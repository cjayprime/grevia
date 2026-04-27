import pandas as pd
from typing import Type
from sqlalchemy.orm import Session
from .base import BaseConnector
from .models import EmissionData, get_engine

class DataLoader:
    """
    Orchestrates the process of fetching data from a connector
    and loading it into the database.
    """

    def __init__(self, engine):
        self.engine = engine

    def load_emissions_from_file(
        self,
        connector: BaseConnector,
        file_id: str,
        company_id: str,
        period: str
    ):
        """
        Fetches a file, parses it as emissions data, and saves to DB.
        """
        df = connector.load_as_dataframe(file_id)

        with Session(self.engine) as session:
            for _, row in df.iterrows():
                emission = EmissionData(
                    company_id=company_id,
                    reporting_period=period,
                    scope=int(row.get('scope', 0)),
                    category=str(row.get('category', 'Unknown')),
                    sub_category=str(row.get('sub_category', '')),
                    co2_equivalent=float(row.get('value', 0.0)),
                    confidence_score=float(row.get('confidence', 0.0)),
                    source_file=file_id
                )
                session.add(emission)
            session.commit()

        print(f"Loaded {len(df)} rows from {file_id} into the database.")

    def sync_all_new_files(self, connector: BaseConnector, company_id: str, period: str):
        """
        Syncs all files matching a certain pattern.
        """
        files = connector.list_files(prefix="emissions_")
        for file in files:
            self.load_emissions_from_file(connector, file['id'], company_id, period)
