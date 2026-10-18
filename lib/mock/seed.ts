import { daysFromToday } from "../format";
import { hectaresFromBoundary } from "../geo";
import type { ActivityType, Certificate, CropCycle, Farmer, LatLng, Order, Plot } from "../types";
import { CROP_REFS } from "./crop-refs";

/** Builds a slightly irregular field polygon around a centre point. */
function field(center: LatLng, widthM: number, heightM: number, skew = 0.12): LatLng[] {
  const [lat, lng] = center;
  const dLat = heightM / 2 / 110_574;
  const dLng = widthM / 2 / (111_320 * Math.cos((lat * Math.PI) / 180));
  return [
    [lat + dLat, lng - dLng],
    [lat + dLat * (1 - skew), lng + dLng],
    [lat - dLat, lng + dLng * (1 - skew)],
    [lat - dLat * (1 - skew / 2), lng - dLng],
  ];
}

function plot(
  id: string,
  farmerId: string,
  name: string,
  property: Plot["property"],
  landType: Plot["landType"],
  locationText: string,
  boundary: LatLng[],
): Plot {
  return {
    id,
    farmerId,
    name,
    property,
    landType,
    locationText,
    boundary,
    areaHectares: hectaresFromBoundary(boundary),
    createdAt: daysFromToday(-320),
  };
}

export const SEED_FARMERS: Farmer[] = [
  {
    id: "farmer_1",
    firstName: "Sokha",
    lastName: "Meas",
    gender: "male",
    dateOfBirth: "1985-03-15",
    educationLevel: "Grade 12",
    primaryPhone: "098 765 432",
    secondaryPhone: "012 445 118",
    province: "Siem Reap",
    district: "Siem Reap City",
    commune: "Wat Bo",
    village: "Wat Bo",
    notes: "Long-standing supplier, reliable with wet-season vegetables.",
    documents: { profilePhotoName: null, nationalIdName: "sokha-nid.jpg" },
    createdAt: daysFromToday(-400),
  },
  {
    id: "farmer_2",
    firstName: "Kimly",
    lastName: "Lay",
    gender: "female",
    dateOfBirth: "1991-07-02",
    educationLevel: "Grade 9",
    primaryPhone: "011 240 907",
    secondaryPhone: "",
    province: "Battambang",
    district: "Battambang City",
    commune: "Svay Por",
    village: "Romchek IV",
    notes: "Interested in organic certification next cycle.",
    documents: { profilePhotoName: null, nationalIdName: null },
    createdAt: daysFromToday(-360),
  },
  {
    id: "farmer_3",
    firstName: "Chantrea",
    lastName: "Sok",
    gender: "female",
    dateOfBirth: "1978-11-23",
    educationLevel: "Primary school",
    primaryPhone: "092 118 640",
    secondaryPhone: "078 902 331",
    province: "Kampong Thom",
    district: "Stueng Saen",
    commune: "Kampong Roteh",
    village: "Ta Ches",
    notes: "",
    documents: { profilePhotoName: null, nationalIdName: null },
    createdAt: daysFromToday(-290),
  },
  {
    id: "farmer_4",
    firstName: "Virak",
    lastName: "Phan",
    gender: "male",
    dateOfBirth: "1988-01-09",
    educationLevel: "Vocational training",
    primaryPhone: "016 703 522",
    secondaryPhone: "089 447 210",
    province: "Prey Veng",
    district: "Ba Phnum",
    commune: "Cheung Phnom",
    village: "Ampil Ta Pok",
    notes: "Runs a shared tractor with two neighbouring households.",
    documents: { profilePhotoName: null, nationalIdName: null },
    createdAt: daysFromToday(-210),
  },
  {
    id: "farmer_5",
    firstName: "Sereypheap",
    lastName: "Ly",
    gender: "male",
    dateOfBirth: "1995-05-30",
    educationLevel: "University",
    primaryPhone: "070 336 894",
    secondaryPhone: "",
    province: "Kampot",
    district: "Tuek Chhou",
    commune: "Trapeang Sangkae",
    village: "Kandal",
    notes: "New to the programme, registered this season.",
    documents: { profilePhotoName: null, nationalIdName: null },
    createdAt: daysFromToday(-70),
  },
];

