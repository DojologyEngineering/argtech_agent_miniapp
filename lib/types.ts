/**
 * Domain model for the ARG TECH field agent app.
 *
 * Phase 1 is UI-only: these types describe the shapes the mock data layer
 * returns today and the shapes the NestJS API is expected to return later.
 */

export type ID = string;

/* ------------------------------------------------------------------ Farmer */

export type Gender = "male" | "female" | "other";

export const EDUCATION_LEVELS = [
  "No formal schooling",
  "Primary school",
  "Grade 9",
  "Grade 12",
  "Vocational training",
  "University",
] as const;
export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

export const CERTIFICATE_TYPES = ["GAP", "Organic", "Other"] as const;
export type CertificateType = (typeof CERTIFICATE_TYPES)[number];

/**
 * The agent uploads the original photo; staff prepare a buyer-safe copy before
 * buyers ever see it.
 */
export interface Certificate {
  id: ID;
  farmerId: ID;
  type: CertificateType;
  issuer: string;
  /** What the certificate covers, e.g. "Tomato production". */
  scope: string;
  expiryDate: string | null; // ISO yyyy-mm-dd
  /** Mock phase: a placeholder image data URI, not the real upload. */
  photo: string | null;
}

export interface FarmerDocuments {
  profilePhotoName: string | null;
  nationalIdName: string | null;
}

export interface Farmer {
  id: ID;
  firstName: string;
  lastName: string;
  gender: Gender | null;
  dateOfBirth: string | null;
  educationLevel: EducationLevel | null;
  /** Labelled "Primary Phone" everywhere it is shown. */
  primaryPhone: string;
  /** Labelled "Secondary Phone" everywhere it is shown. */
  secondaryPhone: string;
  province: string;
  district: string;
  commune: string;
  village: string;
  notes: string;
  documents: FarmerDocuments;
  createdAt: string;
}

export type FarmerInput = Omit<Farmer, "id" | "createdAt" | "documents"> & {
  documents?: Partial<FarmerDocuments>;
};

/* -------------------------------------------------------------------- Plot */

export type PropertyType = "own" | "rent";

export const LAND_TYPES = [
  "Clay Soil",
  "Loam Soil",
  "Sandy Soil",
  "Silt Soil",
  "Alluvial Soil",
] as const;
export type LandType = (typeof LAND_TYPES)[number];

/** [latitude, longitude] pairs, in drawing order. */
export type LatLng = [number, number];

export interface Plot {
  id: ID;
  farmerId: ID;
  name: string;
  property: PropertyType;
  landType: LandType;
  locationText: string;
  /** Polygon traced on the satellite map. Empty until the agent draws it. */
  boundary: LatLng[];
  /**
   * Single source of truth for plot size, computed from `boundary` with Turf.
   * Never entered by hand — see lib/geo.ts.
   */
  areaHectares: number;
  createdAt: string;
}

export type PlotInput = Omit<Plot, "id" | "createdAt" | "areaHectares">;

/* -------------------------------------------------- Crop reference (dropdown) */

export type Season = "Wet Season" | "Dry Season";

/**
 * Fixed reference list used purely as dropdown data — deliberately NOT a
 * browsable catalog module with its own screens.
 */
export interface CropRef {
  id: ID;
  name: string;
  varietyType: string;
  season: Season;
  seedSource: string;
  referencePricePerKg: number;
  daysToHarvest: number;
}

/* -------------------------------------------------------------- Crop cycle */

export type CropCycleStatus = "growing" | "ready_to_harvest" | "harvesting" | "completed";

export const PRODUCTION_METHODS = ["Conventional", "Organic", "GAP", "Mixed"] as const;
export const DELIVERY_FREQUENCIES = ["One-off", "Weekly", "Bi-weekly", "Monthly"] as const;
/** Dropdown options, grouped so the broad kinds and the common products sit together. */
export const FERTILIZER_OPTIONS = [
  { value: "Chemical", group: "Chemical" },
  { value: "Urea", group: "Chemical" },
  { value: "NPK", group: "Chemical" },
  { value: "Organic", group: "Organic" },
  { value: "Compost", group: "Organic" },
  { value: "Manure", group: "Organic" },
  { value: "Mixed", group: "Other" },
  { value: "None", group: "Other" },
] as const;
export const FERTILIZER_TYPES = FERTILIZER_OPTIONS.map((o) => o.value);

export const PESTICIDE_OPTIONS = ["Not used", "Used", "Not sure"] as const;
export type PesticideUse = (typeof PESTICIDE_OPTIONS)[number];

export interface CropCosts {
  seed: number;
  fertilizer: number;
  labor: number;
  other: number;
}

export interface ProductionDetails {
  method: string | null;
  deliveryFrequency: string | null;
  fertilizerType: string | null;
  pesticideUsed: PesticideUse | null;
  /** Optional detail — which product, how often. */
  pesticideDetails: string;
  notes: string;
}

export type ActivityType = "planting" | "harvesting" | "irrigation" | "fertilization" | "delivery";

