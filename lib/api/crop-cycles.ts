import { ConflictError, delay, getState, mutate, NotFoundError } from "../db";
import { formatKg, toISODate } from "../format";
import {
  breakEvenPricePerKg,
  costBasisKg,
  costOfSoldKg,
  cropCycleStatus,
  harvestedQuantityKg,
  isOrderEligible,
  lineItemTotals,
  marginPercent,
  totalCost,
} from "../derive";
import { uid } from "../utils";
import { farmerFullName } from "./farmers";
import { assertNoSettledSales, soldKgForCycle } from "./guards";
import type {
  CropActivity,
  CropCycle,
  CropCycleInput,
  CropCycleStatus,
  CropCycleSummary,
  HarvestLogEntry,
  ID,
  SupplyMatch,
} from "../types";

/** Every line item, across every order, that draws on this crop cycle. */
function salesForCycle(cycleId: ID) {
  const items = getState()
    .orders.flatMap((o) => o.lineItems)
    .filter((i) => i.cropCycleId === cycleId);
  return lineItemTotals(items);
}

function toSummary(cycle: CropCycle): CropCycleSummary {
  const db = getState();
  const farmer = db.farmers.find((f) => f.id === cycle.farmerId);
  const plot = db.plots.find((p) => p.id === cycle.plotId);

  const harvested = harvestedQuantityKg(cycle.harvestLog);
  const sales = salesForCycle(cycle.id);
  const basisKg = costBasisKg(cycle.expectedOutputKg, harvested, Boolean(cycle.completedAt));
  const costOfSold = costOfSoldKg(cycle.costs, basisKg, sales.quantityKg);

  return {
    ...cycle,
    farmerName: farmer ? farmerFullName(farmer) : "Unassigned",
    plotName: plot?.name ?? "Unassigned",
    status: cropCycleStatus(cycle),
    totalCost: totalCost(cycle.costs),

    harvestedQuantityKg: harvested,
    soldQuantityKg: sales.quantityKg,
    availableToSellKg: Math.max(0, harvested - sales.quantityKg),

    totalRevenue: sales.revenue,
    averageSalePricePerKg: sales.averagePricePerKg,
    costBasisKg: basisKg,
    breakEvenPricePerKg: breakEvenPricePerKg(cycle.costs, basisKg),
    costOfSoldKg: costOfSold,
    marginPercent: marginPercent(sales.revenue, costOfSold),
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
    harvestLog: input.harvestLog ?? [],
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
      harvestLog: input.harvestLog ?? db.cropCycles[index].harvestLog,
    };
    db.cropCycles[index] = next;
    return next;
  });
  return delay(updated);
}

export async function deleteCropCycle(id: ID): Promise<void> {
  assertNoSettledSales([id], "this crop cycle");
  mutate((db) => {
    // Only pending orders can reach here: drop this cycle's allocations, then
    // any order left with no line items.
    db.orders.forEach((order) => {
      order.lineItems = order.lineItems.filter((i) => i.cropCycleId !== id);
    });
    db.orders = db.orders.filter((o) => o.lineItems.length > 0);
    db.cropCycles = db.cropCycles.filter((c) => c.id !== id);
  });
  return delay(undefined);
}

/* ------------------------------------------------------------- Harvest Log */

export async function getHarvestLogEntry(cycleId: ID, entryId: ID): Promise<HarvestLogEntry> {
  const cycle = getState().cropCycles.find((c) => c.id === cycleId);
  const entry = cycle?.harvestLog.find((e) => e.id === entryId);
  if (!entry) throw new NotFoundError("Harvest log entry", entryId);
  return delay(entry);
}

export async function addHarvestLogEntry(
  cycleId: ID,
  input: Omit<HarvestLogEntry, "id">,
): Promise<HarvestLogEntry> {
  const entry: HarvestLogEntry = { ...input, id: uid("harvest") };
  mutate((db) => {
    const cycle = db.cropCycles.find((c) => c.id === cycleId);
    if (!cycle) throw new NotFoundError("Crop cycle", cycleId);
    if (cycle.completedAt) {
      throw new ConflictError("This cycle is marked complete. Reopen it before logging more picking.");
    }
    cycle.harvestLog.push(entry);
  });
  return delay(entry);
}

