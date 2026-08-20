import type { APIRoute } from "astro";

export const prerender = false;

interface HistoryEntry {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  mesaj?: unknown;
  gecmis?: unknown;
  dil?: unknown;
}

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_ITEMS = 12;

function json(payload: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function normalizeEndpoint(baseUrl: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  return normalized.endsWith("/api/sohbet")
    ? normalized
    : `${normalized}/api/sohbet`;
}

function normalizeHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (entry): entry is HistoryEntry =>
        Boolean(entry) &&
        typeof entry === "object" &&
        ((entry as HistoryEntry).role === "user" ||
          (entry as HistoryEntry).role === "assistant") &&
        typeof (entry as HistoryEntry).content === "string" &&
        Boolean((entry as HistoryEntry).content.trim()),
    )
    .slice(-MAX_HISTORY_ITEMS)
    .map((entry) => ({
      role: entry.role,
      content: entry.content.trim().slice(0, MAX_MESSAGE_LENGTH),
    }));
}

export const POST: APIRoute = async ({ request }) => {
  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return json({ basari: false, hata: "A valid JSON request is required." }, 400);
  }

  const locale = body.dil === "tr" ? "tr" : "en";
  const copy = locale === "tr"
    ? {
        required: "Lütfen bir mesaj girin.",
        tooLong: `Mesajlar en fazla ${MAX_MESSAGE_LENGTH} karakter olabilir.`,
        disconnected: "ASGARDIAN arayüzü çevrimiçi ancak yapay zekâ hizmeti henüz bağlanmadı.",
        invalidResponse: "ASGARDIAN yapay zekâ hizmetinden geçersiz bir yanıt aldı.",
        unavailable: "ASGARDIAN şu anda yapay zekâ hizmetine ulaşamıyor.",
      }
    : {
        required: "Please enter a message.",
        tooLong: `Messages are limited to ${MAX_MESSAGE_LENGTH} characters.`,
        disconnected: "ASGARDIAN’s interface is online, but its AI backend deployment has not been connected yet.",
        invalidResponse: "ASGARDIAN received an invalid backend response.",
        unavailable: "ASGARDIAN cannot reach the AI service at the moment.",
      };

  if (typeof body.mesaj !== "string" || !body.mesaj.trim()) {
    return json({ basari: false, hata: copy.required }, 400);
  }

  const message = body.mesaj.trim();
  if (message.length > MAX_MESSAGE_LENGTH) {
    return json(
      {
        basari: false,
        hata: copy.tooLong,
      },
      400,
    );
  }

  const backendUrl = String(
    import.meta.env.ASGARDIAN_BACKEND_URL ||
      import.meta.env.PUBLIC_ASGARDIAN_API_URL ||
      "",
  ).trim();

  if (!backendUrl) {
    return json(
      {
        basari: false,
        hata: copy.disconnected,
      },
      503,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35_000);

  try {
    const upstream = await fetch(normalizeEndpoint(backendUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        mesaj: message,
        gecmis: normalizeHistory(body.gecmis),
        dil: locale,
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

    if (!upstream.ok || data.basari === false) {
      return json(
        { basari: false, hata: copy.unavailable },
        upstream.status >= 400 ? upstream.status : 502,
      );
    }

    return json(data, upstream.status);
  } catch {
    return json(
      {
        basari: false,
        hata: copy.unavailable,
      },
      503,
    );
  } finally {
    clearTimeout(timeout);
  }
};
