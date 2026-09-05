import { toISODate } from "./format";
import type { CropCycle, CropCycleStatus, CropCosts, OrderStatus } from "./types";

export function totalCost(costs: CropCosts): number {
  return (costs.seed || 0) + (costs.fertilizer || 0) + (costs.labor || 0) + (costs.other || 0);
}

/** Actual figures win once they exist; otherwise we project from the estimates. */
export function effectiveOutputKg(cycle: Pick<CropCycle, "expectedOutputKg" | "actualOutputKg">) {
  return cycle.actualOutputKg ?? cycle.expectedOutputKg ?? 0;
}

export function effectivePricePerKg(
  cycle: Pick<CropCycle, "estimatedPricePerKg" | "actualPricePerKg">,
) {
  return cycle.actualPricePerKg ?? cycle.estimatedPricePerKg ?? 0;
}

/** Cost per kg the farmer must clear to avoid a loss. Read-only in the UI. */
export function breakEvenPricePerKg(cycle: Pick<CropCycle, "costs" | "expectedOutputKg" | "actualOutputKg">) {
  const output = effectiveOutputKg(cycle);
  if (!output) return null;
  return totalCost(cycle.costs) / output;
}

export function projectedRevenue(
  cycle: Pick<
    CropCycle,
    "expectedOutputKg" | "actualOutputKg" | "estimatedPricePerKg" | "actualPricePerKg"
  >,
) {
  return effectiveOutputKg(cycle) * effectivePricePerKg(cycle);
}

export function marginPercent(
  cycle: Pick<
    CropCycle,
    "costs" | "expectedOutputKg" | "actualOutputKg" | "estimatedPricePerKg" | "actualPricePerKg"
  >,
) {
  const revenue = projectedRevenue(cycle);
  if (!revenue) return null;
  return ((revenue - totalCost(cycle.costs)) / revenue) * 100;
}

export function cropCycleStatus(
  cycle: Pick<CropCycle, "actualHarvestDate" | "expectedHarvestDate">,
  today = toISODate(new Date()),
): CropCycleStatus {
  if (cycle.actualHarvestDate) return "harvested";
  if (cycle.expectedHarvestDate && cycle.expectedHarvestDate <= today) return "ready_to_harvest";
  return "growing";
}

export const CROP_STATUS_LABEL: Record<CropCycleStatus, string> = {
  growing: "Growing",
  ready_to_harvest: "Ready to harvest",
  harvested: "Harvested",
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  delivered: "Delivered",
  completed: "Completed",
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
