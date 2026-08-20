import type { APIRoute } from "astro";

export const prerender = false;

const TIMEOUT_MS = 8_000;

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function healthEndpoint(baseUrl: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  return normalized.endsWith("/health") ? normalized : `${normalized}/health`;
}

export const GET: APIRoute = async () => {
  const backendUrl = String(
    import.meta.env.ASGARDIAN_BACKEND_URL ||
      import.meta.env.PUBLIC_ASGARDIAN_API_URL ||
      "",
  ).trim();

  if (!backendUrl) {
    return json({
      frontend: { status: "operational", platform: "Wix Managed Headless" },
      backend: { status: "not_configured" },
      checkedAt: new Date().toISOString(),
    }, 503);
  }

  const startedAt = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(healthEndpoint(backendUrl), {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const backendPayload = (await response.json().catch(() => null)) as
      | Record<string, unknown>
      | null;

    return json({
      frontend: { status: "operational", platform: "Wix Managed Headless" },
      backend: {
        status: response.ok ? "operational" : "degraded",
        httpStatus: response.status,
        database: backendPayload?.veritabani ?? "unknown",
        databaseType: backendPayload?.veritabani_turu ?? "unknown",
        artificialIntelligence: backendPayload?.yapay_zeka ?? "unknown",
        aiProvider: backendPayload?.yapay_zeka_saglayici ?? "unknown",
        aiModel: backendPayload?.yapay_zeka_modeli ?? "unknown",
        latencyMs: Math.round(performance.now() - startedAt),
      },
      checkedAt: new Date().toISOString(),
    }, response.ok ? 200 : 503);
  } catch {
    return json({
      frontend: { status: "operational", platform: "Wix Managed Headless" },
      backend: {
        status: "unreachable",
        latencyMs: Math.round(performance.now() - startedAt),
      },
      checkedAt: new Date().toISOString(),
    }, 503);
  } finally {
    clearTimeout(timeout);
  }
};
