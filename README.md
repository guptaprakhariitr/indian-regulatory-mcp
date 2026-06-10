# indian-regulatory-mcp — SCAFFOLD

> **The highest-conviction pick from the research.** Wraps SEBI / RBI / MCA / GST / Income-Tax public data into one MCP server. Free underlying data; no AI-native competitor; jurisdictional moat; deep fit for an India-based founder.

**Status:** scaffolded. Build this third (after `sec-edgar-mcp` and `multi-carrier-tracking-mcp`). Idea #2 in [`../../../ai-as-customer-ideas.md`](../../../ai-as-customer-ideas.md).

---

## Why this is the highest-conviction product

Three of the five research agents independently flagged Indian regulatory data:

- Free public data (SEBI orders RSS, RBI press releases RSS, MCA master data CSV, GST verify API).
- Zero AI-native wrapping — no MCP server, no SaaS, no API aggregator.
- Buyers exist: every Indian fintech / legaltech / B2B agent project needs this.
- Defensibility: domain knowledge of which portal serves what + dealing with India-style scraping anti-friction.

## Planned tools

| Tool | Source | Note |
|---|---|---|
| `sebi_orders(date_range, category?)` | SEBI orders RSS + landing pages | Categories: adjudication, prohibitory, settlement, etc. |
| `sebi_circulars(date_range, topic?)` | SEBI circulars RSS | |
| `rbi_circulars(date_range, topic?)` | RBI Notifications RSS | |
| `rbi_press_release(date_range)` | RBI press release RSS | |
| `mca_company(cin)` | MCA Master Data (free CSV / portal) | Returns director list, status, capital, registration date. |
| `mca_director_din(din)` | MCA Director Master Data | Returns name + active directorships. |
| `gst_verify(gstin)` | GST verification public API | Returns name, status, registration date. |
| `pan_verify_pattern(pan)` | (validation only; no full verify) | Pattern + state-from-PAN extraction. Cannot legally verify PAN-Aadhaar linkage. |
| `it_announcements()` | incometaxindia.gov.in press releases | Tax department announcements. |
| `nse_corp_announcements(ticker, date_range)` | NSE corporate announcements feed | Equivalent of US 8-K. |
| `bse_corp_announcements(scrip, date_range)` | BSE announcements | |
| `amfi_nav(scheme_code, date)` | AMFI daily NAV feed (free CSV) | Mutual fund prices. |

## Pricing (proposed — Indian + global blend)

| Tier | Price (USD) | Price (INR equiv) | Calls / mo |
|---|---|---|---|
| Free | $0 | ₹0 | 100 |
| Solo | $9 | ₹749 | 2,000 |
| Team | $29 | ₹2,399 | 10,000 |
| Pro  | $79 | ₹6,499 | 50,000 |

Stripe handles both USD and INR; for Indian customers add UPI checkout via Razorpay.

## Build steps

1. Fork `../sec-edgar-mcp/` to `indian-regulatory-mcp/`.
2. Replace `src/edgar.ts` with `src/sources/` containing one client per source.
3. Several sources require **scraping**, not API calls — keep scrapers in the private repo as the moat.
4. Cache aggressively — Indian gov sites are slow and unreliable; we should be more available than the upstream.

## Open / closed split

- **Open**: MCP shim, RSS parsers, validation regex (GSTIN, PAN, DIN), free-tier endpoints.
- **CLOSED (this is the moat)**: MCA scraper logic (anti-CAPTCHA + cookie handling), NSE/BSE scraping, retry logic, premium tools (alerts, bulk lookups).

## Risk notes

- MCA portal has CAPTCHAs and rate limits; scrape politely or buy paid API access at scale.
- SEBI and RBI RSS are stable and friendly.
- GST verify API has been free historically but the government can pull it; plan for an ToS-permitted scraper backup.
- Indian regulatory data is heavily underused by AI products precisely because the scraping is annoying — that's the moat.

## See also

- [`../sec-edgar-mcp/`](../sec-edgar-mcp/) — reference implementation (SEC EDGAR has cleaner APIs; this product is harder).
- [`../indic-normalize-mcp/`](../indic-normalize-mcp/) — pairs with this; same audience.
- [`../README.md`](../README.md) — Category 1 pipeline.
