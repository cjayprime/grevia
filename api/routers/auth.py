

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from models.database import get_session
from models.company import Company
from helpers.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_authenticated_company,
)
from schemas.auth import (
    SignupRequest,
    SigninRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    AuthResponse,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _company_dict(c: Company) -> dict:
    return {
        "company_id": c.company_id,
        "name": c.name,
        "email": c.email,
        "industry": c.industry,
        "region": c.region,
        "country": c.country,
    }


@router.post("/signup")
def signup(body: SignupRequest, session: Session = Depends(get_session)):
    existing = (
        session.execute(select(Company).where(Company.email == body.email))
        .scalars()
        .first()
    )
    if existing:
        raise HTTPException(409, "An account with this email already exists.")

    company = Company(
        name=body.name,
        email=body.email,
        password=hash_password(body.password),
        industry=body.industry,
        region=body.region,
        country=body.country,
    )
    session.add(company)
    session.commit()
    session.refresh(company)

    token = create_access_token(company.company_id)
    return AuthResponse(token=token, company=_company_dict(company))


@router.post("/signin")
def signin(body: SigninRequest, session: Session = Depends(get_session)):
    company = (
        session.execute(select(Company).where(Company.email == body.email))
        .scalars()
        .first()
    )
    if not company or not company.password:
        raise HTTPException(401, "Invalid email or password.")
    if not verify_password(body.password, company.password):
        raise HTTPException(401, "Invalid email or password.")

    token = create_access_token(company.company_id)
    return AuthResponse(token=token, company=_company_dict(company))


@router.post("/forgot-password")
def forgot_password(
    body: ForgotPasswordRequest, session: Session = Depends(get_session)
):
    company = (
        session.execute(select(Company).where(Company.email == body.email))
        .scalars()
        .first()
    )
    if not company:
        return {"message": "If that email exists, a reset link has been sent."}

    token = create_access_token(company.company_id)
    # In production: send email with reset link containing token.
    # For now we return the token directly for development.
    return {
        "message": "If that email exists, a reset link has been sent.",
        "reset_token": token,
    }


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, session: Session = Depends(get_session)):
    from helpers.auth import decode_token

    company_id = decode_token(body.token)
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(400, "Invalid reset token.")

    company.password = hash_password(body.password)
    session.add(company)
    session.commit()
    return {"message": "Password has been reset successfully."}


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    company: Company = Depends(get_authenticated_company),
    session: Session = Depends(get_session),
):
    if not company.password or not verify_password(
        body.current_password, company.password
    ):
        raise HTTPException(400, "Current password is incorrect.")

    company.password = hash_password(body.new_password)
    session.add(company)
    session.commit()
    return {"message": "Password changed successfully."}


@router.get("/me")
def get_me(company: Company = Depends(get_authenticated_company)):
    return _company_dict(company)
