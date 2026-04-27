from typing import Annotated, Union
from enum import Enum
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

VALID_STANDARDS = {"ESRS", "GRI", "SASB", "TCFD", "ISSB"}


class Standard(str, Enum):
    ESRS = "ESRS"
    GRI = "GRI"
    SASB = "SASB"
    TCFD = "TCFD"
    ISSB = "ISSB"


class AssessmentStatus(str, Enum):
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"


class AssessmentRequest(BaseModel):
    workspace_id: int = Field(
        default=None,
        description="Workspace ID to associate the resulting assessment with",
    )
    standard: str = Field(
        default="ESRS",
        description="Reporting standard — one of: ESRS, GRI, SASB, TCFD, ISSB",
    )
    industry: str = Field(
        default="",
        description="Company industry, used to contextualise material topics",
    )
    region: str = Field(
        default="",
        description="Company operating region, used to contextualise material topics",
    )
    hot_store_ids: list[int] = Field(
        default=[],
        description="Hot-store document IDs to use as source material; empty = use all company documents",
    )

    @field_validator("standard")
    @classmethod
    def validate_standard(cls, v: str) -> str:
        if v not in VALID_STANDARDS:
            raise ValueError(
                f"Invalid standard. Must be one of: {', '.join(sorted(VALID_STANDARDS))}."
            )
        return v

    @field_validator("hot_store_ids")
    @classmethod
    def validate_hot_store_ids(cls, hot_store_ids: list[int]) -> list[int]:
        if any(i <= 0 for i in hot_store_ids):
            raise ValueError("All document IDs must be positive integers.")
        return hot_store_ids


class Topic(str, Enum):
    ENVIRONMENTAL = "Environment"
    SOCIAL = "Social"
    GOVERNANCE = "Governance"


class EnvironmentSubTopic(str, Enum):
    E1 = "E1"
    E2 = "E2"
    E3 = "E3"
    E4 = "E4"


class SocialSubTopic(str, Enum):
    S1 = "S1"
    S2 = "S2"
    S3 = "S3"
    S4 = "S4"


class GovernanceSubTopic(str, Enum):
    G1 = "G1"
    # @property
    # def description(self) -> str:
    #     """Returns the full ESRS standard description."""
    #     descriptions = {
    #         "E1": "Climate Change",
    #         "E2": "Pollution",
    #         "E3": "Water and marine resources",
    #         "E4": "Biodiversity and ecosystems",
    #         "S1": "Own workforce",
    #         "S2": "Workers in the value chain",
    #         "S3": "Affected communities",
    #         "S4": "Consumers and end-users",
    #         "G1": "Business conduct",
    #     }
    #     return descriptions.get(self.value, "Unknown Sub-Topic")


class EnvironmentDisclosureRequirement(str, Enum):
    E1_1 = "E1-1"
    E1_2 = "E1-2"
    E1_3 = "E1-3"
    E1_4 = "E1-4"
    E1_5 = "E1-5"
    E1_6 = "E1-6"
    E1_7 = "E1-7"
    E1_8 = "E1-8"
    E1_9 = "E1-9"
    E2_1 = "E2-1"
    E2_2 = "E2-2"
    E2_3 = "E2-3"
    E2_4 = "E2-4"
    E2_5 = "E2-5"
    E3_1 = "E3-1"
    E3_2 = "E3-2"
    E3_3 = "E3-3"
    E3_4 = "E3-4"
    E3_5 = "E3-5"
    E4_1 = "E4-1"
    E4_2 = "E4-2"
    E4_3 = "E4-3"
    E4_4 = "E4-4"
    E4_5 = "E4-5"
    E5_1 = "E5-1"
    E5_2 = "E5-2"
    E5_3 = "E5-3"
    E5_4 = "E5-4"
    E5_5 = "E5-5"


class SocialDisclosureRequirement(str, Enum):
    S1_1 = "S1-1"
    S1_2 = "S1-2"
    S1_3 = "S1-3"
    S1_4 = "S1-4"
    S1_5 = "S1-5"
    S1_6 = "S1-6"
    S1_7 = "S1-7"
    S1_8 = "S1-8"
    S1_9 = "S1-9"
    S1_10 = "S1-10"
    S1_11 = "S1-11"
    S1_12 = "S1-12"
    S1_13 = "S1-13"
    S1_14 = "S1-14"
    S1_15 = "S1-15"
    S1_16 = "S1-16"
    S1_17 = "S1-17"
    S2_1 = "S2-1"
    S2_2 = "S2-2"
    S2_3 = "S2-3"
    S2_4 = "S2-4"
    S2_5 = "S2-5"
    S3_1 = "S3-1"
    S3_2 = "S3-2"
    S3_3 = "S3-3"
    S3_4 = "S3-4"
    S3_5 = "S3-5"
    S4_1 = "S4-1"
    S4_2 = "S4-2"
    S4_3 = "S4-3"
    S4_4 = "S4-4"
    S4_5 = "S4-5"


class GovernanceDisclosureRequirement(str, Enum):
    G1_1 = "G1-1"
    G1_2 = "G1-2"
    G1_3 = "G1-3"
    G1_4 = "G1-4"
    G1_5 = "G1-5"
    G1_6 = "G1-6"


