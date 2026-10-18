import { format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { delay, getState } from "../db";
import { cropCycleStatus } from "../derive";
import { formatNumber, toISODate } from "../format";
import { farmerFullName } from "./farmers";
import type {
  ActivityType,
  CalendarActivity,
  CropCycle,
  SupplyForecastGroup,
} from "../types";

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  planting: "Planting",
  harvesting: "Harvesting",
  irrigation: "Irrigation",
  fertilization: "Fertilization",
  delivery: "Delivery",
};

/**
 * The calendar is read-only: every entry is derived from a crop cycle or an
 * order record, and each badge carries its own real activity type.
 */
export async function listCalendarActivities(): Promise<CalendarActivity[]> {
  const db = getState();
  const today = toISODate(new Date());
  const activities: CalendarActivity[] = [];

  const context = (cycle: CropCycle) => {
    const farmer = db.farmers.find((f) => f.id === cycle.farmerId);
    const plot = db.plots.find((p) => p.id === cycle.plotId);
    const farmerName = farmer ? farmerFullName(farmer) : "Unassigned";
    const plotName = plot?.name ?? "Unassigned";
    return {
      cropCycleId: cycle.id,
      orderId: null,
      href: `/crops/${cycle.id}`,
      cropName: cycle.cropName,
      plotName,
      farmerName,
      title: farmerName,
      subtitle: `${cycle.cropName} · ${plotName}`,
    };
  };

  db.cropCycles.forEach((cycle) => {
    const ctx = context(cycle);

    if (cycle.plantingDate) {
      activities.push({
        id: `${cycle.id}:planting`,
        type: "planting",
        date: cycle.plantingDate,
        projected: cycle.plantingDate > today,
        ...ctx,
      });
    }

    // Each picking trip gets its own tag once logged; until then, show the
    // single expected date as a projection.
    if (cycle.harvestLog.length > 0) {
      cycle.harvestLog.forEach((entry) => {
        activities.push({
          id: `${cycle.id}:harvest:${entry.id}`,
          type: "harvesting",
          date: entry.date,
          projected: entry.date > today,
          ...ctx,
        });
      });
    } else if (cycle.expectedHarvestDate) {
      activities.push({
        id: `${cycle.id}:harvest-expected`,
        type: "harvesting",
        date: cycle.expectedHarvestDate,
        projected: true,
        ...ctx,
      });
    }

    cycle.activities.forEach((activity) => {
      activities.push({
        id: `${cycle.id}:${activity.id}`,
        type: activity.type,
        date: activity.date,
        projected: activity.date > today,
        ...ctx,
      });
    });
  });

  // Deliveries close the loop: the day produce leaves the farm for a buyer.
  db.orders.forEach((order) => {
    const lines = order.lineItems.map((item) => {
      const cycle = db.cropCycles.find((c) => c.id === item.cropCycleId);
      const farmer = cycle ? db.farmers.find((f) => f.id === cycle.farmerId) : undefined;
      return {
        cropName: cycle?.cropName ?? "—",
        farmerName: farmer ? farmerFullName(farmer) : "Unknown farmer",
        quantityKg: item.quantityKg,
      };
    });
    const cropNames = Array.from(new Set(lines.map((l) => l.cropName)));
    const totalKg = lines.reduce((sum, l) => sum + l.quantityKg, 0);

    activities.push({
      id: `${order.id}:delivery`,
      type: "delivery",
      date: order.deliveryDate,
      // Only a pending order is still ahead of us; delivered/completed already happened.
      projected: order.status === "pending",
      cropCycleId: null,
      orderId: order.id,
      href: `/orders/${order.id}`,
      cropName: cropNames.join(", "),
      plotName: "",
      farmerName: Array.from(new Set(lines.map((l) => l.farmerName))).join(", "),
      title: `${order.code} · ${order.buyer}`,
      subtitle: `${cropNames.join(", ")} · ${formatNumber(totalKg)} kg · ${
        order.deliveryMethod === "pickup" ? "Pick up" : "Delivery"
      }`,
    });
  });

  return delay(activities.sort((a, b) => a.date.localeCompare(b.date)));
}

/* ---------------------------------------------------------- Supply forecast */

export type ForecastBucketSize = "week" | "month";

/**
 * Forward-looking expected supply: how much of each crop should be ready by
 * when, across every farmer. Counts only cycles that have not started being
 * picked (Growing / Ready to harvest) — once picking starts, real quantities
 * live in the Harvest Log and are matched through Supply Matching instead.
 */
export async function getSupplyForecast(
  bucketSize: ForecastBucketSize = "month",
): Promise<SupplyForecastGroup[]> {
  const db = getState();
  const today = toISODate(new Date());

  const groups = new Map<string, SupplyForecastGroup>();

  db.cropCycles.forEach((cycle) => {
    const status = cropCycleStatus(cycle, today);
    if (status !== "growing" && status !== "ready_to_harvest") return;
    if (!cycle.expectedHarvestDate || !cycle.expectedOutputKg) return;

    const date = parseISO(cycle.expectedHarvestDate);
    const periodDate = bucketSize === "week" ? startOfWeek(date, { weekStartsOn: 1 }) : startOfMonth(date);
    const periodStart = toISODate(periodDate);
    const label =
      bucketSize === "week" ? `Week of ${format(periodDate, "d MMM")}` : format(periodDate, "MMMM yyyy");

    const group = groups.get(cycle.cropRefId) ?? {
      cropRefId: cycle.cropRefId,
      cropName: cycle.cropName,
      totalExpectedKg: 0,
      buckets: [],
    };

    const bucket = group.buckets.find((b) => b.periodStart === periodStart);
    if (bucket) {
      bucket.expectedKg += cycle.expectedOutputKg;
      bucket.cycleCount += 1;
    } else {
      group.buckets.push({ periodStart, label, expectedKg: cycle.expectedOutputKg, cycleCount: 1 });
    }

    group.totalExpectedKg += cycle.expectedOutputKg;
    groups.set(cycle.cropRefId, group);
  });

  const rows = Array.from(groups.values())
    .map((group) => ({
      ...group,
      buckets: group.buckets.sort((a, b) => a.periodStart.localeCompare(b.periodStart)),
    }))
    .sort((a, b) => b.totalExpectedKg - a.totalExpectedKg);

  return delay(rows);
}
