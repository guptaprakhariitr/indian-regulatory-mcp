import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  IndianSourcesClient, parseRssItems, parseSebiOrderItem, parseRfc822,
  gstinCheckDigit, parseAmfiNavLine, SEBI_CATEGORY_NORMALIZE,
} from "../src/sources";
import { McpServer, ToolContext } from "../src/mcp-server";
import { buildTools } from "../src/tools";

class FakeKv {
  store = new Map<string, string>();
  async get(key: string, type?: "text" | "json"): Promise<any> {
    const v = this.store.get(key); if (v === undefined) return null;
    if (type === "json") return JSON.parse(v); return v;
  }
  async put(key: string, value: string): Promise<void> { this.store.set(key, value); }
  async delete(key: string): Promise<void> { this.store.delete(key); }
}

const env = {
  CACHE: new FakeKv() as unknown as KVNamespace,
  USAGE: new FakeKv() as unknown as KVNamespace,
  SEBI_BASE: "https://www.sebi.gov.in",
  RBI_BASE: "https://rbi.org.in",
  MCA_BASE: "https://www.mca.gov.in",
  NSE_BASE: "https://www.nseindia.com",
  BSE_BASE: "https://www.bseindia.com",
  AMFI_BASE: "https://www.amfiindia.com",
  UPGRADE_URL: "x",
};

const fixSebiOrdersRss = `<?xml version="1.0"?>
<rss><channel>
<item>
<title><![CDATA[Adjudication Order in respect of XYZ Securities Ltd]]></title>
<link>https://www.sebi.gov.in/.../order.pdf</link>
<pubDate>Mon, 02 Jun 2026 10:30:00 +0530</pubDate>
<category><![CDATA[Adjudication Order]]></category>
</item>
<item>
<title><![CDATA[Settlement Order in respect of ABC]]></title>
<link>https://www.sebi.gov.in/.../s2.pdf</link>
<pubDate>Wed, 28 May 2026 11:00:00 +0530</pubDate>
<category><![CDATA[settlement order]]></category>
</item>
<item>
<title><![CDATA[Prohibitory Order against DEF]]></title>
<link>https://www.sebi.gov.in/.../p1.pdf</link>
<pubDate>Sat, 10 May 2026 14:00:00 +0530</pubDate>
<category><![CDATA[Prohibitory]]></category>
</item>
</channel></rss>`;

const fixAmfiNavLine = `Open Ended Schemes(Equity Scheme - Large Cap Fund)
100033;INF179KB1HP9;INF179KB1HQ7;HDFC Top 100 Fund - Direct - Growth;1102.4567;07-Jun-2026
100034;ISIN-G;ISIN-D;HDFC Small Cap Fund - Direct - Growth;125.7800;07-Jun-2026
`;