export const SEED_CERTIFICATES: Certificate[] = [
  {
    id: "cert_1",
    farmerId: "farmer_2",
    title: "Organic Certification",
    issuedDate: daysFromToday(-500),
    expiryDate: daysFromToday(230),
    notes: "Issued by the Cambodian Organic Agriculture Association.",
  },
  {
    id: "cert_2",
    farmerId: "farmer_3",
    title: "Cambodia GAP",
    issuedDate: daysFromToday(-620),
    expiryDate: daysFromToday(110),
    notes: "",
  },
  {
    id: "cert_3",
    farmerId: "farmer_3",
    title: "Water Use Training",
    issuedDate: daysFromToday(-180),
    expiryDate: null,
    notes: "Completed the two-day provincial irrigation workshop.",
  },
  {
    id: "cert_4",
    farmerId: "farmer_4",
    title: "Fresh Produce Handling",
    issuedDate: daysFromToday(-95),
    expiryDate: daysFromToday(635),
    notes: "",
  },
];

export const SEED_PLOTS: Plot[] = [
  plot(
    "plot_1",
    "farmer_1",
    "Vegetable Plot A",
    "own",
    "Clay Soil",
    "Wat Bo, Siem Reap City, Siem Reap",
    field([13.3567, 103.8601], 260, 190),
  ),
  plot(
    "plot_2",
    "farmer_1",
    "Vegetable Plot B",
    "rent",
    "Loam Soil",
    "Trang village, Siem Reap City, Siem Reap",
    field([13.3612, 103.8688], 180, 150, 0.2),
  ),
  plot(
    "plot_3",
    "farmer_2",
    "Riverside Plot",
    "own",
    "Alluvial Soil",
    "Romchek IV, Battambang City, Battambang",
    field([13.0912, 103.2029], 300, 210),
  ),
  plot(
    "plot_4",
    "farmer_2",
    "Vegetable Plot C",
    "own",
    "Clay Soil",
    "Svay Por, Battambang City, Battambang",
    field([13.0854, 103.1961], 240, 200, 0.05),
  ),
  plot(
    "plot_5",
    "farmer_3",
    "Vegetable Plot D",
    "rent",
    "Silt Soil",
    "Ta Ches, Stueng Saen, Kampong Thom",
    field([12.7108, 104.8886], 320, 240),
  ),
  plot(
    "plot_6",
    "farmer_4",
    "Vegetable Plot E",
    "own",
    "Sandy Soil",
    "Ampil Ta Pok, Ba Phnum, Prey Veng",
    field([11.4032, 105.4771], 220, 180, 0.18),
  ),
  plot(
    "plot_7",
    "farmer_5",
    "Hill Farm Terrace",
    "own",
    "Loam Soil",
    "Kandal, Tuek Chhou, Kampot",
    field([10.6224, 104.1503], 170, 140),
  ),
];

const ref = (id: string) => CROP_REFS.find((c) => c.id === id)!;
const areaOf = (plotId: string) => SEED_PLOTS.find((p) => p.id === plotId)!.areaHectares;

interface HarvestSeed {
  offset: number;
  quantityKg: number;
  note?: string;
}

interface CycleSeed {
  id: string;
  farmerId: string;
  plotId: string;
  cropRefId: string;
  plantingOffset: number;
  harvestOffset: number;
  costs: CropCycle["costs"];
  expectedOutputKg: number;
  estimatedPricePerKg: number;
  harvests?: HarvestSeed[];
  /** Offset the agent tapped "Mark cycle complete" — omit while still picking. */
  completedOffset?: number;
  production?: Partial<CropCycle["production"]>;
  extraActivities?: { type: ActivityType; offset: number; note: string }[];
}

