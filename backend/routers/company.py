from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
 
from models.database import get_session
from models.company import Company
from helpers.auth import get_authenticated_company

router = APIRouter(prefix="/api/v1/companies", tags=["companies"], dependencies=[Depends(get_authenticated_company)])

@router.get("/current")
def get_authenticated_company_endpoint(company: Company = Depends(get_authenticated_company)):
    return {
        "company_id": company.company_id,
        "name": company.name,
        "email": company.email,
        "industry": company.industry,
        "region": company.region,
        "country": company.country,
    }


@router.get("/{company_id}")
def get_company(company_id: int, session: Session = Depends(get_session)):
    company = session.get(Company, company_id)
    if not company:
        return {"company_id": company_id, "name": None}
    return {"company_id": company.company_id, "name": company.name, "industry": company.industry}
