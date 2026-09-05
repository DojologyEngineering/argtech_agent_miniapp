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
  crops/                       crop cycles: list · new · [id] · [id]/edit
  calendar/                    read-only month + list views
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
consistently, personal info, linked plots, document uploads (profile photo, national ID),
and certificates; full add/edit forms with cascading Province → District → Commune →
Village selects. Farmer cards count **orders**, not "carts".

### Plots
Belongs to one farmer. The **area calculation is the single source of truth**: the agent
traces the field on Esri satellite imagery with Geoman, and Turf converts the polygon to
hectares. The length/width read-outs are the bounding box of that same polygon, labelled
as informational — there is no second, independent way to set the area. Saving says
**Save Plot**.

### Crops (Crop Cycles)
Farmer-linked plantings, not a crop catalog. Each record links Farmer → Plot → Crop, with
planting / expected harvest / actual harvest dates, itemised costs (seed, fertilizer,
labor, other), expected and actual output in kg, estimated and actual price **per kg**,
and read-only **break-even price** and **margin** derived from those. Cultivated area is
inherited from the plot's calculated hectares — never re-entered. Status (growing / ready
to harvest / harvested) is derived from the dates.

The crop list (Jasmine, Basmati, Arborio, Sushi, Brown Rice) exists only as dropdown data
in `lib/mock/crop-refs.ts` — selecting one pre-fills variety, season, seed source and
reference price, all still editable. There is deliberately **no Crop Catalog screen**.
Seasons are **Wet Season** / **Dry Season** only.

### Calendar
Read-only, with month-grid and list views. Every entry is derived from a crop cycle, and
each badge carries its **own** activity type — Planting, Harvesting, Irrigation,
Fertilization — with a colour legend. Expected (not yet actual) harvests are marked
"Planned". Tapping an activity opens its crop cycle.

### Orders
An order hangs off a **harvested crop cycle**, which carries farmer, plot, crop and actual
output — no independent re-selection. Only cycles with an actual harvest and no existing
order can be picked. Status tiles filter Pending / Delivery / Completed, the detail screen
shows the Pending → Delivered → Complete flow with the matching action
(**Mark Delivered** / **Mark Completed**), and saving says **Save Order**.

---

## Known Phase-1 limitations

- Data lives in `localStorage` on the device; it is not shared between agents.
- Document uploads record the chosen file name only — no file is stored or transmitted.
- Field activities (irrigation, fertilization) are seeded on crop cycles and shown
  read-only in the calendar; there is no entry form for them yet.
- The notification bell on the dashboard is presentational.