function cycle(input: CycleSeed): CropCycle {
  const r = ref(input.cropRefId);
  return {
    id: input.id,
    farmerId: input.farmerId,
    plotId: input.plotId,
    cropRefId: input.cropRefId,
    cropName: r.name,
    varietyType: r.varietyType,
    season: r.season,
    seedSource: r.seedSource,
    referencePricePerKg: r.referencePricePerKg,
    plantingDate: daysFromToday(input.plantingOffset),
    expectedHarvestDate: daysFromToday(input.harvestOffset),
    cultivatedAreaHectares: areaOf(input.plotId),
    costs: input.costs,
    expectedOutputKg: input.expectedOutputKg,
    estimatedPricePerKg: input.estimatedPricePerKg,
    harvestLog: (input.harvests ?? []).map((h, i) => ({
      id: `${input.id}_harvest_${i}`,
      date: daysFromToday(h.offset),
      quantityKg: h.quantityKg,
      note: h.note ?? "",
    })),
    completedAt: input.completedOffset != null ? daysFromToday(input.completedOffset) : null,
    production: {
      method: input.production?.method ?? null,
      deliveryFrequency: input.production?.deliveryFrequency ?? null,
      fertilizerType: input.production?.fertilizerType ?? null,
      pesticideUsed: input.production?.pesticideUsed ?? null,
      notes: input.production?.notes ?? "",
    },
    activities: (input.extraActivities ?? []).map((a, i) => ({
      id: `${input.id}_act_${i}`,
      type: a.type,
      date: daysFromToday(a.offset),
      note: a.note,
    })),
    createdAt: daysFromToday(input.plantingOffset - 3),
  };
}

