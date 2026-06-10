# Tools Reference — indian-regulatory-mcp

Per-tool reference for AI agents. The descriptions below are what the LLM reads to decide whether to call your tool — verbatim from `src/tools.ts`.

## `sebi_orders`

SEBI orders (adjudication, settlement, prohibitory, recovery, WTM, etc.) filtered by date and category. Returns title + date + URL to the official order PDF.

See `src/tools.ts` for the JSON Schema input.

## `sebi_circulars`

SEBI circulars by topic substring and date.

See `src/tools.ts` for the JSON Schema input.

## `rbi_circulars`

RBI notifications/circulars by topic and date.

See `src/tools.ts` for the JSON Schema input.

## `rbi_press_release`

RBI press releases by date.

See `src/tools.ts` for the JSON Schema input.

## `mca_company`

Look up an Indian company by CIN. Returns name, status, capital, directors. CIN format: `<L|U|I>5digits + 2letters + 4digits + 3letters + 6digits`, e.g. 'L21091MH2009PLC195643'. Premium.

See `src/tools.ts` for the JSON Schema input.

## `gst_verify`

Validate a GSTIN structurally (state code + PAN + entity-sequence + Mod-36 check digit). Note: this checks *structure*, not whether the GSTIN is currently active — for active-status, an authorized GST API call is required.

See `src/tools.ts` for the JSON Schema input.

## `nse_corp_announcements`

NSE corporate announcements for a ticker (equivalent to US 8-K). Premium.

See `src/tools.ts` for the JSON Schema input.

## `amfi_nav`

Daily NAV for an Indian mutual fund scheme by AMFI scheme code.

See `src/tools.ts` for the JSON Schema input.

## Client setup

### Cursor / Claude Desktop / Cline
```json
{
  "mcpServers": {
    "indian-regulatory-mcp": {
      "url": "https://indian-regulatory-mcp.prakhar-cognizance.workers.dev/mcp",
      "headers": { "Authorization": "Bearer YOUR_API_KEY" }
    }
  }
}
```

Anonymous requests get the free tier (100 calls/month, 10/min). Upgrade at `/upgrade?tier=solo|team|pro`.