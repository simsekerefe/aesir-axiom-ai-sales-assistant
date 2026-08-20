import * as wixDataItems from "@wix/wix-data-items-sdk";
import { auth } from "@wix/essentials";

export type Locale = "en" | "tr";
type CmsRecord = Record<string, unknown> & { _id?: string };

export interface SiteSettings {
  brandName: string;
  brandIdentifier: string;
  slogan: string;
  contactLabel: string;
  contactHref: string;
  languageLabel: string;
  schemaVersion: string;
  emblem: unknown;
  logo: unknown;
}

export interface PageSeo {
  route: string;
  title: string;
  description: string;
  noIndex: boolean;
  ogImage: unknown;
}

export interface PageSection {
  id: string;
  pageKey: string;
  sectionKey: string;
  locale: Locale;
  eyebrow: string;
  title: string;
  titleSecond: string;
  body: string;
  bodySecondary: string;
  ctaLabel: string;
  ctaHref: string;
  image: unknown;
  imageAlt: string;
  sortOrder: number;
}

export interface ContentItem {
  id: string;
  groupKey: string;
  locale: Locale;
  code: string;
  title: string;
  body: string;
  category: string;
  status: string;
  tags: string;
  sortOrder: number;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asLocale(value: unknown): Locale {
  return value === "tr" ? "tr" : "en";
}

function active(record: CmsRecord): boolean {
  return record.active !== false;
}

function normalizeRoute(pathname: string): string {
  if (pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

async function queryCollection(collectionId: string, limit: number): Promise<CmsRecord[]> {
  try {
    const elevatedQuery = auth.elevate(wixDataItems.query);
    const result = await elevatedQuery(collectionId).limit(limit).find();
    return (result.items ?? []) as CmsRecord[];
  } catch (error) {
    console.error(`[cms:${collectionId}] query failed`, error);
    return [];
  }
}

export async function getShellContent(locale: Locale, pathname: string): Promise<{
  settings?: SiteSettings;
  seo?: PageSeo;
}> {
  const [settingsRecords, seoRecords] = await Promise.all([
    queryCollection("SiteSettings", 20),
    queryCollection("PageSEO", 100),
  ]);

  const settingsRecord = settingsRecords.find(
    (record) => asLocale(record.locale) === locale && active(record),
  );
  const requestedRoute = normalizeRoute(pathname);
  const seoRecord = seoRecords.find(
    (record) =>
      asLocale(record.locale) === locale &&
      normalizeRoute(asText(record.route)) === requestedRoute,
  );

  return {
    settings: settingsRecord
      ? {
          brandName: asText(settingsRecord.brandName),
          brandIdentifier: asText(settingsRecord.brandIdentifier),
          slogan: asText(settingsRecord.slogan),
          contactLabel: asText(settingsRecord.contactLabel),
          contactHref: asText(settingsRecord.contactHref),
          languageLabel: asText(settingsRecord.languageLabel),
          schemaVersion: asText(settingsRecord.schemaVersion),
          emblem: settingsRecord.emblem,
          logo: settingsRecord.logo,
        }
      : undefined,
    seo: seoRecord
      ? {
          route: asText(seoRecord.route),
          title: asText(seoRecord.title),
          description: asText(seoRecord.description),
          noIndex: seoRecord.noIndex === true,
          ogImage: seoRecord.ogImage,
        }
      : undefined,
  };
}

export async function getPageContent(
  pageKey: string,
  locale: Locale,
  groupKeys: string[] = [],
): Promise<{
  sections: PageSection[];
  items: ContentItem[];
}> {
  const [sectionRecords, itemRecords] = await Promise.all([
    queryCollection("PageSections", 200),
    queryCollection("ContentItems", 500),
  ]);

  const sections = sectionRecords
    .filter(
      (record) =>
        active(record) &&
        asText(record.pageKey) === pageKey &&
        asLocale(record.locale) === locale,
    )
    .map((record): PageSection => ({
      id: asText(record._id),
      pageKey: asText(record.pageKey),
      sectionKey: asText(record.sectionKey),
      locale: asLocale(record.locale),
      eyebrow: asText(record.eyebrow),
      title: asText(record.title),
      titleSecond: asText(record.titleSecond),
      body: asText(record.body),
      bodySecondary: asText(record.bodySecondary),
      ctaLabel: asText(record.ctaLabel),
      ctaHref: asText(record.ctaHref),
      image: record.image,
      imageAlt: asText(record.imageAlt),
      sortOrder: asNumber(record.sortOrder),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const items = itemRecords
    .filter(
      (record) =>
        active(record) &&
        asLocale(record.locale) === locale &&
        (groupKeys.length === 0 || groupKeys.includes(asText(record.groupKey))),
    )
    .map((record): ContentItem => ({
      id: asText(record._id),
      groupKey: asText(record.groupKey),
      locale: asLocale(record.locale),
      code: asText(record.code),
      title: asText(record.title),
      body: asText(record.body),
      category: asText(record.category),
      status: asText(record.status),
      tags: asText(record.tags),
      sortOrder: asNumber(record.sortOrder),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return { sections, items };
}

export function getHomeContent(locale: Locale) {
  return getPageContent('home', locale, [
    'capabilities',
    'principles',
    'projects',
    'architecture',
  ]);
}
