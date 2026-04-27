

from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

VALID_INDUSTRIES = {
    "Agriculture", "Automotive", "Banking & Finance", "Chemicals",
    "Construction", "Consumer Goods", "Education", "Energy — Oil & Gas",
    "Energy — Renewables", "Food & Beverage", "Healthcare",
    "Hospitality & Tourism", "Insurance", "Manufacturing",
    "Media & Entertainment", "Mining & Metals", "Pharmaceuticals",
    "Real Estate", "Retail", "Technology", "Telecommunications",
    "Transportation & Logistics", "Utilities", "Waste Management",
}

VALID_REGIONS = {"Africa", "Europe", "Americas", "Asia-Pacific", "Middle East"}


class CreateWorkspaceRequest(BaseModel):
    company_id: int = Field(default=1, description="ID of the company this workspace belongs to")
    industry: str = Field(description="Company industry — must be one of the supported industry values")
    region: str = Field(description="Operating region — one of: Africa, Europe, Americas, Asia-Pacific, Middle East")
    hq_country: str = Field(description="Country where the company's headquarters is located")
    employee_count: int = Field(description="Total number of employees (must be a positive integer)")
    annual_revenue: int = Field(description="Annual revenue in USD (must be a positive integer)")
    business_description: str = Field(description="Description of the company's core products, services, and business model")
    value_chain_description: str = Field(description="Description of the company's upstream and downstream value chain activities")
    key_stakeholders: List[str] = Field(description="List of key stakeholder groups (e.g. investors, employees, suppliers)")
    sustainability_goals: str = Field(description="Company sustainability targets and net-zero commitments")

    @field_validator("industry")
    @classmethod
    def validate_industry(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Industry is required.")
        if v not in VALID_INDUSTRIES:
            raise ValueError("Invalid industry. Must be one of the supported values.")
        return v

    @field_validator("region")
    @classmethod
    def validate_region(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Region is required.")
        if v not in VALID_REGIONS:
            raise ValueError("Invalid region. Must be one of: Africa, Europe, Americas, Asia-Pacific, Middle East.")
        return v

    @field_validator("hq_country")
    @classmethod
    def validate_hq_country(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("HQ Country is required.")
        return v.strip()

    @field_validator("employee_count")
    @classmethod
    def validate_employee_count(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Employee count must be a positive number.")
        return v

    @field_validator("annual_revenue")
    @classmethod
    def validate_annual_revenue(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Annual revenue must be a positive number.")
        return v

    @field_validator("business_description")
    @classmethod
    def validate_business_description(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Business description is required.")
        return v.strip()

    @field_validator("value_chain_description")
    @classmethod
    def validate_value_chain_description(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Value chain description is required.")
        return v.strip()

    @field_validator("key_stakeholders")
    @classmethod
    def validate_stakeholders(cls, v: List[str]) -> List[str]:
        v = [s.strip() for s in v if s.strip()]
        if not v:
            raise ValueError("At least one key stakeholder is required.")
        return v

    @field_validator("sustainability_goals")
    @classmethod
    def validate_sustainability_goals(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Sustainability goals are required.")
        return v.strip()


class UpdateWorkspaceRequest(BaseModel):
    industry: Optional[str] = Field(default=None, description="Updated industry — must be one of the supported industry values")
    region: Optional[str] = Field(default=None, description="Updated operating region")
    hq_country: Optional[str] = Field(default=None, description="Updated headquarters country")
    employee_count: Optional[int] = Field(default=None, description="Updated employee count — must be positive")
    annual_revenue: Optional[int] = Field(default=None, description="Updated annual revenue in USD — must be positive")
    business_description: Optional[str] = Field(default=None, description="Updated business description")
    value_chain_description: Optional[str] = Field(default=None, description="Updated value chain description")
    key_stakeholders: Optional[List[str]] = Field(default=None, description="Updated list of key stakeholder groups")
    sustainability_goals: Optional[str] = Field(default=None, description="Updated sustainability goals and targets")

    @field_validator("industry")
    @classmethod
    def validate_industry(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_INDUSTRIES:
            raise ValueError("Invalid industry. Must be one of the supported values.")
        return v

    @field_validator("region")
    @classmethod
    def validate_region(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_REGIONS:
            raise ValueError("Invalid region. Must be one of: Africa, Europe, Americas, Asia-Pacific, Middle East.")
        return v

    @field_validator("employee_count")
    @classmethod
    def validate_employee_count(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v <= 0:
            raise ValueError("Employee count must be a positive number.")
        return v

    @field_validator("annual_revenue")
    @classmethod
    def validate_annual_revenue(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v <= 0:
            raise ValueError("Annual revenue must be a positive number.")
        return v
