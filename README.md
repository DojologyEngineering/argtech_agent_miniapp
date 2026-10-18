# ARG TECH Field Agent — Telegram Mini App (Phase 1: UI only)

Field agents in Cambodia use this Mini App to register farmers, trace farm plots on
satellite imagery, log crop cycles, and raise purchase orders.

**Phase 1 is frontend only.** All data is mock/local — no backend, no database. Every
screen reads and writes through a small service layer (`lib/api/*`) so that swapping in
the NestJS API later touches those files and nothing else.

---

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS v4 (CSS-first `@theme` tokens in `app/globals.css`) |
| Components | shadcn/ui-style primitives on Radix (`components/ui/*`) |
| Icons | lucide-react |
| Telegram | `@twa-dev/sdk`, lazily loaded on the client (`lib/telegram.ts`) |
| Maps | Leaflet + react-leaflet + Leaflet-Geoman, Esri World Imagery tiles |
| Area maths | Turf.js (`lib/geo.ts`) |
| Dates | date-fns |

No API keys are required — Esri World Imagery is free to use with attribution.

---

## Running locally

```bash
npm install
npm run dev          # http://localhost:3000
```

Other scripts: `npm run build`, `npm run start`, `npm run typecheck`.

The app is laid out for a phone (max width 448px, safe-area padding, 16px inputs so iOS
does not zoom). A desktop browser is fine for development.

---

## Testing inside Telegram with ngrok

Telegram only loads Mini Apps over HTTPS, so a tunnel is needed for local testing.

1. **Install ngrok** — <https://ngrok.com/download>, or `winget install ngrok.ngrok`
   (Windows) / `brew install ngrok` (macOS). Then authenticate once:

   ```bash
   ngrok config add-authtoken <YOUR_TOKEN>
   ```

2. **Start the dev server** in one terminal:

   ```bash
   npm run dev
   ```

3. **Start the tunnel** in a second terminal:

   ```bash
   ngrok http 3000        # or: npm run tunnel
   ```

   Copy the HTTPS forwarding URL it prints, e.g. `https://a1b2-c3d4.ngrok-free.app`.

