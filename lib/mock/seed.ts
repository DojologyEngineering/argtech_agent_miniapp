import { daysFromToday } from "../format";
import { hectaresFromBoundary } from "../geo";
import { placeholderImage } from "../placeholder";
import type {
  ActivityType,
  Certificate,
  CropCycle,
  Farmer,
  LatLng,
  Order,
  OrderLineItem,
  Plot,
} from "../types";
import { buyerTierPricePerKg, CROP_REFS } from "./crop-refs";

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
    province: "Kampong Cham",
    district: "Kang Meas",
    commune: "Angkor Ban",
    village: "Prek Koy",
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
    province: "Kampong Cham",
    district: "Kang Meas",
    commune: "Ampil",
    village: "Kampong Tnaot",
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
    province: "Kampong Cham",
    district: "Srey Santhor",
    commune: "Baray",
    village: "Ta Ong",
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
    province: "Kampong Cham",
    district: "Kang Meas",
    commune: "Chrey Vien",
    village: "Prek Tonloap",
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
    province: "Kampong Cham",
    district: "Kampong Siem",
    commune: "Kampong Siem",
    village: "Prek Pdau",
    notes: "New to the programme, registered this season.",
    documents: { profilePhotoName: null, nationalIdName: null },
    createdAt: daysFromToday(-70),
  },
  {
    id: "farmer_6",
    firstName: "Dara",
    lastName: "Heng",
    gender: "male",
    dateOfBirth: "1982-09-12",
    educationLevel: "Grade 9",
    primaryPhone: "097 612 345",
    secondaryPhone: "",
    province: "Kampong Cham",
    district: "Kang Meas",
    commune: "Ampil",
    village: "Prey Kmeng",
    notes: "Grows cabbage and leafy greens for the Phnom Penh markets.",
    documents: { profilePhotoName: null, nationalIdName: null },
    createdAt: daysFromToday(-150),
  },
  {
    id: "farmer_7",
    firstName: "Srey Mom",
    lastName: "Chea",
    gender: "female",
    dateOfBirth: "1990-04-27",
    educationLevel: "Grade 12",
    primaryPhone: "085 330 912",
    secondaryPhone: "012 778 604",
    province: "Kampong Cham",
    district: "Srey Santhor",
    commune: "Kaoh Krabei",
    village: "Prek Dambouk",
    notes: "Organic-minded grower on the Mekong river bank.",
    documents: { profilePhotoName: null, nationalIdName: "srey-mom-nid.jpg" },
    createdAt: daysFromToday(-120),
  },
  {
    id: "farmer_8",
    firstName: "Vannak",
    lastName: "Keo",
    gender: "male",
    dateOfBirth: "1986-12-03",
    educationLevel: "Primary school",
    primaryPhone: "096 204 781",
    secondaryPhone: "",
    province: "Kampong Cham",
    district: "Kampong Siem",
    commune: "Veal Vong",
    village: "Veal Vong",
    notes: "Registered this season, starting with tomatoes.",
    documents: { profilePhotoName: null, nationalIdName: null },
    createdAt: daysFromToday(-45),
  },
];

