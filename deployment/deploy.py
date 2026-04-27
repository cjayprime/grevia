#!/usr/bin/env python3
"""
Grevia — Deploy backend + frontend to AWS App Runner via ECR.

Prerequisites:
  - AWS CLI v2 configured with sufficient IAM permissions
  - Docker running locally
  - Python 3.10+

Usage:
  python deployment/deploy.py                    # deploy both
  python deployment/deploy.py --backend-only     # backend only
  python deployment/deploy.py --frontend-only    # frontend only

Required env vars:
  AWS_ACCOUNT_ID   – 12-digit AWS account ID
  API_GATEWAY_URL  – API Gateway URL fronting the backend
                     (baked into the frontend as NEXT_PUBLIC_API_URL)

Optional env vars:
  AWS_REGION       – target region (default: us-east-1)
  BACKEND_ENV_VARS – path to a .env file whose KEY=VALUE lines become
                     App Runner runtime env vars for the backend service
"""

import argparse
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
PROJECT = "grevia"
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")


def run(cmd: list[str], *, capture=False, check=True, **kwargs) -> subprocess.CompletedProcess:
    print(f"  $ {' '.join(cmd)}")
    return subprocess.run(cmd, capture_output=capture, text=True, check=check, **kwargs)


def run_json(cmd: list[str]) -> dict | list:
    result = run(cmd, capture=True)
    return json.loads(result.stdout)


def get_git_sha() -> str:
    try:
        r = run(["git", "-C", str(ROOT_DIR), "rev-parse", "--short", "HEAD"], capture=True)
        return r.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return "latest"


def ecr_login(ecr_uri: str):
    print("Logging in to ECR...")
    password = run(
        ["aws", "ecr", "get-login-password", "--region", AWS_REGION],
        capture=True,
    ).stdout.strip()
    run(
        ["docker", "login", "--username", "AWS", "--password-stdin", ecr_uri],
        input=password,
    )


def ensure_ecr_repo(repo: str):
    r = run(
        ["aws", "ecr", "describe-repositories", "--repository-names", repo, "--region", AWS_REGION],
        capture=True,
        check=False,
    )
    if r.returncode != 0:
        print(f"Creating ECR repository: {repo}")
        run([
            "aws", "ecr", "create-repository",
            "--repository-name", repo,
            "--region", AWS_REGION,
            "--image-scanning-configuration", "scanOnPush=true",
            "--image-tag-mutability", "MUTABLE",
        ])


def build_and_push(context: Path, repo: str, tag: str, ecr_uri: str, build_args: dict[str, str] | None = None):
    image = f"{ecr_uri}/{repo}"
    cmd = ["docker", "build"]
    for k, v in (build_args or {}).items():
        cmd += ["--build-arg", f"{k}={v}"]
    cmd += ["-t", f"{repo}:{tag}", str(context)]

    print(f"Building {repo}:{tag} ...")
    run(cmd)
    run(["docker", "tag", f"{repo}:{tag}", f"{image}:{tag}"])
    run(["docker", "tag", f"{repo}:{tag}", f"{image}:latest"])

    print(f"Pushing {image}:{tag} ...")
    run(["docker", "push", f"{image}:{tag}"])
    run(["docker", "push", f"{image}:latest"])


def load_env_file(path: str) -> dict[str, str]:
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if re.match(r"^[A-Z_]+=", line):
                key, _, value = line.partition("=")
                env[key] = value
    return env


def get_or_create_access_role() -> str:
    role_name = f"{PROJECT}-apprunner-ecr-access"

    r = run(
        ["aws", "iam", "get-role", "--role-name", role_name, "--query", "Role.Arn", "--output", "text"],
        capture=True,
        check=False,
    )
    if r.returncode == 0 and r.stdout.strip() not in ("", "None"):
        return r.stdout.strip()

    print(f"Creating IAM role: {role_name}")
    trust_policy = json.dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {"Service": "build.apprunner.amazonaws.com"},
            "Action": "sts:AssumeRole",
        }],
    })

    r = run([
        "aws", "iam", "create-role",
        "--role-name", role_name,
        "--assume-role-policy-document", trust_policy,
        "--query", "Role.Arn",
        "--output", "text",
    ], capture=True)
    role_arn = r.stdout.strip()

    run([
        "aws", "iam", "attach-role-policy",
        "--role-name", role_name,
        "--policy-arn", "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess",
    ])

    print("Waiting 10s for IAM role propagation...")
    time.sleep(10)
    return role_arn


def find_existing_service(service_name: str) -> str | None:
    r = run([
        "aws", "apprunner", "list-services",
        "--region", AWS_REGION,
        "--query", f"ServiceSummaryList[?ServiceName=='{service_name}'].ServiceArn | [0]",
        "--output", "text",
    ], capture=True)
    arn = r.stdout.strip()
    if arn and arn != "None":
        return arn
    return None


