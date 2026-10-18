"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Package, Plus } from "lucide-react";
import { ScreenHeader, HeaderIconButton } from "@/components/layout/screen-header";
import { Content } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Badge, EmptyState, ListSkeleton, SearchInput } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { useQuery } from "@/lib/hooks/use-query";
import { countOrdersByStatus, listOrders } from "@/lib/api/orders";
import { ORDER_STATUS_LABEL } from "@/lib/derive";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

type Tab = OrderStatus | "all";

const STATUS_TONE = { pending: "amber", delivered: "green", completed: "blue" } as const;

const TABS: { value: Tab; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "delivered", label: "Delivery" },
  { value: "completed", label: "Completed" },
];

export default function OrdersPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");

  const { data: orders, loading } = useQuery(
    () => listOrders({ search, status: tab }),
    [search, tab],
  );
  const { data: counts } = useQuery(() => countOrdersByStatus(), []);

  const total = counts ? counts.pending + counts.delivered + counts.completed : 0;

  return (
    <>
      <ScreenHeader
        title="Purchase Order"
        subtitle={`${total} order${total === 1 ? "" : "s"}`}
        action={
          <HeaderIconButton href="/orders/new" label="Add order">
            <Plus className="size-5" />
          </HeaderIconButton>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2.5">
            {TABS.map((item) => {
              const active = tab === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setTab(active ? "all" : item.value)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-xl px-2 py-2.5 text-center transition-colors",
                    active ? "bg-white text-brand-700" : "bg-white/15 text-white",
                  )}
                >
                  <p className="text-xl font-extrabold leading-tight">
                    {counts ? counts[item.value as OrderStatus] : "—"}
                  </p>
                  <p className={cn("text-[11px]", active ? "text-muted" : "text-white/80")}>
                    {item.label}
                  </p>
                </button>
              );
            })}
          </div>
          <SearchInput value={search} onChange={setSearch} placeholder="Search orders..." />
        </div>
      </ScreenHeader>

      <Content withNav className="space-y-2.5">
        {tab !== "all" ? (
          <button
            type="button"
            onClick={() => setTab("all")}
            className="mb-1 text-xs font-semibold text-brand-700 underline"
          >
            Showing {ORDER_STATUS_LABEL[tab]} only — show all orders
          </button>
        ) : null}

        {loading && !orders ? <ListSkeleton /> : null}

        {orders?.map((order) => (
          <Link key={order.id} href={`/orders/${order.id}`} className="block">
            <Card className="p-3.5 active:bg-canvas">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl",
                    order.status === "pending"
                      ? "bg-amber-50 text-amber-600"
                      : order.status === "delivered"
                        ? "bg-brand-50 text-brand-600"
                        : "bg-blue-50 text-blue-600",
                  )}
                >
                  <Package className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-bold text-ink">{order.code}</p>
                    <Badge tone={STATUS_TONE[order.status]} dot>
                      {ORDER_STATUS_LABEL[order.status]}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted">
                    {order.buyer} · {formatDate(order.orderDate)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-ink">{formatCurrency(order.totalPrice)}</p>
                  <p className="text-[11px] text-muted">{formatNumber(order.totalQuantityKg)} kg</p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted/70" />
              </div>

              {/* One row per line item — an order can span several farmers. */}
              <div className="mt-3 space-y-1.5 border-t border-line/70 pt-2.5">
                {order.lineItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs">
                    <span className="min-w-0 flex-1 truncate text-muted">
                      <span className="font-medium text-ink">{item.cropName}</span> ·{" "}
                      {item.farmerName} · {item.plotName}
                    </span>
                    <span className="shrink-0 text-muted">
                      {formatNumber(item.quantityKg)} kg × {formatCurrency(item.pricePerKg, 2)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </Link>
        ))}

        {orders && orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title={search || tab !== "all" ? "No orders match" : "No purchase orders yet"}
            description={
              search || tab !== "all"
                ? "Try another search or status."
                : "Raise an order against a harvested crop cycle."
            }
            action={
              search || tab !== "all" ? null : (
                <Button asChild size="sm">
                  <Link href="/orders/new">
                    <Plus /> Add order
                  </Link>
                </Button>
              )
            }
          />
        ) : null}
      </Content>
    </>
  );
}
