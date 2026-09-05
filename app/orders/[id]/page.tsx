"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Check, Package, Pencil, X } from "lucide-react";
import { ScreenHeader, HeaderIconButton } from "@/components/layout/screen-header";
import { Content, StickyFooter } from "@/components/layout/app-shell";
import { Card, CardBody, SectionHeading } from "@/components/ui/card";
import { Badge, DataPoint, EmptyState, ListSkeleton } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useQuery } from "@/lib/hooks/use-query";
import { advanceOrderStatus, cancelOrder, getOrder } from "@/lib/api/orders";
import { ORDER_STATUS_LABEL, orderStatusStep } from "@/lib/derive";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/utils";

const STATUS_TONE = { pending: "amber", delivered: "green", completed: "blue" } as const;

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: order, error } = useQuery(() => getOrder(id), [id]);
  const [confirmCancel, setConfirmCancel] = useState(false);

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
  const unitLabel = order.unit === "KG" ? "kg" : order.unit.toLowerCase();

  return (
    <>
      <ScreenHeader
        title="Purchase Details"
        backHref="/orders"
        action={
          <HeaderIconButton href={`/orders/${order.id}/edit`} label="Edit order">
            <Pencil className="size-4" />
          </HeaderIconButton>
        }
      />

      <Content withFooter className="space-y-5">
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
                <Badge tone={STATUS_TONE[order.status]} dot>
                  {ORDER_STATUS_LABEL[order.status]}
                </Badge>
              </div>
              <p className="truncate text-xs text-muted">
                {order.cropName} · {order.farmerName}
              </p>
              <p className="truncate text-xs text-muted">
                {order.buyer} · {formatDate(order.createdAt)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-bold text-ink">{formatCurrency(order.totalPrice)}</p>
              <p className="text-[11px] text-muted">
                {formatNumber(order.quantity)} {unitLabel}
              </p>
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
          <SectionHeading title="Order Details" />
          <Card>
            <CardBody className="grid grid-cols-2 gap-4">
              <DataPoint
                label="Crop cycle"
                value={
                  order.cycle ? (
                    <Link href={`/crops/${order.cycle.id}`} className="text-brand-700 underline">
                      {order.cropName}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <DataPoint
                label="Farmer"
                value={
                  order.cycle ? (
                    <Link href={`/farmers/${order.cycle.farmerId}`} className="text-brand-700 underline">
                      {order.farmerName}
                    </Link>
                  ) : (
                    order.farmerName
                  )
                }
              />
              <DataPoint label="Plot name" value={order.plotName} />
              <DataPoint label="Variety type" value={order.cycle?.varietyType ?? "—"} />
              <DataPoint label="Quantity" value={formatNumber(order.quantity)} />
              <DataPoint label="Unit" value={order.unit} />
              <DataPoint label="Total Price" value={formatCurrency(order.totalPrice)} />
              <DataPoint label="Buyer" value={order.buyer} />
              <DataPoint label="Create Date" value={formatDate(order.createdAt)} />
              <DataPoint
                label="Delivery Method"
                value={order.deliveryMethod === "pickup" ? "Pick up" : "Delivery"}
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
                await advanceOrderStatus(order.id);
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
        description="The order will be removed. The crop cycle itself is not affected."
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        destructive
        onConfirm={async () => {
          await cancelOrder(order.id);
          router.replace("/orders");
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