export async function updateHarvestLogEntry(
  cycleId: ID,
  entryId: ID,
  input: Omit<HarvestLogEntry, "id">,
): Promise<HarvestLogEntry> {
  const updated = mutate((db) => {
    const cycle = db.cropCycles.find((c) => c.id === cycleId);
    if (!cycle) throw new NotFoundError("Crop cycle", cycleId);
    const index = cycle.harvestLog.findIndex((e) => e.id === entryId);
    if (index === -1) throw new NotFoundError("Harvest log entry", entryId);
    assertStillCoversSales(cycle, harvestedAfter(cycle, entryId, input.quantityKg));
    const next: HarvestLogEntry = { ...input, id: entryId };
    cycle.harvestLog[index] = next;
    return next;
  });
  return delay(updated);
}

export async function deleteHarvestLogEntry(cycleId: ID, entryId: ID): Promise<void> {
  mutate((db) => {
    const cycle = db.cropCycles.find((c) => c.id === cycleId);
    if (!cycle) throw new NotFoundError("Crop cycle", cycleId);
    assertStillCoversSales(cycle, harvestedAfter(cycle, entryId, 0));
    cycle.harvestLog = cycle.harvestLog.filter((e) => e.id !== entryId);
  });
  return delay(undefined);
}

/** Harvested kg once `entryId` is changed to `quantityKg` (0 = removed). */
function harvestedAfter(cycle: CropCycle, entryId: ID, quantityKg: number): number {
  return cycle.harvestLog.reduce(
    (sum, e) => sum + (e.id === entryId ? quantityKg : e.quantityKg),
    0,
  );
}

/**
 * Orders can only hold what was actually picked, so a harvest edit may not
 * shrink the total below what is already allocated.
 */
function assertStillCoversSales(cycle: CropCycle, harvestedKg: number) {
  const soldKg = soldKgForCycle(cycle.id);
  if (harvestedKg >= soldKg) return;
  throw new ConflictError(
    `${formatKg(soldKg)} of this cycle is already on purchase orders, so total harvested can't drop to ${formatKg(harvestedKg)}. Reduce those order allocations first.`,
  );
}

/* -------------------------------------------------------- Field Activities */

export async function getActivity(cycleId: ID, activityId: ID): Promise<CropActivity> {
  const cycle = getState().cropCycles.find((c) => c.id === cycleId);
  const activity = cycle?.activities.find((a) => a.id === activityId);
  if (!activity) throw new NotFoundError("Activity", activityId);
  return delay(activity);
}

export async function addActivity(
  cycleId: ID,
  input: Omit<CropActivity, "id">,
): Promise<CropActivity> {
  const activity: CropActivity = { ...input, id: uid("activity") };
  mutate((db) => {
    const cycle = db.cropCycles.find((c) => c.id === cycleId);
    if (!cycle) throw new NotFoundError("Crop cycle", cycleId);
    cycle.activities.push(activity);
  });
  return delay(activity);
}

export async function updateActivity(
  cycleId: ID,
  activityId: ID,
  input: Omit<CropActivity, "id">,
): Promise<CropActivity> {
  const updated = mutate((db) => {
    const cycle = db.cropCycles.find((c) => c.id === cycleId);
    if (!cycle) throw new NotFoundError("Crop cycle", cycleId);
    const index = cycle.activities.findIndex((a) => a.id === activityId);
    if (index === -1) throw new NotFoundError("Activity", activityId);
    const next: CropActivity = { ...input, id: activityId };
    cycle.activities[index] = next;
    return next;
  });
  return delay(updated);
}

