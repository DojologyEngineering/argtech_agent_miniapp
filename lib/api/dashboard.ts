import { format, parseISO, subMonths } from "date-fns";
import { delay, getState } from "../db";
import { cropCycleStatus } from "../derive";
import { toISODate } from "../format";
import { farmerFullName } from "./farmers";
import type { ID, OrderStatus } from "../types";

export interface DashboardStats {
  totalFarmers: number;
  totalPlots: number;
  activeCrops: number;
  purchaseOrders: number;
}

export interface HarvestPoint {
  month: string; // "Apr"
  tons: number;
}

export interface UpcomingHarvest {
  cropCycleId: ID;
  cropName: string;
  farmerName: string;
  plotName: string;
  date: string;
  tons: number;
  province: string;
  overdue: boolean;
}

export interface RecentOrderRow {
  id: ID;
  code: string;
  cropName: string;
  quantity: number;
  unit: string;
  buyer: string;
  status: OrderStatus;
}

export interface DashboardData {
  stats: DashboardStats;
  harvestSeries: HarvestPoint[];
  harvestChangePercent: number | null;
  upcomingHarvests: UpcomingHarvest[];
  recentOrders: RecentOrderRow[];
}

export async function getDashboard(): Promise<DashboardData> {
  const db = getState();
  const today = toISODate(new Date());

  const activeCrops = db.cropCycles.filter((c) => cropCycleStatus(c, today) !== "harvested").length;

  // Actual harvested volume, bucketed into the last six months.
  const buckets: HarvestPoint[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const d = subMonths(now, i);
    buckets.push({ month: format(d, "MMM"), tons: 0 });
  }
  const bucketKeys = Array.from({ length: 6 }, (_, i) =>
    format(subMonths(now, 5 - i), "yyyy-MM"),
  );

  db.cropCycles.forEach((cycle) => {
    if (!cycle.actualHarvestDate || !cycle.actualOutputKg) return;
    const key = format(parseISO(cycle.actualHarvestDate), "yyyy-MM");
    const index = bucketKeys.indexOf(key);
    if (index >= 0) buckets[index].tons += cycle.actualOutputKg / 1000;
  });
  buckets.forEach((b) => {
    b.tons = Number(b.tons.toFixed(2));
  });

  const last = buckets[buckets.length - 1]?.tons ?? 0;
  const previous = buckets[buckets.length - 2]?.tons ?? 0;
  const harvestChangePercent = previous > 0 ? ((last - previous) / previous) * 100 : null;

  const upcomingHarvests: UpcomingHarvest[] = db.cropCycles
    .filter((c) => !c.actualHarvestDate && c.expectedHarvestDate)
    .map((cycle) => {
      const farmer = db.farmers.find((f) => f.id === cycle.farmerId);
      const plot = db.plots.find((p) => p.id === cycle.plotId);
      return {
        cropCycleId: cycle.id,
        cropName: cycle.cropName,
        farmerName: farmer ? farmerFullName(farmer) : "Unassigned",
        plotName: plot?.name ?? "Unassigned",
        date: cycle.expectedHarvestDate,
        tons: Number((cycle.expectedOutputKg / 1000).toFixed(2)),
        province: farmer?.province ?? "—",
        overdue: cycle.expectedHarvestDate < today,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  const recentOrders: RecentOrderRow[] = [...db.orders]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4)
    .map((order) => ({
      id: order.id,
      code: order.code,
      cropName: db.cropCycles.find((c) => c.id === order.cropCycleId)?.cropName ?? "—",
      quantity: order.quantity,
      unit: order.unit,
      buyer: order.buyer,
      status: order.status,
    }));

  return delay({
    stats: {
      totalFarmers: db.farmers.length,
      totalPlots: db.plots.length,
      activeCrops,
      purchaseOrders: db.orders.length,
    },
    harvestSeries: buckets,
    harvestChangePercent,
    upcomingHarvests,
    recentOrders,
  });
}
