# Changelog

## [0.2.0] — 2026-06-10

### Changed
- **Billing migrated to Dodo Payments** (was: planned Stripe). Merchant-of-Record model — Dodo handles VAT/GST/sales-tax remittance worldwide on our behalf, lifting tax compliance off the operator.
- Env vars: `STRIPE_*` → `DODO_API_KEY` / `DODO_WEBHOOK_SECRET`. New `[vars]`: `DODO_PRODUCT_ID_{SOLO,TEAM,PRO}`, `PRODUCT_NAME`, `FROM_EMAIL`.

### Added
- `GET /upgrade?tier=…` — creates a Dodo hosted checkout link, 302s to it.
- `GET /account` — returns the caller's key + tier + Dodo customer-portal link (requires `Authorization: Bearer …`).
- `POST /webhooks/dodo` — verifies Standard-Webhooks signature (HMAC-SHA256 + 5-minute replay window), mints API keys on `subscription.active`, downgrades on cancellation/failure, idempotent on retries.
- `src/dodo.ts`, `src/webhook.ts`, `src/checkout.ts` — vendored shim, identical across all Category-1 products.
- `mintApiKey()`, `updateKeyStatus()`, `getKeyBySubscription()` in `auth.ts`.
- `KeyRecord.status` field — tracks `active` / `cancelled` / `past_due`.
- Optional Resend integration: API key emailed to the customer on subscription start.


## [0.1.1] — 2026-06-08

### Fixed
- SEBI orders RSS parser was case-sensitive on category matching; "Adjudication" was treated as different from "adjudication".
- NSE corporate-announcements endpoint started returning 403 without a session cookie (Sep 2025 change). Added cookie-warming step before scrape.

### Added
- `amfi_nav` — daily NAV lookup from AMFI's free CSV.
- GSTIN check digit (Mod-36) validation in `gst_verify`.

## [0.1.0] — 2026-05-20

### Added
- Initial release. Tools: `sebi_orders`, `sebi_circulars`, `rbi_circulars`, `rbi_press_release`, `mca_company`, `gst_verify`, `nse_corp_announcements`.
- SEBI + RBI RSS parsing.
- MCA master-data lookup (form-based scrape).
- GSTIN structure validation (state code + check digit).
