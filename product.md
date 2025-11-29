Name: tbd

## Product vision
One centralized catalog powers two customer-facing sites (“Sell to Us” and “Buy from Us”) plus an internal admin console. The business buys used vinyl from collectors, then lists selected inventory on its storefront. Admins govern acquisition and sale pricing through configurable policies that reference third-party market data and condition grades.

## Primary roles & surfaces
- **Admin (core employee)**: maintains catalog metadata, defines global and per-release pricing strategies, triages incoming seller submissions, and pushes inventory live. Works exclusively in the admin console.
- **Seller (record owner)**: uses the “sell to us” site to receive instant offers, describe condition, and submit a lot for review. Receives follow-up communications off-platform (email/SMS) once admin accepts.
- **Buyer (store customer)**: browses the “buy from us” storefront (standard ecommerce flow with cart, checkout, etc.) and is unaware of the sourcing process.

## System overview
```
Seller Site <-> API <-> Catalog DB <-> Admin Console <-> API <-> Storefront
                             ^
                      Pricing Engine
```
- **Catalog DB**: single source of truth for releases, condition, offer price, list price, and state (submitted, vetted, live, sold).
- **Pricing engine**: service or module that fetches Discogs/eBay stats, applies policies, and outputs offer/list prices per condition tier.
- **Admin console**: UI for policy configuration, catalog edits, queue management, and manual overrides.
- **Seller site**: lightweight search + instant quote flow; writes seller submission records.
- **Storefront**: ecommerce front end showing list price, stock count, and condition.

## Pricing strategy
Admin-configurable pricing templates drive both buying offers and selling list prices.

### Data inputs
- **External market sources**: Discogs and eBay APIs (or cached datasets) provide low/median/high sale prices over a configurable time window (default 90 days). Missing data flags records for manual review.
- **Condition curves**: global table mapping condition tiers (Mint, NM, VG+, VG, VG-, G) to percentage adjustments (e.g., Mint = 110% of NM baseline, VG = 60%).
- **Channel-specific multipliers**: administrators can create policies per acquisition channel (web submissions vs. store walk-ins) or per genre/label.

### Offer (buy) calculation
```
market_stat = choose(low|median|high, source=Discogs|eBay|hybrid)
base_offer = market_stat * percentage (e.g., 55%)
condition_adjusted_offer = base_offer * condition_curve[media]*media_weight
                           + base_offer * condition_curve[sleeve]*sleeve_weight
rounded_offer = round_to_increment(condition_adjusted_offer, $0.25)
```
- Hybrid mode averages Discogs/eBay stats or uses fallback order (Discogs -> eBay -> manual prompt).
- Admin can impose min/max caps or profit targets (e.g., target 40% gross margin on resale).
- Offers expire after N days; expiry duration is policy-controlled.

### Listing (sell) calculation
```
market_stat_sell = choose(low|median|high, source=Discogs|eBay|hybrid)
list_price_suggestion = market_stat_sell * percentage (e.g., 125%)
condition_adjusted_list = list_price_suggestion * condition_curve[media]
admin_override (optional): absolute value or +/- adjustment
```
- List price suggestions consider current inventory costs to avoid selling below acquisition price.
- Admin can define markdown schedules (e.g., -10% after 30 days unsold).

## Catalog & submission data model (high level)
- **Release**: id, title, artist, label, catalog_number, barcode, release_year, genre, cover_art_url.
- **Market snapshot**: release_id, source, stat_low, stat_median, stat_high, fetched_at.
- **Pricing policy**: id, name, scope (global/genre/release), buy_formula, sell_formula, condition_curve.
- **Seller submission**: submission_id, seller_contact, status, created_at, expires_at.
- **Submission item**: submission_id, release_id, quantity, seller_condition_media, seller_condition_sleeve, auto_offer_price.
- **Inventory lot**: lot_id, release_id, condition_media, condition_sleeve, cost_basis, list_price, channel, status (draft/live/sold).

