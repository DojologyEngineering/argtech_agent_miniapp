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

export interface Certificate {
  id: ID;
  farmerId: ID;
  title: string;
  issuedDate: string; // ISO yyyy-mm-dd
  expiryDate: string | null;
  notes: string;
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

export type CropCycleStatus = "growing" | "ready_to_harvest" | "harvested";

export const PRODUCTION_METHODS = ["Conventional", "Organic", "GAP", "Mixed"] as const;
export const DELIVERY_FREQUENCIES = ["One-off", "Weekly", "Bi-weekly", "Monthly"] as const;
export const FERTILIZER_TYPES = ["Urea", "NPK", "Compost", "Manure", "None"] as const;

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
  pesticideUsed: string | null;
  notes: string;
}

export type ActivityType = "planting" | "harvesting" | "irrigation" | "fertilization";

/** Field events logged against a cycle. The Calendar renders these read-only. */
export interface CropActivity {
  id: ID;
  type: ActivityType;
  date: string;
  note: string;
}

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
  actualHarvestDate: string | null;

  /** Copied from the linked plot's calculated area — not re-entered here. */
  cultivatedAreaHectares: number;

  costs: CropCosts;
  expectedOutputKg: number;
  actualOutputKg: number | null;
  estimatedPricePerKg: number;
  actualPricePerKg: number | null;

  production: ProductionDetails;
  activities: CropActivity[];
  createdAt: string;
}

export type CropCycleInput = Omit<CropCycle, "id" | "createdAt" | "activities"> & {
  activities?: CropActivity[];
};

/* ------------------------------------------------------------------- Order */

export type OrderStatus = "pending" | "delivered" | "completed";
export type DeliveryMethod = "pickup" | "delivery";
export type Unit = "KG" | "TON" | "SACK";

export interface Order {
  id: ID;
  code: string; // PO-001
  /** Orders hang off a completed crop cycle; farmer/plot/crop come from it. */
  cropCycleId: ID;
  quantity: number;
  unit: Unit;
  totalPrice: number;
  buyer: string;
  deliveryMethod: DeliveryMethod;
  status: OrderStatus;
  notes: string;
  createdAt: string;
}

export type OrderInput = Omit<Order, "id" | "code" | "createdAt">;

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
  breakEvenPricePerKg: number | null;
  projectedRevenue: number;
  marginPercent: number | null;
}

export interface OrderSummary extends Order {
  farmerName: string;
  plotName: string;
  cropName: string;
  cycle: CropCycle | null;
}

export interface CalendarActivity {
  id: string;
  type: ActivityType;
  date: string;
  cropCycleId: ID;
  cropName: string;
  plotName: string;
  farmerName: string;
  /** Expected harvests still to happen are flagged so the UI can dim them. */
  projected: boolean;
}
