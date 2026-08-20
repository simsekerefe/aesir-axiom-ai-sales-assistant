import type { APIRoute } from 'astro';

export const prerender = false;

const ROUTES = [
  '/',
  '/about',
  '/faq',
  '/contact',
  '/privacy',
  '/terms',
  '/tr/',
  '/tr/about',
  '/tr/faq',
  '/tr/contact',
  '/tr/privacy',
  '/tr/terms',
];

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const GET: APIRoute = ({ url }) => {
  const urls = ROUTES.map((route) => `  <url><loc>${escapeXml(new URL(route, url.origin).href)}</loc></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
