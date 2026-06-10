// Indian regulatory sources client.
// CLOSED-SOURCE candidates: scraping logic for MCA (CAPTCHA-handling) and NSE
// (cookie-warming). Open shim shows the surface; production lives in the
// private repo.

import { KvCache, stableKey } from "./cache";

export interface SourcesEnv {
  CACHE: KVNamespace;
  SEBI_BASE: string;
  RBI_BASE: string;
  MCA_BASE: string;
  NSE_BASE: string;
  BSE_BASE: string;
  AMFI_BASE: string;
}

export interface SebiOrder {
  date: string;          // YYYY-MM-DD
  title: string;
  category: string;      // normalized: adjudication / settlement / prohibitory / other
  url: string;
}

export interface RbiCircular {
  date: string;
  title: string;
  topic?: string;
  url: string;
}

export interface McaCompany {
  cin: string;
  company_name: string;
  status?: string;
  date_of_incorporation?: string;
  registered_office?: string;
  authorized_capital?: number;
  paid_up_capital?: number;
  directors?: Array<{ din: string; name: string; designation?: string }>;
}

export interface NseAnnouncement {
  ticker: string;
  date: string;
  subject: string;
  description: string;
  attachment_url?: string;
}

export interface AmfiNav {
  scheme_code: string;
  scheme_name: string;
  nav: number;
  date: string;          // YYYY-MM-DD
}

// SEBI uses different category strings in RSS vs landing pages.
// Map every variant we've seen to a canonical category.
const SEBI_CATEGORY_NORMALIZE: Record<string, string> = {
  "adjudication order": "adjudication",
  "adjudication": "adjudication",
  "settlement order": "settlement",
  "settlement": "settlement",
  "prohibitory": "prohibitory",
  "prohibitory order": "prohibitory",
  "wtm order": "wtm",
  "wtm": "wtm",
  "recovery": "recovery",
  "informal guidance": "informal_guidance",
  "consent order": "consent",
};

export class IndianSourcesClient {
  private cache: KvCache;
  constructor(private env: SourcesEnv) { this.cache = new KvCache(env.CACHE, "in"); }

  /** SEBI orders (adjudication / settlement / prohibitory / etc.) via RSS. */
  async sebiOrders(opts: { dateFrom?: string; dateTo?: string; category?: string; limit?: number }): Promise<SebiOrder[]> {
    const key = `sebi-orders:${stableKey(opts)}`;
    return this.cache.memoize(key, 60 * 60, async () => {
      const r = await fetch(`${this.env.SEBI_BASE}/sebi_data/rss/orders.xml`);
      if (!r.ok) throw new Error(`SEBI orders ${r.status}`);
      const xml = await r.text();
      const items = parseRssItems(xml);
      const orders = items.map(parseSebiOrderItem);
      return filterOrders(orders, opts);
    });
  }

  /** SEBI circulars via RSS. */
  async sebiCirculars(opts: { dateFrom?: string; dateTo?: string; topic?: string; limit?: number }): Promise<RbiCircular[]> {
    const key = `sebi-circ:${stableKey(opts)}`;
    return this.cache.memoize(key, 60 * 60, async () => {
      const r = await fetch(`${this.env.SEBI_BASE}/sebi_data/rss/circulars.xml`);
      if (!r.ok) throw new Error(`SEBI circulars ${r.status}`);
      const xml = await r.text();
      const items = parseRssItems(xml);
      return items.map(parseRbiCircular).filter((c) => filterByDate(c.date, opts.dateFrom, opts.dateTo))
        .slice(0, opts.limit ?? 50);
    });
  }

  /** RBI circulars via RSS. */
  async rbiCirculars(opts: { dateFrom?: string; dateTo?: string; topic?: string; limit?: number }): Promise<RbiCircular[]> {
    const key = `rbi-circ:${stableKey(opts)}`;
    return this.cache.memoize(key, 60 * 60, async () => {
      const r = await fetch(`${this.env.RBI_BASE}/Scripts/Rss.aspx?cat=notifications`);
      if (!r.ok) throw new Error(`RBI circulars ${r.status}`);
      const xml = await r.text();
      return parseRssItems(xml).map(parseRbiCircular)
        .filter((c) => filterByDate(c.date, opts.dateFrom, opts.dateTo))
        .filter((c) => !opts.topic || c.title.toLowerCase().includes(opts.topic.toLowerCase()))
        .slice(0, opts.limit ?? 50);
    });
  }

  /** RBI press releases via RSS. */
  async rbiPressReleases(opts: { dateFrom?: string; dateTo?: string; limit?: number }): Promise<RbiCircular[]> {
    const key = `rbi-press:${stableKey(opts)}`;
    return this.cache.memoize(key, 60 * 60, async () => {
      const r = await fetch(`${this.env.RBI_BASE}/Scripts/Rss.aspx?cat=press_release`);
      if (!r.ok) throw new Error(`RBI press ${r.status}`);
      const xml = await r.text();
      return parseRssItems(xml).map(parseRbiCircular)
        .filter((c) => filterByDate(c.date, opts.dateFrom, opts.dateTo))
        .slice(0, opts.limit ?? 50);
    });
  }

  /**
   * MCA company master data by CIN.
   * Open shim returns a stub; production scraper (with cookie + CAPTCHA logic)
   * lives in the private repo.
   */
  async mcaCompany(cin: string): Promise<McaCompany | null> {
    if (!/^[ULIuli][0-9]{5}[A-Za-z]{2}[0-9]{4}[A-Za-z]{3}[0-9]{6}$/.test(cin)) {
      throw new Error("Invalid CIN format. Expected: U|L|I + 5 digits + 2 letters + 4 digits + 3 letters + 6 digits");
    }
    const key = `mca:${cin.toUpperCase()}`;
    return this.cache.memoize(key, 60 * 60 * 24 * 7, async () => {
      // STUB: in private repo this hits the MCA Master Data form.
      // For the open shim we return null so the agent surfaces "unknown".
      return null;
    });
  }

