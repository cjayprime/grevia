

from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


class AnalyzeEmissionsRequest(BaseModel):
    hot_store_ids: list[int] = Field(
        description="Non-empty list of hot-store document IDs to extract emissions data from"
    )
    workspace_id: Optional[int] = Field(
        default=None, description="Optional workspace to scope the analysis"
    )

    @field_validator("hot_store_ids")
    @classmethod
    def validate_hot_store_ids(cls, v: list[int]) -> list[int]:
        if not v:
            raise ValueError("At least one document_id is required.")
        if any(i <= 0 for i in v):
            raise ValueError("All document IDs must be positive integers.")
        return v


class NarrativeRequest(BaseModel):
    workspace_id: Optional[int] = Field(
        default=None, description="Optional workspace to scope the narrative generation"
    )


class UpdateEmissionRequest(BaseModel):
    scope: Optional[int] = Field(
        default=None,
        description="GHG Protocol scope: 1 (direct), 2 (indirect energy), or 3 (value chain)",
    )
    category: Optional[str] = Field(
        default=None,
        description="Specific emission category per GHG Protocol (e.g. 'Stationary combustion')",
    )
    tco2e: Optional[float] = Field(
        default=None, description="Tonnes of CO2 equivalent — must be zero or positive"
    )
    percentage_of_total: Optional[float] = Field(
        default=None,
        description="This record's share of total company emissions, 0–100",
    )
    confidence: Optional[Literal["high", "medium", "low"]] = Field(
        default=None,
        description="Confidence level: high = audited, medium = estimated, low = rough proxy",
    )
    status: Optional[Literal["ok", "gap", "outlier", "unverified"]] = Field(
        default=None, description="Data quality status of this record"
    )
    esrs_reference: Optional[str] = Field(
        default=None,
        description="Applicable ESRS disclosure reference (e.g. 'ESRS E1-6')",
    )
    gri_reference: Optional[str] = Field(
        default=None, description="Applicable GRI standard reference (e.g. 'GRI 305-1')"
    )
    tcfd_reference: Optional[str] = Field(
        default=None,
        description="Applicable TCFD pillar reference (e.g. 'Metrics & Targets')",
    )
    issb_reference: Optional[str] = Field(
        default=None,
        description="Applicable ISSB standard reference (e.g. 'IFRS S2 C6')",
    )
    narrative_disclosure: Optional[str] = Field(
        default=None,
        description="Plain-language narrative describing this emission source",
    )
    year: Optional[int] = Field(default=None, description="Reporting year, 2000–2100")
    period: Optional[str] = Field(
        default=None, description="Reporting period label (e.g. 'Annual', 'Q1 2024')"
    )

    @field_validator("scope")
    @classmethod
    def validate_scope(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v not in (1, 2, 3):
            raise ValueError("Scope must be 1, 2, or 3.")
        return v

    @field_validator("tco2e")
    @classmethod
    def validate_tco2e(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("tco2e cannot be negative.")
        return v

    @field_validator("percentage_of_total")
    @classmethod
    def validate_percentage(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (0 <= v <= 100):
            raise ValueError("percentage_of_total must be between 0 and 100.")
        return v

    @field_validator("year")
    @classmethod
    def validate_year(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (2000 <= v <= 2100):
            raise ValueError("Year must be between 2000 and 2100.")
        return v


class EmissionSchema(BaseModel):
    scope: int = Field(
        description="GHG Protocol scope: 1 (direct), 2 (indirect energy), or 3 (value chain)"
    )
    category: str = Field(
        description="Specific activity category per GHG Protocol (e.g. 'Stationary combustion', 'Business travel')"
    )
    tco2e: Optional[float] = Field(
        default=None,
        description="Tonnes of CO2 equivalent; null if data is completely missing",
    )
    confidence: Literal["high", "medium", "low"] = Field(
        description="'high' if directly measured/audited, 'medium' if estimated from reliable proxies, 'low' if rough estimate"
    )
    status: Literal["ok", "gap", "outlier", "unverified"] = Field(
        description="'ok' if complete data present, 'gap' if missing/incomplete, 'outlier' if anomalous, 'unverified' if not yet checked"
    )
    esrs_reference: Optional[str] = Field(
        default=None,
        description="Mapped ESRS E1 sub-disclosure reference (e.g. 'ESRS E1-6')",
    )
    gri_reference: Optional[str] = Field(
        default=None, description="Mapped GRI 305 standard reference (e.g. 'GRI 305-1')"
    )
    tcfd_reference: Optional[str] = Field(
        default=None,
        description="Mapped TCFD pillar reference (e.g. 'Metrics & Targets')",
    )
    issb_reference: Optional[str] = Field(
        default=None, description="Mapped ISSB standard reference (e.g. 'IFRS S2 C6')"
    )
    narrative: Optional[str] = Field(
        default=None,
        description="Brief factual sentence describing the emission source",
    )


class AnalysisResult(BaseModel):
    records: list[EmissionSchema] = Field(
        description="List of all extracted emission records from the provided documents"
    )


class NarrativeSchema(BaseModel):
    emission_record_id: int = Field(
        description="ID of the emission record this narrative belongs to"
    )
    narrative: str = Field(
        description="Professional narrative disclosure paragraph suitable for a CSRD annual report"
    )


class NarrativeResult(BaseModel):
    narratives: list[NarrativeSchema] = Field(
        description="List of generated narrative disclosures for gap and outlier records"
    )
