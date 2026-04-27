import os
import uuid

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID", "")
R2_ACCESS_KEY = os.getenv("R2_ACCESS_KEY", "")
R2_SECRET_KEY = os.getenv("R2_SECRET_KEY", "")
R2_BUCKET = os.getenv("R2_BUCKET", "grevia-old")
R2_PUBLIC_URL = os.getenv("R2_PUBLIC_URL", "")

_use_local = not R2_ACCOUNT_ID
LOCAL_STORE = os.path.join(os.path.dirname(__file__), "..", "storage")


def _get_client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=R2_ACCESS_KEY,
        aws_secret_access_key=R2_SECRET_KEY,
        config=Config(signature_version="s3v4"),
        region_name="weur"
    )


# Upload a file to R2 or local disk
def upload_file(data: bytes, company_id: str, filename: str) -> str:
    ext = os.path.splitext(filename)[1]
    key = f"hot-store/{company_id}/{uuid.uuid4().hex}{ext}"

    if _use_local:
        full = os.path.join(LOCAL_STORE, str(company_id))
        os.makedirs(full, exist_ok=True)
        path = os.path.join(full, f"{uuid.uuid4().hex}{ext}")
        with open(path, "wb") as f:
            f.write(data)
        return path

    try:
        client = _get_client()
        client.put_object(Bucket=R2_BUCKET, Key=key, Body=data)
    except ClientError as e:
        print(f"Boto3 Error: {e.response['Error']['Code']}")
        print(f"Message: {e.response['Error']['Message']}")
        raise e
        # return ""
    if R2_PUBLIC_URL:
        return f"{R2_PUBLIC_URL}/{key}"
    return key


# Download a file from R2 or local disk
def download_file(file_path: str) -> bytes:
    if _use_local or os.path.isfile(file_path):
        with open(file_path, "rb") as f:
            return f.read()

    client = _get_client()
    resp = client.get_object(Bucket=R2_BUCKET, Key=file_path)
    return resp["Body"].read()


# Delete a file from R2 or local disk
def delete_file(file_path: str) -> None:
    if _use_local or os.path.isfile(file_path):
        if os.path.isfile(file_path):
            os.remove(file_path)
        return

    client = _get_client()
    client.delete_object(Bucket=R2_BUCKET, Key=file_path)


# Generate a presigned URL for R2
def get_presigned_url(file_path: str, expires: int = 3600) -> str:
    if _use_local:
        return file_path
    client = _get_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": R2_BUCKET, "Key": file_path},
        ExpiresIn=expires,
    )