beforeEach(() => {
  (env.CACHE as any).store = new Map();
  vi.stubGlobal("fetch", async (url: string | URL) => {
    const u = typeof url === "string" ? url : url.toString();
    if (u.includes("sebi.gov.in/sebi_data/rss/orders.xml"))    return new Response(fixSebiOrdersRss, { status: 200 });
    if (u.includes("sebi.gov.in/sebi_data/rss/circulars.xml")) return new Response(`<rss><channel></channel></rss>`, { status: 200 });
    if (u.includes("rbi.org.in/Scripts/Rss.aspx"))             return new Response(`<rss><channel></channel></rss>`, { status: 200 });
    if (u.includes("amfiindia.com/spages/NAVAll.txt"))         return new Response(fixAmfiNavLine, { status: 200 });
    return new Response("", { status: 200 });
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("RSS parsing", () => {
  it("parses items, titles, dates, categories", () => {
    const items = parseRssItems(fixSebiOrdersRss);
    expect(items.length).toBe(3);
    expect(items[0].title).toContain("XYZ Securities");
  });
});

describe("RFC-822 date normalization", () => {
  it("converts SEBI date format to ISO", () => {
    expect(parseRfc822("Mon, 02 Jun 2026 10:30:00 +0530")).toBe("2026-06-02");
  });
});

describe("SEBI category normalization (0.1.1 bug fix)", () => {
  it("normalizes case-insensitively for 'settlement order' and 'settlement Order'", () => {
    const a = parseSebiOrderItem({ title: "x", link: "y", pubDate: "Mon, 02 Jun 2026 10:30:00 +0530", category: "Settlement Order" });
    const b = parseSebiOrderItem({ title: "x", link: "y", pubDate: "Mon, 02 Jun 2026 10:30:00 +0530", category: "settlement order" });
    expect(a.category).toBe("settlement");
    expect(b.category).toBe("settlement");
  });
  it("covers adjudication / prohibitory / wtm / recovery", () => {
    expect(SEBI_CATEGORY_NORMALIZE["adjudication order"]).toBe("adjudication");
    expect(SEBI_CATEGORY_NORMALIZE["prohibitory"]).toBe("prohibitory");
    expect(SEBI_CATEGORY_NORMALIZE["wtm order"]).toBe("wtm");
    expect(SEBI_CATEGORY_NORMALIZE["recovery"]).toBe("recovery");
  });
});

describe("sebi_orders filtering", () => {
  it("filters by category (case-insensitive)", async () => {
    const c = new IndianSourcesClient(env as any);
    const all = await c.sebiOrders({});
    expect(all.length).toBe(3);
    const adj = await c.sebiOrders({ category: "Adjudication" });
    expect(adj.length).toBe(1);
    expect(adj[0].category).toBe("adjudication");
  });
  it("filters by date_from/date_to", async () => {
    const c = new IndianSourcesClient(env as any);
    const recent = await c.sebiOrders({ dateFrom: "2026-05-15" });
    expect(recent.length).toBe(2);
    expect(recent.every((o) => o.date >= "2026-05-15")).toBe(true);
  });
});

describe("GSTIN validation", () => {
  it("rejects malformed GSTINs", () => {
    const c = new IndianSourcesClient(env as any);
    expect(c.gstVerifyStructure("INVALID").valid).toBe(false);
  });
  it("validates structure and extracts state code", () => {
    const c = new IndianSourcesClient(env as any);
    // 29ABCDE1234F1Z<X> - structurally valid, X depends on check digit calc
    const cd = gstinCheckDigit("29ABCDE1234F1Z");
    const g = "29ABCDE1234F1Z" + cd;
    const r = c.gstVerifyStructure(g);
    expect(r.valid).toBe(true);
    expect(r.state_code).toBe("29");
    expect(r.pan).toBe("ABCDE1234F");
    expect(r.check_digit_valid).toBe(true);
  });
  it("rejects wrong check digit", () => {
    const c = new IndianSourcesClient(env as any);
    // Compute correct then flip
    const cd = gstinCheckDigit("29ABCDE1234F1Z");
    const wrong = cd === "0" ? "1" : "0";
    const r = c.gstVerifyStructure("29ABCDE1234F1Z" + wrong);
    expect(r.check_digit_valid).toBe(false);
  });
});

describe("MCA CIN validation", () => {
  it("throws on malformed CIN", async () => {
    const c = new IndianSourcesClient(env as any);
    await expect(c.mcaCompany("INVALID")).rejects.toThrow(/CIN/);
  });
  it("accepts a valid CIN format", async () => {
    const c = new IndianSourcesClient(env as any);
    // Stub returns null in open shim
    const r = await c.mcaCompany("L21091MH2009PLC195643");
    expect(r).toBeNull();
  });
});

describe("AMFI NAV", () => {
  it("parses one scheme line", async () => {
    const c = new IndianSourcesClient(env as any);
    const r = await c.amfiNav({ scheme_code: "100033" });
    expect(r).not.toBeNull();
    expect(r!.scheme_name).toContain("HDFC Top 100");
    expect(r!.nav).toBe(1102.4567);
    expect(r!.date).toBe("2026-06-07");
  });
  it("parseAmfiNavLine returns null when scheme code not present", () => {
    expect(parseAmfiNavLine(fixAmfiNavLine, "999999")).toBeNull();
  });
});

describe("MCP protocol", () => {
  const server = new McpServer({ name: "indian-regulatory-mcp", version: "0.1.1" });
  for (const t of buildTools()) server.register(t);
  const ctx: ToolContext = { env: env as any, apiKey: null, tier: "free", callsRemaining: 100 };

  it("free tier hides mca_company + nse_corp_announcements (premium)", async () => {
    const r = await server.handle({ jsonrpc: "2.0", id: 1, method: "tools/list" }, ctx);
    const names = (r!.result as any).tools.map((t: any) => t.name) as string[];
    expect(names).toContain("sebi_orders");
    expect(names).toContain("gst_verify");
    expect(names).not.toContain("mca_company");
    expect(names).not.toContain("nse_corp_announcements");
  });

  it("sebi_orders end-to-end", async () => {
    const r = await server.handle(
      { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "sebi_orders", arguments: {} } }, ctx
    );
    const out = JSON.parse((r!.result as any).content[0].text);
    expect(out.count).toBe(3);
  });

  it("gst_verify end-to-end", async () => {
    const r = await server.handle(
      { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "gst_verify", arguments: { gstin: "29ABCDE1234F1Z" + gstinCheckDigit("29ABCDE1234F1Z") } } }, ctx
    );
    const out = JSON.parse((r!.result as any).content[0].text);
    expect(out.valid).toBe(true);
  });
});
