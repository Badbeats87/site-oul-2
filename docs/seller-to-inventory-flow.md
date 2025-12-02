# Seller → Inventory → Storefront Flow

This document captures the desired end-to-end flow for onboarding records from sellers, reviewing them in the admin console, and making them available to buyers. Every step should stay in sync with Discogs so admins always have the most reliable metadata reference, while still allowing them to override fields easily when needed.

## 1. Seller Submission

1. Seller searches Discogs from the seller portal.
2. Seller selects a release and immediately sees an automated buy quote that is calculated using the **buyer pricing policy**.
3. Seller submits their list of items (with conditions, quantity, notes, etc.).

### Requirements
- Discogs lookup should persist the Discogs ID (and optionally master ID) so we can re-fetch metadata at any time.
- Store the buyer quote inputs (policy version, condition adjustments) so they can be audited later.

## 2. Admin Review

1. New submissions appear in the admin dashboard (Submissions tab).
2. Admin can view all items, adjust counter-offers, and accept/reject per item or entire submission.
3. Accepted items should trigger inventory creation (see next section).

### Requirements
- Details modal/page must display Discogs reference info (title, artist, label, catalog number, release year, cover art).
- Admin should be able to click through to Discogs for additional verification.

## 3. Inventory Lot Creation

1. When an item is accepted, create an `InventoryLot` in status `DRAFT`.
2. Carry over:
   - Release reference (Discogs ID, master ID if present).
   - Seller-entered conditions, quantity, notes.
   - Cost basis (final accepted buy price).
3. Immediately re-fetch Discogs metadata (or use cached metadata) to populate label, catalog number, year, genres, etc.

### Requirements
- Keep a link back to the submission and submission item for traceability.
- Maintain both the Discogs metadata (as reference) and editable fields on the lot so admins can diverge if needed.

## 4. Inventory Editing

From the Inventory tab/page:

1. Admin should see each draft lot with all key metadata:
   - Title, artist, label, catalog number, release year.
   - SKU, channel, cost/list sale prices.
   - Media/sleeve condition, submission origin, notes.
2. Every field should be editable inline or via an edit drawer/modal (whichever offers the best UX).
3. Provide easy access to Discogs reference (link or embedded preview) so admins can double-check data before editing.

### Requirements
- Support editing label, catalog number, release year, release notes/description, cover art (if we allow uploads), condition grades, SKU, channel, etc.
- Persist admin edits without losing the Discogs reference—e.g., store overrides separately or mark last sync date.

## 5. Seller Pricing Policy (List Price)

1. Once a lot exists, calculate the **seller pricing policy** value to determine initial list price.
2. Show both the policy-derived price and the editable field so admins can tweak it.
3. Track which policy/version was applied (for auditing).

### Requirements
- Recalculate list price when policy changes or conditions change (optional manual trigger).
- Allow admin override at any time; overrides should persist until explicitly recalculated.

## 6. Publishing to Storefront

1. When the lot is ready, admin sets status to `LIVE`.
2. Buyer storefront (`/buyer`) should list all `LIVE` lots with:
   - Title, artist, label, catalog number, year.
   - Condition, price, quantity (if >1), cover art.
   - Any descriptive notes that help buyers.
3. When buyers add to cart/checkout, inventory should move to `RESERVED`/`SOLD` statuses and hide from the storefront accordingly.

### Requirements
- Ensure inventory availability is enforced (no double-selling). Consider reserving on “add to cart” or at payment time.
- Provide easy way to switch back to `DRAFT`/`REMOVED` if the listing needs to be pulled.

## 7. Discogs Synchronization & Editing UX

- **Sync**: Any time we need authoritative data (e.g., new submission selection, admin wants to refresh metadata), hit Discogs and update the reference fields.
- **Editable Fields**: Admin should be able to edit *every* record detail quickly:
  - Inline editable fields in the table for SKU, status, prices.
  - Expanded editor/drawer for label, catalog number, release year, tracklist/notes, cover art, etc.
- **History**: Track what was pulled from Discogs vs. what was edited manually so we can revert or re-sync if needed.

## Summary

- Sellers → submission → admin review → accepted items → inventory drafts.
- Draft lots pull Discogs metadata but remain fully editable.
- Seller pricing policy sets initial list price; admin can override.
- Setting status to `LIVE` makes the lot appear on the buyer storefront.
- Throughout the flow, keep Discogs IDs around so we can re-sync or link back for reference, while letting admins freely edit the canonical data we store.
