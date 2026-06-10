# Registry Submission Checklist — indian-regulatory-mcp

Pre-filled values for every MCP registry. Each submission takes 1–3 minutes in a browser.

## ✅ Already automatic

### Glama — `glama.ai`
Auto-crawls GitHub by repo topic `mcp-server`. Already tagged. Indexes within 24 hours.
- https://glama.ai/mcp/servers?q=indian-regulatory-mcp

### Official MCP Registry
- The `server.json` at this repo's root is the registry manifest.
- Submit via: `mcp-publisher publish server.json` (after `make publisher` and `mcp-publisher login github` in the registry repo).
- Downstream registries (PulseMCP, mcp.so) ingest from here weekly.

## 🌐 Manual browser submission

### PulseMCP — single URL field
- https://www.pulsemcp.com/submit
- **Paste:** `https://github.com/guptaprakhariitr/indian-regulatory-mcp`

### mcp.so — multi-field form
- https://mcp.so/submit
- **Name:** `indian-regulatory-mcp`
- **Display name:** `Indian Regulatory Data`
- **Description:** `SEBI orders/circulars, RBI notifications, MCA company master, GSTIN/PAN validation, NSE/BSE announcements, AMFI NAV.`
- **GitHub URL:** `https://github.com/guptaprakhariitr/indian-regulatory-mcp`
- **Endpoint URL:** `https://indian-regulatory-mcp.atlasword.workers.dev/mcp`
- **Tags:** sebi, rbi, mca, gst, nse, bse, amfi, india, fintech, legaltech
- **License:** MIT
- **Transport:** HTTP (remote)

### mcp.directory
- https://mcp.directory/submit
- Same values as mcp.so. Include a demo GIF if you can.

### Smithery (paid — $30/mo)
- https://smithery.ai/new
- Worth it if you have ≥6 paid subscribers.

### Cursor Marketplace
- Submit from Cursor → Settings → Marketplace → Submit. Curated; 1–2 weeks for approval.

## Social

### Show HN
- Title: `Show HN: indian-regulatory-mcp — Indian Regulatory Data as an MCP for Claude / Cursor`
- URL: `https://github.com/guptaprakhariitr/indian-regulatory-mcp`

### Twitter / X thread template
> Just shipped indian-regulatory-mcp — Model Context Protocol server: sebi orders/circulars, rbi notifications, mca company master, gstin/pan validation, nse/bse announcements, amfi nav.
>
> Endpoint: https://indian-regulatory-mcp.atlasword.workers.dev/mcp
> GitHub: https://github.com/guptaprakhariitr/indian-regulatory-mcp
>
> Free tier available. Paid from $9/mo.
