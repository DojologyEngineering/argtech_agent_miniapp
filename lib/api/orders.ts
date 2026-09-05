import { delay, getState, mutate, NotFoundError } from "../db";
import { nextOrderStatus } from "../derive";
import { uid } from "../utils";
import { farmerFullName } from "./farmers";
import type { ID, Order, OrderInput, OrderStatus, OrderSummary } from "../types";

function toSummary(order: Order): OrderSummary {
  const db = getState();
  const cycle = db.cropCycles.find((c) => c.id === order.cropCycleId) ?? null;
  const farmer = cycle ? db.farmers.find((f) => f.id === cycle.farmerId) : undefined;
  const plot = cycle ? db.plots.find((p) => p.id === cycle.plotId) : undefined;
  return {
    ...order,
    cycle,
    cropName: cycle?.cropName ?? "—",
    farmerName: farmer ? farmerFullName(farmer) : "—",
    plotName: plot?.name ?? "—",
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
          o.cropName.toLowerCase().includes(q) ||
          o.farmerName.toLowerCase().includes(q) ||
          o.buyer.toLowerCase().includes(q)
        : true,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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

export async function createOrder(input: OrderInput): Promise<Order> {
  const order: Order = {
    ...input,
    id: uid("order"),
    code: nextOrderCode(),
    createdAt: new Date().toISOString().slice(0, 10),
  };
  mutate((db) => db.orders.push(order));
  return delay(order);
}

export async function updateOrder(id: ID, input: OrderInput): Promise<Order> {
  const updated = mutate((db) => {
    const index = db.orders.findIndex((o) => o.id === id);
    if (index === -1) throw new NotFoundError("Order", id);
    const next: Order = { ...db.orders[index], ...input, id, code: db.orders[index].code };
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
  mutate((db) => {
    db.orders = db.orders.filter((o) => o.id !== id);
  });
  return delay(undefined);
}
