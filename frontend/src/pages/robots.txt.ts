import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = ({ url }) => {
  const origin = url.origin;
  return new Response([
    'User-agent: *',
    'Allow: /',
    'Disallow: /technical-dossier',
    'Disallow: /api/',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
