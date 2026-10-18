import { toISODate } from "./format";
import type {
  CropCycle,
  CropCycleStatus,
  CropCosts,
  HarvestLogEntry,
  OrderLineItem,
  OrderStatus,
} from "./types";

export function totalCost(costs: CropCosts): number {
  return (costs.seed || 0) + (costs.fertilizer || 0) + (costs.labor || 0) + (costs.other || 0);
}

/** Physical output picked so far. Carries no money — harvesting isn't selling. */
export function harvestedQuantityKg(entries: HarvestLogEntry[]): number {
  return entries.reduce((sum, e) => sum + e.quantityKg, 0);
}

/** Totals for a set of order line items (one order, or one cycle's sales). */
export function lineItemTotals(items: Pick<OrderLineItem, "quantityKg" | "pricePerKg">[]) {
  const quantityKg = items.reduce((sum, i) => sum + i.quantityKg, 0);
  const revenue = items.reduce((sum, i) => sum + i.quantityKg * i.pricePerKg, 0);
  return {
    quantityKg,
    revenue,
    averagePricePerKg: quantityKg > 0 ? revenue / quantityKg : null,
  };
}

/**
 * The kg a cycle's cost is spread over. While picking is under way the final
 * yield is unknown, so expected output stands in (or the harvest so far, if
 * that has already overtaken it). Once the cycle is marked complete, the real
 * harvest is the answer.
 *
 * Dividing by kg *sold so far* instead would charge the whole season's cost to
 * the first few kg out of the door and show a deep loss on a healthy cycle.
 */
export function costBasisKg(
  expectedOutputKg: number,
  harvestedKg: number,
  completed: boolean,
): number {
  if (completed && harvestedKg > 0) return harvestedKg;
  return Math.max(expectedOutputKg, harvestedKg);
}

/** Unit cost per kg the farmer must clear to avoid a loss. */
export function breakEvenPricePerKg(costs: CropCosts, basisKg: number): number | null {
  if (basisKg <= 0) return null;
  return totalCost(costs) / basisKg;
}

/** The slice of total cost that the kg sold so far are responsible for. */
export function costOfSoldKg(costs: CropCosts, basisKg: number, soldKg: number): number {
  const unitCost = breakEvenPricePerKg(costs, basisKg);
  return unitCost === null ? 0 : unitCost * soldKg;
}

/** Margin on what has been sold: revenue against the cost of those same kg. */
export function marginPercent(revenue: number, costOfSold: number): number | null {
  if (revenue <= 0) return null;
  return ((revenue - costOfSold) / revenue) * 100;
}

export function cropCycleStatus(
  cycle: Pick<CropCycle, "expectedHarvestDate" | "harvestLog" | "completedAt">,
  today = toISODate(new Date()),
): CropCycleStatus {
  if (cycle.completedAt) return "completed";
  if (cycle.harvestLog.length > 0) return "harvesting";
  if (cycle.expectedHarvestDate && cycle.expectedHarvestDate <= today) return "ready_to_harvest";
  return "growing";
}

export const CROP_STATUS_LABEL: Record<CropCycleStatus, string> = {
  growing: "Growing",
  ready_to_harvest: "Ready to harvest",
  harvesting: "Harvesting",
  completed: "Completed",
};

/** Shared badge tone per status, reused across the crops list, detail and plot screens. */
export const CROP_STATUS_TONE: Record<CropCycleStatus, "green" | "amber" | "blue" | "neutral"> = {
  growing: "green",
  ready_to_harvest: "amber",
  harvesting: "blue",
  completed: "neutral",
};

/** A cycle can be sold from once picking has begun, whatever remains unsold. */
export function isOrderEligible(status: CropCycleStatus): boolean {
  return status === "harvesting" || status === "completed";
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  delivered: "Delivered",
  completed: "Completed",
};

export const ORDER_STATUS_TONE: Record<OrderStatus, "amber" | "green" | "blue"> = {
  pending: "amber",
  delivered: "green",
  completed: "blue",
};

/** Orders move forward only: pending → delivered → completed. */
export function nextOrderStatus(status: OrderStatus): OrderStatus | null {
  if (status === "pending") return "delivered";
  if (status === "delivered") return "completed";
  return null;
}

export function orderStatusStep(status: OrderStatus): number {
  return status === "pending" ? 1 : status === "delivered" ? 2 : 3;
}
