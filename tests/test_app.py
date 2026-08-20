import re
import tempfile
import unittest
from unittest.mock import Mock, patch

from app import create_app
from app.database import get_engine
from app.services.ai_service import AIServiceError, ai_service


class AsgardianApplicationTests(unittest.TestCase):
    def setUp(self):
        self.temp_directory = tempfile.TemporaryDirectory()
        database_path = f"{self.temp_directory.name}/test-leads.db"
        self.app = create_app(
            "development",
            {
                "TESTING": True,
                "SECRET_KEY": "test-only-secret",
                "DATABASE_URL": f"sqlite:///{database_path}",
                "GROQ_API_KEY": "",
                "ASGARDIAN_EMPLOYEE_USERNAME": "operator",
                "ASGARDIAN_EMPLOYEE_PASSWORD": "correct-horse",
                "SESSION_COOKIE_SECURE": False,
            },
        )
        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            get_engine().dispose()
        self.temp_directory.cleanup()

    def _csrf_token(self):
        response = self.client.get("/dashboard/login")
        self.assertEqual(response.status_code, 200)
        match = re.search(
            rb'name="csrf_token" value="([^"]+)"',
            response.data,
        )
        self.assertIsNotNone(match)
        return match.group(1).decode("utf-8")

    def _login(self):
        response = self.client.post(
            "/dashboard/login",
            data={
                "csrf_token": self._csrf_token(),
                "username": "operator",
                "password": "correct-horse",
            },
        )
        self.assertEqual(response.status_code, 302)

    def test_health_reports_database_and_safe_ai_configuration(self):
        response = self.client.get("/health")
        payload = response.get_json()

        self.assertEqual(response.status_code, 200)
        self.assertTrue(payload["basari"])
        self.assertEqual(payload["veritabani_turu"], "sqlite")
        self.assertEqual(payload["yapay_zeka"], "demo")
        self.assertEqual(payload["yapay_zeka_saglayici"], "groq")
        self.assertNotIn("api_key", payload)
        self.assertTrue(response.headers["X-Request-ID"])

    def test_chat_validates_json_message_history_and_language(self):
        self.assertEqual(self.client.post("/api/sohbet", data="invalid").status_code, 400)
        self.assertEqual(self.client.post("/api/sohbet", json={"mesaj": ""}).status_code, 400)
        invalid_history = self.client.post(
            "/api/sohbet",
            json={"mesaj": "Hello", "gecmis": "not-a-list"},
        )
        self.assertEqual(invalid_history.status_code, 400)

        with patch("app.routes.ai_service.yanit_uret", return_value="Ready") as mocked:
            response = self.client.post(
                "/api/sohbet",
                json={"mesaj": "  Hello  ", "gecmis": [], "dil": "en"},
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["cevap"], "Ready")
        mocked.assert_called_once_with("Hello", [], dil="en")

    def test_ai_provider_failure_becomes_safe_service_response(self):
        with patch(
            "app.routes.ai_service.yanit_uret",
            side_effect=AIServiceError("provider detail must stay private"),
        ):
            response = self.client.post(
                "/api/sohbet",
                json={"mesaj": "Bir sistem öner.", "gecmis": [], "dil": "tr"},
            )
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("provider detail", response.get_data(as_text=True))

    def test_ai_service_builds_model_payload_in_service_layer(self):
        provider_response = Mock()
        provider_response.raise_for_status.return_value = None
        provider_response.json.return_value = {
            "choices": [{"message": {"content": "Engineering response"}}]
        }
        with self.app.app_context():
            self.app.config.update(
                GROQ_API_KEY="test-provider-key",
                AI_MODEL="openai/gpt-oss-20b",
            )
            with patch(
                "app.services.ai_service.requests.post",
                return_value=provider_response,
            ) as provider_call:
                answer = ai_service.yanit_uret(
                    "Explain the system.",
                    [{"role": "assistant", "content": "Context"}],
                    dil="en",
                )

        self.assertEqual(answer, "Engineering response")
        request = provider_call.call_args.kwargs
        self.assertEqual(request["json"]["model"], "openai/gpt-oss-20b")
        self.assertIn("Respond in English", request["json"]["messages"][0]["content"])
        self.assertEqual(request["json"]["messages"][-1]["content"], "Explain the system.")
        self.assertEqual(request["timeout"], 30)

    def test_lead_is_persisted_with_bound_parameters(self):
        injection_text = "Robert'); DROP TABLE leads;--"
        first = self.client.post(
            "/api/leads",
            json={
                "isim": injection_text,
                "telefon": "+90 555 000 00 00",
                "mesaj": "Simulation project",
            },
        )
        second = self.client.post(
            "/api/leads",
            json={"isim": "Second lead", "telefon": "+90 555 000 00 01"},
        )
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)

        self._login()
        listing = self.client.get("/api/leads")
        payload = listing.get_json()
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(len(payload["leadler"]), 2)
        self.assertTrue(any(lead["isim"] == injection_text for lead in payload["leadler"]))

    def test_employee_dashboard_and_lead_api_require_login(self):
        dashboard = self.client.get("/dashboard")
        listing = self.client.get("/api/leads")
        self.assertEqual(dashboard.status_code, 302)
        self.assertIn("/dashboard/login", dashboard.headers["Location"])
        self.assertEqual(listing.status_code, 401)

    def test_login_csrf_session_and_csp(self):
        login_page = self.client.get("/dashboard/login")
        csp = login_page.headers["Content-Security-Policy"]
        nonce_match = re.search(r"'nonce-([^']+)'", csp)
        self.assertIsNotNone(nonce_match)
        self.assertIn(
            f'nonce="{nonce_match.group(1)}"',
            login_page.get_data(as_text=True),
        )

        rejected = self.client.post(
            "/dashboard/login",
            data={"username": "operator", "password": "correct-horse"},
        )
        self.assertEqual(rejected.status_code, 400)

        self._login()
        dashboard = self.client.get("/dashboard")
        self.assertEqual(dashboard.status_code, 200)
        self.assertIn("ASGARDIAN Control", dashboard.get_data(as_text=True))
        self.assertEqual(dashboard.headers["X-Frame-Options"], "DENY")

    def test_request_and_field_size_limits(self):
        oversized_field = self.client.post(
            "/api/leads",
            json={"isim": "A" * 121, "telefon": "123"},
        )
        self.assertEqual(oversized_field.status_code, 400)

        oversized_request = self.client.post(
            "/api/sohbet",
            data='{"mesaj":"' + ("A" * 70_000) + '"}',
            content_type="application/json",
        )
        self.assertEqual(oversized_request.status_code, 413)


if __name__ == "__main__":
    unittest.main()