## Detailed flows

### Seller submission / admin buying
1. Seller lands on “Sell to Us” site and authenticates via email magic link or continues as guest with later confirmation step.
2. Seller searches catalog by artist/title/barcode; auto-complete hits the existing database.
3. Upon selection, site fetches price quote using current buy policy (condition defaults to NM until seller inputs actual condition).
4. Seller specifies media & sleeve condition, quantity, and optional notes/photos; quote updates live.
5. Seller adds item to virtual selling list (cart analogue). Repeat search/add flow for multiple records.
6. Before submission, site summarizes expected payout, payout method, and policy disclaimers (e.g., subject to inspection).
7. Seller submits; system creates `seller_submission` with status `pending_review` and sends confirmation email.
8. Admin console shows queue sorted by submission date or potential value. Admin can:
   - **Accept** entire submission (auto-generate purchase order, send instructions/shipping label).
   - **Counter** individual line items (adjust offer) and request seller confirmation.
   - **Reject** items or entire submission with canned reasons.
9. Once items are physically received and inspected, admin finalizes condition, updates cost basis, and converts accepted items into inventory lots ready for pricing/listing.

### Admin inventory prep / selling
1. Admin adds or confirms release metadata (either via seller submission or manually).
2. System suggests list price via sell policy; admin reviews margins (list price vs. cost basis) and may override.
3. Admin adds merchandising data (description, store tags, photos) and marks inventory lot as `live`.
4. Storefront pulls all `live` lots, grouped by release and condition. Multiple copies show available quantity.
5. Once a buyer completes checkout, storefront marks the lot as reserved. Inventory sync prevents overselling.
6. Fulfillment workflow (shipping notification, tracking) occurs outside this doc’s scope but should integrate order statuses back into the lot record.

### Buyer storefront flow
1. Buyer browses catalog, filters by genre, price, condition, or new arrivals.
2. PDP shows condition, audio notes, pricing history, and a badge if price recently dropped.
3. Buyer adds to cart and checks out through standard ecommerce stack (payment provider TBD).
4. After purchase, system triggers order confirmation email and updates inventory lot to `sold`.

## Edge cases & operational considerations
- **Missing external data**: Flag releases lacking Discogs/eBay stats for manual pricing; seller site should display “Needs manual review” instead of instant quote.
- **Duplicate submissions**: Detect identical seller lots within a cooldown window to avoid repeated quotes abuse.
- **Condition disputes**: If received condition is lower than declared, admin can auto-reprice using same policy and request seller approval before finalizing.
- **Regional pricing**: Consider currency conversion if sellers/buyers operate outside base currency; store converted amounts alongside USD baseline.
- **Tax and compliance**: Capture seller tax info if payouts exceed thresholds; storefront must handle sales tax/VAT rules per region.
- **Notifications**: Email/SMS templates for submission received, quote adjustments, acceptance, payment sent, and buyer order statuses.
- **Audit trail**: Log policy versions applied to each quote/list price for traceability.

## Open questions for dev kickoff
| Priority | Question | Why it matters |
| --- | --- | --- |
| P0 | What third-party integrations (Discogs, eBay, shipping labels, payments) already exist or need procurement? | Blocks API design, infrastructure estimates, and legal/vendor onboarding. |
| P0 | How will payouts be issued (ACH, PayPal, store credit) and who provides KYC/AML checks? | Determines compliance scope, database fields, and payout provider integrations. |
| P1 | Should sellers authenticate or can they fully transact as guests? | Impacts auth stack choice, data retention, quote retrieval, and notification logic. |
| P1 | Do admins need bulk import/export tools for catalog and pricing policies? | Informs build vs. buy decisions for data management and affects early backlog sizing. |
| P2 | Are there SLAs for responding to submissions or auto-expiring unreviewed requests? | Guides automation, notification cadence, and queue prioritization logic. |