export const SEED_CERTIFICATES: Certificate[] = [
  {
    id: "cert_1",
    farmerId: "farmer_2",
    type: "Organic",
    issuer: "Cambodian Organic Agriculture Association",
    scope: "Vegetable production",
    expiryDate: daysFromToday(230),
    photo: null,
  },
  {
    id: "cert_2",
    farmerId: "farmer_3",
    type: "GAP",
    issuer: "Ministry of Agriculture (sample)",
    scope: "Cabbage and chili production",
    expiryDate: daysFromToday(110),
    photo: null,
  },
  {
    id: "cert_3",
    farmerId: "farmer_3",
    type: "Other",
    issuer: "Provincial Department of Water Resources",
    scope: "Water use training",
    expiryDate: null,
    photo: null,
  },
  {
    id: "cert_4",
    farmerId: "farmer_4",
    type: "Other",
    issuer: "Provincial Department of Agriculture",
    scope: "Fresh produce handling",
    expiryDate: daysFromToday(635),
    photo: null,
  },
  // A tomato grower with a GAP certificate on file. The image is a placeholder
  // and says so — it is not a real certificate.
  {
    id: "cert_5",
    farmerId: "farmer_4",
    type: "GAP",
    issuer: "Cambodia GAP Certification Body (sample)",
    scope: "Tomato production",
    expiryDate: daysFromToday(300),
    photo: placeholderImage("GAP certificate", { sample: true }),
  },
  {
    id: "cert_6",
    farmerId: "farmer_7",
    type: "Organic",
    issuer: "Cambodian Organic Agriculture Association (sample)",
    scope: "Long bean production",
    expiryDate: daysFromToday(420),
    photo: null,
  },
];

