import type { CropRef } from "../types";

/**
 * Dropdown source only. Intentionally not exposed as a "Crop Catalog" module —
 * selecting one of these pre-fills a crop cycle, and every field stays editable.
 *
 * ARG TECH's actual market is fruit and vegetable smallholders in Cambodia,
 * not rice — days-to-harvest here reflect a first picking, since most of
 * these crops (all but cabbage) keep producing over several more weeks.
 */
export const CROP_REFS: CropRef[] = [
  {
    id: "crop_cucumber",
    name: "Cucumber",
    varietyType: "Local Hybrid F1",
    season: "Wet Season",
    seedSource: "Local",
    referencePricePerKg: 0.35,
    daysToHarvest: 40,
  },
  {
    id: "crop_tomato",
    name: "Tomato",
    varietyType: "Local Round",
    season: "Dry Season",
    seedSource: "Local",
    referencePricePerKg: 0.6,
    daysToHarvest: 60,
  },
  {
    id: "crop_longbean",
    name: "Long Bean",
    varietyType: "Yardlong Green",
    season: "Wet Season",
    seedSource: "Vietnam",
    referencePricePerKg: 0.5,
    daysToHarvest: 45,
  },
  {
    id: "crop_morningglory",
    name: "Morning Glory",
    varietyType: "Trakuon Sre",
    season: "Wet Season",
    seedSource: "Local",
    referencePricePerKg: 0.25,
    daysToHarvest: 25,
  },
  {
    id: "crop_chili",
    name: "Chili",
    varietyType: "Bird's Eye (Marech Kdao)",
    season: "Dry Season",
    seedSource: "Local",
    referencePricePerKg: 1.5,
    daysToHarvest: 75,
  },
  {
    id: "crop_cabbage",
    name: "Cabbage",
    varietyType: "Green Ball",
    season: "Dry Season",
    seedSource: "Korea",
    referencePricePerKg: 0.3,
    daysToHarvest: 65,
  },
  {
    id: "crop_eggplant",
    name: "Eggplant",
    varietyType: "Long Purple",
    season: "Wet Season",
    seedSource: "Vietnam",
    referencePricePerKg: 0.4,
    daysToHarvest: 70,
  },
];

export function findCropRef(id: string | null | undefined) {
  return CROP_REFS.find((c) => c.id === id) ?? null;
}

/* ------------------------------------------------------ Crop specification */

/**
 * What buyers expect of each crop at handover (sample data). Shown to the
 * agent as read-only reference on the crop cycle and on the handover check.
 */
export interface CropSpec {
  ripeness: string;
  size: string;
  condition: string;
  bestUsedWithin: string;
}

export const CROP_SPECS: Record<string, CropSpec> = {
  crop_tomato: {
    ripeness: "Firm, mostly red-ripe",
    size: "Medium",
    condition: "No cracks, rot or bruising",
    bestUsedWithin: "7 days",
  },
  crop_cucumber: {
    ripeness: "Firm, dark green",
    size: "Medium",
    condition: "Straight, no soft spots or yellowing",
    bestUsedWithin: "5 days",
  },
  crop_longbean: {
    ripeness: "Tender, snaps cleanly",
    size: "Medium length",
    condition: "No spots or overgrown pods",
    bestUsedWithin: "4 days",
  },
  crop_cabbage: {
    ripeness: "Firm, compact heads",
    size: "Medium to large",
    condition: "No split heads or damaged outer leaves",
    bestUsedWithin: "14 days",
  },
  crop_morningglory: {
    ripeness: "Fresh, tender leaves",
    size: "Standard bundle",
    condition: "No yellowing or wilting",
    bestUsedWithin: "2 days",
  },
  crop_chili: {
    ripeness: "Fully colored",
    size: "Standard",
    condition: "No soft spots or shriveling",
    bestUsedWithin: "7 days",
  },
  crop_eggplant: {
    ripeness: "Firm, glossy",
    size: "Medium",
    condition: "No blemishes or soft spots",
    bestUsedWithin: "7 days",
  },
};

export function findCropSpec(cropRefId: string | null | undefined): CropSpec | null {
  return (cropRefId && CROP_SPECS[cropRefId]) || null;
}

/* -------------------------------------------------------- Buyer price tiers */

/** Buyer App price per kg by order quantity: under 200 kg / 200–999 kg / 1,000 kg and above. */
const BUYER_PRICE_TIERS: Record<string, [number, number, number]> = {
  crop_tomato: [0.65, 0.6, 0.55],
  crop_cucumber: [0.5, 0.48, 0.45],
  crop_longbean: [0.75, 0.7, 0.65],
  crop_morningglory: [0.38, 0.35, 0.32],
  crop_chili: [1.3, 1.2, 1.1],
  crop_cabbage: [0.45, 0.42, 0.4],
  crop_eggplant: [0.6, 0.55, 0.5],
};

/** The tier price applies to the whole order, chosen by the order's total quantity. */
export function buyerTierPricePerKg(cropRefId: string, orderTotalKg: number): number {
  const tiers = BUYER_PRICE_TIERS[cropRefId];
  if (!tiers) return findCropRef(cropRefId)?.referencePricePerKg ?? 0;
  return orderTotalKg < 200 ? tiers[0] : orderTotalKg < 1000 ? tiers[1] : tiers[2];
}