/** Field events logged against a cycle. The Calendar renders these read-only. */
export interface CropActivity {
  id: ID;
  type: ActivityType;
  date: string;
  note: string;
}

/**
 * One picking trip — a physical event only. Vegetables like tomato, cucumber,
 * chili, eggplant and long bean are picked repeatedly over weeks; a
 * single-harvest crop like cabbage just ends up with one entry.
 *
 * Deliberately carries no price and no buyer: harvesting is not selling.
 * Money is recorded on Order line items instead.
 */
export interface HarvestLogEntry {
  id: ID;
  date: string;
  quantityKg: number;
  note: string;
}

/** Manually loggable field work. Planting/harvesting/delivery derive from other records. */
export const MANUAL_ACTIVITY_TYPES = ["irrigation", "fertilization"] as const;
export type ManualActivityType = (typeof MANUAL_ACTIVITY_TYPES)[number];

export interface CropCycle {
  id: ID;
  farmerId: ID;
  plotId: ID;
  cropRefId: ID;
  /** Snapshotted from the crop reference at selection time, still editable. */
  cropName: string;
  varietyType: string;
  season: Season;
  seedSource: string;
  referencePricePerKg: number;

  plantingDate: string;
  expectedHarvestDate: string;

  /** Copied from the linked plot's calculated area — not re-entered here. */
  cultivatedAreaHectares: number;

  costs: CropCosts;
  expectedOutputKg: number;
  estimatedPricePerKg: number;

  /** Every picking logged so far. Total output/average price are derived — see lib/derive.ts. */
  harvestLog: HarvestLogEntry[];
  /** Set only by the manual "Mark cycle complete" action — there's no single date that means "done picking". */
  completedAt: string | null;

  production: ProductionDetails;
  activities: CropActivity[];
  createdAt: string;
}

export type CropCycleInput = Omit<CropCycle, "id" | "createdAt" | "activities" | "harvestLog"> & {
  activities?: CropActivity[];
  harvestLog?: HarvestLogEntry[];
};

/* ------------------------------------------------------------------- Order */

/**
 * Same labels as the Buyer App. Orders are raised in the Buyer App or by staff
 * in the Admin Portal and move through these states there — field agents only
 * view them, record the handover check, and report problems.
 */
export type OrderStatus =
  | "requested"
  | "confirmed"
  | "delivered"
  | "completed"
  | "declined"
  | "cancelled";
export type DeliveryMethod = "pickup" | "delivery";
export type OrderSource = "buyer_app" | "staff";

/** "Order now" draws on stock that is available today; a "Request" is for a future date. */
export type OrderKind = "order_now" | "request";

/** What the buyer asked for, as typed in the Buyer App. */
export interface RequestedCrop {
  /** Null for an "Other crop" request: a crop that is not in the catalog. */
  cropRefId: ID | null;
  cropName: string;
  quantityKg: number;
}

/** Where and when the buyer collects a Pickup order (set by staff). */
export interface PickupDetails {
  meetingPoint: string;
  /** e.g. "08:00 – 10:00" */
  time: string | null;
  /** A recognisable spot next to the meeting point. */
  landmark?: string | null;
  /** Link that opens the meeting point in a maps app. */
  mapUrl?: string | null;
  /** Who collects the produce for the buyer. */
  collectorName?: string | null;
  collectorPhone?: string | null;
}

export const PROBLEM_REASONS = [
  "Farmer cannot deliver",
  "Quantity short",
  "Quality concern",
  "Other",
] as const;
export type ProblemReason = (typeof PROBLEM_REASONS)[number];

export const REJECT_REASONS = [
  "Too ripe",
  "Not ripe enough",
  "Cracks or damage",
  "Wrong size",
  "Other",
] as const;
export type RejectReason = (typeof REJECT_REASONS)[number];

/** Raised by the agent against one line. Never changes the order status. */
export interface ProblemReport {
  reason: ProblemReason;
  note: string;
  reportedAt: string;
}

/** What the buyer asked for beyond the standard crop specification. */
export interface OrderRequirements {
  ripeness: string | null;
  size: string | null;
}

/** The agent's check of one farmer's produce at handover. Locked once saved. */
export interface HandoverCheck {
  receivedKg: number;
  acceptedKg: number;
  /** receivedKg − acceptedKg. */
  rejectedKg: number;
  rejectReason: RejectReason | null;
  /** Mock phase: placeholder image data URIs. */
  photos: string[];
  note: string;
  /** Only asked for Pick up orders. */
  buyerRepPresent: boolean | null;
  checkedAt: string;
}

/**
 * One allocation from a single crop cycle. An order can hold several of
 * these, so one buyer's requirement can be filled from several farmers.
 * Farmer, plot and crop are always read through `cropCycleId` — never copied.
 */
export interface OrderLineItem {
  id: ID;
  cropCycleId: ID;
  quantityKg: number;
  pricePerKg: number;
  problem: ProblemReport | null;
  handoverCheck: HandoverCheck | null;
}

