"""Unit tests for helpers/auth.py — no database required."""
import pytest
import jwt as pyjwt

from helpers.auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
    SECRET_KEY,
    ALGORITHM,
)
from fastapi import HTTPException


class TestPasswordHashing:
    def test_hash_returns_string(self):
        h = hash_password("secret123")
        assert isinstance(h, str)
        assert h != "secret123"

    def test_hash_is_unique_per_call(self):
        assert hash_password("same") != hash_password("same")

    def test_verify_correct_password(self):
        h = hash_password("mypassword")
        assert verify_password("mypassword", h) is True

    def test_verify_wrong_password(self):
        h = hash_password("mypassword")
        assert verify_password("wrong", h) is False

    def test_verify_empty_password_fails(self):
        h = hash_password("mypassword")
        assert verify_password("", h) is False


class TestJWT:
    def test_create_token_is_string(self):
        token = create_access_token(42)
        assert isinstance(token, str)

    def test_decode_returns_company_id(self):
        token = create_access_token(99)
        assert decode_token(token) == 99

    def test_decode_invalid_token_raises_401(self):
        with pytest.raises(HTTPException) as exc:
            decode_token("not.a.real.token")
        assert exc.value.status_code == 401

    def test_decode_tampered_token_raises_401(self):
        token = create_access_token(1)
        tampered = token[:-4] + "XXXX"
        with pytest.raises(HTTPException):
            decode_token(tampered)

    def test_decode_expired_token_raises_401(self):
        from datetime import datetime, timedelta
        payload = {"sub": "1", "exp": datetime.utcnow() - timedelta(seconds=1)}
        expired = pyjwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        with pytest.raises(HTTPException):
            decode_token(expired)
