import pandas as pd
from data_warehouse.base import BaseConnector
from data_warehouse.models import init_db, get_engine, EmissionData
from data_warehouse.loader import DataLoader
from sqlalchemy.orm import Session
from sqlalchemy import select

# 1. Mock Connector for demonstration
class MockConnector(BaseConnector):
    def connect(self): pass
    def list_files(self, prefix=None):
        return [{'id': 'mock_emissions.csv', 'name': 'mock_emissions.csv'}]
    def download_file(self, file_id, dest_path): return dest_path
    def load_as_dataframe(self, file_id):
        return pd.DataFrame([
            {'scope': 1, 'category': 'Natural gas', 'value': 1200.5, 'confidence': 0.95},
            {'scope': 2, 'category': 'Electricity', 'value': 850.0, 'confidence': 0.88},
            {'scope': 3, 'category': 'Business Travel', 'value': 340.2, 'confidence': 0.75},
        ])

def run_verification():
    print("--- Starting ESG Data Warehouse Verification ---")

    # Initialize DB
    engine = get_engine("sqlite:///test_esg.db")
    init_db(engine)
    print("Database initialized.")

    # Create loader and connector
    loader = DataLoader(engine)
    mock_conn = MockConnector()

    # Load data
    print("Loading data from mock connector...")
    loader.load_emissions_from_file(
        mock_conn,
        "mock_emissions.csv",
        company_id="Northwind-Holdings",
        period="FY2025"
    )

    # Verify data in DB
    with Session(engine) as session:
        statement = select(EmissionData).where(EmissionData.company_id == "Northwind-Holdings")
        results = session.execute(statement).scalars().all()

        print(f"\nVerification Results (found {len(results)} records):")
        for record in results:
            print(f"- Scope {record.scope}: {record.category} | {record.co2_equivalent} {record.unit} (Conf: {record.confidence_score})")

if __name__ == "__main__":
    run_verification()
