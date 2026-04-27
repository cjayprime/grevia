

from typing import Optional

from pydantic import BaseModel, Field, field_validator


class SignupRequest(BaseModel):
    name: str = Field(description="Company name")
    email: str = Field(description="Company email address")
    password: str = Field(description="Password (min 8 characters)")
    industry: Optional[str] = Field(default=None, description="Company industry")
    region: Optional[str] = Field(default=None, description="Operating region")
    country: Optional[str] = Field(default=None, description="Country of headquarters")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Company name is required.")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not v or "@" not in v:
            raise ValueError("A valid email is required.")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v


class SigninRequest(BaseModel):
    email: str = Field(description="Company email address")
    password: str = Field(description="Account password")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return v.strip().lower()


class ForgotPasswordRequest(BaseModel):
    email: str = Field(description="Email to send reset link to")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return v.strip().lower()


class ResetPasswordRequest(BaseModel):
    token: str = Field(description="Reset token from email link")
    password: str = Field(description="New password (min 8 characters)")

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(description="Current password")
    new_password: str = Field(description="New password (min 8 characters)")

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v


class AuthResponse(BaseModel):
    token: str
    company: dict