class MaterialityAssessmentBreakdown(BaseModel):
    # materiality_assessment_breakdown_id: int = Field(
    #     ..., description="Unique identifier for the assessment breakdown record."
    # )
    # materiality_assessment_id: int = Field(
    #     ..., description="Foreign key referencing the parent materiality assessment."
    # )
    topic: Topic = Field(
        None,
        description="The high-level ESG material topic (Environmental, Social, or Governance).",
    )
    sub_topic: Annotated[
        Union[EnvironmentSubTopic, SocialSubTopic, GovernanceSubTopic],
        Field(
            None,
            description="The specific thematic sub-topic, it must be a sub topic of the topic already specified.",
        ),
    ]
    disclosure_requirement: Annotated[
        Union[
            EnvironmentDisclosureRequirement,
            SocialDisclosureRequirement,
            GovernanceDisclosureRequirement,
        ],
        Field(
            ...,
            description="The standardized disclosure requirement according to ESRS standards.",
        ),
    ]
    description: str = Field(
        ...,
        description="Detailed description of the assessment item. Use this field to outline the actions the company has taken if and only if there is evidence of such actions in the provided documents. If there is no evidence of any action taken, you must leave this field blank and fill the recommendations field instead with what the company should be doing according to ESRS standards and the documents provided.",
    )
    policies: list[str] = Field(
        ..., description="List of relevant policies associated with this disclosure."
    )
    processes: list[str] = Field(
        ...,
        description="List of processes used to manage this topic, refere to ESRS 2 for your response here.",
    )
    strategies: list[str] = Field(
        ..., description="List of strategies implemented regarding this topic."
    )
    impact_risk_opportunities: str = Field(
        ..., description="Narrative regarding the impacts, risks, and opportunities."
    )
    metric_target: float = Field(
        None,
        description="Numerical target value for the defined metric. This should be a specific goal the company aims to achieve (e.g., reduce emissions by 20%). You MUST retrieve it from the documents provided and not make it up. If no target is set, leave this field as 0.",
    )
    metric_description: str = Field(
        None,
        description="Explanation of the metric being tracked (e.g., total greenhouse gas emissions).",
    )
    metric_unit: str = Field(
        None, description="Unit of measurement (e.g., tons, percentage, currency)."
    )
    metric_id: str = Field(
        None,
        description="Unique identifier for the associated metric. This should be gotten from EFRAG official documents and not made up. If no specific metric ID is referenced only do what the EFRAG official website instructs you to do, if that is not to use any ID then leave this field blank.",
    )
    xml_id: str = Field(
        None,
        description="Reference ID used for XML reporting export. This should be retrieved from EFRAG official documents and not made up. If no specific XML ID is referenced only do what the EFRAG official website instructs you to do, if that is not to use any ID then leave this field blank.",
    )
    datapoints: str = Field(None, description="Associated data point identifiers.")
    financial_materiality_score: Decimal = Field(
        ...,
        ge=0,
        le=99.99,
        description="Score representing the financial materiality (0.00 to 99.99).",
    )
    impact_materiality_score: Decimal = Field(
        ...,
        ge=0,
        le=99.99,
        description="Score representing the impact materiality (0.00 to 99.99).",
    )
    recommendations: str = Field(
        ...,
        description="Detailed recommendations for improving performance on this topic, based on ESRS standards and the provided documents. This field should be filled if there is no evidence of action in the description field.",
    )
    date: datetime = Field(
        default_factory=datetime.now,
        description="Timestamp when you completed the assessment.",
    )


class EnvironmentalAssessment(MaterialityAssessmentBreakdown):
    topic: str = Field(
        Topic.ENVIRONMENTAL,
        description="The high-level ESG material topic - Environmental",
    )
    sub_topic: EnvironmentSubTopic = Field(
        ...,
        description="The specific thematic sub-topic, it must be a sub topic of the topic already specified.",
    )
    disclosure_requirement: EnvironmentDisclosureRequirement = Field(
        ...,
        description="The standardized disclosure requirement according to ESRS standards.",
    )


class EnvironmentalAssessmentBreakdown(MaterialityAssessmentBreakdown):
    all: list[EnvironmentalAssessment] = Field(
        ...,
        description="A list of assessment items covering multiple disclosure requirements. Each item in the list should follow the structure defined in EnvironmentalAssessment, allowing for comprehensive coverage of all relevant ESRS Environmental disclosure requirements.",
    )


class SocialAssessment(MaterialityAssessmentBreakdown):
    topic: str = Field(
        Topic.SOCIAL,
        description="The high-level ESG material topic - Social",
    )
    sub_topic: SocialSubTopic = Field(
        ...,
        description="The specific thematic sub-topic, it must be a sub topic of the topic already specified.",
    )
    disclosure_requirement: SocialDisclosureRequirement = Field(
        ...,
        description="The standardized disclosure requirement according to ESRS standards.",
    )


class SocialAssessmentBreakdown(MaterialityAssessmentBreakdown):
    all: list[SocialAssessment] = Field(
        ...,
        description="A list of assessment items covering multiple disclosure requirements. Each item in the list should follow the structure defined in SocialAssessment, allowing for comprehensive coverage of all relevant ESRS Social disclosure requirements.",
    )


class GovernanceAssessment(MaterialityAssessmentBreakdown):
    topic: str = Field(
        Topic.GOVERNANCE,
        description="The high-level ESG material topic - Governance",
    )
    sub_topic: GovernanceSubTopic = Field(
        ...,
        description="The specific thematic sub-topic, it must be a sub topic of the topic already specified.",
    )
    disclosure_requirement: GovernanceDisclosureRequirement = Field(
        ...,
        description="The standardized disclosure requirement according to ESRS standards.",
    )


class GovernanceAssessmentBreakdown(MaterialityAssessmentBreakdown):
    all: list[GovernanceAssessment] = Field(
        ...,
        description="A list of assessment items covering multiple disclosure requirements. Each item in the list should follow the structure defined in GovernanceAssessment, allowing for comprehensive coverage of all relevant ESRS Governance disclosure requirements.",
    )
