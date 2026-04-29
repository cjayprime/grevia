"""Integration tests for /api/v1/auth — uses SQLite via conftest fixtures."""
import pytest
from helpers.auth import create_access_token


class TestSignup:
    def test_signup_success(self, client):
        r = client.post("/api/v1/auth/signup", json={
            "name": "Test Corp",
            "email": "newco@test.com",
            "password": "password123",
        })
        assert r.status_code == 200
        body = r.json()
        assert "token" in body
        assert body["company"]["email"] == "newco@test.com"

    def test_signup_duplicate_email_409(self, client, company):
        r = client.post("/api/v1/auth/signup", json={
            "name": "Dup",
            "email": company.email,
            "password": "password123",
        })
        assert r.status_code == 409

    def test_signup_invalid_email_422(self, client):
        r = client.post("/api/v1/auth/signup", json={
            "name": "Bad",
            "email": "notanemail",
            "password": "password123",
        })
        assert r.status_code == 422

    def test_signup_short_password_422(self, client):
        r = client.post("/api/v1/auth/signup", json={
            "name": "Bad",
            "email": "x@y.com",
            "password": "short",
        })
        assert r.status_code == 422


class TestSignin:
    def test_signin_success(self, client, company):
        r = client.post("/api/v1/auth/signin", json={
            "email": company.email,
            "password": "password123",
        })
        assert r.status_code == 200
        assert "token" in r.json()

    def test_signin_wrong_password_401(self, client, company):
        r = client.post("/api/v1/auth/signin", json={
            "email": company.email,
            "password": "wrongpassword",
        })
        assert r.status_code == 401

    def test_signin_unknown_email_401(self, client):
        r = client.post("/api/v1/auth/signin", json={
            "email": "nobody@nowhere.com",
            "password": "password123",
        })
        assert r.status_code == 401


class TestGetMe:
    def test_me_returns_company(self, client, company, auth_headers):
        r = client.get("/api/v1/auth/me", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["email"] == company.email

    def test_me_no_token_403(self, client):
        r = client.get("/api/v1/auth/me")
        assert r.status_code == 403

    def test_me_bad_token_401(self, client):
        r = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer badtoken"})
        assert r.status_code == 401


class TestForgotPassword:
    def test_always_returns_200(self, client):
        r = client.post("/api/v1/auth/forgot-password", json={"email": "any@email.com"})
        assert r.status_code == 200
        assert "message" in r.json()

    def test_known_email_returns_reset_token(self, client, company):
        r = client.post("/api/v1/auth/forgot-password", json={"email": company.email})
        assert r.status_code == 200
        assert "reset_token" in r.json()


class TestResetPassword:
    def test_reset_with_valid_token(self, client, company):
        token = create_access_token(company.company_id)
        r = client.post("/api/v1/auth/reset-password", json={
            "token": token,
            "password": "newpassword99",
        })
        assert r.status_code == 200
        # Confirm can now sign in with new password
        r2 = client.post("/api/v1/auth/signin", json={
            "email": company.email,
            "password": "newpassword99",
        })
        assert r2.status_code == 200

    def test_reset_bad_token_400(self, client):
        r = client.post("/api/v1/auth/reset-password", json={
            "token": "invalid.token.here",
            "password": "newpassword99",
        })
        assert r.status_code in (400, 401)


class TestChangePassword:
    def test_change_password_success(self, client, company, auth_headers):
        r = client.post("/api/v1/auth/change-password", json={
            "current_password": "password123",
            "new_password": "updated99pass",
        }, headers=auth_headers)
        assert r.status_code == 200

    def test_change_password_wrong_current_400(self, client, company, auth_headers):
        r = client.post("/api/v1/auth/change-password", json={
            "current_password": "wrongcurrent",
            "new_password": "updated99pass",
        }, headers=auth_headers)
        assert r.status_code == 400

    def test_change_password_short_new_422(self, client, auth_headers):
        r = client.post("/api/v1/auth/change-password", json={
            "current_password": "password123",
            "new_password": "short",
        }, headers=auth_headers)
        assert r.status_code == 422
