import { ConflictError, getState } from "../db";
import type { ID } from "../types";

/**
 * Orders already delivered or completed are the record of what really shipped,
 * so produce that went into them can't be deleted out from under them. Pending
 * orders are still negotiable — their allocations are released instead.
 */
export function assertNoSettledSales(cycleIds: ID[], subject: string) {
  if (cycleIds.length === 0) return;
  const codes = getState()
    .orders.filter((o) => o.status !== "pending")
    .filter((o) => o.lineItems.some((i) => cycleIds.includes(i.cropCycleId)))
    .map((o) => o.code);
  if (codes.length === 0) return;

  throw new ConflictError(
    `Can't delete ${subject}: produce from it is part of ${codes.join(", ")}, which ${
      codes.length === 1 ? "is" : "are"
    } already delivered or completed.`,
  );
}

/** Kg of a cycle already allocated on orders, optionally ignoring one order. */
export function soldKgForCycle(cycleId: ID, excludeOrderId?: ID): number {
  return getState()
    .orders.filter((o) => o.id !== excludeOrderId)
    .flatMap((o) => o.lineItems)
    .filter((i) => i.cropCycleId === cycleId)
    .reduce((sum, i) => sum + i.quantityKg, 0);
}
