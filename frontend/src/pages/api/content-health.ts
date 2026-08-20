import type { APIRoute } from 'astro';
import * as wixDataItems from '@wix/wix-data-items-sdk';
import { auth } from '@wix/essentials';

export const prerender = false;

const COLLECTIONS = [
  ['SiteSettings', 20],
  ['PageSections', 200],
  ['ContentItems', 500],
  ['PageSEO', 100],
] as const;

function response(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export const GET: APIRoute = async () => {
  const startedAt = performance.now();
  try {
    const elevatedQuery = auth.elevate(wixDataItems.query);
    const results = await Promise.all(
      COLLECTIONS.map(async ([collectionId, limit]) => {
        const result = await elevatedQuery(collectionId).limit(limit).find();
        return { collectionId, items: result.items ?? [] };
      }),
    );

    const locales = { en: 0, tr: 0 };
    for (const result of results) {
      for (const item of result.items as Array<Record<string, unknown>>) {
        if (item.locale === 'en') locales.en += 1;
        if (item.locale === 'tr') locales.tr += 1;
      }
    }

    return response({
      status: 'operational',
      latencyMs: Math.round(performance.now() - startedAt),
      totalItems: results.reduce((total, result) => total + result.items.length, 0),
      collections: Object.fromEntries(results.map((result) => [result.collectionId, result.items.length])),
      locales,
      checkedAt: new Date().toISOString(),
    });
  } catch {
    return response({
      status: 'unreachable',
      latencyMs: Math.round(performance.now() - startedAt),
      checkedAt: new Date().toISOString(),
    }, 503);
  }
};
