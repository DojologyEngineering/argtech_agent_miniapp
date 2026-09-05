import { delay, getState, mutate, NotFoundError } from "../db";
import {
  breakEvenPricePerKg,
  cropCycleStatus,
  marginPercent,
  projectedRevenue,
  totalCost,
} from "../derive";
import { uid } from "../utils";
import { farmerFullName } from "./farmers";
import type { CropCycle, CropCycleInput, CropCycleStatus, CropCycleSummary, ID } from "../types";

function toSummary(cycle: CropCycle): CropCycleSummary {
  const db = getState();
  const farmer = db.farmers.find((f) => f.id === cycle.farmerId);
  const plot = db.plots.find((p) => p.id === cycle.plotId);
  return {
    ...cycle,
    farmerName: farmer ? farmerFullName(farmer) : "Unassigned",
    plotName: plot?.name ?? "Unassigned",
    status: cropCycleStatus(cycle),
    totalCost: totalCost(cycle.costs),
    breakEvenPricePerKg: breakEvenPricePerKg(cycle),
    projectedRevenue: projectedRevenue(cycle),
    marginPercent: marginPercent(cycle),
  };
}

export async function listCropCycles(options?: {
  search?: string;
  status?: CropCycleStatus | "all";
  farmerId?: ID;
  plotId?: ID;
}): Promise<CropCycleSummary[]> {
  const q = (options?.search ?? "").trim().toLowerCase();
  const rows = getState()
    .cropCycles.map(toSummary)
    .filter((c) => (options?.farmerId ? c.farmerId === options.farmerId : true))
    .filter((c) => (options?.plotId ? c.plotId === options.plotId : true))
    .filter((c) =>
      options?.status && options.status !== "all" ? c.status === options.status : true,
    )
    .filter((c) =>
      q
        ? c.cropName.toLowerCase().includes(q) ||
          c.farmerName.toLowerCase().includes(q) ||
          c.plotName.toLowerCase().includes(q) ||
          c.varietyType.toLowerCase().includes(q)
        : true,
    )
    .sort((a, b) => b.plantingDate.localeCompare(a.plantingDate));
  return delay(rows);
}

export async function getCropCycle(id: ID): Promise<CropCycleSummary> {
  const cycle = getState().cropCycles.find((c) => c.id === id);
  if (!cycle) throw new NotFoundError("Crop cycle", id);
  return delay(toSummary(cycle));
}

export async function createCropCycle(input: CropCycleInput): Promise<CropCycle> {
  const cycle: CropCycle = {
    ...input,
    id: uid("cycle"),
    activities: input.activities ?? [],
    createdAt: new Date().toISOString().slice(0, 10),
  };
  mutate((db) => db.cropCycles.push(cycle));
  return delay(cycle);
}

export async function updateCropCycle(id: ID, input: CropCycleInput): Promise<CropCycle> {
  const updated = mutate((db) => {
    const index = db.cropCycles.findIndex((c) => c.id === id);
    if (index === -1) throw new NotFoundError("Crop cycle", id);
    const next: CropCycle = {
      ...db.cropCycles[index],
      ...input,
      id,
      activities: input.activities ?? db.cropCycles[index].activities,
    };
    db.cropCycles[index] = next;
    return next;
  });
  return delay(updated);
}

export async function deleteCropCycle(id: ID): Promise<void> {
  mutate((db) => {
    db.orders = db.orders.filter((o) => o.cropCycleId !== id);
    db.cropCycles = db.cropCycles.filter((c) => c.id !== id);
  });
  return delay(undefined);
}

/**
 * Cycles an order can be raised against: harvested, with an actual output,
 * and not already sold on an existing order.
 */
export async function listOrderableCropCycles(includeCycleId?: ID): Promise<CropCycleSummary[]> {
  const db = getState();
  const taken = new Set(
    db.orders.filter((o) => o.cropCycleId !== undefined).map((o) => o.cropCycleId),
  );
  const rows = db.cropCycles
    .map(toSummary)
    .filter((c) => c.status === "harvested" && (c.actualOutputKg ?? 0) > 0)
    .filter((c) => c.id === includeCycleId || !taken.has(c.id))
    .sort((a, b) => (b.actualHarvestDate ?? "").localeCompare(a.actualHarvestDate ?? ""));
  return delay(rows);
}