export async function deleteActivity(cycleId: ID, activityId: ID): Promise<void> {
  mutate((db) => {
    const cycle = db.cropCycles.find((c) => c.id === cycleId);
    if (!cycle) throw new NotFoundError("Crop cycle", cycleId);
    cycle.activities = cycle.activities.filter((a) => a.id !== activityId);
  });
  return delay(undefined);
}

/**
 * Manual agent action: there's no single date that signals "fully done
 * picking this plot", so completion is a deliberate tap, not auto-computed.
 */
export async function completeCropCycle(id: ID): Promise<CropCycle> {
  const updated = mutate((db) => {
    const cycle = db.cropCycles.find((c) => c.id === id);
    if (!cycle) throw new NotFoundError("Crop cycle", id);
    cycle.completedAt = toISODate(new Date());
    return cycle;
  });
  return delay(updated);
}

/** Undoes "Mark cycle complete" so more picking can be logged. */
export async function reopenCropCycle(id: ID): Promise<CropCycle> {
  const updated = mutate((db) => {
    const cycle = db.cropCycles.find((c) => c.id === id);
    if (!cycle) throw new NotFoundError("Crop cycle", id);
    cycle.completedAt = null;
    return cycle;
  });
  return delay(updated);
}

/* ---------------------------------------------------------- Supply matching */

/**
 * Harvested stock still unsold, across every farmer — the pool an agent
 * allocates from when filling a buyer's requirement.
 *
 * `excludeOrderId` releases an order's own allocations back into the pool so
 * editing that order doesn't count its quantities against itself.
 */
export async function listSupplyMatches(options?: {
  cropRefId?: ID;
  excludeOrderId?: ID;
}): Promise<SupplyMatch[]> {
  const db = getState();

  const rows = db.cropCycles
    .filter((cycle) => isOrderEligible(cropCycleStatus(cycle)))
    .filter((cycle) => (options?.cropRefId ? cycle.cropRefId === options.cropRefId : true))
    .map((cycle) => {
      const harvested = harvestedQuantityKg(cycle.harvestLog);
      const soldElsewhere = db.orders
        .filter((o) => o.id !== options?.excludeOrderId)
        .flatMap((o) => o.lineItems)
        .filter((i) => i.cropCycleId === cycle.id)
        .reduce((sum, i) => sum + i.quantityKg, 0);

      const farmer = db.farmers.find((f) => f.id === cycle.farmerId);
      const plot = db.plots.find((p) => p.id === cycle.plotId);
      const lastHarvestDate = cycle.harvestLog.reduce<string | null>(
        (latest, e) => (latest === null || e.date > latest ? e.date : latest),
        null,
      );

      return {
        cropCycleId: cycle.id,
        farmerId: cycle.farmerId,
        farmerName: farmer ? farmerFullName(farmer) : "Unassigned",
        plotName: plot?.name ?? "Unassigned",
        cropRefId: cycle.cropRefId,
        cropName: cycle.cropName,
        varietyType: cycle.varietyType,
        availableToSellKg: Math.max(0, harvested - soldElsewhere),
        harvestedQuantityKg: harvested,
        estimatedPricePerKg: cycle.estimatedPricePerKg,
        lastHarvestDate,
      };
    })
    .filter((row) => row.availableToSellKg > 0)
    .sort((a, b) => b.availableToSellKg - a.availableToSellKg);

  return delay(rows);
}

/** Crops that currently have any unsold harvested stock, for the crop filter. */
export async function listCropsWithSupply(): Promise<{ cropRefId: ID; cropName: string; availableKg: number }[]> {
  const matches = await listSupplyMatches();
  const byCrop = new Map<ID, { cropRefId: ID; cropName: string; availableKg: number }>();
  matches.forEach((m) => {
    const existing = byCrop.get(m.cropRefId);
    if (existing) existing.availableKg += m.availableToSellKg;
    else
      byCrop.set(m.cropRefId, {
        cropRefId: m.cropRefId,
        cropName: m.cropName,
        availableKg: m.availableToSellKg,
      });
  });
  return Array.from(byCrop.values()).sort((a, b) => a.cropName.localeCompare(b.cropName));
}