// Pilot area: Kampong Cham, along the Mekong. Coordinates sit where the farmers'
// villages are, so the satellite map matches the address.
export const SEED_PLOTS: Plot[] = [
  plot(
    "plot_1",
    "farmer_1",
    "Vegetable Plot A",
    "own",
    "Clay Soil",
    "Prek Koy, Angkor Ban, Kang Meas, Kampong Cham",
    field([12.014, 105.382], 260, 190),
  ),
  plot(
    "plot_2",
    "farmer_1",
    "Vegetable Plot B",
    "rent",
    "Loam Soil",
    "Prek Koy, Angkor Ban, Kang Meas, Kampong Cham",
    field([12.0095, 105.3905], 180, 150, 0.2),
  ),
  plot(
    "plot_3",
    "farmer_2",
    "Riverside Plot",
    "own",
    "Alluvial Soil",
    "Kampong Tnaot, Ampil, Kang Meas, Kampong Cham",
    field([11.965, 105.351], 300, 210),
  ),
  plot(
    "plot_4",
    "farmer_2",
    "Vegetable Plot C",
    "own",
    "Clay Soil",
    "Kampong Tnaot, Ampil, Kang Meas, Kampong Cham",
    field([11.9705, 105.344], 240, 200, 0.05),
  ),
  plot(
    "plot_5",
    "farmer_3",
    "Vegetable Plot D",
    "rent",
    "Silt Soil",
    "Ta Ong, Baray, Srey Santhor, Kampong Cham",
    field([11.883, 105.263], 320, 240),
  ),
  plot(
    "plot_6",
    "farmer_4",
    "Vegetable Plot E",
    "own",
    "Sandy Soil",
    "Prek Tonloap, Chrey Vien, Kang Meas, Kampong Cham",
    field([12.038, 105.356], 220, 180, 0.18),
  ),
  plot(
    "plot_7",
    "farmer_5",
    "Hill Farm Terrace",
    "own",
    "Loam Soil",
    "Prek Pdau, Kampong Siem, Kampong Siem, Kampong Cham",
    field([12.082, 105.465], 170, 140),
  ),
  plot(
    "plot_8",
    "farmer_6",
    "Vegetable Plot F",
    "own",
    "Loam Soil",
    "Prey Kmeng, Ampil, Kang Meas, Kampong Cham",
    field([11.992, 105.368], 250, 190, 0.1),
  ),
  plot(
    "plot_9",
    "farmer_7",
    "Mekong Bank Plot",
    "own",
    "Alluvial Soil",
    "Prek Dambouk, Kaoh Krabei, Srey Santhor, Kampong Cham",
    field([11.901, 105.278], 280, 200, 0.14),
  ),
  plot(
    "plot_10",
    "farmer_8",
    "Vegetable Plot G",
    "rent",
    "Silt Soil",
    "Veal Vong, Veal Vong, Kampong Siem, Kampong Cham",
    field([12.105, 105.489], 210, 170, 0.08),
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
      pesticideDetails: input.production?.pesticideDetails ?? "",
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
      fertilizerType: "Chemical",
      pesticideUsed: "Used",
      pesticideDetails: "Neem oil",
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
    production: { method: "Conventional", deliveryFrequency: "Weekly", fertilizerType: "Chemical", pesticideUsed: "Used", pesticideDetails: "Mancozeb", notes: "" },
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
    production: { method: "Mixed", fertilizerType: "Mixed", pesticideUsed: "Not used", notes: "Compost base with a chemical top dressing. Good head formation this cycle." },
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
    production: { method: "Conventional", fertilizerType: "Chemical", pesticideUsed: "Used", pesticideDetails: "Spinosad", notes: "" },
  }),
  // Harvesting: first picking taken, more to come.
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
    harvests: [{ offset: -3, quantityKg: 140, note: "First picking" }],
    production: { method: "Conventional", fertilizerType: "Organic", pesticideUsed: "Not sure", notes: "Pods forming well, first pick taken." },
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
    production: { method: "Conventional", fertilizerType: "Chemical", pesticideUsed: "Not used", notes: "" },
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
    production: { method: "Conventional", fertilizerType: "Mixed", pesticideUsed: "Used", pesticideDetails: "Abamectin", notes: "Picking weekly, plants still flowering." },
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
    production: { method: "Organic", fertilizerType: "Organic", pesticideUsed: "Not used", notes: "" },
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
    production: { method: "Conventional", fertilizerType: "Chemical", pesticideUsed: "Not used", notes: "" },
    extraActivities: [{ type: "irrigation", offset: 2, note: "First irrigation" }],
  }),
  // Harvesting: tomatoes picked every few days, part of the stock already sold.
  cycle({
    id: "cycle_10",
    farmerId: "farmer_1",
    plotId: "plot_2",
    cropRefId: "crop_tomato",
    plantingOffset: -75,
    harvestOffset: -15,
    costs: { seed: 60, fertilizer: 90, labor: 200, other: 30 },
    expectedOutputKg: 1200,
    estimatedPricePerKg: 0.6,
    harvests: [
      { offset: -12, quantityKg: 300, note: "First picking" },
      { offset: -6, quantityKg: 320 },
      { offset: -2, quantityKg: 280 },
    ],
    production: { method: "Conventional", deliveryFrequency: "Weekly", fertilizerType: "Mixed", pesticideUsed: "Not used", notes: "" },
  }),
  // Growing: planted, nothing picked yet. These feed the supply forecast (weekly and monthly).
  cycle({
    id: "cycle_12",
    farmerId: "farmer_4",
    plotId: "plot_6",
    cropRefId: "crop_cucumber",
    plantingOffset: -20,
    harvestOffset: 20,
    costs: { seed: 40, fertilizer: 60, labor: 140, other: 20 },
    expectedOutputKg: 800,
    estimatedPricePerKg: 0.35,
    production: { method: "Conventional", fertilizerType: "Chemical", pesticideUsed: "Used", pesticideDetails: "Neem oil", notes: "" },
  }),
  cycle({
    id: "cycle_13",
    farmerId: "farmer_2",
    plotId: "plot_4",
    cropRefId: "crop_cucumber",
    plantingOffset: -2,
    harvestOffset: 38,
    costs: { seed: 35, fertilizer: 55, labor: 120, other: 15 },
    expectedOutputKg: 650,
    estimatedPricePerKg: 0.35,
    production: { method: "Conventional", fertilizerType: "Mixed", pesticideUsed: "Not used", notes: "" },
  }),
  cycle({
    id: "cycle_14",
    farmerId: "farmer_1",
    plotId: "plot_1",
    cropRefId: "crop_morningglory",
    plantingOffset: -3,
    harvestOffset: 22,
    costs: { seed: 10, fertilizer: 15, labor: 40, other: 5 },
    expectedOutputKg: 350,
    estimatedPricePerKg: 0.25,
    production: { method: "Conventional", fertilizerType: "Chemical", pesticideUsed: "Not used", notes: "" },
  }),
  cycle({
    id: "cycle_15",
    farmerId: "farmer_5",
    plotId: "plot_7",
    cropRefId: "crop_longbean",
    plantingOffset: -15,
    harvestOffset: 30,
    costs: { seed: 25, fertilizer: 40, labor: 100, other: 15 },
    expectedOutputKg: 500,
    estimatedPricePerKg: 0.5,
    production: { method: "Organic", fertilizerType: "Organic", pesticideUsed: "Not used", notes: "" },
  }),
  cycle({
    id: "cycle_16",
    farmerId: "farmer_2",
    plotId: "plot_3",
    cropRefId: "crop_chili",
    plantingOffset: -30,
    harvestOffset: 45,
    costs: { seed: 45, fertilizer: 60, labor: 170, other: 35 },
    expectedOutputKg: 600,
    estimatedPricePerKg: 1.5,
    production: { method: "Conventional", fertilizerType: "Chemical", pesticideUsed: "Used", pesticideDetails: "Abamectin", notes: "" },
  }),
  cycle({
    id: "cycle_17",
    farmerId: "farmer_3",
    plotId: "plot_5",
    cropRefId: "crop_cabbage",
    plantingOffset: -12,
    harvestOffset: 53,
    costs: { seed: 60, fertilizer: 90, labor: 200, other: 30 },
    expectedOutputKg: 1500,
    estimatedPricePerKg: 0.3,
    production: { method: "Conventional", fertilizerType: "Chemical", pesticideUsed: "Not sure", notes: "" },
  }),
  cycle({
    id: "cycle_18",
    farmerId: "farmer_4",
    plotId: "plot_6",
    cropRefId: "crop_eggplant",
    plantingOffset: -10,
    harvestOffset: 60,
    costs: { seed: 40, fertilizer: 60, labor: 180, other: 30 },
    expectedOutputKg: 900,
    estimatedPricePerKg: 0.4,
    production: { method: "Conventional", fertilizerType: "Chemical", pesticideUsed: "Used", pesticideDetails: "Spinosad", notes: "" },
  }),
  cycle({
    id: "cycle_19",
    farmerId: "farmer_1",
    plotId: "plot_1",
    cropRefId: "crop_tomato",
    plantingOffset: -2,
    harvestOffset: 58,
    costs: { seed: 60, fertilizer: 95, labor: 210, other: 35 },
    expectedOutputKg: 1100,
    estimatedPricePerKg: 0.6,
    production: { method: "Conventional", fertilizerType: "Chemical", pesticideUsed: "Used", pesticideDetails: "Mancozeb", notes: "" },
  }),
  cycle({
    id: "cycle_20",
    farmerId: "farmer_3",
    plotId: "plot_5",
    cropRefId: "crop_chili",
    plantingOffset: 0,
    harvestOffset: 75,
    costs: { seed: 50, fertilizer: 65, labor: 190, other: 35 },
    expectedOutputKg: 700,
    estimatedPricePerKg: 1.5,
    production: { method: "Conventional", fertilizerType: "Mixed", pesticideUsed: "Used", pesticideDetails: "Abamectin", notes: "" },
  }),
  cycle({
    id: "cycle_21",
    farmerId: "farmer_5",
    plotId: "plot_7",
    cropRefId: "crop_tomato",
    plantingOffset: 0,
    harvestOffset: 60,
    costs: { seed: 55, fertilizer: 80, labor: 170, other: 25 },
    expectedOutputKg: 900,
    estimatedPricePerKg: 0.6,
    production: { method: "Mixed", fertilizerType: "Mixed", pesticideUsed: "Not used", notes: "" },
  }),
  cycle({
    id: "cycle_22",
    farmerId: "farmer_2",
    plotId: "plot_4",
    cropRefId: "crop_morningglory",
    plantingOffset: -13,
    harvestOffset: 12,
    costs: { seed: 10, fertilizer: 15, labor: 35, other: 5 },
    expectedOutputKg: 300,
    estimatedPricePerKg: 0.25,
    production: { method: "Conventional", fertilizerType: "Chemical", pesticideUsed: "Not used", notes: "" },
  }),
  cycle({
    id: "cycle_23",
    farmerId: "farmer_1",
    plotId: "plot_2",
    cropRefId: "crop_cucumber",
    plantingOffset: -31,
    harvestOffset: 9,
    costs: { seed: 35, fertilizer: 50, labor: 120, other: 15 },
    expectedOutputKg: 500,
    estimatedPricePerKg: 0.35,
    production: { method: "Conventional", fertilizerType: "Chemical", pesticideUsed: "Used", pesticideDetails: "Neem oil", notes: "" },
  }),
  // Growing: cabbage planted a few weeks ago, harvest expected in December.
  cycle({
    id: "cycle_24",
    farmerId: "farmer_6",
    plotId: "plot_8",
    cropRefId: "crop_cabbage",
    plantingOffset: -20,
    harvestOffset: 45,
    costs: { seed: 50, fertilizer: 80, labor: 170, other: 25 },
    expectedOutputKg: 1200,
    estimatedPricePerKg: 0.3,
    production: { method: "Conventional", fertilizerType: "Chemical", pesticideUsed: "Used", pesticideDetails: "Spinosad", notes: "" },
  }),
  // Harvesting: long bean picked twice so far on an organic plot.
  cycle({
    id: "cycle_25",
    farmerId: "farmer_7",
    plotId: "plot_9",
    cropRefId: "crop_longbean",
    plantingOffset: -50,
    harvestOffset: -5,
    costs: { seed: 25, fertilizer: 35, labor: 105, other: 10 },
    expectedOutputKg: 600,
    estimatedPricePerKg: 0.5,
    harvests: [
      { offset: -4, quantityKg: 90, note: "First picking" },
      { offset: -1, quantityKg: 110 },
    ],
    production: { method: "Organic", deliveryFrequency: "Weekly", fertilizerType: "Organic", pesticideUsed: "Not used", notes: "Compost and neem spray only." },
  }),
  // Growing: a first tomato crop, planted last week.
  cycle({
    id: "cycle_26",
    farmerId: "farmer_8",
    plotId: "plot_10",
    cropRefId: "crop_tomato",
    plantingOffset: -6,
    harvestOffset: 54,
    costs: { seed: 50, fertilizer: 75, labor: 140, other: 20 },
    expectedOutputKg: 1000,
    estimatedPricePerKg: 0.6,
    production: { method: "Conventional", fertilizerType: "Mixed", pesticideUsed: "Not sure", notes: "" },
  }),
  // Completed, multi-harvest: a full tomato season on Hill Farm Terrace, fully logged.
  cycle({
    id: "cycle_27",
    farmerId: "farmer_5",
    plotId: "plot_7",
    cropRefId: "crop_tomato",
    plantingOffset: -125,
    harvestOffset: -65,
    costs: { seed: 20, fertilizer: 28, labor: 60, other: 12 },
    expectedOutputKg: 300,
    estimatedPricePerKg: 0.6,
    harvests: [
      { offset: -63, quantityKg: 60, note: "First picking, breaker-stage fruit for the market" },
      { offset: -58, quantityKg: 70, note: "Second picking, fruit setting well on the lower trusses" },
      { offset: -52, quantityKg: 80, note: "Peak picking, best colour and size of the season" },
      { offset: -46, quantityKg: 60, note: "Fourth picking, slightly smaller fruit" },
      { offset: -41, quantityKg: 30, note: "Final picking, vines declining" },
    ],
    completedOffset: -38,
    production: {
      method: "Conventional",
      deliveryFrequency: "Weekly",
      fertilizerType: "Mixed",
      pesticideUsed: "Used",
      pesticideDetails: "Mancozeb, three sprays during fruit set",
      notes:
        "Staked and pruned every two weeks. Compost mixed into the beds before transplanting, NPK as top dressing. Picked every 5 to 7 days. Plot cleared after the final picking.",
    },
    extraActivities: [
      { type: "irrigation", offset: -123, note: "Drip line installed and first watering after transplanting" },
      { type: "fertilization", offset: -110, note: "Basal dressing: compost plus NPK worked into the beds" },
      { type: "irrigation", offset: -100, note: "Weekly drip irrigation started" },
      { type: "fertilization", offset: -90, note: "First top dressing, NPK 15-15-15" },
      { type: "irrigation", offset: -78, note: "Extra watering through a dry spell" },
      { type: "fertilization", offset: -72, note: "Second top dressing, potassium-rich for fruit set" },
      { type: "irrigation", offset: -60, note: "Watering reduced as the first fruit began to colour" },
    ],
  }),
];

