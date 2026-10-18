import { ConflictError, delay, getState, mutate, NotFoundError } from "../db";
import {
  canReportProblem,
  harvestedQuantityKg,
  isHandoverDue,
  lineItemTotals,
  nextOrderStatus,
} from "../derive";
import { formatKg, toISODate } from "../format";
import { uid } from "../utils";
import { farmerFullName } from "./farmers";
import { soldKgForCycle } from "./guards";
import type {
  HandoverCheck,
  ID,
  Order,
  OrderInput,
  OrderLineItemSummary,
  OrderStatus,
  OrderSummary,
  ProblemReport,
} from "../types";

function toSummary(order: Order): OrderSummary {
  const db = getState();

  const lineItems: OrderLineItemSummary[] = order.lineItems.map((item) => {
    const cycle = db.cropCycles.find((c) => c.id === item.cropCycleId);
    const farmer = cycle ? db.farmers.find((f) => f.id === cycle.farmerId) : undefined;
    const plot = cycle ? db.plots.find((p) => p.id === cycle.plotId) : undefined;
    return {
      ...item,
      farmerId: cycle?.farmerId ?? "",
      farmerName: farmer ? farmerFullName(farmer) : "Unknown farmer",
      plotName: plot?.name ?? "—",
      cropName: cycle?.cropName ?? "—",
      varietyType: cycle?.varietyType ?? "—",
      cropRefId: cycle?.cropRefId ?? "",
      lineTotal: item.quantityKg * item.pricePerKg,
    };
  });

  const totals = lineItemTotals(order.lineItems);

  return {
    ...order,
    lineItems,
    totalQuantityKg: totals.quantityKg,
    totalPrice: totals.revenue,
    farmerNames: Array.from(new Set(lineItems.map((i) => i.farmerName))),
    // An unmatched request has no farmer lines yet: fall back to the crop that was asked for.
    cropNames: lineItems.length
      ? Array.from(new Set(lineItems.map((i) => i.cropName)))
      : [order.requested.cropName],
    hasProblem: order.lineItems.some((i) => i.problem !== null),
    handoverDue: isHandoverDue(order),
  };
}

/** The number inside a code like "PO-0009" or "REQ-0010". */
function codeNumber(code: string): number {
  const n = Number(code.replace(/\D/g, ""));
  return Number.isNaN(n) ? 0 : n;
}

function nextOrderCode(): string {
  const numbers = getState().orders.map((o) => codeNumber(o.code));
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `PO-${String(next).padStart(4, "0")}`;
}

export async function listOrders(options?: {
  search?: string;
  status?: OrderStatus | "all";
  /** Only Confirmed orders whose delivery date has arrived and still need a handover check. */
  handoverDue?: boolean;
}): Promise<OrderSummary[]> {
  const q = (options?.search ?? "").trim().toLowerCase();
  const rows = getState()
    .orders.map(toSummary)
    .filter((o) => (options?.status && options.status !== "all" ? o.status === options.status : true))
    .filter((o) => (options?.handoverDue ? o.handoverDue : true))
    .filter((o) =>
      q
        ? o.code.toLowerCase().includes(q) ||
          o.buyer.toLowerCase().includes(q) ||
          o.cropNames.some((c) => c.toLowerCase().includes(q)) ||
          o.farmerNames.some((f) => f.toLowerCase().includes(q))
        : true,
    )
    // Newest first, by the number in the code (as in the Buyer App), then by order date.
    .sort((a, b) => codeNumber(b.code) - codeNumber(a.code) || b.orderDate.localeCompare(a.orderDate));
  return delay(rows);
}

export async function countOrdersByStatus(): Promise<Record<OrderStatus, number>> {
  const counts: Record<OrderStatus, number> = {
    requested: 0,
    confirmed: 0,
    delivered: 0,
    completed: 0,
    declined: 0,
    cancelled: 0,
  };
  getState().orders.forEach((o) => {
    counts[o.status] += 1;
  });
  return delay(counts);
}

export async function getOrder(id: ID): Promise<OrderSummary> {
  const order = getState().orders.find((o) => o.id === id);
  if (!order) throw new NotFoundError("Order", id);
  return delay(toSummary(order));
}

