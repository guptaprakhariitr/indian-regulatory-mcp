import { Tool } from "./mcp-server";
import { IndianSourcesClient, SourcesEnv } from "./sources";

export function buildTools(): Tool[] {
  return [
    {
      name: "sebi_orders",
      description:
        "SEBI orders (adjudication, settlement, prohibitory, recovery, WTM, etc.) filtered by date and category. Returns title + date + URL to the official order PDF.",
      inputSchema: {
        type: "object",
        properties: {
          date_from: { type: "string", description: "ISO YYYY-MM-DD." },
          date_to: { type: "string" },
          category: { type: "string", description: "adjudication / settlement / prohibitory / wtm / recovery / informal_guidance / consent. Case-insensitive (fix in 0.1.1)." },
          limit: { type: "integer", default: 25, minimum: 1, maximum: 200 },
        },
        required: [],
      },
      handler: async (args, ctx) => {
        const c = new IndianSourcesClient(ctx.env as unknown as SourcesEnv);
        const out = await c.sebiOrders({ dateFrom: args.date_from, dateTo: args.date_to, category: args.category, limit: args.limit ?? 25 });
        return { count: out.length, orders: out };
      },
    },
    {
      name: "sebi_circulars",
      description: "SEBI circulars by topic substring and date.",
      inputSchema: { type: "object", properties: { date_from: { type: "string" }, date_to: { type: "string" }, topic: { type: "string" }, limit: { type: "integer", default: 25 } }, required: [] },
      handler: async (args, ctx) => {
        const c = new IndianSourcesClient(ctx.env as unknown as SourcesEnv);
        const out = await c.sebiCirculars({ dateFrom: args.date_from, dateTo: args.date_to, topic: args.topic, limit: args.limit ?? 25 });
        return { count: out.length, circulars: out };
      },
    },
    {
      name: "rbi_circulars",
      description: "RBI notifications/circulars by topic and date.",
      inputSchema: { type: "object", properties: { date_from: { type: "string" }, date_to: { type: "string" }, topic: { type: "string" }, limit: { type: "integer", default: 25 } }, required: [] },
      handler: async (args, ctx) => {
        const c = new IndianSourcesClient(ctx.env as unknown as SourcesEnv);
        const out = await c.rbiCirculars({ dateFrom: args.date_from, dateTo: args.date_to, topic: args.topic, limit: args.limit ?? 25 });
        return { count: out.length, circulars: out };
      },
    },
    {
      name: "rbi_press_release",
      description: "RBI press releases by date.",
      inputSchema: { type: "object", properties: { date_from: { type: "string" }, date_to: { type: "string" }, limit: { type: "integer", default: 25 } }, required: [] },
      handler: async (args, ctx) => {
        const c = new IndianSourcesClient(ctx.env as unknown as SourcesEnv);
        const out = await c.rbiPressReleases({ dateFrom: args.date_from, dateTo: args.date_to, limit: args.limit ?? 25 });
        return { count: out.length, releases: out };
      },
    },
    {
      name: "mca_company",
      description:
        "Look up an Indian company by CIN. Returns name, status, capital, directors. CIN format: `<L|U|I>5digits + 2letters + 4digits + 3letters + 6digits`, e.g. 'L21091MH2009PLC195643'. Premium.",
      inputSchema: { type: "object", properties: { cin: { type: "string" } }, required: ["cin"] },
      premium: true,
      handler: async (args, ctx) => {
        const c = new IndianSourcesClient(ctx.env as unknown as SourcesEnv);
        const out = await c.mcaCompany(args.cin);
        return out ?? { cin: args.cin, error: "Not found or MCA scraper not configured in open shim. Production scraper lives in private repo." };
      },
    },
    {
      name: "gst_verify",
      description:
        "Validate a GSTIN structurally (state code + PAN + entity-sequence + Mod-36 check digit). Note: this checks *structure*, not whether the GSTIN is currently active — for active-status, an authorized GST API call is required.",
      inputSchema: { type: "object", properties: { gstin: { type: "string" } }, required: ["gstin"] },
      handler: async (args, ctx) => {
        const c = new IndianSourcesClient(ctx.env as unknown as SourcesEnv);
        return c.gstVerifyStructure(args.gstin);
      },
    },
    {
      name: "nse_corp_announcements",
      description: "NSE corporate announcements for a ticker (equivalent to US 8-K). Premium.",
      inputSchema: { type: "object", properties: { ticker: { type: "string" }, date_from: { type: "string" }, date_to: { type: "string" }, limit: { type: "integer", default: 25 } }, required: ["ticker"] },
      premium: true,
      handler: async (args, ctx) => {
        const c = new IndianSourcesClient(ctx.env as unknown as SourcesEnv);
        const out = await c.nseAnnouncements({ ticker: args.ticker, dateFrom: args.date_from, dateTo: args.date_to, limit: args.limit ?? 25 });
        return { count: out.length, announcements: out };
      },
    },
    {
      name: "amfi_nav",
      description: "Daily NAV for an Indian mutual fund scheme by AMFI scheme code.",
      inputSchema: { type: "object", properties: { scheme_code: { type: "string" }, date: { type: "string" } }, required: ["scheme_code"] },
      handler: async (args, ctx) => {
        const c = new IndianSourcesClient(ctx.env as unknown as SourcesEnv);
        const out = await c.amfiNav({ scheme_code: args.scheme_code, date: args.date });
        return out ?? { error: "scheme not found" };
      },
    },
  ];
}