export const SEED_CROP_CYCLES: CropCycle[] = [
  // Completed, multi-harvest: cucumber was picked every few days for two weeks.
  cycle({
    id: "cycle_1",
    farmerId: "farmer_1",
    plotId: "plot_1",
    cropRefId: "crop_cucumber",
    plantingOffset: -75,
    harvestOffset: -35,
    costs: { seed: 40, fertilizer: 60, labor: 150, other: 20 },
    expectedOutputKg: 900,
    estimatedPricePerKg: 0.35,
    harvests: [
      { offset: -33, quantityKg: 120, note: "First picking" },
      { offset: -29, quantityKg: 150 },
      { offset: -25, quantityKg: 160 },
      { offset: -21, quantityKg: 140 },
      { offset: -17, quantityKg: 110 },
      { offset: -13, quantityKg: 90, note: "Final picking, vines declining" },
    ],
    completedOffset: -10,
    production: {
      method: "Conventional",
      deliveryFrequency: "Weekly",
      fertilizerType: "NPK",
      pesticideUsed: "Neem oil",
      notes: "Picked twice weekly during peak season.",
    },
    extraActivities: [{ type: "irrigation", offset: -50, note: "Drip line set up" }],
  }),
  // Harvesting, in progress: tomato picking has started, more expected.
  cycle({
    id: "cycle_2",
    farmerId: "farmer_2",
    plotId: "plot_3",
    cropRefId: "crop_tomato",
    plantingOffset: -80,
    harvestOffset: -20,
    costs: { seed: 60, fertilizer: 90, labor: 220, other: 35 },
    expectedOutputKg: 1400,
    estimatedPricePerKg: 0.6,
    harvests: [
      { offset: -18, quantityKg: 180, note: "First picking" },
      { offset: -11, quantityKg: 220 },
      { offset: -4, quantityKg: 240, note: "Peak production" },
    ],
    production: { method: "Conventional", deliveryFrequency: "Weekly", fertilizerType: "NPK", pesticideUsed: "Mancozeb", notes: "" },
    extraActivities: [{ type: "irrigation", offset: -60, note: "Canal water released" }],
  }),
  // Completed, single harvest: cabbage is cut all at once.
  cycle({
    id: "cycle_3",
    farmerId: "farmer_3",
    plotId: "plot_5",
    cropRefId: "crop_cabbage",
    plantingOffset: -75,
    harvestOffset: -10,
    costs: { seed: 45, fertilizer: 70, labor: 160, other: 25 },
    expectedOutputKg: 2000,
    estimatedPricePerKg: 0.3,
    harvests: [{ offset: -8, quantityKg: 2150, note: "Full plot cut in one day" }],
    completedOffset: -7,
    production: { method: "GAP", fertilizerType: "Compost", pesticideUsed: "None", notes: "Good head formation this cycle." },
  }),
  // Completed, multi-harvest: eggplant kept producing for over a month before the plot was cleared.
  cycle({
    id: "cycle_4",
    farmerId: "farmer_4",
    plotId: "plot_6",
    cropRefId: "crop_eggplant",
    plantingOffset: -100,
    harvestOffset: -30,
    costs: { seed: 35, fertilizer: 55, labor: 190, other: 30 },
    expectedOutputKg: 1100,
    estimatedPricePerKg: 0.4,
    harvests: [
      { offset: -28, quantityKg: 140 },
      { offset: -21, quantityKg: 160 },
      { offset: -14, quantityKg: 150 },
      { offset: -7, quantityKg: 130 },
      { offset: -1, quantityKg: 100, note: "Final harvest before plot cleared" },
    ],
    completedOffset: 0,
    production: { method: "Conventional", fertilizerType: "NPK", pesticideUsed: "Spinosad", notes: "" },
  }),
  // Ready to harvest: expected date has passed but no picking logged yet.
  cycle({
    id: "cycle_5",
    farmerId: "farmer_1",
    plotId: "plot_2",
    cropRefId: "crop_longbean",
    plantingOffset: -50,
    harvestOffset: -5,
    costs: { seed: 25, fertilizer: 40, labor: 110, other: 15 },
    expectedOutputKg: 750,
    estimatedPricePerKg: 0.5,
    production: { method: "Conventional", notes: "Pods forming well, ready for first pick." },
  }),
  // Growing: recently planted, expected harvest still weeks away.
  cycle({
    id: "cycle_6",
    farmerId: "farmer_2",
    plotId: "plot_4",
    cropRefId: "crop_morningglory",
    plantingOffset: -10,
    harvestOffset: 15,
    costs: { seed: 10, fertilizer: 15, labor: 40, other: 5 },
    expectedOutputKg: 400,
    estimatedPricePerKg: 0.25,
    production: { method: "Conventional", fertilizerType: "Urea", notes: "" },
  }),
  // Harvesting, in progress: chili picked weekly, plants still flowering.
  cycle({
    id: "cycle_7",
    farmerId: "farmer_3",
    plotId: "plot_5",
    cropRefId: "crop_chili",
    plantingOffset: -60,
    harvestOffset: -15,
    costs: { seed: 50, fertilizer: 65, labor: 200, other: 40 },
    expectedOutputKg: 850,
    estimatedPricePerKg: 1.5,
    harvests: [
      { offset: -12, quantityKg: 60, note: "First picking" },
      { offset: -6, quantityKg: 80 },
      { offset: -1, quantityKg: 70, note: "Picking continues weekly" },
    ],
    production: { method: "Conventional", pesticideUsed: "Abamectin", notes: "Picking weekly, plants still flowering." },
  }),
  // Harvesting: cucumber just started, only an early thinning pick logged.
  cycle({
    id: "cycle_8",
    farmerId: "farmer_5",
    plotId: "plot_7",
    cropRefId: "crop_cucumber",
    plantingOffset: -35,
    harvestOffset: 5,
    costs: { seed: 30, fertilizer: 45, labor: 100, other: 15 },
    expectedOutputKg: 700,
    estimatedPricePerKg: 0.35,
    harvests: [{ offset: -2, quantityKg: 90, note: "Early thinning picks" }],
    production: { method: "Organic", fertilizerType: "Manure", notes: "" },
  }),
  // Growing: newly planted, nothing to log yet.
  cycle({
    id: "cycle_9",
    farmerId: "farmer_4",
    plotId: "plot_6",
    cropRefId: "crop_tomato",
    plantingOffset: -8,
    harvestOffset: 52,
    costs: { seed: 55, fertilizer: 80, labor: 150, other: 20 },
    expectedOutputKg: 1300,
    estimatedPricePerKg: 0.6,
    extraActivities: [{ type: "irrigation", offset: 2, note: "First irrigation" }],
  }),
];