/** Orders referencing a given crop cycle, for that cycle's detail screen. */
export async function listOrdersForCropCycle(cycleId: ID): Promise<OrderSummary[]> {
  const rows = getState()
    .orders.filter((o) => o.lineItems.some((i) => i.cropCycleId === cycleId))
    .map(toSummary)
    .sort((a, b) => b.orderDate.localeCompare(a.orderDate));
  return delay(rows);
}

/** Orders drawing on any of a farmer's crop cycles, for the farmer detail screen. */
export async function listOrdersForFarmer(farmerId: ID): Promise<OrderSummary[]> {
  const db = getState();
  const cycleIds = new Set(db.cropCycles.filter((c) => c.farmerId === farmerId).map((c) => c.id));
  const rows = db.orders
    .filter((o) => o.lineItems.some((i) => cycleIds.has(i.cropCycleId)))
    .map(toSummary)
    .sort((a, b) => b.orderDate.localeCompare(a.orderDate));
  return delay(rows);
}

/**
 * The same rules the Supply Matching screen enforces, held at the service
 * boundary so no caller can oversell produce: every line needs a real cycle,
 * a positive quantity and price, and no more than that cycle has picked and
 * not yet allocated elsewhere.
 */
function validateOrder(input: OrderInput, excludeOrderId?: ID) {
  const db = getState();

  if (input.lineItems.length === 0) throw new ConflictError("Add at least one line item.");
  if (input.deliveryDate < input.orderDate) {
    throw new ConflictError("Delivery date can't be before the order date.");
  }

  const requested = new Map<ID, number>();
  input.lineItems.forEach((item) => {
    if (!(item.quantityKg > 0) || !(item.pricePerKg > 0)) {
      throw new ConflictError("Every line item needs a quantity and a price.");
    }
    requested.set(item.cropCycleId, (requested.get(item.cropCycleId) ?? 0) + item.quantityKg);
  });

  requested.forEach((quantityKg, cycleId) => {
    const cycle = db.cropCycles.find((c) => c.id === cycleId);
    if (!cycle) throw new NotFoundError("Crop cycle", cycleId);
    const available = harvestedQuantityKg(cycle.harvestLog) - soldKgForCycle(cycleId, excludeOrderId);
    if (quantityKg > available) {
      throw new ConflictError(
        `${cycle.cropName} (${formatKg(Math.max(0, available))} available) can't cover ${formatKg(quantityKg)}.`,
      );
    }
  });
}

/** The crop and total kg of an order built from allocations (the unreachable agent-side builder). */
function requestedFromInput(input: OrderInput): Order["requested"] {
  const first = getState().cropCycles.find((c) => c.id === input.lineItems[0]?.cropCycleId);
  return {
    cropRefId: first?.cropRefId ?? null,
    cropName: first?.cropName ?? "—",
    quantityKg: input.lineItems.reduce((sum, i) => sum + i.quantityKg, 0),
  };
}

export async function createOrder(input: OrderInput): Promise<Order> {
  validateOrder(input);
  const order: Order = {
    ...input,
    // Orders are raised in the Buyer App or Admin Portal; this path is not reachable from the
    // agent UI. An "Order now" is confirmed on the spot and moves forward via advanceOrderStatus.
    status: "confirmed",
    source: "staff",
    kind: "order_now",
    requested: requestedFromInput(input),
    pickup: null,
    requirements: { ripeness: null, size: null },
    requirementsText: null,
    reason: null,
    id: uid("order"),
    code: nextOrderCode(),
    lineItems: input.lineItems.map((item) => ({
      ...item,
      id: uid("line"),
      problem: null,
      handoverCheck: null,
    })),
    createdAt: new Date().toISOString().slice(0, 10),
  };
  mutate((db) => db.orders.push(order));
  return delay(order);
}

export async function updateOrder(id: ID, input: OrderInput): Promise<Order> {
  const existing = getState().orders.find((o) => o.id === id);
  if (!existing) throw new NotFoundError("Order", id);
  if (existing.status === "completed") {
    throw new ConflictError(`${existing.code} is completed and can no longer be edited.`);
  }
  validateOrder(input, id);

  const updated = mutate((db) => {
    const index = db.orders.findIndex((o) => o.id === id);
    if (index === -1) throw new NotFoundError("Order", id);
    const next: Order = {
      ...db.orders[index],
      ...input,
      id,
      code: db.orders[index].code,
      status: db.orders[index].status,
      // Re-saving allocations must not wipe a line's problem report or handover check.
      lineItems: input.lineItems.map((item) => {
        const before = db.orders[index].lineItems.find((l) => l.cropCycleId === item.cropCycleId);
        return {
          ...item,
          id: uid("line"),
          problem: before?.problem ?? null,
          handoverCheck: before?.handoverCheck ?? null,
        };
      }),
    };
    db.orders[index] = next;
    return next;
  });
  return delay(updated);
}

