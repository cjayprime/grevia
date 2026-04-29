"""Unit tests for Pydantic schemas — no database, no HTTP."""
import pytest
from pydantic import ValidationError

from schemas.auth import SignupRequest, SigninRequest, ResetPasswordRequest
from schemas.emissions import (
    AnalyzeEmissionsRequest,
    UpdateEmissionRequest,
    EmissionSchema,
)
from schemas.hot_store import HotReportRequest
from schemas.policy import ExtractPoliciesRequest


# ── Auth schemas ──────────────────────────────────────────────────────────────

class TestSignupRequest:
    def _valid(self, **overrides):
        data = {"name": "Acme Corp", "email": "ceo@acme.com", "password": "secure99"}
        data.update(overrides)
        return SignupRequest(**data)

    def test_valid(self):
        r = self._valid()
        assert r.email == "ceo@acme.com"

    def test_email_is_lowercased(self):
        r = self._valid(email="CEO@ACME.COM")
        assert r.email == "ceo@acme.com"

    def test_name_stripped(self):
        r = self._valid(name="  Acme  ")
        assert r.name == "Acme"

    def test_blank_name_raises(self):
        with pytest.raises(ValidationError):
            self._valid(name="   ")

    def test_invalid_email_raises(self):
        with pytest.raises(ValidationError):
            self._valid(email="notanemail")

    def test_short_password_raises(self):
        with pytest.raises(ValidationError):
            self._valid(password="short")

    def test_password_exactly_8_chars_ok(self):
        r = self._valid(password="12345678")
        assert r.password == "12345678"


class TestResetPasswordRequest:
    def test_short_password_raises(self):
        with pytest.raises(ValidationError):
            ResetPasswordRequest(token="tok", password="bad")

    def test_valid(self):
        r = ResetPasswordRequest(token="tok", password="newpassword")
        assert r.token == "tok"


# ── Emissions schemas ─────────────────────────────────────────────────────────

class TestAnalyzeEmissionsRequest:
    def test_valid(self):
        r = AnalyzeEmissionsRequest(hot_store_ids=[1, 2, 3])
        assert r.hot_store_ids == [1, 2, 3]

    def test_empty_list_raises(self):
        with pytest.raises(ValidationError):
            AnalyzeEmissionsRequest(hot_store_ids=[])

    def test_negative_id_raises(self):
        with pytest.raises(ValidationError):
            AnalyzeEmissionsRequest(hot_store_ids=[-1])

    def test_zero_id_raises(self):
        with pytest.raises(ValidationError):
            AnalyzeEmissionsRequest(hot_store_ids=[0])


class TestUpdateEmissionRequest:
    def test_valid_scope(self):
        r = UpdateEmissionRequest(scope=2)
        assert r.scope == 2

    def test_invalid_scope_raises(self):
        with pytest.raises(ValidationError):
            UpdateEmissionRequest(scope=4)

    def test_negative_tco2e_raises(self):
        with pytest.raises(ValidationError):
            UpdateEmissionRequest(tco2e=-1.0)

    def test_zero_tco2e_ok(self):
        r = UpdateEmissionRequest(tco2e=0.0)
        assert r.tco2e == 0.0

    def test_percentage_out_of_range_raises(self):
        with pytest.raises(ValidationError):
            UpdateEmissionRequest(percentage_of_total=101.0)

    def test_year_out_of_range_raises(self):
        with pytest.raises(ValidationError):
            UpdateEmissionRequest(year=1999)

    def test_valid_year(self):
        r = UpdateEmissionRequest(year=2024)
        assert r.year == 2024

    def test_all_none_is_valid(self):
        r = UpdateEmissionRequest()
        assert r.scope is None


class TestEmissionSchema:
    def _valid(self, **overrides):
        data = {
            "scope": 1,
            "category": "Stationary combustion",
            "confidence": "high",
            "status": "ok",
        }
        data.update(overrides)
        return EmissionSchema(**data)

    def test_valid(self):
        e = self._valid()
        assert e.scope == 1

    def test_invalid_confidence_raises(self):
        with pytest.raises(ValidationError):
            self._valid(confidence="very_high")

    def test_invalid_status_raises(self):
        with pytest.raises(ValidationError):
            self._valid(status="unknown")

    def test_null_tco2e_allowed(self):
        e = self._valid(tco2e=None)
        assert e.tco2e is None


# ── HotStore schemas ──────────────────────────────────────────────────────────

class TestHotReportRequest:
    def test_valid(self):
        r = HotReportRequest(
            company_id=1, prompt="Summarise emissions", hot_store_ids=[1, 2]
        )
        assert r.prompt == "Summarise emissions"

    def test_empty_prompt_raises(self):
        with pytest.raises(ValidationError):
            HotReportRequest(company_id=1, prompt="", hot_store_ids=[1])

    def test_empty_ids_raises(self):
        with pytest.raises(ValidationError):
            HotReportRequest(company_id=1, prompt="Test", hot_store_ids=[])


# ── Policy schemas ────────────────────────────────────────────────────────────

class TestExtractPoliciesRequest:
    def test_valid(self):
        r = ExtractPoliciesRequest(company_id=1, hot_store_ids=[5, 6])
        assert len(r.hot_store_ids) == 2

    def test_empty_ids_raises(self):
        with pytest.raises(ValidationError):
            ExtractPoliciesRequest(company_id=1, hot_store_ids=[])
