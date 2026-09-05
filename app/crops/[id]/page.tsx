"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronRight, Pencil, ShoppingCart, Trash2, X } from "lucide-react";
import { ScreenHeader, HeaderIconButton } from "@/components/layout/screen-header";
import { Content } from "@/components/layout/app-shell";
import { Card, CardBody, SectionHeading } from "@/components/ui/card";
import { Badge, DataPoint, EmptyState, ListSkeleton } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useQuery } from "@/lib/hooks/use-query";
import { deleteCropCycle, getCropCycle } from "@/lib/api/crop-cycles";
import { listOrders } from "@/lib/api/orders";
import { CROP_STATUS_LABEL, ORDER_STATUS_LABEL } from "@/lib/derive";
import { formatCurrency, formatDate, formatHectares, formatKg } from "@/lib/format";
import { ACTIVITY_LABEL } from "@/lib/api/calendar";

const STATUS_TONE = { growing: "green", ready_to_harvest: "amber", harvested: "blue" } as const;

export default function CropCycleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: cycle, error } = useQuery(() => getCropCycle(id), [id]);
  const { data: orders } = useQuery(() => listOrders(), []);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (error) {
    return (
      <>
        <ScreenHeader title="Crop cycle not found" backHref="/crops" />
        <Content>
          <EmptyState icon={X} title="This crop cycle no longer exists" />
        </Content>
      </>
    );
  }

  if (!cycle) {
    return (
      <>
        <ScreenHeader title="Loading..." backHref="/crops" />
        <Content>
          <ListSkeleton rows={3} />
        </Content>
      </>
    );
  }

  const linkedOrders = (orders ?? []).filter((o) => o.cropCycleId === cycle.id);
  const profit = cycle.projectedRevenue - cycle.totalCost;

  return (
    <>
      <ScreenHeader
        title={cycle.cropName}
        subtitle={`${cycle.varietyType} · ${cycle.plotName}`}
        backHref="/crops"
        avatarName={cycle.cropName}
        action={
          <HeaderIconButton href={`/crops/${cycle.id}/edit`} label="Edit crop cycle">
            <Pencil className="size-4" />
          </HeaderIconButton>
        }
      />

      <Content className="space-y-5">
        <Card>
          <CardBody className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted">Status</p>
              <Badge tone={STATUS_TONE[cycle.status]} dot className="mt-1">
                {CROP_STATUS_LABEL[cycle.status]}
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted">{cycle.season}</p>
              <p className="text-sm font-bold text-ink">
                {formatHectares(cycle.cultivatedAreaHectares)}
              </p>
            </div>
          </CardBody>
        </Card>

        <div>
          <SectionHeading title="Farmer & Plot" />
          <Card>
            <CardBody className="grid grid-cols-2 gap-4">
              <DataPoint
                label="Farmer"
                value={
                  <Link href={`/farmers/${cycle.farmerId}`} className="text-brand-700 underline">
                    {cycle.farmerName}
                  </Link>
                }
              />
              <DataPoint
                label="Plot"
                value={
                  <Link href={`/plots/${cycle.plotId}`} className="text-brand-700 underline">
                    {cycle.plotName}
                  </Link>
                }
              />
              <DataPoint label="Crop name" value={cycle.cropName} />
              <DataPoint label="Variety type" value={cycle.varietyType} />
              <DataPoint label="Season" value={cycle.season} />
              <DataPoint label="Seed source" value={cycle.seedSource || "—"} />
              <DataPoint
                label="Cultivated area"
                value={formatHectares(cycle.cultivatedAreaHectares)}
                className="col-span-2"
              />
            </CardBody>
          </Card>
        </div>

        <div>
          <SectionHeading title="Schedule" />
          <Card>
            <CardBody className="grid grid-cols-2 gap-4">
              <DataPoint label="Planting date" value={formatDate(cycle.plantingDate)} />
              <DataPoint label="Expected harvest" value={formatDate(cycle.expectedHarvestDate)} />
              <DataPoint
                label="Actual harvest"
                value={cycle.actualHarvestDate ? formatDate(cycle.actualHarvestDate) : "Not yet"}
                className="col-span-2"
              />
            </CardBody>
          </Card>
        </div>

        <div>
          <SectionHeading title="Costs" hint="Itemised inputs for this cycle" />
          <Card>
            <CardBody className="space-y-2.5">
              <CostRow label="Seed" value={cycle.costs.seed} />
              <CostRow label="Fertilizer" value={cycle.costs.fertilizer} />
              <CostRow label="Labor" value={cycle.costs.labor} />
              <CostRow label="Other" value={cycle.costs.other} />
              <div className="flex items-center justify-between border-t border-line pt-2.5">
                <span className="text-sm font-bold text-ink">Total cost</span>
                <span className="text-sm font-bold text-ink">{formatCurrency(cycle.totalCost)}</span>
              </div>
            </CardBody>
          </Card>
        </div>

        <div>
          <SectionHeading title="Output & Pricing" />
          <Card>
            <CardBody className="grid grid-cols-2 gap-4">
              <DataPoint label="Expected output" value={formatKg(cycle.expectedOutputKg)} />
              <DataPoint
                label="Actual output"
                value={cycle.actualOutputKg != null ? formatKg(cycle.actualOutputKg) : "—"}
              />
              <DataPoint
                label="Estimated price"
                value={`${formatCurrency(cycle.estimatedPricePerKg, 2)}/kg`}
              />
              <DataPoint
                label="Actual price"
                value={
                  cycle.actualPricePerKg != null
                    ? `${formatCurrency(cycle.actualPricePerKg, 2)}/kg`
                    : "—"
                }
              />
            </CardBody>
          </Card>
        </div>

        <div>
          <SectionHeading title="Break-even & Margin" hint="Calculated, not entered" />
          <Card>
            <CardBody className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <DataPoint
                  label="Break-even price"
                  value={
                    cycle.breakEvenPricePerKg === null
                      ? "—"
                      : `${formatCurrency(cycle.breakEvenPricePerKg, 3)}/kg`
                  }
                />
                <DataPoint
                  label="Margin"
                  value={
                    cycle.marginPercent === null ? "—" : `${cycle.marginPercent.toFixed(1)}%`
                  }
                />
              </div>
              <div className="rounded-xl bg-canvas p-3 text-xs text-muted">
                Revenue {formatCurrency(cycle.projectedRevenue)} − cost{" "}
                {formatCurrency(cycle.totalCost)} ={" "}
                <span
                  className={profit >= 0 ? "font-semibold text-brand-700" : "font-semibold text-red-600"}
                >
                  {formatCurrency(profit)}
                </span>
              </div>
            </CardBody>
          </Card>
        </div>

        {cycle.production.method ||
        cycle.production.deliveryFrequency ||
        cycle.production.fertilizerType ||
        cycle.production.pesticideUsed ||
        cycle.production.notes ? (
          <div>
            <SectionHeading title="Production Details" />
            <Card>
              <CardBody className="grid grid-cols-2 gap-4">
                <DataPoint label="Production method" value={cycle.production.method ?? "—"} />
                <DataPoint
                  label="Delivery frequency"
                  value={cycle.production.deliveryFrequency ?? "—"}
                />
                <DataPoint label="Fertilizer type" value={cycle.production.fertilizerType ?? "—"} />
                <DataPoint label="Pesticide used" value={cycle.production.pesticideUsed ?? "—"} />
                {cycle.production.notes ? (
                  <DataPoint label="Notes" value={cycle.production.notes} className="col-span-2" />
                ) : null}
              </CardBody>
            </Card>
          </div>
        ) : null}

        {cycle.activities.length ? (
          <div>
            <SectionHeading title="Field Activities" hint="Shown on the calendar" />
            <Card>
              <CardBody className="space-y-2">
                {cycle.activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line/70 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        {ACTIVITY_LABEL[activity.type]}
                      </p>
                      {activity.note ? (
                        <p className="truncate text-xs text-muted">{activity.note}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs text-muted">{formatDate(activity.date)}</span>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>
        ) : null}

        <div>
          <SectionHeading title={`Purchase Orders (${linkedOrders.length})`} />
          <Card>
            <CardBody className="space-y-2">
              {linkedOrders.length ? (
                linkedOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center gap-3 rounded-xl border border-line/70 p-3 active:bg-canvas"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <ShoppingCart className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{order.code}</p>
                      <p className="truncate text-xs text-muted">{order.buyer}</p>
                    </div>
                    <Badge tone={order.status === "completed" ? "blue" : order.status === "delivered" ? "green" : "amber"} dot>
                      {ORDER_STATUS_LABEL[order.status]}
                    </Badge>
                    <ChevronRight className="size-4 shrink-0 text-muted/70" />
                  </Link>
                ))
              ) : cycle.status === "harvested" && (cycle.actualOutputKg ?? 0) > 0 ? (
                <Button asChild variant="subtle" block>
                  <Link href={`/orders/new?cropCycleId=${cycle.id}`}>
                    <ShoppingCart /> Create purchase order
                  </Link>
                </Button>
              ) : (
                <p className="py-4 text-center text-sm text-muted">
                  Record the actual harvest before raising a purchase order
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        <Button variant="danger" block onClick={() => setConfirmDelete(true)}>
          <Trash2 /> Delete crop cycle
        </Button>
      </Content>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this crop cycle?"
        description="Any purchase order raised against it will be removed too."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          await deleteCropCycle(cycle.id);
          router.replace("/crops");
        }}
      />
    </>
  );
}

function CostRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-semibold text-ink">{formatCurrency(value)}</span>
    </div>
  );
}