/** Moves an order one step along requested → confirmed → delivered → completed. */
export async function advanceOrderStatus(id: ID): Promise<Order> {
  const updated = mutate((db) => {
    const order = db.orders.find((o) => o.id === id);
    if (!order) throw new NotFoundError("Order", id);
    const next = nextOrderStatus(order.status);
    if (next) order.status = next;
    return order;
  });
  return delay(updated);
}

export async function cancelOrder(id: ID): Promise<void> {
  const existing = getState().orders.find((o) => o.id === id);
  if (existing?.status === "completed") {
    throw new ConflictError(`${existing.code} is completed and can't be cancelled.`);
  }
  mutate((db) => {
    db.orders = db.orders.filter((o) => o.id !== id);
  });
  return delay(undefined);
}

/* ---------------------------------------------- What the field agent can do */

export interface ProblemInput {
  reason: ProblemReport["reason"];
  note: string;
}

/**
 * Flags a line for staff. It never touches the order status — staff resolve
 * problems in the Admin Portal.
 */
export async function reportProblem(
  orderId: ID,
  lineItemId: ID,
  input: ProblemInput,
): Promise<void> {
  mutate((db) => {
    const order = db.orders.find((o) => o.id === orderId);
    if (!order) throw new NotFoundError("Order", orderId);
    const line = order.lineItems.find((l) => l.id === lineItemId);
    if (!line) throw new NotFoundError("Order line", lineItemId);
    if (!canReportProblem(order.status)) {
      throw new ConflictError(`Problems can't be reported on a ${order.status} order.`);
    }
    line.problem = {
      reason: input.reason,
      note: input.note.trim(),
      reportedAt: toISODate(new Date()),
    };
  });
  return delay(undefined);
}

export interface HandoverCheckInput {
  receivedKg: number;
  acceptedKg: number;
  rejectReason: HandoverCheck["rejectReason"];
  photos: string[];
  note: string;
  buyerRepPresent: boolean | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Records the agent's check of one farmer's produce at handover. Saved once,
 * then locked. The agent does not change the order status — staff mark it
 * Delivered in the Admin Portal.
 */
export async function saveHandoverCheck(
  orderId: ID,
  lineItemId: ID,
  input: HandoverCheckInput,
): Promise<void> {
  mutate((db) => {
    const order = db.orders.find((o) => o.id === orderId);
    if (!order) throw new NotFoundError("Order", orderId);
    const line = order.lineItems.find((l) => l.id === lineItemId);
    if (!line) throw new NotFoundError("Order line", lineItemId);

    if (order.status !== "confirmed") {
      throw new ConflictError("A handover check can only be recorded on a Confirmed order.");
    }
    if (line.handoverCheck) throw new ConflictError("This handover check is already saved.");
    if (!(input.receivedKg > 0)) throw new ConflictError("Enter the kg received.");
    if (input.acceptedKg < 0 || input.acceptedKg > input.receivedKg) {
      throw new ConflictError("Accepted kg can't be more than received kg.");
    }
    const rejectedKg = round2(input.receivedKg - input.acceptedKg);
    if (rejectedKg > 0 && !input.rejectReason) {
      throw new ConflictError("Choose a reason for the rejected kg.");
    }
    if (input.photos.length > 4) throw new ConflictError("Attach at most 4 photos.");

    line.handoverCheck = {
      receivedKg: input.receivedKg,
      acceptedKg: input.acceptedKg,
      rejectedKg,
      rejectReason: rejectedKg > 0 ? input.rejectReason : null,
      photos: input.photos,
      note: input.note.trim(),
      buyerRepPresent: order.deliveryMethod === "pickup" ? Boolean(input.buyerRepPresent) : null,
      checkedAt: toISODate(new Date()),
    };
  });
  return delay(undefined);
}