interface OrderSeed {
  id: string;
  code: string;
  kind: Order["kind"];
  /** Null cropRefId = an "Other crop" request that is not in the catalog. */
  requested: { cropRefId: string | null; cropName?: string; quantityKg: number };
  /** Days from today the order was placed. */
  placedOffset: number;
  /** Days from today of the delivery or pickup — the needed-by date for a request. */
  dateOffset: number;
  deliveryMethod: Order["deliveryMethod"];
  status: Order["status"];
  source?: Order["source"];
  notes?: string;
  requirements?: Partial<Order["requirements"]>;
  requirementsText?: string;
  reason?: string;
  pickup?: Order["pickup"];
  /** Empty while a request has not been matched to farmers yet. */
  lines: { id: string; cropCycleId: string; quantityKg: number; handoverCheck?: OrderLineItem["handoverCheck"] }[];
}

const BUYER = "Fresh Market Ltd.";

/**
 * Orders come from the Buyer App or from staff, and the agent only views them.
 * Price per kg follows the buyer price tiers: one tier per crop, chosen by the
 * order's total quantity and applied to the whole order.
 */
function order(input: OrderSeed): Order {
  const catalog = input.requested.cropRefId ? ref(input.requested.cropRefId) : null;
  const totalKg = input.lines.reduce((sum, l) => sum + l.quantityKg, 0);
  return {
    id: input.id,
    code: input.code,
    buyer: BUYER,
    source: input.source ?? "buyer_app",
    kind: input.kind,
    requested: {
      cropRefId: input.requested.cropRefId,
      cropName: catalog?.name ?? input.requested.cropName ?? "—",
      quantityKg: input.requested.quantityKg,
    },
    orderDate: daysFromToday(input.placedOffset),
    deliveryDate: daysFromToday(input.dateOffset),
    deliveryMethod: input.deliveryMethod,
    pickup: input.pickup ?? null,
    requirements: {
      ripeness: input.requirements?.ripeness ?? null,
      size: input.requirements?.size ?? null,
    },
    requirementsText: input.requirementsText ?? null,
    reason: input.reason ?? null,
    status: input.status,
    notes: input.notes ?? "",
    lineItems: input.lines.map((l) => {
      const cropRefId = SEED_CROP_CYCLES.find((c) => c.id === l.cropCycleId)!.cropRefId;
      return {
        id: l.id,
        cropCycleId: l.cropCycleId,
        quantityKg: l.quantityKg,
        pricePerKg: buyerTierPricePerKg(cropRefId, totalKg),
        problem: null,
        handoverCheck: l.handoverCheck ?? null,
      };
    }),
    createdAt: daysFromToday(input.placedOffset),
  };
}

