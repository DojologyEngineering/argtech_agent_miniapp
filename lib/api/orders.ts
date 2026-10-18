import { ConflictError, delay, getState, mutate, NotFoundError } from "../db";
import { harvestedQuantityKg, lineItemTotals, nextOrderStatus } from "../derive";
import { formatKg } from "../format";
import { uid } from "../utils";
import { farmerFullName } from "./farmers";
import { soldKgForCycle } from "./guards";
import type {
  ID,
  Order,
  OrderInput,
  OrderLineItemSummary,
  OrderStatus,
  OrderSummary,
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
    cropNames: Array.from(new Set(lineItems.map((i) => i.cropName))),
  };
}

function nextOrderCode(): string {
  const numbers = getState()
    .orders.map((o) => Number(o.code.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `PO-${String(next).padStart(3, "0")}`;
}

export async function listOrders(options?: {
  search?: string;
  status?: OrderStatus | "all";
}): Promise<OrderSummary[]> {
  const q = (options?.search ?? "").trim().toLowerCase();
  const rows = getState()
    .orders.map(toSummary)
    .filter((o) => (options?.status && options.status !== "all" ? o.status === options.status : true))
    .filter((o) =>
      q
        ? o.code.toLowerCase().includes(q) ||
          o.buyer.toLowerCase().includes(q) ||
          o.cropNames.some((c) => c.toLowerCase().includes(q)) ||
          o.farmerNames.some((f) => f.toLowerCase().includes(q))
        : true,
    )
    .sort((a, b) => b.orderDate.localeCompare(a.orderDate));
  return delay(rows);
}

export async function countOrdersByStatus(): Promise<Record<OrderStatus, number>> {
  const counts: Record<OrderStatus, number> = { pending: 0, delivered: 0, completed: 0 };
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

export async function createOrder(input: OrderInput): Promise<Order> {
  validateOrder(input);
  const order: Order = {
    ...input,
    // New orders always start pending; status only moves forward through advanceOrderStatus.
    status: "pending",
    id: uid("order"),
    code: nextOrderCode(),
    lineItems: input.lineItems.map((item) => ({ ...item, id: uid("line") })),
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
      lineItems: input.lineItems.map((item) => ({ ...item, id: uid("line") })),
    };
    db.orders[index] = next;
    return next;
  });
  return delay(updated);
}

/** Moves an order one step along pending → delivered → completed. */
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
