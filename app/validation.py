"""Boundary validation for public API payloads.

Routes own HTTP coordination; these helpers keep repeated input rules explicit,
testable, and independent from the database and AI provider layers.
"""


MAX_MESSAGE_LENGTH = 2_000
MAX_HISTORY_ITEMS = 12
MAX_NAME_LENGTH = 120
MAX_PHONE_LENGTH = 40
MAX_LEAD_MESSAGE_LENGTH = 6_000


class ValidationError(ValueError):
    """Represent a client-correctable request validation failure."""


def required_text(value, label, max_length):
    if not isinstance(value, str) or not value.strip():
        raise ValidationError(f"{label} zorunludur.")
    normalized = value.strip()
    if len(normalized) > max_length:
        raise ValidationError(
            f"{label} en fazla {max_length} karakter olabilir."
        )
    return normalized


def optional_text(value, label, max_length):
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValidationError(f"{label} metin olmalıdır.")
    normalized = value.strip()
    if len(normalized) > max_length:
        raise ValidationError(
            f"{label} en fazla {max_length} karakter olabilir."
        )
    return normalized or None


def locale(value):
    if value is None:
        return "tr"
    if value not in {"tr", "en"}:
        raise ValidationError("Dil yalnızca 'tr' veya 'en' olabilir.")
    return value


def chat_history(value):
    if value is None:
        return []
    if not isinstance(value, list):
        raise ValidationError("Sohbet geçmişi liste olmalıdır.")
    if len(value) > MAX_HISTORY_ITEMS:
        raise ValidationError(
            f"Sohbet geçmişi en fazla {MAX_HISTORY_ITEMS} kayıt içerebilir."
        )

    normalized = []
    for entry in value:
        if not isinstance(entry, dict):
            raise ValidationError("Sohbet geçmişi kayıtları nesne olmalıdır.")
        role = entry.get("role")
        content = entry.get("content")
        if role not in {"user", "assistant"}:
            raise ValidationError("Sohbet geçmişi rolü geçersizdir.")
        normalized.append(
            {
                "role": role,
                "content": required_text(
                    content,
                    "Sohbet geçmişi içeriği",
                    MAX_MESSAGE_LENGTH,
                ),
            }
        )
    return normalized
