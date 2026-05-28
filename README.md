# Alexis Oakes — REALTOR® | Coldwell Banker Select

A single-page brand + listings site for Alexis Oakes, built in the KLINEKRAFT
zero-build pattern (static `index.html` + assets, one Cloudflare Pages Function).

## What's inside
- **`index.html`** — the whole site (loader, hero, stats, about, listings, process, guides, contact, footer). No build step.
- **`functions/api/listings.js`** — Cloudflare Pages Function. Fetches the CB Select Zillow XML feed server-side, filters to Alexis's active listings (by agent email `aoakes@cbtulsa.com` or name), and returns JSON at **`/api/listings`**. This avoids browser mixed-content (the feed is `http://`) and CORS issues.
- **`assets/`** — web fonts (Mostra Nuova, her logo face), responsive photos, logos (AO + Coldwell Banker Select), and downloadable PDF guides.
- **`_headers`** — edge caching + basic security headers.

## Deploy (GitHub → Cloudflare Pages)
1. Push this folder to a repo in the KLINEKRAFT org.
2. In Cloudflare Pages: **Create project → Connect to Git → select repo**.
3. Build settings: **Framework preset: None. Build command: (blank). Output directory: `/`**.
4. Deploy. The `functions/` folder is picked up automatically — `/api/listings` goes live with the site.

The listings grid calls `/api/listings` on load. Locally (no Functions) it shows a
sample layout; once deployed on Pages, it shows live MLS listings.

## Live listings
- Source: `http://realistiq.net/exports/iq_cb_select_zillow.xml`
- Filter + field mapping live in `functions/api/listings.js`. Edge-cached ~15 min.
- To change which agent's listings show, edit `AGENT_EMAIL` / `AGENT_NAME` at the top of that file.

## Notes
- **Fonts:** display type is **Mostra Nuova** (the face from her AO logo), served locally as WOFF2. Body is **Hanken Grotesk** and the script accent is **Sacramento**, both from Google Fonts.
- **Loader:** the AO monogram draws on (SVG stroke) then fills — inline SVG in `index.html`.
- **Contact form:** opens the visitor's mail client (`mailto:`). Swap in a Pages Function + form service later if you want server-side capture.
- **Brand compliance:** Coldwell Banker® uses ® on first mention; footer carries the Anywhere Advisors LLC disclaimer, trademark line, and Equal Housing Opportunity mark.
- **KLINEKRAFT mark:** footer currently shows a low-opacity "Crafted by KLINEKRAFT" wordmark. Drop `klinekraft_logo_white.png` into `/assets/logos/` and swap the `.kraft` link for the image if you'd rather use the logo.