export interface Order {
  id: ID;
  code: string; // PO-001
  buyer: string;
  source: OrderSource;
  kind: OrderKind;
  /** The crop and quantity asked for. A confirmed order can hold less (see lineItems). */
  requested: RequestedCrop;
  orderDate: string;
  /** Delivery or pickup date for orders; the needed-by date for a request. Shown on the Calendar. */
  deliveryDate: string;
  deliveryMethod: DeliveryMethod;
  /** Pickup orders only, once confirmed. */
  pickup: PickupDetails | null;
  requirements: OrderRequirements;
  /** Free-text requirements on an "Other crop" request. */
  requirementsText: string | null;
  /** Why staff declined the request or cancelled the order. */
  reason: string | null;
  /** Tracked for the whole order, not per line item. */
  status: OrderStatus;
  notes: string;
  lineItems: OrderLineItem[];
  createdAt: string;
}

export type OrderLineItemInput = Pick<OrderLineItem, "cropCycleId" | "quantityKg" | "pricePerKg">;

export type OrderInput = Omit<
  Order,
  | "id"
  | "code"
  | "createdAt"
  | "lineItems"
  | "source"
  | "kind"
  | "requested"
  | "pickup"
  | "requirements"
  | "requirementsText"
  | "reason"
> & {
  lineItems: OrderLineItemInput[];
};

/* -------------------------------------------------------- View-model shapes */

export interface FarmerSummary extends Farmer {
  fullName: string;
  plotCount: number;
  /** Labelled "orders" in the UI — the mockup's "carts" was a mislabel. */
  orderCount: number;
  certificateCount: number;
  locationLabel: string;
}

export interface PlotSummary extends Plot {
  farmerName: string;
}

export interface CropCycleSummary extends CropCycle {
  farmerName: string;
  plotName: string;
  status: CropCycleStatus;
  totalCost: number;

  /** Physical output: sum of every Harvest Log entry's quantity. */
  harvestedQuantityKg: number;
  /** Sum of every Order line item quantity referencing this cycle. */
  soldQuantityKg: number;
  /** Harvested so far − sold so far. Also shown as "unsold surplus". */
  availableToSellKg: number;

  /** Money only exists once sold — summed from Order line items. */
  totalRevenue: number;
  averageSalePricePerKg: number | null;
  /**
   * The kg the cycle's cost is spread over: expected output while picking is
   * still under way, the actual harvest once the cycle is complete.
   */
  costBasisKg: number;
  /** Total cost ÷ cost basis — the unit cost every kg must clear. Null with no basis. */
  breakEvenPricePerKg: number | null;
  /** Share of the total cost attributable to the kg sold so far (break-even × sold). */
  costOfSoldKg: number;
  /** (Revenue − cost of the kg sold) ÷ revenue. Null until something is sold. */
  marginPercent: number | null;
}

export interface OrderLineItemSummary extends OrderLineItem {
  farmerId: ID;
  farmerName: string;
  plotName: string;
  cropName: string;
  varietyType: string;
  lineTotal: number;
  cropRefId: ID;
}

export interface OrderSummary extends Omit<Order, "lineItems"> {
  lineItems: OrderLineItemSummary[];
  totalQuantityKg: number;
  totalPrice: number;
  /** Distinct farmers supplying this order — an order may pull from several. */
  farmerNames: string[];
  cropNames: string[];
  /** At least one line carries a "Problem reported" flag. */
  hasProblem: boolean;
  /** Confirmed, delivery date reached, and some line still has no saved handover check. */
  handoverDue: boolean;
}

/** A row on the Supply Matching screen: harvested stock still unsold. */
export interface SupplyMatch {
  cropCycleId: ID;
  farmerId: ID;
  farmerName: string;
  plotName: string;
  cropRefId: ID;
  cropName: string;
  varietyType: string;
  availableToSellKg: number;
  harvestedQuantityKg: number;
  estimatedPricePerKg: number;
  lastHarvestDate: string | null;
}

/** Forward-looking expected supply, bucketed by period, for one crop. */
export interface SupplyForecastBucket {
  /** ISO date of the bucket start, used as a stable key. */
  periodStart: string;
  label: string;
  expectedKg: number;
  cycleCount: number;
}

export interface SupplyForecastGroup {
  cropRefId: ID;
  cropName: string;
  totalExpectedKg: number;
  buckets: SupplyForecastBucket[];
}

export interface CalendarActivity {
  id: string;
  type: ActivityType;
  date: string;
  /** Null for deliveries, which belong to an order rather than a single cycle. */
  cropCycleId: ID | null;
  orderId: ID | null;
  /** Where tapping the entry goes. */
  href: string;
  cropName: string;
  plotName: string;
  farmerName: string;
  /** Primary and secondary lines shown on the card. */
  title: string;
  subtitle: string;
  /** Expected harvests still to happen are flagged so the UI can dim them. */
  projected: boolean;
}