  /** GSTIN structure validation + Mod-36 check digit. */
  gstVerifyStructure(gstin: string): { gstin: string; valid: boolean; state_code?: string; pan?: string; entity_seq?: string; check_digit_valid?: boolean } {
    const g = gstin.toUpperCase();
    if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g)) {
      return { gstin: g, valid: false };
    }
    const cd = gstinCheckDigit(g.slice(0, 14));
    return {
      gstin: g, valid: cd === g[14],
      state_code: g.slice(0, 2),
      pan: g.slice(2, 12),
      entity_seq: g[12],
      check_digit_valid: cd === g[14],
    };
  }

  /**
   * NSE corporate announcements scraper.
   * NSE requires a session cookie (added Sep 2025). Open shim returns a stub.
   */
  async nseAnnouncements(opts: { ticker: string; dateFrom?: string; dateTo?: string; limit?: number }): Promise<NseAnnouncement[]> {
    const key = `nse:${stableKey(opts)}`;
    return this.cache.memoize(key, 60 * 15, async () => {
      // STUB: in private repo this warms a session cookie and hits the JSON endpoint.
      return [];
    });
  }

  /** AMFI daily NAV by scheme code. */
  async amfiNav(opts: { scheme_code: string; date?: string }): Promise<AmfiNav | null> {
    const key = `amfi:${opts.scheme_code}:${opts.date ?? "latest"}`;
    return this.cache.memoize(key, 60 * 60 * 6, async () => {
      const r = await fetch(`${this.env.AMFI_BASE}/spages/NAVAll.txt`);
      if (!r.ok) throw new Error(`AMFI ${r.status}`);
      const txt = await r.text();
      return parseAmfiNavLine(txt, opts.scheme_code);
    });
  }
}

// ── Helpers (exported for tests) ────────────────────────────────────────────

export function parseRssItems(xml: string): Array<{ title: string; link: string; pubDate: string; description?: string; category?: string }> {
  const items: Array<{ title: string; link: string; pubDate: string; description?: string; category?: string }> = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const it = m[1];
    items.push({
      title: extract(it, "title") ?? "",
      link:  extract(it, "link") ?? "",
      pubDate: extract(it, "pubDate") ?? "",
      description: extract(it, "description"),
      category: extract(it, "category"),
    });
  }
  return items;
}

function extract(s: string, tag: string): string | undefined {
  const m = s.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`));
  return m?.[1]?.trim();
}

export function parseSebiOrderItem(it: { title: string; link: string; pubDate: string; description?: string; category?: string }): SebiOrder {
  // Bug fix 0.1.1: category match is case-insensitive.
  const rawCat = (it.category ?? extractCategoryFromTitle(it.title) ?? "").toLowerCase().trim();
  const category = SEBI_CATEGORY_NORMALIZE[rawCat] ?? "other";
  return {
    date: parseRfc822(it.pubDate),
    title: it.title,
    category,
    url: it.link,
  };
}

function extractCategoryFromTitle(title: string): string | null {
  // Many SEBI titles start with "Adjudication Order in respect of..."
  const m = title.match(/^([A-Za-z ]+? Order)/);
  return m?.[1] ?? null;
}

export function parseRbiCircular(it: { title: string; link: string; pubDate: string; description?: string }): RbiCircular {
  return {
    date: parseRfc822(it.pubDate),
    title: it.title,
    url: it.link,
  };
}

export function parseRfc822(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toISOString().slice(0, 10);
}

function filterByDate(date: string, from?: string, to?: string): boolean {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function filterOrders(orders: SebiOrder[], opts: { dateFrom?: string; dateTo?: string; category?: string; limit?: number }): SebiOrder[] {
  const cat = opts.category ? (SEBI_CATEGORY_NORMALIZE[opts.category.toLowerCase()] ?? opts.category.toLowerCase()) : undefined;
  return orders
    .filter((o) => filterByDate(o.date, opts.dateFrom, opts.dateTo))
    .filter((o) => !cat || o.category === cat)
    .slice(0, opts.limit ?? 50);
}

/** GSTIN Mod-36 check digit. */
export function gstinCheckDigit(first14: string): string {
  if (first14.length !== 14) return "";
  const charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let factor = 2, sum = 0;
  for (let i = first14.length - 1; i >= 0; i--) {
    const code = charset.indexOf(first14[i]);
    if (code < 0) return "";
    let p = code * factor;
    p = (Math.floor(p / 36)) + (p % 36);
    sum += p;
    factor = factor === 2 ? 1 : 2;
  }
  const checkCode = (36 - (sum % 36)) % 36;
  return charset[checkCode];
}

/** Parse one scheme line from AMFI's NAVAll.txt. Format: code;ISIN_GROWTH;ISIN_DIV;scheme_name;nav;date */
export function parseAmfiNavLine(text: string, schemeCode: string): AmfiNav | null {
  for (const line of text.split("\n")) {
    if (!line.startsWith(schemeCode + ";")) continue;
    const parts = line.split(";");
    if (parts.length < 6) continue;
    return {
      scheme_code: parts[0],
      scheme_name: parts[3],
      nav: parseFloat(parts[4]),
      date: parseDdMmmYyyy(parts[5].trim()),
    };
  }
  return null;
}

function parseDdMmmYyyy(s: string): string {
  // AMFI date format: "07-Jun-2026"
  const m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!m) return s;
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  return `${m[3]}-${months[m[2]]}-${m[1].padStart(2, "0")}`;
}

export { SEBI_CATEGORY_NORMALIZE };
