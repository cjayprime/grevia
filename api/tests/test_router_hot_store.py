"""Integration tests for /api/v1/hot-store."""
import io
import pytest
from unittest.mock import patch, MagicMock

from models.hot_store import HotStore, FileType, Category, Status


def _seed_doc(db_session, company, **kwargs):
    defaults = dict(
        company_id=company.company_id,
        file_name="report.pdf",
        original_filename="Annual Report.pdf",
        file_type=FileType.PDF,
        file_path="fake/path/report.pdf",
        file_size=2048,
        category=Category.REPORT,
        chunks="[]",
        status=Status.READY,
    )
    defaults.update(kwargs)
    doc = HotStore(**defaults)
    db_session.add(doc)
    db_session.commit()
    db_session.refresh(doc)
    return doc


class TestListDocuments:
    def test_empty(self, client, auth_headers):
        r = client.get("/api/v1/hot-store/documents?is_hot_report=false", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["documents"] == []

    def test_returns_documents(self, client, db_session, company, auth_headers):
        _seed_doc(db_session, company)
        r = client.get("/api/v1/hot-store/documents", headers=auth_headers)
        assert r.json()["total"] >= 1

    def test_deleted_docs_excluded(self, client, db_session, company, auth_headers):
        _seed_doc(db_session, company, deleted=True)
        r = client.get("/api/v1/hot-store/documents", headers=auth_headers)
        # deleted docs should not appear
        for doc in r.json()["documents"]:
            assert not doc.get("deleted", False)

    def test_filter_by_category(self, client, db_session, company, auth_headers):
        _seed_doc(db_session, company, category=Category.FINANCIAL)
        _seed_doc(db_session, company, category=Category.POLICY)
        r = client.get("/api/v1/hot-store/documents?category=financial", headers=auth_headers)
        docs = r.json()["documents"]
        assert all(d["category"] == "financial" for d in docs)

    def test_filter_is_hot_report(self, client, db_session, company, auth_headers):
        _seed_doc(db_session, company, is_hot_report=True)
        _seed_doc(db_session, company, is_hot_report=False)
        r = client.get("/api/v1/hot-store/documents?is_hot_report=true", headers=auth_headers)
        docs = r.json()["documents"]
        assert all(d["is_hot_report"] for d in docs)

    def test_pagination(self, client, db_session, company, auth_headers):
        for i in range(5):
            _seed_doc(db_session, company, file_name=f"file{i}.pdf")
        r = client.get("/api/v1/hot-store/documents?page=1&limit=2", headers=auth_headers)
        assert len(r.json()["documents"]) == 2

    def test_no_auth_403(self, client):
        r = client.get("/api/v1/hot-store/documents")
        assert r.status_code == 403


class TestDeleteDocument:
    def test_soft_delete(self, client, db_session, company, auth_headers):
        doc = _seed_doc(db_session, company)
        with patch("routers.hot_store.delete_file"):
            r = client.delete(
                f"/api/v1/hot-store/documents/{doc.hot_store_id}",
                headers=auth_headers,
            )
        assert r.status_code == 200
        assert r.json()["deleted"] is True
        db_session.refresh(doc)
        assert doc.deleted is True

    def test_delete_nonexistent_404(self, client, auth_headers):
        r = client.delete("/api/v1/hot-store/documents/99999", headers=auth_headers)
        assert r.status_code == 404


class TestPreviewDocument:
    def test_pdf_preview(self, client, db_session, company, auth_headers):
        doc = _seed_doc(db_session, company, file_type=FileType.PDF)
        r = client.get(
            f"/api/v1/hot-store/documents/{doc.hot_store_id}/preview",
            headers=auth_headers,
        )
        assert r.status_code == 200
        assert r.json()["type"] == "pdf"

    def test_txt_preview(self, client, db_session, company, auth_headers):
        doc = _seed_doc(
            db_session, company,
            file_type=FileType.TXT,
            file_name="notes.txt",
            original_filename="notes.txt",
        )
        with patch("routers.hot_store.download_file", return_value=b"hello text"):
            with patch("routers.hot_store.extract_text", return_value="hello text"):
                r = client.get(
                    f"/api/v1/hot-store/documents/{doc.hot_store_id}/preview",
                    headers=auth_headers,
                )
        assert r.status_code == 200
        assert r.json()["type"] == "text"
        assert r.json()["data"] == "hello text"

    def test_html_report_preview(self, client, db_session, company, auth_headers):
        doc = _seed_doc(
            db_session, company,
            is_hot_report=True,
            file_name="report.html",
            original_filename="report.html",
            file_type=FileType.OTHER,
        )
        html_bytes = b"<html><body>Report</body></html>"
        with patch("routers.hot_store.download_file", return_value=html_bytes):
            r = client.get(
                f"/api/v1/hot-store/documents/{doc.hot_store_id}/preview",
                headers=auth_headers,
            )
        assert r.status_code == 200
        assert r.json()["type"] == "html"
        assert "Report" in r.json()["data"]

    def test_preview_nonexistent_404(self, client, auth_headers):
        r = client.get("/api/v1/hot-store/documents/99999/preview", headers=auth_headers)
        assert r.status_code == 404


class TestUploadDocument:
    def test_upload_txt(self, client, company, auth_headers):
        with patch("routers.hot_store.upload_file", return_value="fake/path/file.txt"):
            r = client.post(
                "/api/v1/hot-store/upload",
                files={"file": ("notes.txt", io.BytesIO(b"hello world"), "text/plain")},
                data={"category": "other"},
                headers=auth_headers,
            )
        assert r.status_code == 200
        assert r.json()["original_filename"] == "notes.txt"
        assert r.json()["chunks"] == "[]"

    def test_upload_unsupported_type_400(self, client, auth_headers):
        r = client.post(
            "/api/v1/hot-store/upload",
            files={"file": ("malware.exe", io.BytesIO(b"\x00"), "application/octet-stream")},
            data={"category": "other"},
            headers=auth_headers,
        )
        assert r.status_code == 400


class TestHotReport:
    @patch("routers.hot_store.upload_file", return_value="fake/path/report.html")
    @patch("routers.hot_store.chat", return_value="<html><body>Report</body></html>")
    def test_generate_report(self, mock_chat, mock_upload, client, db_session, company, auth_headers):
        doc = _seed_doc(db_session, company, chunks='[{"text": "emissions data", "index": 0}]')
        r = client.post(
            "/api/v1/hot-store/hot-reports",
            json={
                "company_id": company.company_id,
                "prompt": "Summarise our emissions",
                "hot_store_ids": [doc.hot_store_id],
            },
            headers=auth_headers,
        )
        assert r.status_code == 200
        assert r.json()["is_hot_report"] is True

    def test_content_too_long_400(self, client, db_session, company, auth_headers):
        long_text = "x" * 6000
        doc = _seed_doc(
            db_session, company,
            chunks=f'[{{"text": "{long_text}", "index": 0}}]',
        )
        r = client.post(
            "/api/v1/hot-store/hot-reports",
            json={
                "company_id": company.company_id,
                "prompt": "Generate report",
                "hot_store_ids": [doc.hot_store_id],
            },
            headers=auth_headers,
        )
        assert r.status_code == 400
        assert "too long" in r.json()["detail"].lower()

    def test_missing_prompt_422(self, client, db_session, company, auth_headers):
        doc = _seed_doc(db_session, company)
        r = client.post(
            "/api/v1/hot-store/hot-reports",
            json={"company_id": company.company_id, "prompt": "", "hot_store_ids": [doc.hot_store_id]},
            headers=auth_headers,
        )
        assert r.status_code == 422
