import { delay, getState, mutate, NotFoundError } from "../db";
import { hectaresFromBoundary } from "../geo";
import { uid } from "../utils";
import { farmerFullName } from "./farmers";
import { assertNoSettledSales } from "./guards";
import type { ID, Plot, PlotInput, PlotSummary } from "../types";

function toSummary(plot: Plot): PlotSummary {
  const farmer = getState().farmers.find((f) => f.id === plot.farmerId);
  return { ...plot, farmerName: farmer ? farmerFullName(farmer) : "Unassigned" };
}

export async function listPlots(search = "", farmerId?: ID): Promise<PlotSummary[]> {
  const q = search.trim().toLowerCase();
  const rows = getState()
    .plots.filter((p) => (farmerId ? p.farmerId === farmerId : true))
    .map(toSummary)
    .filter((p) =>
      q
        ? p.name.toLowerCase().includes(q) ||
          p.farmerName.toLowerCase().includes(q) ||
          p.locationText.toLowerCase().includes(q)
        : true,
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  return delay(rows);
}

export async function getPlot(id: ID): Promise<PlotSummary> {
  const plot = getState().plots.find((p) => p.id === id);
  if (!plot) throw new NotFoundError("Plot", id);
  return delay(toSummary(plot));
}

export async function createPlot(input: PlotInput): Promise<Plot> {
  const plot: Plot = {
    ...input,
    id: uid("plot"),
    // Area is always recomputed from the drawn boundary — never taken as input.
    areaHectares: hectaresFromBoundary(input.boundary),
    createdAt: new Date().toISOString().slice(0, 10),
  };
  mutate((db) => db.plots.push(plot));
  return delay(plot);
}

export async function updatePlot(id: ID, input: PlotInput): Promise<Plot> {
  const updated = mutate((db) => {
    const index = db.plots.findIndex((p) => p.id === id);
    if (index === -1) throw new NotFoundError("Plot", id);
    const next: Plot = {
      ...db.plots[index],
      ...input,
      id,
      areaHectares: hectaresFromBoundary(input.boundary),
    };
    db.plots[index] = next;
    // Crop cycles snapshot the plot area and carry the plot's owner, so keep
    // both in step when the plot is resized or handed to another farmer.
    db.cropCycles.forEach((cycle) => {
      if (cycle.plotId !== id) return;
      cycle.cultivatedAreaHectares = next.areaHectares;
      cycle.farmerId = next.farmerId;
    });
    return next;
  });
  return delay(updated);
}

export async function deletePlot(id: ID): Promise<void> {
  const cycleIdsOnPlot = getState()
    .cropCycles.filter((c) => c.plotId === id)
    .map((c) => c.id);
  assertNoSettledSales(cycleIdsOnPlot, "this plot");
  mutate((db) => {
    const cycleIds = db.cropCycles.filter((c) => c.plotId === id).map((c) => c.id);
    // Strip this plot's allocations from pending orders, then drop orders left with nothing.
    db.orders.forEach((order) => {
      order.lineItems = order.lineItems.filter((i) => !cycleIds.includes(i.cropCycleId));
    });
    db.orders = db.orders.filter((o) => o.lineItems.length > 0);
    db.cropCycles = db.cropCycles.filter((c) => c.plotId !== id);
    db.plots = db.plots.filter((p) => p.id !== id);
  });
  return delay(undefined);
}
