"use client";

import { Fragment } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, ChevronRight, MapPin, Package, Sprout, X } from "lucide-react";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Content } from "@/components/layout/app-shell";
import { Card, CardBody, SectionHeading } from "@/components/ui/card";
import { Badge, DataPoint, EmptyState, ListSkeleton } from "@/components/ui/misc";
import { HandoverCheckSection } from "@/components/orders/handover-check";
import { ReportProblemButton } from "@/components/orders/report-problem";
import { useQuery } from "@/lib/hooks/use-query";
import { getOrder } from "@/lib/api/orders";
import {
  canReportProblem,
  ORDER_STATUS_TONE,
  orderDateLabel,
  orderQuantityLabel,
  orderRequirementsLabel,
  orderStatusLabel,
  orderStatusStep,
  requestedCropLabel,
  showsHandoverCheck,
} from "@/lib/derive";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrderSource } from "@/lib/types";

const SOURCE_LABEL: Record<OrderSource, string> = { buyer_app: "Buyer app", staff: "Staff" };

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, error } = useQuery(() => getOrder(id), [id]);

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

  const isPickup = order.deliveryMethod === "pickup";
  // "Order now" is confirmed straight away, so its timeline has no Requested step.
  // A request starts at Requested and waits for staff to confirm it.
  const hasRequestedStep = order.kind === "request";
  const flow = [
    ...(hasRequestedStep ? ["Requested"] : []),
    "Confirmed",
    isPickup ? "Picked up" : "Delivered",
    "Complete",
  ];
  // Position of the order's status within `flow` (1-based); 0 for declined / cancelled.
  const step = Math.max(0, orderStatusStep(order.status) - (hasRequestedStep ? 0 : 1));
  const matched = order.lineItems.length > 0;
  const dateLabel = orderDateLabel(order);
  // Declined / cancelled orders are over; show why instead of the progress flow.
  const closed = order.status === "declined" || order.status === "cancelled";

  return (
    <>
      <ScreenHeader title="Purchase Details" backHref="/orders" />

      <Content className="space-y-5">
        <Card>
          <CardBody className="flex items-center gap-3">
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
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[15px] font-bold text-ink">{order.code}</p>
                <Badge tone={ORDER_STATUS_TONE[order.status]} dot>
                  {orderStatusLabel(order.status, order.deliveryMethod)}
                </Badge>
                {order.hasProblem ? <Badge tone="red">Problem reported</Badge> : null}
                {order.handoverDue ? <Badge tone="blue">Check due today</Badge> : null}
              </div>
              <p className="truncate text-xs text-muted">{order.buyer}</p>
              <p className="truncate text-xs text-muted">
                {requestedCropLabel(order.requested)} · {orderQuantityLabel(order)}
              </p>
            </div>
            {matched ? (
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-ink">{formatCurrency(order.totalPrice)}</p>
                <p className="text-[11px] text-muted">{formatNumber(order.totalQuantityKg)} kg</p>
              </div>
            ) : null}
          </CardBody>
        </Card>

        <div>
          <SectionHeading
            title="Order Status Flow"
            hint="Orders are managed in the Buyer App and Admin Portal"
          />
          <Card>
            <CardBody className="space-y-3">
              {closed ? (
                <p className="text-sm text-muted">
                  This order was{" "}
                  <span className="font-semibold text-ink">{order.status}</span> and is no longer
                  active.
                </p>
              ) : (
                <div className="flex items-center">
                  {flow.map((label, i) => (
                    <Fragment key={label}>
                      {i > 0 ? <StatusConnector done={step > i} /> : null}
                      <StatusStep index={i + 1} current={step} label={label} />
                    </Fragment>
                  ))}
                </div>
              )}
              {closed && order.reason ? (
                <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600">
                  <p className="font-semibold">
                    {order.status === "declined" ? "Declined" : "Cancelled"}
                  </p>
                  <p className="mt-0.5">{order.reason}</p>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>

        {matched ? (
          <div>
            <SectionHeading
              title={`Line Items (${order.lineItems.length})`}
              hint={
                order.farmerNames.length > 1
                  ? `Supplied by ${order.farmerNames.length} farmers — each is checked separately`
                  : "Farmer, plot and crop come from each crop cycle"
              }
            />
            <div className="space-y-3">
              {order.lineItems.map((item) => (
                <Card key={item.id}>
                  <CardBody className="space-y-3">
                    <Link
                      href={`/crops/${item.cropCycleId}`}
                      className="flex items-center gap-3 rounded-xl active:bg-canvas"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                        <Sprout className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-bold text-ink">{item.cropName}</p>
                          {item.handoverCheck ? <Badge tone="green">Checked</Badge> : null}
                          {item.problem ? <Badge tone="red">Problem reported</Badge> : null}
                        </div>
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

                    {item.problem ? (
                      <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600">
                        <p className="font-semibold">{item.problem.reason}</p>
                        {item.problem.note ? <p className="mt-0.5">{item.problem.note}</p> : null}
                        <p className="mt-1 text-red-600/80">
                          Reported {formatDate(item.problem.reportedAt)} · staff will follow up
                        </p>
                      </div>
                    ) : null}

                    {showsHandoverCheck(order.status) ? (
                      <HandoverCheckSection order={order} line={item} />
                    ) : null}

                    {canReportProblem(order.status) ? (
                      <ReportProblemButton order={order} line={item} />
                    ) : null}
                  </CardBody>
                </Card>
              ))}

              <Card>
                <CardBody className="flex items-center justify-between">
                  <span className="text-sm font-bold text-ink">
                    Total · {formatNumber(order.totalQuantityKg)} kg
                  </span>
                  <span className="text-sm font-bold text-ink">
                    {formatCurrency(order.totalPrice)}
                  </span>
                </CardBody>
              </Card>
            </div>
          </div>
        ) : (
          <div>
            <SectionHeading title="Request" hint="What the buyer asked for" />
            <Card>
              <CardBody className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <DataPoint label="Crop" value={requestedCropLabel(order.requested)} />
                  <DataPoint
                    label="Requested quantity"
                    value={`${formatNumber(order.requested.quantityKg)} kg`}
                  />
                  <DataPoint label={`${dateLabel} date`} value={formatDate(order.deliveryDate)} />
                  <DataPoint label="Buyer requirements" value={orderRequirementsLabel(order)} />
                </div>
                {order.status === "requested" ? (
                  <p className="rounded-xl bg-canvas p-3 text-xs text-muted">
                    Staff will match this to farmers. You will see them here once it is confirmed.
                  </p>
                ) : null}
              </CardBody>
            </Card>
          </div>
        )}

        {isPickup && showsHandoverCheck(order.status) ? (
          <div>
            <SectionHeading title="Pickup details" hint="Where the buyer collects the produce" />
            <Card>
              <CardBody className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <MapPin className="size-5" />
                </span>
                {order.pickup ? (
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-ink">{order.pickup.meetingPoint}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatDate(order.deliveryDate)}
                      {order.pickup.time ? ` · ${order.pickup.time}` : ""}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted">Staff will arrange the meeting point.</p>
                )}
              </CardBody>
            </Card>
          </div>
        ) : null}

        <div>
          <SectionHeading title="Order Details" />
          <Card>
            <CardBody className="grid grid-cols-2 gap-4">
              <DataPoint label="Buyer" value={order.buyer} />
              <DataPoint label="Source" value={SOURCE_LABEL[order.source]} />
              <DataPoint label="Type" value={order.kind === "request" ? "Request" : "Order now"} />
              <DataPoint label="Order Date" value={formatDate(order.orderDate)} />
              <DataPoint label={`${dateLabel} Date`} value={formatDate(order.deliveryDate)} />
              <DataPoint label="Delivery Method" value={isPickup ? "Pickup" : "Delivery"} />
              <DataPoint
                label="Buyer Requirements"
                value={orderRequirementsLabel(order)}
                className="col-span-2"
              />
              {matched ? (
                <>
                  <DataPoint
                    label="Total Quantity"
                    value={`${formatNumber(order.totalQuantityKg)} kg`}
                  />
                  <DataPoint label="Total Price" value={formatCurrency(order.totalPrice)} />
                </>
              ) : null}
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
    </>
  );
}

function StatusStep({ index, current, label }: { index: number; current: number; label: string }) {
  const done = current >= index;
  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <span
        className={cn(
          "flex size-7 items-center justify-center rounded-full text-xs font-bold",
          done ? "bg-brand-600 text-white" : "bg-canvas text-muted",
        )}
      >
        {done ? <Check className="size-4" /> : index}
      </span>
      <span className={cn("text-[11px] font-semibold", done ? "text-ink" : "text-muted")}>
        {label}
      </span>
    </div>
  );
}

function StatusConnector({ done }: { done: boolean }) {
  // Sits level with the step circles, above their labels.
  return (
    <span
      className={cn("mx-1.5 mb-5 h-0.5 min-w-3 flex-1 rounded-full", done ? "bg-brand-600" : "bg-line")}
    />
  );
}
