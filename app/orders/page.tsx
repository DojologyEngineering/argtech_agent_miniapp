"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight, Package } from "lucide-react";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Content } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Badge, EmptyState, FilterChips, ListSkeleton, SearchInput } from "@/components/ui/misc";
import { useQuery } from "@/lib/hooks/use-query";
import { countOrdersByStatus, listOrders } from "@/lib/api/orders";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  orderDateLabel,
  orderQuantityLabel,
  orderStatusLabel,
  requestedCropLabel,
} from "@/lib/derive";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

type Filter = OrderStatus | "all";

// Same chips, in the same order, as the Buyer App's "My orders".
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "requested", label: ORDER_STATUS_LABEL.requested },
  { value: "confirmed", label: ORDER_STATUS_LABEL.confirmed },
  { value: "delivered", label: ORDER_STATUS_LABEL.delivered },
  { value: "completed", label: ORDER_STATUS_LABEL.completed },
  { value: "declined", label: ORDER_STATUS_LABEL.declined },
  { value: "cancelled", label: ORDER_STATUS_LABEL.cancelled },
];

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersView />
    </Suspense>
  );
}

function OrdersView() {
  // The dashboard's "Handovers due" card links here with ?filter=handover.
  const initialHandoverFilter = useSearchParams().get("filter") === "handover";

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [handoverOnly, setHandoverOnly] = useState(initialHandoverFilter);

  const { data: orders, loading } = useQuery(
    () => listOrders({ search, status: filter, handoverDue: handoverOnly }),
    [search, filter, handoverOnly],
  );
  const { data: counts } = useQuery(() => countOrdersByStatus(), []);

  const total = counts ? Object.values(counts).reduce((sum, n) => sum + n, 0) : 0;
  const narrowed = filter !== "all" || handoverOnly;

  return (
    <>
      <ScreenHeader
        title="Purchase Order"
        subtitle={`${total} order${total === 1 ? "" : "s"} · view only`}
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Search orders..." />
      </ScreenHeader>

      <Content withNav className="space-y-2.5">
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} className="mb-0.5" />

        {handoverOnly ? (
          <button
            type="button"
            onClick={() => setHandoverOnly(false)}
            className="mb-1 text-xs font-semibold text-brand-700 underline"
          >
            Showing orders with a check due today — show all orders
          </button>
        ) : null}

        {loading && !orders ? <ListSkeleton /> : null}

        {orders?.map((order) => {
          const matched = order.lineItems.length > 0;
          return (
            <Link key={order.id} href={`/orders/${order.id}`} className="block">
              <Card className="p-3.5 active:bg-canvas">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-xl",
                      order.status === "confirmed"
                        ? "bg-amber-50 text-amber-600"
                        : order.status === "delivered"
                          ? "bg-brand-50 text-brand-600"
                          : order.status === "completed"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-canvas text-muted",
                    )}
                  >
                    <Package className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-[15px] font-bold text-ink">{order.code}</p>
                      <Badge tone={ORDER_STATUS_TONE[order.status]} dot>
                        {orderStatusLabel(order.status, order.deliveryMethod)}
                      </Badge>
                      {order.hasProblem ? <Badge tone="red">Problem reported</Badge> : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      <span className="font-medium text-ink">
                        {requestedCropLabel(order.requested)}
                      </span>{" "}
                      · {orderQuantityLabel(order)}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {orderDateLabel(order)} {formatDate(order.deliveryDate, "d MMM")}
                    </p>
                  </div>
                  {matched ? (
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-ink">{formatCurrency(order.totalPrice)}</p>
                      <p className="text-[11px] text-muted">
                        {formatNumber(order.totalQuantityKg)} kg
                      </p>
                    </div>
                  ) : null}
                  <ChevronRight className="size-5 shrink-0 text-muted/70" />
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <Badge>{order.kind === "request" ? "Request" : "Order now"}</Badge>
                  <Badge>{order.deliveryMethod === "pickup" ? "Pickup" : "Delivery"}</Badge>
                  {!order.requested.cropRefId ? <Badge tone="amber">Not in catalog</Badge> : null}
                  {order.handoverDue ? <Badge tone="blue">Check due today</Badge> : null}
                </div>

                {order.reason &&
                (order.status === "declined" || order.status === "cancelled") ? (
                  <p className="mt-2 text-xs text-red-600">Reason: {order.reason}</p>
                ) : null}

                {/* One row per line item — an order can span several farmers. */}
                {matched ? (
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
                ) : order.status === "requested" ? (
                  <p className="mt-3 border-t border-line/70 pt-2.5 text-xs text-muted">
                    Not yet matched to a farmer
                  </p>
                ) : null}
              </Card>
            </Link>
          );
        })}

        {orders && orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title={
              search || narrowed
                ? "No orders match"
                : "No purchase orders yet"
            }
            description={
              search || narrowed
                ? "Try another search or status."
                : "Orders placed in the Buyer App or by staff appear here."
            }
          />
        ) : null}
      </Content>
    </>
  );
}