/**
 * The same orders as the Buyer App, as the agent sees them (view-only).
 *
 * Supply picture (harvested / sold / available):
 *   cycle_1  cucumber  770 / 550 / 220   PO-0008 400 + PO-0003 150
 *   cycle_27 tomato    300 / 290 /  10   PO-0002 (completed cycle, 33.3% margin)
 *   cycle_2  tomato    640 / 500 / 140   PO-0009
 *   cycle_3  cabbage  2150 / 300 /1850   PO-0007
 *   cycle_4  eggplant  680 /   0 / 680   PO-0005 was cancelled, so nothing is sold
 *   cycle_5  long bean 140 / 120 /  20   PO-0004
 *   cycle_10 tomato    900 / 800 / 100   PO-0009 500 + PO-0006 300
 *
 * Handover picture: PO-0006 is the only order that shows "Check due today"
 * (Confirmed, delivery today, no saved check). PO-0009 and PO-0004 are Confirmed
 * but not yet due, and PO-0008 has a saved check.
 */
export const SEED_ORDERS: Order[] = [
  // Requested: a crop that is not in the catalog. Not matched to farmers yet.
  order({
    id: "ord_req_0011",
    code: "REQ-0011",
    kind: "request",
    requested: { cropRefId: null, cropName: "Pumpkin", quantityKg: 150 },
    placedOffset: 0,
    dateOffset: 21,
    deliveryMethod: "pickup",
    status: "requested",
    requirementsText: "Medium, firm, no cracks",
    lines: [],
  }),
  // Requested: waiting for ARG TECH staff to match farmers.
  order({
    id: "ord_req_0010",
    code: "REQ-0010",
    kind: "request",
    requested: { cropRefId: "crop_chili", quantityKg: 200 },
    placedOffset: -1,
    dateOffset: 14,
    deliveryMethod: "delivery",
    status: "requested",
    notes: "Prefer a mix of red and green if possible.",
    lines: [],
  }),
  // Confirmed order now: two farmers supply one tomato order. Delivery in 2 days, not due yet.
  order({
    id: "ord_po_0009",
    code: "PO-0009",
    kind: "order_now",
    requested: { cropRefId: "crop_tomato", quantityKg: 1000 },
    placedOffset: -2,
    dateOffset: 2,
    deliveryMethod: "delivery",
    status: "confirmed",
    notes: "Please call on arrival at the gate.",
    lines: [
      { id: "line_9a", cropCycleId: "cycle_2", quantityKg: 500 },
      { id: "line_9b", cropCycleId: "cycle_10", quantityKg: 500 },
    ],
  }),
  // Confirmed, pickup arranged. Not due yet.
  order({
    id: "ord_po_0004",
    code: "PO-0004",
    kind: "order_now",
    requested: { cropRefId: "crop_longbean", quantityKg: 120 },
    placedOffset: -3,
    dateOffset: 2,
    deliveryMethod: "pickup",
    status: "confirmed",
    source: "staff",
    pickup: {
      meetingPoint: "Angkor Ban commune office, Kang Meas",
      time: "08:00 – 10:00",
      landmark: "Next to the market gate (sample)",
      mapUrl: "https://www.google.com/maps/search/?api=1&query=Kang+Meas+Kampong+Cham",
      collectorName: "Sophea Chan (sample)",
      collectorPhone: "+855 12 888 456",
    },
    lines: [{ id: "line_4a", cropCycleId: "cycle_5", quantityKg: 120 }],
  }),
  // Confirmed order now, pickup not arranged yet: the buyer's wished pickup date is 5 days ahead.
  order({
    id: "ord_po_0003",
    code: "PO-0003",
    kind: "order_now",
    requested: { cropRefId: "crop_cucumber", quantityKg: 150 },
    placedOffset: -2,
    dateOffset: 5,
    deliveryMethod: "pickup",
    status: "confirmed",
    lines: [{ id: "line_3a", cropCycleId: "cycle_1", quantityKg: 150 }],
  }),
  // Confirmed request, delivery today and no saved check: the one order showing "Check due today".
  order({
    id: "ord_po_0006",
    code: "PO-0006",
    kind: "request",
    requested: { cropRefId: "crop_tomato", quantityKg: 300 },
    placedOffset: -3,
    dateOffset: 0,
    deliveryMethod: "delivery",
    status: "confirmed",
    requirements: { ripeness: "Partly ripe", size: "Medium" },
    lines: [{ id: "line_6a", cropCycleId: "cycle_10", quantityKg: 300 }],
  }),
  // Picked up: a request confirmed for less than asked (400 of 500 kg), with a saved handover check.
  order({
    id: "ord_po_0008",
    code: "PO-0008",
    kind: "request",
    requested: { cropRefId: "crop_cucumber", quantityKg: 500 },
    placedOffset: -9,
    dateOffset: -3,
    deliveryMethod: "pickup",
    status: "delivered",
    pickup: { meetingPoint: "Kang Meas district market, main gate", time: "07:00 – 09:00" },
    lines: [
      {
        id: "line_8a",
        cropCycleId: "cycle_1",
        quantityKg: 400,
        handoverCheck: {
          receivedKg: 400,
          acceptedKg: 380,
          rejectedKg: 20,
          rejectReason: "Cracks or damage",
          photos: [placeholderImage("Handover photo 1"), placeholderImage("Handover photo 2")],
          note: "Some cucumbers cracked in the crates.",
          buyerRepPresent: true,
          checkedAt: daysFromToday(-3),
        },
      },
    ],
  }),
  // Completed.
  order({
    id: "ord_po_0007",
    code: "PO-0007",
    kind: "order_now",
    requested: { cropRefId: "crop_cabbage", quantityKg: 300 },
    placedOffset: -22,
    dateOffset: -18,
    deliveryMethod: "delivery",
    status: "completed",
    lines: [{ id: "line_7a", cropCycleId: "cycle_3", quantityKg: 300 }],
  }),
  // Declined request: never matched to farmers.
  order({
    id: "ord_req_0006",
    code: "REQ-0006",
    kind: "request",
    requested: { cropRefId: "crop_morningglory", quantityKg: 150 },
    placedOffset: -12,
    dateOffset: 4,
    deliveryMethod: "delivery",
    status: "declined",
    reason: "Not enough supply for your date",
    lines: [],
  }),
  // Cancelled by staff after confirmation. Its kg are released, so they don't count as sold.
  order({
    id: "ord_po_0005",
    code: "PO-0005",
    kind: "order_now",
    requested: { cropRefId: "crop_eggplant", quantityKg: 250 },
    placedOffset: -10,
    dateOffset: -6,
    deliveryMethod: "delivery",
    status: "cancelled",
    reason: "Farmer could not deliver",
    lines: [{ id: "line_5a", cropCycleId: "cycle_4", quantityKg: 250 }],
  }),
  // Completed: the 290 kg sale of Hill Farm Terrace's tomatoes (10 kg stayed unsold). One order
  // of 200–999 kg, so the whole order is priced at the $0.60 tier.
  order({
    id: "ord_po_0002",
    code: "PO-0002",
    kind: "order_now",
    requested: { cropRefId: "crop_tomato", quantityKg: 290 },
    placedOffset: -44,
    dateOffset: -40,
    deliveryMethod: "delivery",
    status: "completed",
    notes: "Deliver to the back entrance before 10:00.",
    lines: [
      {
        id: "line_2a",
        cropCycleId: "cycle_27",
        quantityKg: 290,
        handoverCheck: {
          receivedKg: 290,
          acceptedKg: 290,
          rejectedKg: 0,
          rejectReason: null,
          photos: [placeholderImage("Handover photo 1")],
          note: "Fruit firm and evenly coloured. Everything accepted.",
          buyerRepPresent: null,
          checkedAt: daysFromToday(-40),
        },
      },
    ],
  }),
];
