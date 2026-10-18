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
    seedSource: "Thailand",
    referencePricePerKg: 0.35,
    daysToHarvest: 40,
  },
  {
    id: "crop_tomato",
    name: "Tomato",
    varietyType: "Local Round",
    season: "Dry Season",
    seedSource: "Thailand",
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
    seedSource: "Thailand",
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
