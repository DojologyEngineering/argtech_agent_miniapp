"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronRight,
  Pencil,
  Plus,
  RotateCcw,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { ScreenHeader, HeaderIconButton } from "@/components/layout/screen-header";
import { Content } from "@/components/layout/app-shell";
import { Card, CardBody, SectionHeading } from "@/components/ui/card";
import { Badge, DataPoint, EmptyState, ErrorNotice, ListSkeleton } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useQuery } from "@/lib/hooks/use-query";
import {
  completeCropCycle,
  deleteActivity,
  deleteCropCycle,
  deleteHarvestLogEntry,
  getCropCycle,
  reopenCropCycle,
} from "@/lib/api/crop-cycles";
import { listOrdersForCropCycle } from "@/lib/api/orders";
import { ACTIVITY_LABEL } from "@/lib/api/calendar";
import {
  CROP_STATUS_LABEL,
  CROP_STATUS_TONE,
  isOrderEligible,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
} from "@/lib/derive";
import { formatCurrency, formatDate, formatHectares, formatKg } from "@/lib/format";
import { haptic } from "@/lib/telegram";
import { errorMessage } from "@/lib/utils";

export default function CropCycleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: cycle, error } = useQuery(() => getCropCycle(id), [id]);
  const { data: orders } = useQuery(() => listOrdersForCropCycle(id), [id]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [harvestToDelete, setHarvestToDelete] = useState<string | null>(null);
  const [activityToDelete, setActivityToDelete] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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

  const linkedOrders = orders ?? [];
  const canRaiseOrder = isOrderEligible(cycle.status) && cycle.availableToSellKg > 0;
  const canMarkComplete = cycle.status !== "completed" && cycle.harvestLog.length > 0;
  // Revenue is only for the kg sold, so it's weighed against those kg's share of the cost.
  const profit = cycle.totalRevenue - cycle.costOfSoldKg;
  const isCompleted = cycle.status === "completed";
  const basisLabel =
    cycle.completedAt && cycle.harvestedQuantityKg > 0
      ? "actual harvest"
      : cycle.harvestedQuantityKg > cycle.expectedOutputKg
        ? "harvest so far"
        : "expected output";
  const sortedHarvests = [...cycle.harvestLog].sort((a, b) => b.date.localeCompare(a.date));
  const sortedActivities = [...cycle.activities].sort((a, b) => b.date.localeCompare(a.date));

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
        <ErrorNotice message={actionError} />

        <Card>
          <CardBody className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted">Status</p>
              <Badge tone={CROP_STATUS_TONE[cycle.status]} dot className="mt-1">
                {CROP_STATUS_LABEL[cycle.status]}
              </Badge>
              {cycle.completedAt ? (
                <p className="mt-1 text-xs text-muted">Marked complete {formatDate(cycle.completedAt)}</p>
              ) : null}
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
          <SectionHeading
            title="Output & Pricing"
            hint="Harvested comes from the log; sold comes from orders"
          />
          <Card>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <DataPoint label="Expected output" value={formatKg(cycle.expectedOutputKg)} />
                <DataPoint label="Harvested so far" value={formatKg(cycle.harvestedQuantityKg)} />
                <DataPoint label="Sold so far" value={formatKg(cycle.soldQuantityKg)} />
                <DataPoint
                  label="Unsold surplus"
                  value={
                    <span
                      className={
                        cycle.availableToSellKg > 0 ? "text-status-pending" : "text-ink"
                      }
                    >
                      {formatKg(cycle.availableToSellKg)}
                    </span>
                  }
                />
                <DataPoint
                  label="Estimated price"
                  value={`${formatCurrency(cycle.estimatedPricePerKg, 2)}/kg`}
                />
                <DataPoint
                  label="Average sale price"
                  value={
                    cycle.averageSalePricePerKg != null
                      ? `${formatCurrency(cycle.averageSalePricePerKg, 2)}/kg`
                      : "—"
                  }
                />
              </div>

              {cycle.availableToSellKg > 0 ? (
                <p className="rounded-xl bg-canvas p-3 text-xs text-muted">
                  {formatKg(cycle.availableToSellKg)} picked but not yet sold — perishable stock
                  sitting unsold is a real loss risk.
                </p>
              ) : null}
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
                Break-even spreads the {formatCurrency(cycle.totalCost)} total cost over{" "}
                {formatKg(cycle.costBasisKg)} ({basisLabel}).
                {cycle.soldQuantityKg > 0 ? (
                  <>
                    {" "}
                    Revenue {formatCurrency(cycle.totalRevenue)} − cost of the{" "}
                    {formatKg(cycle.soldQuantityKg)} sold {formatCurrency(cycle.costOfSoldKg)} ={" "}
                    <span
                      className={
                        profit >= 0 ? "font-semibold text-brand-700" : "font-semibold text-red-600"
                      }
                    >
                      {formatCurrency(profit)}
                    </span>
                    . Updates as order line items are recorded against this cycle.
                  </>
                ) : (
                  " Nothing sold yet, so there is no margin to show."
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        <div>
          <SectionHeading
            title={`Harvest Log (${cycle.harvestLog.length})`}
            hint="Each picking trip logged so far"
            action={
              isCompleted ? (
                <Button
                  variant="subtle"
                  size="sm"
                  disabled={marking}
                  onClick={async () => {
                    setMarking(true);
                    setActionError(null);
                    haptic("medium");
                    try {
                      await reopenCropCycle(cycle.id);
                    } catch (e) {
                      setActionError(errorMessage(e));
                    } finally {
                      setMarking(false);
                    }
                  }}
                >
                  <RotateCcw /> Reopen cycle
                </Button>
              ) : (
                <Button asChild variant="subtle" size="sm">
                  <Link href={`/crops/${cycle.id}/harvests/new`}>
                    <Plus /> Add Harvest
                  </Link>
                </Button>
              )
            }
          />
          <Card>
            <CardBody className="space-y-2">
              {sortedHarvests.length ? (
                sortedHarvests.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 rounded-xl border border-line/70 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-ink">{formatKg(entry.quantityKg)}</p>
                        <span className="text-xs text-muted">{formatDate(entry.date)}</span>
                      </div>
                      {entry.note ? <p className="mt-1 text-xs text-muted">{entry.note}</p> : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Link
                        href={`/crops/${cycle.id}/harvests/${entry.id}/edit`}
                        aria-label="Edit harvest"
                        className="rounded-lg p-2 text-muted hover:bg-canvas"
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <button
                        type="button"
                        aria-label="Delete harvest"
                        onClick={() => setHarvestToDelete(entry.id)}
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-muted">
                  No harvests logged yet — add one once picking starts
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        {canMarkComplete ? (
          <Button
            block
            disabled={marking}
            onClick={async () => {
              setMarking(true);
              setActionError(null);
              haptic("medium");
              try {
                await completeCropCycle(cycle.id);
              } catch (e) {
                setActionError(errorMessage(e));
              } finally {
                setMarking(false);
              }
            }}
          >
            <CheckCircle2 /> {marking ? "Marking complete..." : "Mark cycle complete"}
          </Button>
        ) : null}

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

        <div>
          <SectionHeading
            title={`Field Activities (${cycle.activities.length})`}
            hint="Irrigation and fertilization, shown on the calendar"
            action={
              <Button asChild variant="subtle" size="sm">
                <Link href={`/crops/${cycle.id}/activities/new`}>
                  <Plus /> Add Activity
                </Link>
              </Button>
            }
          />
          <Card>
            <CardBody className="space-y-2">
              {sortedActivities.length ? (
                sortedActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 rounded-xl border border-line/70 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-ink">
                          {ACTIVITY_LABEL[activity.type]}
                        </p>
                        <span className="shrink-0 text-xs text-muted">
                          {formatDate(activity.date)}
                        </span>
                      </div>
                      {activity.note ? (
                        <p className="mt-1 text-xs text-muted">{activity.note}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Link
                        href={`/crops/${cycle.id}/activities/${activity.id}/edit`}
                        aria-label="Edit activity"
                        className="rounded-lg p-2 text-muted hover:bg-canvas"
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <button
                        type="button"
                        aria-label="Delete activity"
                        onClick={() => setActivityToDelete(activity.id)}
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-muted">
                  No field activities logged yet
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        <div>
          <SectionHeading title={`Purchase Orders (${linkedOrders.length})`} />
          <Card>
            <CardBody className="space-y-2">
              {linkedOrders.length
                ? linkedOrders.map((order) => {
                    // Only this cycle's share of a possibly multi-farmer order.
                    const ownLines = order.lineItems.filter((i) => i.cropCycleId === cycle.id);
                    const ownKg = ownLines.reduce((sum, i) => sum + i.quantityKg, 0);
                    const ownValue = ownLines.reduce((sum, i) => sum + i.lineTotal, 0);
                    return (
                      <Link
                        key={order.id}
                        href={`/orders/${order.id}`}
                        className="flex items-center gap-3 rounded-xl border border-line/70 p-3 active:bg-canvas"
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                          <ShoppingCart className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-bold text-ink">{order.code}</p>
                            <Badge tone={ORDER_STATUS_TONE[order.status]} dot>
                              {ORDER_STATUS_LABEL[order.status]}
                            </Badge>
                          </div>
                          <p className="truncate text-xs text-muted">{order.buyer}</p>
                          <p className="truncate text-xs text-muted">
                            {formatKg(ownKg)} from this cycle · {formatCurrency(ownValue)}
                          </p>
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-muted/70" />
                      </Link>
                    );
                  })
                : null}

              {canRaiseOrder ? (
                <Button asChild variant="subtle" block>
                  <Link href={`/orders/new?cropRefId=${cycle.cropRefId}`}>
                    <ShoppingCart /> Sell surplus ({formatKg(cycle.availableToSellKg)} available)
                  </Link>
                </Button>
              ) : !linkedOrders.length ? (
                <p className="py-4 text-center text-sm text-muted">
                  {cycle.harvestedQuantityKg > 0
                    ? "All harvested produce for this cycle has already been sold."
                    : "Log a harvest before raising a purchase order."}
                </p>
              ) : null}
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
        description="Its allocations are released from any pending purchase order (an order left with nothing is removed). A cycle that already supplied a delivered or completed order can't be deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          setActionError(null);
          try {
            await deleteCropCycle(cycle.id);
            router.replace("/crops");
          } catch (e) {
            setActionError(errorMessage(e));
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
      />

      <ConfirmDialog
        open={harvestToDelete !== null}
        onOpenChange={(open) => !open && setHarvestToDelete(null)}
        title="Delete this harvest entry?"
        description="Harvested and available-to-sell totals for this cycle will be recalculated."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          setActionError(null);
          try {
            if (harvestToDelete) await deleteHarvestLogEntry(cycle.id, harvestToDelete);
          } catch (e) {
            setActionError(errorMessage(e));
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
          setHarvestToDelete(null);
        }}
      />

      <ConfirmDialog
        open={activityToDelete !== null}
        onOpenChange={(open) => !open && setActivityToDelete(null)}
        title="Delete this activity?"
        description="It will also stop appearing on the calendar."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (activityToDelete) await deleteActivity(cycle.id, activityToDelete);
          setActivityToDelete(null);
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