def env_dict_to_apprunner(env: dict[str, str]) -> dict[str, str]:
    return env


def deploy_app_runner_service(
    service_name: str,
    image_uri: str,
    tag: str,
    port: int,
    env_vars: dict[str, str],
    access_role_arn: str,
    health_path: str | None = None,
):
    existing_arn = find_existing_service(service_name)

    source_config = {
        "AuthenticationConfiguration": {"AccessRoleArn": access_role_arn},
        "ImageRepository": {
            "ImageIdentifier": f"{image_uri}:{tag}",
            "ImageRepositoryType": "ECR",
            "ImageConfiguration": {
                "Port": str(port),
                "RuntimeEnvironmentVariables": env_dict_to_apprunner(env_vars),
            },
        },
        "AutoDeploymentsEnabled": False,
    }

    if existing_arn:
        print(f"Updating App Runner service: {service_name}")
        run([
            "aws", "apprunner", "update-service",
            "--region", AWS_REGION,
            "--service-arn", existing_arn,
            "--source-configuration", json.dumps(source_config),
        ])
    else:
        print(f"Creating App Runner service: {service_name}")
        cmd = [
            "aws", "apprunner", "create-service",
            "--region", AWS_REGION,
            "--service-name", service_name,
            "--source-configuration", json.dumps(source_config),
            "--instance-configuration", json.dumps({"Cpu": "1024", "Memory": "2048"}),
        ]
        if health_path:
            cmd += [
                "--health-check-configuration", json.dumps({
                    "Protocol": "HTTP",
                    "Path": health_path,
                    "Interval": 10,
                    "Timeout": 5,
                    "HealthyThreshold": 1,
                    "UnhealthyThreshold": 3,
                }),
            ]
        run(cmd)

    print(f"Done: {service_name}")


def print_services():
    print("\nApp Runner services:")
    run([
        "aws", "apprunner", "list-services",
        "--region", AWS_REGION,
        "--query", f"ServiceSummaryList[?starts_with(ServiceName, '{PROJECT}')].[ServiceName, ServiceUrl, Status]",
        "--output", "table",
    ])


def main():
    parser = argparse.ArgumentParser(description="Deploy Grevia to AWS App Runner")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--backend-only", action="store_true")
    group.add_argument("--frontend-only", action="store_true")
    args = parser.parse_args()

    deploy_backend = not args.frontend_only
    deploy_frontend = not args.backend_only

    aws_account_id = os.environ.get("AWS_ACCOUNT_ID")
    if not aws_account_id:
        sys.exit("ERROR: AWS_ACCOUNT_ID is not set")

    api_gateway_url = os.environ.get("API_GATEWAY_URL")
    if deploy_frontend and not api_gateway_url:
        sys.exit("ERROR: API_GATEWAY_URL is required for frontend builds")

    for cmd in ["aws", "docker"]:
        r = subprocess.run(["which", cmd], capture_output=True)
        if r.returncode != 0:
            sys.exit(f"ERROR: {cmd} not found")

    tag = get_git_sha()
    ecr_uri = f"{aws_account_id}.dkr.ecr.{AWS_REGION}.amazonaws.com"

    ecr_login(ecr_uri)
    access_role_arn = get_or_create_access_role()

    if deploy_backend:
        print(f"\n{'=' * 40}\n  Backend\n{'=' * 40}")
        repo = f"{PROJECT}-backend"
        ensure_ecr_repo(repo)
        build_and_push(ROOT_DIR / "backend", repo, tag, ecr_uri)

        backend_env: dict[str, str] = {}
        env_file = os.environ.get("BACKEND_ENV_VARS")
        if env_file:
            backend_env = load_env_file(env_file)

        deploy_app_runner_service(
            service_name=f"{PROJECT}-backend",
            image_uri=f"{ecr_uri}/{repo}",
            tag=tag,
            port=8000,
            env_vars=backend_env,
            access_role_arn=access_role_arn,
            health_path="/health",
        )

    if deploy_frontend:
        print(f"\n{'=' * 40}\n  Frontend\n{'=' * 40}")
        repo = f"{PROJECT}-frontend"
        ensure_ecr_repo(repo)
        build_and_push(
            ROOT_DIR / "frontend", repo, tag, ecr_uri,
            build_args={"NEXT_PUBLIC_API_URL": api_gateway_url},
        )

        deploy_app_runner_service(
            service_name=f"{PROJECT}-frontend",
            image_uri=f"{ecr_uri}/{repo}",
            tag=tag,
            port=3000,
            env_vars={"NEXT_PUBLIC_API_URL": api_gateway_url},
            access_role_arn=access_role_arn,
        )

    print(f"\nDeployment complete (tag: {tag})")
    print_services()


if __name__ == "__main__":
    main()
