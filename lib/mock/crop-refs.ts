import type { CropRef } from "../types";

/**
 * Dropdown source only. Intentionally not exposed as a "Crop Catalog" module —
 * selecting one of these pre-fills a crop cycle, and every field stays editable.
 */
export const CROP_REFS: CropRef[] = [
  {
    id: "crop_jasmine",
    name: "Jasmine Rice",
    varietyType: "Phka Rumduol",
    season: "Wet Season",
    seedSource: "Vietnam",
    referencePricePerKg: 0.45,
    daysToHarvest: 180,
  },
  {
    id: "crop_basmati",
    name: "Basmati Rice",
    varietyType: "Dehradun",
    season: "Dry Season",
    seedSource: "India",
    referencePricePerKg: 0.8,
    daysToHarvest: 150,
  },
  {
    id: "crop_arborio",
    name: "Arborio Rice",
    varietyType: "Carnaroli",
    season: "Dry Season",
    seedSource: "Italy",
    referencePricePerKg: 1.2,
    daysToHarvest: 160,
  },
  {
    id: "crop_sushi",
    name: "Sushi Rice",
    varietyType: "Koshihikari",
    season: "Wet Season",
    seedSource: "Japan",
    referencePricePerKg: 0.95,
    daysToHarvest: 140,
  },
  {
    id: "crop_brown",
    name: "Brown Rice",
    varietyType: "Long Grain",
    season: "Wet Season",
    seedSource: "USA",
    referencePricePerKg: 0.5,
    daysToHarvest: 170,
  },
];

export function findCropRef(id: string | null | undefined) {
  return CROP_REFS.find((c) => c.id === id) ?? null;
}