/**
 * Orders are buyer-facing transactions made of line items, so one order can
 * be filled from several farmers' crop cycles. PO-004 does exactly that —
 * two cucumber growers filling one buyer's requirement.
 *
 * Resulting supply picture (harvested / sold / available):
 *   cycle_1 cucumber  770 / 700 /  70
 *   cycle_2 tomato    640 /   0 / 640   ← unsold surplus
 *   cycle_3 cabbage  2150 /2150 /   0   ← fully sold
 *   cycle_4 eggplant  680 / 680 /   0
 *   cycle_7 chili     210 / 150 /  60
 *   cycle_8 cucumber   90 /  60 /  30
 */
export const SEED_ORDERS: Order[] = [
  {
    id: "order_1",
    code: "PO-001",
    buyer: "Local Market Vendor",
    orderDate: daysFromToday(-16),
    deliveryDate: daysFromToday(-14),
    deliveryMethod: "pickup",
    status: "completed",
    notes: "Sold across multiple market days.",
    lineItems: [{ id: "line_1a", cropCycleId: "cycle_1", quantityKg: 500, pricePerKg: 0.35 }],
    createdAt: daysFromToday(-16),
  },
  {
    id: "order_2",
    code: "PO-002",
    buyer: "Vegetable Wholesaler",
    orderDate: daysFromToday(-9),
    deliveryDate: daysFromToday(-8),
    deliveryMethod: "delivery",
    status: "completed",
    notes: "",
    lineItems: [{ id: "line_2a", cropCycleId: "cycle_3", quantityKg: 2150, pricePerKg: 0.28 }],
    createdAt: daysFromToday(-9),
  },
  {
    id: "order_3",
    code: "PO-003",
    buyer: "Phsar Doeum Kor Market",
    orderDate: daysFromToday(-3),
    deliveryDate: daysFromToday(-1),
    deliveryMethod: "pickup",
    status: "delivered",
    notes: "",
    lineItems: [{ id: "line_3a", cropCycleId: "cycle_4", quantityKg: 680, pricePerKg: 0.39 }],
    createdAt: daysFromToday(-3),
  },
  // One buyer's cucumber requirement, filled from two different farmers.
  {
    id: "order_4",
    code: "PO-004",
    buyer: "Fresh Mart Phnom Penh",
    orderDate: daysFromToday(-2),
    deliveryDate: daysFromToday(2),
    deliveryMethod: "delivery",
    status: "pending",
    notes: "Combined cucumber order across two growers.",
    lineItems: [
      { id: "line_4a", cropCycleId: "cycle_1", quantityKg: 200, pricePerKg: 0.34 },
      { id: "line_4b", cropCycleId: "cycle_8", quantityKg: 60, pricePerKg: 0.4 },
    ],
    createdAt: daysFromToday(-2),
  },
  {
    id: "order_5",
    code: "PO-005",
    buyer: "Spice Trader Co.",
    orderDate: daysFromToday(-1),
    deliveryDate: daysFromToday(3),
    deliveryMethod: "pickup",
    status: "pending",
    notes: "",
    lineItems: [{ id: "line_5a", cropCycleId: "cycle_7", quantityKg: 150, pricePerKg: 1.55 }],
    createdAt: daysFromToday(-1),
  },
];
