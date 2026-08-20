import type { APIRoute } from "astro";

export const prerender = false;

type LeadSource = "contact" | "asgardian";

interface RequestBody {
  isim?: unknown;
  telefon?: unknown;
  mesaj?: unknown;
  kaynak?: unknown;
  dil?: unknown;
}

const LIMITS = {
  name: 120,
  phone: 40,
  message: 6000,
} as const;

function json(payload: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function normalizeEndpoint(baseUrl: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  return normalized.endsWith("/api/leads")
    ? normalized
    : `${normalized}/api/leads`;
}

function cleanString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isSupportedSource(value: unknown): value is LeadSource {
  return value === "contact" || value === "asgardian";
}

export const POST: APIRoute = async ({ request }) => {
  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return json({ basari: false, hata: "A valid JSON request is required." }, 400);
  }

  const name = cleanString(body.isim, LIMITS.name);
  const phone = cleanString(body.telefon, LIMITS.phone);
  const message = cleanString(body.mesaj, LIMITS.message);
  const locale = body.dil === "tr" ? "tr" : "en";
  const copy = locale === "tr"
    ? {
        required: "İsim ve telefon numarası zorunludur.",
        source: "Talep kaynağı geçersizdir.",
        disconnected: "Talep hizmeti henüz bağlanmadı.",
        invalidResponse: "Talep hizmeti geçersiz bir yanıt döndürdü.",
        unavailable: "Talep hizmetine şu anda ulaşılamıyor.",
      }
    : {
        required: "Name and phone number are required.",
        source: "The inquiry source is invalid.",
        disconnected: "The inquiry service has not been connected yet.",
        invalidResponse: "The inquiry service returned an invalid response.",
        unavailable: "The inquiry service is temporarily unavailable.",
      };

  if (!name || !phone) {
    return json(
      { basari: false, hata: copy.required },
      400,
    );
  }

  if (!isSupportedSource(body.kaynak)) {
    return json({ basari: false, hata: copy.source }, 400);
  }

  const backendUrl = String(
    import.meta.env.ASGARDIAN_BACKEND_URL ||
      import.meta.env.PUBLIC_ASGARDIAN_API_URL ||
      "",
  ).trim();

  if (!backendUrl) {
    return json(
      { basari: false, hata: copy.disconnected },
      503,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const upstream = await fetch(normalizeEndpoint(backendUrl), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        isim: name,
        telefon: phone,
        mesaj: [
          `[SOURCE / ${body.kaynak.toUpperCase()}]`,
          message,
        ].filter(Boolean).join("\n"),
      }),
      signal: controller.signal,
    });
    const data = (await upstream.json().catch(() => null)) as
      | Record<string, unknown>
      | null;

    if (!data) {
      return json(
        { basari: false, hata: copy.invalidResponse },
        502,
      );
    }

    return json(data, upstream.status);
  } catch {
    return json(
      { basari: false, hata: copy.unavailable },
      503,
    );
  } finally {
    clearTimeout(timeout);
  }
};
