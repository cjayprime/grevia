"""Integration tests for /api/v1/policy."""
import pytest
from unittest.mock import patch

from models.policy_item import PolicyItem, MdrType, KanbanColumn, Priority


def _seed_policy(db_session, company, **kwargs):
    defaults = dict(
        company_id=company.company_id,
        title="Net Zero by 2040",
        description="Reduce all emissions to net zero.",
        esrs_reference="ESRS E1-2",
        mdr_type=MdrType.MDR_P,
        kanban_column=KanbanColumn.POLICY_DEFINED,
        priority=Priority.HIGH,
    )
    defaults.update(kwargs)
    item = PolicyItem(**defaults)
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)
    return item


class TestListPolicies:
    def test_empty_board(self, client, auth_headers):
        r = client.get("/api/v1/policy", headers=auth_headers)
        assert r.status_code == 200
        body = r.json()
        assert all(isinstance(body[col], list) for col in [
            "policy_defined", "action_planned", "action_implemented",
            "action_progress", "action_blocked", "outcome_verified"
        ])

    def test_seeded_policy_appears_in_correct_column(self, client, db_session, company, auth_headers):
        _seed_policy(db_session, company, kanban_column=KanbanColumn.ACTION_PLANNED)
        r = client.get("/api/v1/policy", headers=auth_headers)
        assert len(r.json()["action_planned"]) == 1
        assert r.json()["policy_defined"] == []

    def test_no_auth_403(self, client):
        r = client.get("/api/v1/policy")
        assert r.status_code == 403


class TestCreatePolicy:
    def test_create_success(self, client, company, auth_headers):
        r = client.post("/api/v1/policy", json={
            "company_id": company.company_id,
            "title": "Climate Action Policy",
            "description": "We commit to reducing emissions.",
            "esrs_reference": "ESRS E1-1",
            "mdr_type": "MDR-P",
            "kanban_column": "policy_defined",
            "priority": "critical",
        }, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["title"] == "Climate Action Policy"
        assert r.json()["priority"] == "critical"

    def test_missing_required_field_422(self, client, auth_headers):
        r = client.post("/api/v1/policy", json={
            "company_id": 1,
            # missing title
            "mdr_type": "MDR-P",
            "kanban_column": "policy_defined",
            "priority": "high",
        }, headers=auth_headers)
        assert r.status_code == 422


class TestMovePolicy:
    def test_move_to_new_column(self, client, db_session, company, auth_headers):
        policy = _seed_policy(db_session, company, kanban_column=KanbanColumn.POLICY_DEFINED)
        r = client.patch(
            f"/api/v1/policy/{policy.policy_item_id}/move",
            json={"column": "action_planned"},
            headers=auth_headers,
        )
        assert r.status_code == 200
        assert r.json()["kanban_column"] == "action_planned"

    def test_move_nonexistent_404(self, client, auth_headers):
        r = client.patch(
            "/api/v1/policy/99999/move",
            json={"column": "action_planned"},
            headers=auth_headers,
        )
        assert r.status_code == 404


class TestUpdatePolicy:
    def test_update_title(self, client, db_session, company, auth_headers):
        policy = _seed_policy(db_session, company)
        r = client.put(
            f"/api/v1/policy/{policy.policy_item_id}",
            json={"title": "Updated Title"},
            headers=auth_headers,
        )
        assert r.status_code == 200
        assert r.json()["title"] == "Updated Title"

    def test_update_priority(self, client, db_session, company, auth_headers):
        policy = _seed_policy(db_session, company)
        r = client.put(
            f"/api/v1/policy/{policy.policy_item_id}",
            json={"priority": "low"},
            headers=auth_headers,
        )
        assert r.status_code == 200
        assert r.json()["priority"] == "low"

    def test_update_nonexistent_404(self, client, auth_headers):
        r = client.put(
            "/api/v1/policy/99999",
            json={"title": "X"},
            headers=auth_headers,
        )
        assert r.status_code == 404


class TestDeletePolicy:
    def test_delete_success(self, client, db_session, company, auth_headers):
        policy = _seed_policy(db_session, company)
        r = client.delete(
            f"/api/v1/policy/{policy.policy_item_id}",
            headers=auth_headers,
        )
        assert r.status_code == 200
        assert r.json()["deleted"] == policy.policy_item_id

    def test_delete_nonexistent_404(self, client, auth_headers):
        r = client.delete("/api/v1/policy/99999", headers=auth_headers)
        assert r.status_code == 404


class TestExtractPolicies:
    @patch("routers.policy.chat")
    def test_extract_creates_policies(self, mock_chat, client, db_session, company, auth_headers):
        from schemas.policy import ExtractionResult, ExtractedPolicySchema
        from models.hot_store import HotStore, FileType, Category, Status

        mock_chat.return_value = ExtractionResult(items=[
            ExtractedPolicySchema(
                title="Carbon Neutrality Policy",
                description="Achieve carbon neutrality by 2035.",
                esrs_reference="ESRS E1-1",
                mdr_type="MDR-P",
                kanban_column="policy_defined",
                priority="critical",
            )
        ])

        doc = HotStore(
            company_id=company.company_id,
            file_name="policy.pdf",
            original_filename="policy.pdf",
            file_type=FileType.PDF,
            file_path="fake/path/policy.pdf",
            file_size=512,
            category=Category.POLICY,
            chunks='[{"text": "carbon neutrality commitment", "index": 0}]',
            status=Status.READY,
        )
        db_session.add(doc)
        db_session.commit()
        db_session.refresh(doc)

        r = client.post(
            "/api/v1/policy/extract",
            json={"company_id": company.company_id, "hot_store_ids": [doc.hot_store_id]},
            headers=auth_headers,
        )
        assert r.status_code == 200
        assert len(r.json()) == 1
        assert r.json()[0]["title"] == "Carbon Neutrality Policy"

    def test_extract_no_docs_400(self, client, auth_headers):
        r = client.post(
            "/api/v1/policy/extract",
            json={"company_id": 1, "hot_store_ids": [99999]},
            headers=auth_headers,
        )
        assert r.status_code == 400
