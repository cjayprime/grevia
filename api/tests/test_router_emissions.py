"""Integration tests for /api/v1/emissions — mocks the AI chat call."""
import pytest
from unittest.mock import patch, MagicMock

from models.emission_record import EmissionRecord, EmissionConfidence, EmissionStatus


def _seed_record(db_session, company, **kwargs):
    defaults = dict(
        company_id=company.company_id,
        scope=1,
        category="Stationary combustion",
        tco2e=100.0,
        confidence=EmissionConfidence.HIGH,
        status=EmissionStatus.OK,
    )
    defaults.update(kwargs)
    rec = EmissionRecord(**defaults)
    db_session.add(rec)
    db_session.commit()
    db_session.refresh(rec)
    return rec


class TestListEmissions:
    def test_empty_list(self, client, auth_headers):
        r = client.get("/api/v1/emissions", headers=auth_headers)
        assert r.status_code == 200
        body = r.json()
        assert body["records"] == []
        assert body["total"] == 0

    def test_returns_own_records(self, client, db_session, company, auth_headers):
        _seed_record(db_session, company)
        r = client.get("/api/v1/emissions", headers=auth_headers)
        assert r.json()["total"] == 1

    def test_scope_filter(self, client, db_session, company, auth_headers):
        _seed_record(db_session, company, scope=1)
        _seed_record(db_session, company, scope=2)
        r = client.get("/api/v1/emissions?scope=1", headers=auth_headers)
        body = r.json()
        assert body["total"] == 1
        assert body["records"][0]["scope"] == 1

    def test_invalid_scope_400(self, client, auth_headers):
        r = client.get("/api/v1/emissions?scope=5", headers=auth_headers)
        assert r.status_code == 400

    def test_pagination(self, client, db_session, company, auth_headers):
        for i in range(5):
            _seed_record(db_session, company, category=f"Cat {i}")
        r = client.get("/api/v1/emissions?page=1&limit=2", headers=auth_headers)
        body = r.json()
        assert len(body["records"]) == 2
        assert body["total"] == 5

    def test_no_auth_403(self, client):
        r = client.get("/api/v1/emissions")
        assert r.status_code == 403

    def test_gap_records_sorted_last(self, client, db_session, company, auth_headers):
        _seed_record(db_session, company, scope=1, category="A", status=EmissionStatus.GAP)
        _seed_record(db_session, company, scope=1, category="B", status=EmissionStatus.OK)
        r = client.get("/api/v1/emissions", headers=auth_headers)
        records = r.json()["records"]
        statuses = [rec["status"] for rec in records]
        # OK should come before GAP
        assert statuses.index("ok") < statuses.index("gap")


class TestUpdateEmission:
    def test_update_category(self, client, db_session, company, auth_headers):
        rec = _seed_record(db_session, company)
        r = client.put(
            f"/api/v1/emissions/{rec.emission_record_id}",
            json={"category": "Mobile combustion"},
            headers=auth_headers,
        )
        assert r.status_code == 200
        assert r.json()["category"] == "Mobile combustion"

    def test_update_status(self, client, db_session, company, auth_headers):
        rec = _seed_record(db_session, company)
        r = client.put(
            f"/api/v1/emissions/{rec.emission_record_id}",
            json={"status": "gap"},
            headers=auth_headers,
        )
        assert r.status_code == 200
        assert r.json()["status"] == "gap"

    def test_update_nonexistent_404(self, client, auth_headers):
        r = client.put(
            "/api/v1/emissions/99999",
            json={"category": "X"},
            headers=auth_headers,
        )
        assert r.status_code == 404

    def test_invalid_scope_422(self, client, db_session, company, auth_headers):
        rec = _seed_record(db_session, company)
        r = client.put(
            f"/api/v1/emissions/{rec.emission_record_id}",
            json={"scope": 9},
            headers=auth_headers,
        )
        assert r.status_code == 422


class TestTimeline:
    def test_empty_timeline(self, client, auth_headers):
        r = client.get("/api/v1/emissions/timeline", headers=auth_headers)
        assert r.status_code == 200
        assert r.json() == []

    def test_timeline_aggregates_by_period(self, client, db_session, company, auth_headers):
        _seed_record(db_session, company, scope=1, tco2e=100.0, year=2024, period="Annual")
        _seed_record(db_session, company, scope=2, tco2e=50.0, year=2024, period="Annual")
        r = client.get("/api/v1/emissions/timeline", headers=auth_headers)
        body = r.json()
        assert len(body) == 1
        assert body[0]["scope1"] == 100.0
        assert body[0]["scope2"] == 50.0
        assert body[0]["scope3"] == 0.0


class TestAnalyzeEmissions:
    @patch("routers.emissions.chat")
    @patch("routers.emissions.download_file", return_value=b"sample text content")
    @patch("routers.emissions.extract_text", return_value="Sample emissions data")
    def test_analyze_creates_records(
        self, mock_extract, mock_download, mock_chat,
        client, db_session, company, auth_headers
    ):
        from schemas.emissions import AnalysisResult, EmissionSchema

        mock_chat.return_value = AnalysisResult(records=[
            EmissionSchema(
                scope=1,
                category="Stationary combustion",
                tco2e=500.0,
                confidence="high",
                status="ok",
                esrs_reference="ESRS E1-6",
                narrative="Direct fuel combustion.",
            )
        ])

        # Create a stub HotStore doc
        from models.hot_store import HotStore, FileType, Category, Status
        doc = HotStore(
            company_id=company.company_id,
            file_name="test.pdf",
            original_filename="test.pdf",
            file_type=FileType.PDF,
            file_path="fake/path/test.pdf",
            file_size=1024,
            category=Category.REPORT,
            chunks="[]",
            status=Status.READY,
        )
        db_session.add(doc)
        db_session.commit()
        db_session.refresh(doc)

        # Also seed workspace
        from models.workspace import Workspace
        ws = Workspace(company_id=company.company_id)
        db_session.add(ws)
        db_session.commit()
        db_session.refresh(ws)

        r = client.post(
            "/api/v1/emissions/analyze",
            json={"hot_store_ids": [doc.hot_store_id], "workspace_id": ws.workspace_id},
            headers=auth_headers,
        )
        assert r.status_code == 200
        records = r.json()
        assert len(records) == 1
        assert records[0]["scope"] == 1
        assert records[0]["tco2e"] == 500.0
