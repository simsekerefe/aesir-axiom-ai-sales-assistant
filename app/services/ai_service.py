import requests
from flask import current_app


class AIServiceError(Exception):
    """Represent failures inside the AI service layer."""


class AIService:
    GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
    MODEL = "llama-3.1-8b-instant"
    TIMEOUT = 30

    def yanit_uret(self, mesaj, gecmis=None):
        provider = str(
            current_app.config.get("AI_PROVIDER", "groq")
        ).strip().lower()
        if provider != "groq":
            raise AIServiceError("Desteklenmeyen yapay zeka sağlayıcısı.")

        api_key = str(current_app.config.get("GROQ_API_KEY", "")).strip()
        if not api_key:
            return (
                "AXIOM şu anda demo modunda çalışıyor. "
                "Yapay zekâ hizmetini etkinleştirmek için Groq API anahtarı "
                "yapılandırılmalıdır."
            )

        messages = self._build_messages(mesaj, gecmis)
        return self._call_groq(api_key, messages)

    def _get_system_prompt(self):
        prompt = current_app.config.get("BUSINESS_CONTEXT", "")
        if not isinstance(prompt, str) or not prompt.strip():
            raise AIServiceError(
                "Yapay zeka sistem talimatı yapılandırılmamış."
            )
        return prompt.strip()

    def _build_messages(self, mesaj, gecmis):
        if not isinstance(mesaj, str) or not mesaj.strip():
            raise AIServiceError("Kullanıcı mesajı boş olamaz.")

        if gecmis is None:
            gecmis = []
        if not isinstance(gecmis, list):
            raise AIServiceError("Sohbet geçmişi liste olmalıdır.")

        messages = [
            {"role": "system", "content": self._get_system_prompt()}
        ]

        # Clearly malformed history entries are ignored.
        for entry in gecmis:
            if not isinstance(entry, dict):
                continue

            role = entry.get("role")
            content = entry.get("content")
            if (
                role in {"user", "assistant"}
                and isinstance(content, str)
                and content.strip()
            ):
                messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": mesaj})
        return messages

    def _call_groq(self, api_key, messages):
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.MODEL,
            "messages": messages,
            "temperature": 0.3,
        }

        try:
            response = requests.post(
                self.GROQ_ENDPOINT,
                headers=headers,
                json=payload,
                timeout=self.TIMEOUT,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            raise AIServiceError(
                "Yapay zeka hizmetine şu anda ulaşılamıyor."
            ) from exc

        try:
            data = response.json()
        except ValueError as exc:
            raise AIServiceError(
                "Yapay zeka hizmetinden geçersiz yanıt alındı."
            ) from exc

        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise AIServiceError(
                "Yapay zeka yanıtı beklenen biçimde değil."
            ) from exc

        if not isinstance(content, str) or not content.strip():
            raise AIServiceError("Yapay zeka hizmeti boş yanıt döndürdü.")

        return content.strip()


ai_service = AIService()