4. **Point the bot at that URL** in [@BotFather](https://t.me/BotFather):

   - `/newbot` (first time) → follow the prompts to create the bot.
   - `/newapp` → pick the bot → give the Mini App a title, description, 640×360 photo,
     and paste the ngrok HTTPS URL as the **Web App URL**.
   - Or, for a quick menu-button launch: `/mybots` → select the bot →
     **Bot Settings → Menu Button → Configure menu button** → paste the same URL.

5. **Open the bot in Telegram** and tap the menu button / Mini App link. The agent's
   identity comes from their Telegram account — there is no login screen.

Notes:

- The ngrok URL changes every restart on the free plan — update BotFather each time.
- `next.config.ts` already allow-lists `*.ngrok-free.app` (and friends) as dev origins.
- Outside Telegram the SDK degrades to a no-op and a mock agent identity is used, so
  every screen still works in a plain browser.

---

## Project structure

```
app/
  page.tsx                     Dashboard (Home)
  farmers/                     list · new · [id] · [id]/edit · certificates
  plots/                       list · new · [id] · [id]/edit
  crops/                       crop cycles: list · new · [id] · [id]/edit · harvests · activities
  calendar/                    read-only month · list · forecast views
  orders/                      list · new · [id] · [id]/edit
  providers.tsx                Telegram context (user, inTelegram, ready)

components/
  layout/                      AppShell, Content, StickyFooter, ScreenHeader, BottomNav
  ui/                          button, card, field, select, misc, confirm-dialog
  map/plot-map.tsx             Leaflet + Geoman polygon editor (client-only)
  plots/ crops/ orders/ farmers/ dashboard/   feature components & forms

lib/
  types.ts                     domain model
  db.ts                        in-memory store + localStorage persistence
  api/                         service layer — THE swap point for the real API
  derive.ts                    status, totals, break-even, margin
  geo.ts                       Turf area / bounding dimensions
  format.ts                    dates, currency, kg, hectares
  hooks/use-query.ts           fetch + re-run on store change
  mock/                        seed data, crop reference list, Cambodian locations
```

### Swapping in the backend

`lib/api/*` exposes plain async functions (`listFarmers`, `createPlot`,
`advanceOrderStatus`, …) returning the same shapes the API is expected to return.
Replace their bodies with `fetch` calls and delete `lib/db.ts` + `lib/mock/seed.ts`;
components, forms and hooks stay as they are. `useQuery` re-runs on store changes today —
with a real API it becomes a cache invalidation.

---

## Modules

### Home
Stats derived from the live mock dataset (farmers, plots, active crops, orders), a
six-month harvest volume chart built from actual harvested output, upcoming harvests, and
recent purchase orders. A **Reset demo data** control at the bottom restores the seed
dataset — it exists only in this phase.

### Farmer
List with search; detail with **Primary Phone** / **Secondary Phone** labelled
consistently, personal info, linked plots, crop cycles and purchase orders (each linking
through), document uploads (profile photo, national ID), certificates (type GAP / Organic /
Other, issuer, scope, expiry, photo — staff prepare a buyer-safe copy before buyers see it);
full add/edit forms with cascading Province → District → Commune → Village selects. Consent to
share records with buyers is handled when a farmer is onboarded, so there is no toggle here. Farmer cards count **orders**, not "carts".

### Plots
Belongs to one farmer. The **area calculation is the single source of truth**: the agent
traces the field on Esri satellite imagery with Geoman, and Turf converts the polygon to
hectares. The length/width read-outs are the bounding box of that same polygon, labelled
as informational — there is no second, independent way to set the area. Saving says
**Save Plot**.

### Crops (Crop Cycles)
Farmer-linked plantings, not a crop catalog. Each record links Farmer → Plot → Crop, with
planting / expected harvest dates, itemised costs (seed, fertilizer, labor, other), expected
output in kg and an estimated price **per kg**. Cultivated area is inherited from the plot's
calculated hectares — never re-entered, and kept in step if the plot is resized or handed to
another farmer.

Picking is recorded as a **Harvest Log**: one entry per trip (date, kg, note), because
vegetables are picked repeatedly over weeks. A harvest carries no price — money exists only on
order line items. **Field activities** (irrigation, fertilization) are logged from the same
screen. **Production details** (method, delivery frequency, fertilizer type, pesticide used
with optional details) are optional to save, but a "Production details missing" badge shows on
the cycle until method, fertilizer and pesticide are set. The detail screen also shows the
crop's read-only **specification** (ripeness, size, condition, best used within) — what buyers
expect, so the farmer can be told before picking. Status is derived: *Growing* → *Ready to harvest* (expected date reached) →
*Harvesting* (first pick logged) → *Completed* (the agent taps **Mark cycle complete**;
**Reopen cycle** undoes it).

**Break-even price** is total cost ÷ a cost basis — expected output while picking is under
way, the actual harvest once the cycle is complete. **Margin** compares revenue with the cost
of the kg sold so far (break-even × kg sold), so a cycle isn't shown at a loss just because
only its first few kg have been sold.

Harvest edits are checked against orders: total harvested can't drop below what is already
allocated, and a completed cycle takes no new picks until reopened.

The crop list (Cucumber, Tomato, Long Bean, Morning Glory, Chili, Cabbage, Eggplant) exists
only as dropdown data in `lib/mock/crop-refs.ts` — selecting one pre-fills variety, season,
seed source and reference price, all still editable. There is deliberately **no Crop Catalog
screen**. Seasons are **Wet Season** / **Dry Season** only.

### Calendar
Read-only, with month-grid, list and supply-forecast views. Entries are derived from crop
cycles (planting, each logged picking, irrigation, fertilization) and from **orders**
(a rose-coloured *Delivery / handover* entry on each live order's delivery date, flagged when
the handover check is due). Each badge carries its **own** activity type with a colour legend;
anything still ahead (expected harvests, requested or confirmed deliveries) is marked "Planned". Tapping an entry opens its crop cycle or order.

### Orders (view-only)
Buyers order in the Buyer App and staff manage orders in the Admin Portal, so field agents
**view** orders here — no create, edit, status change or cancel (the old `/orders/new` and
`/orders/:id/edit` URLs redirect). Statuses use the Buyer App labels: Requested, Confirmed,
Delivered, Completed, Declined, Cancelled — "Delivered" reads **Picked up** on a pickup order.

The list shows every kind of order the Buyer App can produce, with the same scrollable filter
chips (All, Requested, Confirmed, Delivered, Completed, Declined, Cancelled) and search. Each card
carries a type tag (*Order now* or *Request*), a method tag (*Delivery* or *Pickup*), "Not in
catalog" for other-crop requests, and the date that matters — "Delivery 20 Oct", "Pickup 22 Oct"
or "Needed by 29 Oct" for requests; the order date is on the detail screen. A **Request** that
is still Requested is not matched to farmers yet: the card shows the crop, requested quantity and
"Not yet matched to a farmer", and the detail adds a note that staff will match it. Declined and
Cancelled orders show their reason on the card and detail, and have no handover check. The detail
screen also shows source (Buyer app or Staff), the order date, buyer requirements, **Pickup
details** (meeting point and time, once a pickup order is Confirmed) and a read-only status flow. Prices follow the buyer price tiers (under 200 kg /
200–999 kg / 1,000 kg+), chosen by the order's total quantity and applied to the whole order
(`lib/mock/crop-refs.ts`).

The agent's part is the **handover check**, per line item, so each farmer's produce is checked
separately. On a Confirmed order the line shows the crop specification and any buyer
requirements as reference, then: received kg, accepted kg (never above received), rejected kg
(calculated), a reason (required when anything is rejected), up to 4 photos, a note, and — for
Pick up orders — "Buyer representative present". Saving locks the check and marks the line
**Checked**; it never changes the order status (staff mark Delivered in the Admin Portal).
Delivered and completed orders show the saved check read-only. A Confirmed order whose delivery
or pickup date is today (or earlier) and that still has an unchecked line shows a calm blue
**Check due today** tag — on the list, the detail and the calendar — and nothing shows before the
date. The dashboard's **Handovers due** card counts those same orders and opens the Orders list
filtered to them.

The only other agent action is **Report a problem** on a line (Farmer cannot deliver, Quantity
short, Quality concern, Other, plus a note). It adds a "Problem reported" badge on the line and
the order and leaves the status alone.

Produce that went into a delivered or completed order is protected: its crop cycle, plot and
farmer can't be deleted, and harvest edits can't drop below what is already allocated.

---

## Known Phase-1 limitations

- Data lives in `localStorage` on the device; it is not shared between agents.
- Document uploads record the chosen file name only — no file is stored or transmitted.
- The notification bell on the dashboard is presentational.
- Photos (handover, certificate) are recorded as generated placeholder images, not uploaded.
- Demo data is sample data: all farmers, plots and crop cycles are placed in the Kampong Cham
  pilot area (Kang Meas, Srey Santhor, Kampong Siem).
- The agent-side order builder (`components/orders/supply-matching.tsx` and the create/update
  functions in `lib/api/orders.ts`) is no longer reachable from the UI and can be deleted.
