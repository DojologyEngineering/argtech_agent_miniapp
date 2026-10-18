import { formatNumber, toISODate } from "./format";
import type {
  CropCycle,
  CropCycleStatus,
  CropCosts,
  HarvestLogEntry,
  DeliveryMethod,
  Order,
  OrderLineItem,
  OrderStatus,
  OrderSummary,
  ProductionDetails,
  RequestedCrop,
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
  requested: "Requested",
  confirmed: "Confirmed",
  delivered: "Delivered",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
};

/** "Delivered" reads "Picked up" on a pickup order — the buyer collected it. */
export function orderStatusLabel(status: OrderStatus, method: DeliveryMethod): string {
  return status === "delivered" && method === "pickup" ? "Picked up" : ORDER_STATUS_LABEL[status];
}

/** The date that matters on a card: needed-by for open requests, otherwise delivery or pickup. */
export function orderDateLabel(order: Pick<Order, "status" | "deliveryMethod">): string {
  if (order.status === "requested" || order.status === "declined") return "Needed by";
  return order.deliveryMethod === "pickup" ? "Pickup" : "Delivery";
}

/** "Pumpkin" for catalog crops, "Other crop: Pumpkin" for crops that are not listed. */
export function requestedCropLabel(requested: Pick<RequestedCrop, "cropRefId" | "cropName">): string {
  return requested.cropRefId ? requested.cropName : `Other crop: ${requested.cropName}`;
}

/**
 * "150 kg requested" while a request is unmatched, "400 of 500 kg" when staff confirmed
 * less than was asked for, otherwise "300 kg".
 */
export function orderQuantityLabel(
  order: Pick<OrderSummary, "lineItems" | "totalQuantityKg" | "requested">,
): string {
  if (order.lineItems.length === 0) return `${formatNumber(order.requested.quantityKg)} kg requested`;
  if (order.totalQuantityKg !== order.requested.quantityKg) {
    return `${formatNumber(order.totalQuantityKg)} of ${formatNumber(order.requested.quantityKg)} kg`;
  }
  return `${formatNumber(order.totalQuantityKg)} kg`;
}

/** What the produce is checked against, in the buyer's words; "Standard" when they asked for nothing extra. */
export function orderRequirementsLabel(
  order: Pick<Order, "requirements" | "requirementsText" | "requested">,
): string {
  if (!order.requested.cropRefId) return order.requirementsText || "To be agreed with ARG TECH";
  const { ripeness, size } = order.requirements;
  const parts = [ripeness && `Ripeness: ${ripeness}`, size && `Size: ${size}`].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Standard";
}

export const ORDER_STATUS_TONE: Record<OrderStatus, "neutral" | "amber" | "green" | "blue" | "red"> = {
  requested: "neutral",
  confirmed: "amber",
  delivered: "green",
  completed: "blue",
  declined: "red",
  cancelled: "neutral",
};

/** Orders move forward only: requested → confirmed → delivered → completed. */
export function nextOrderStatus(status: OrderStatus): OrderStatus | null {
  if (status === "requested") return "confirmed";
  if (status === "confirmed") return "delivered";
  if (status === "delivered") return "completed";
  return null;
}

/** Position on the Requested → Completed flow; 0 for orders that left it (declined, cancelled). */
export function orderStatusStep(status: OrderStatus): number {
  switch (status) {
    case "requested":
      return 1;
    case "confirmed":
      return 2;
    case "delivered":
      return 3;
    case "completed":
      return 4;
    default:
      return 0;
  }
}

/** Declined and cancelled orders release their produce — it no longer counts as sold. */
export function orderCountsAsSold(status: OrderStatus): boolean {
  return status !== "declined" && status !== "cancelled";
}

/** Delivered or completed: the produce has left the farm and the order is the record of it. */
export function isOrderSettled(status: OrderStatus): boolean {
  return status === "delivered" || status === "completed";
}

/** The handover check is filled in at Confirmed and stays visible afterwards. */
export function showsHandoverCheck(status: OrderStatus): boolean {
  return status === "confirmed" || status === "delivered" || status === "completed";
}

/**
 * A handover is due once a Confirmed order reaches its delivery date and some
 * line still has no saved check. Delivered and completed orders are no longer due.
 */
export function isHandoverDue(
  order: Pick<Order, "status" | "deliveryDate" | "lineItems">,
  today = toISODate(new Date()),
): boolean {
  return (
    order.status === "confirmed" &&
    order.deliveryDate <= today &&
    order.lineItems.some((line) => !line.handoverCheck)
  );
}

/** Problems can be reported once an order is Confirmed, and until it is completed. */
export function canReportProblem(status: OrderStatus): boolean {
  return status === "confirmed" || status === "delivered";
}

/** True when production method, fertilizer type or pesticide use hasn't been filled in. */
export function productionDetailsMissing(
  production: Pick<ProductionDetails, "method" | "fertilizerType" | "pesticideUsed">,
): boolean {
  return !production.method || !production.fertilizerType || !production.pesticideUsed;
}
