"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Check, ChevronRight, Package, Pencil, Sprout, X } from "lucide-react";
import { ScreenHeader, HeaderIconButton } from "@/components/layout/screen-header";
import { Content, StickyFooter } from "@/components/layout/app-shell";
import { Card, CardBody, SectionHeading } from "@/components/ui/card";
import { Badge, DataPoint, EmptyState, ErrorNotice, ListSkeleton } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useQuery } from "@/lib/hooks/use-query";
import { advanceOrderStatus, cancelOrder, getOrder } from "@/lib/api/orders";
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, orderStatusStep } from "@/lib/derive";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { haptic } from "@/lib/telegram";
import { cn, errorMessage } from "@/lib/utils";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: order, error } = useQuery(() => getOrder(id), [id]);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (error) {
    return (
      <>
        <ScreenHeader title="Order not found" backHref="/orders" />
        <Content>
          <EmptyState icon={X} title="This order no longer exists" />
        </Content>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <ScreenHeader title="Loading..." backHref="/orders" />
        <Content>
          <ListSkeleton rows={3} />
        </Content>
      </>
    );
  }

  const step = orderStatusStep(order.status);

  return (
    <>
      <ScreenHeader
        title="Purchase Details"
        backHref="/orders"
        action={
          order.status === "completed" ? undefined : (
            <HeaderIconButton href={`/orders/${order.id}/edit`} label="Edit order">
              <Pencil className="size-4" />
            </HeaderIconButton>
          )
        }
      />

      <Content withFooter className="space-y-5">
        <ErrorNotice message={actionError} />
        <Card>
          <CardBody className="flex items-center gap-3">
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
                <Badge tone={ORDER_STATUS_TONE[order.status]} dot>
                  {ORDER_STATUS_LABEL[order.status]}
                </Badge>
              </div>
              <p className="truncate text-xs text-muted">{order.buyer}</p>
              <p className="truncate text-xs text-muted">
                {formatDate(order.orderDate)} ·{" "}
                {order.lineItems.length === 1
                  ? "1 line item"
                  : `${order.lineItems.length} line items`}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-bold text-ink">{formatCurrency(order.totalPrice)}</p>
              <p className="text-[11px] text-muted">{formatNumber(order.totalQuantityKg)} kg</p>
            </div>
          </CardBody>
        </Card>

        <div>
          <SectionHeading title="Order Status Flow" />
          <Card>
            <CardBody>
              <div className="flex items-center">
                <StatusStep index={1} current={step} label="Pending" />
                <StatusConnector done={step > 1} />
                <StatusStep index={2} current={step} label="Delivered" />
                <StatusConnector done={step > 2} />
                <StatusStep index={3} current={step} label="Complete" />
              </div>
            </CardBody>
          </Card>
        </div>

        <div>
          <SectionHeading
            title={`Line Items (${order.lineItems.length})`}
            hint={
              order.farmerNames.length > 1
                ? `Supplied by ${order.farmerNames.length} farmers`
                : "Farmer, plot and crop come from each crop cycle"
            }
          />
          <Card>
            <CardBody className="space-y-2">
              {order.lineItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/crops/${item.cropCycleId}`}
                  className="flex items-center gap-3 rounded-xl border border-line/70 p-3 active:bg-canvas"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Sprout className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{item.cropName}</p>
                    <p className="truncate text-xs text-muted">
                      {item.farmerName} · {item.plotName}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {formatNumber(item.quantityKg)} kg × {formatCurrency(item.pricePerKg, 2)}/kg
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-ink">{formatCurrency(item.lineTotal)}</p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted/70" />
                </Link>
              ))}

              <div className="flex items-center justify-between border-t border-line pt-2.5">
                <span className="text-sm font-bold text-ink">
                  Total · {formatNumber(order.totalQuantityKg)} kg
                </span>
                <span className="text-sm font-bold text-ink">
                  {formatCurrency(order.totalPrice)}
                </span>
              </div>
            </CardBody>
          </Card>
        </div>

        <div>
          <SectionHeading title="Order Details" />
          <Card>
            <CardBody className="grid grid-cols-2 gap-4">
              <DataPoint label="Buyer" value={order.buyer} />
              <DataPoint label="Order Date" value={formatDate(order.orderDate)} />
              <DataPoint label="Delivery Date" value={formatDate(order.deliveryDate)} />
              <DataPoint
                label="Delivery Method"
                value={order.deliveryMethod === "pickup" ? "Pick up" : "Delivery"}
              />
              <DataPoint label="Total Quantity" value={`${formatNumber(order.totalQuantityKg)} kg`} />
              <DataPoint
                label="Total Price"
                value={formatCurrency(order.totalPrice)}
                className="col-span-2"
              />
            </CardBody>
          </Card>
        </div>

        <div>
          <SectionHeading title="Notes" />
          <Card>
            <CardBody>
              <p className={order.notes ? "text-sm text-ink" : "text-sm text-muted"}>
                {order.notes || "No notes recorded for this order."}
              </p>
            </CardBody>
          </Card>
        </div>
      </Content>

      <StickyFooter>
        {order.status === "completed" ? (
          <Button block onClick={() => router.push("/orders")}>
            Back to order list
          </Button>
        ) : (
          <>
            <Button
              variant="danger"
              size="icon"
              aria-label="Cancel order"
              onClick={() => setConfirmCancel(true)}
            >
              <X />
            </Button>
            <Button
              block
              variant={order.status === "pending" ? "warning" : "primary"}
              onClick={async () => {
                haptic("medium");
                setActionError(null);
                try {
                  await advanceOrderStatus(order.id);
                } catch (e) {
                  setActionError(errorMessage(e));
                }
              }}
            >
              <Check /> {order.status === "pending" ? "Mark Delivered" : "Mark Completed"}
            </Button>
          </>
        )}
      </StickyFooter>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title={`Cancel ${order.code}?`}
        description="The order and all its line items will be removed, releasing the allocated quantities back to each crop cycle."
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        destructive
        onConfirm={async () => {
          try {
            await cancelOrder(order.id);
            router.replace("/orders");
          } catch (e) {
            setActionError(errorMessage(e));
          }
        }}
      />
    </>
  );
}

function StatusStep({ index, current, label }: { index: number; current: number; label: string }) {
  const done = current >= index;
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span
        className={cn(
          "flex size-7 items-center justify-center rounded-full text-xs font-bold",
          done ? "bg-brand-600 text-white" : "bg-canvas text-muted",
        )}
      >
        {done ? <Check className="size-4" /> : index}
      </span>
      <span className={cn("text-xs font-semibold", done ? "text-ink" : "text-muted")}>{label}</span>
    </div>
  );
}

function StatusConnector({ done }: { done: boolean }) {
  return <span className={cn("mx-2 h-0.5 flex-1 rounded-full", done ? "bg-brand-600" : "bg-line")} />;
}
