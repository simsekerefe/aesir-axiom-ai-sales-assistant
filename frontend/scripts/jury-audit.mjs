import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function sourceFiles(path, output = []) {
  const absolute = join(root, path);
  for (const entry of readdirSync(absolute)) {
    const item = join(absolute, entry);
    if (statSync(item).isDirectory()) sourceFiles(relative(root, item), output);
    else if (/\.(astro|tsx?|css|mjs|md|json)$/.test(entry)) output.push(item);
  }
  return output;
}

const required = [
  "src/pages/index.astro",
  "src/pages/tr/index.astro",
  "src/pages/api/asgardian.ts",
  "src/pages/api/leads.ts",
  "src/pages/api/system-health.ts",
  "src/pages/api/content-health.ts",
  "src/pages/robots.txt.ts",
  "src/pages/sitemap.xml.ts",
  "src/components/AsgardianChat.tsx",
  "src/pages/technical-dossier.astro",
  "docs/ARCHITECTURE.md",
  "docs/FRONTEND.md",
  "docs/CMS.md",
  "docs/DESIGN_SYSTEM.md",
  "docs/JURY_DEMO.md",
];

const packageJson = JSON.parse(read("package.json"));
const globalCss = read("src/styles/global.css");
const layout = read("src/layouts/Layout.astro");
const allSource = sourceFiles("src").map((file) => readFileSync(file, "utf8")).join("\n");

const checks = [
  ["Kurumsal paket adı", packageJson.name === "aesir-axiom-corporate-site"],
  ["Zorunlu teknik dosyalar", required.every((path) => existsSync(join(root, path)))],
  ["İngilizce ve Türkçe rotalar", ["index.astro", "about.astro", "faq.astro", "contact.astro", "privacy.astro", "terms.astro"].every((route) => existsSync(join(root, "src/pages", route)) && existsSync(join(root, "src/pages/tr", route)))],
  ["Wix CMS içerik katmanı", allSource.includes('getPageContent') && allSource.includes('PageSections') && allSource.includes('ContentItems')],
  ["CMS health kanıtı", allSource.includes('/api/content-health')],
  ["SEO robots + sitemap", allSource.includes('Sitemap:') && allSource.includes('sitemaps.org/schemas/sitemap')],
  ["ASGARDIAN frontend proxy", allSource.includes('/api/asgardian') && allSource.includes('ASGARDIAN_BACKEND_URL')],
  ["Lead frontend proxy", allSource.includes('/api/leads') && allSource.includes('submitLead')],
  ["Merkezi marka renkleri", ["#0F141D", "#1E3A4D", "#6E7D8A", "#D4AF37", "#F5F7FA"].every((token) => globalCss.includes(token))],
  ["Marcellus + Inter tipografi", globalCss.includes('"Marcellus"') && globalCss.includes('"Inter"')],
  ["Azaltılmış hareket desteği", globalCss.includes("prefers-reduced-motion")],
  ["Teknik dossier noindex desteği", layout.includes("noindex,nofollow") && allSource.includes('robots="noindex,nofollow"')],
  ["Şablon kalıntısı yok", !allSource.includes("Wix Astro Blank Template") && !allSource.includes("Composer skeleton")],
  ["Kaynak kodda Groq anahtarı yok", !/gsk_[A-Za-z0-9_-]{12,}/.test(allSource)],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failed += 1;
}

console.log(`\n${checks.length - failed}/${checks.length} kontrol başarılı.`);
if (failed) process.exit(1);
