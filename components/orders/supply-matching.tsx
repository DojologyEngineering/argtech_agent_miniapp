"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Save, Sprout, X } from "lucide-react";
import { Card, CardBody, SectionHeading } from "@/components/ui/card";
import { DerivedField, FieldGroup, Input, InputWithSuffix, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorNotice } from "@/components/ui/misc";
import { StickyFooter } from "@/components/layout/app-shell";
import { useQuery } from "@/lib/hooks/use-query";
import { listSupplyMatches } from "@/lib/api/crop-cycles";
import { CROP_REFS } from "@/lib/mock/crop-refs";
import { formatCurrency, formatDate, formatKg, formatNumber, toISODate } from "@/lib/format";
import { haptic } from "@/lib/telegram";
import { cn, errorMessage } from "@/lib/utils";
import type { DeliveryMethod, ID, OrderInput, OrderStatus, SupplyMatch } from "@/lib/types";

const DELIVERY_OPTIONS: { value: DeliveryMethod; label: string }[] = [
  { value: "pickup", label: "Pick up" },
  { value: "delivery", label: "Delivery" },
];

const num = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** What the agent has allocated from one crop cycle, as raw form strings. */
interface Allocation {
  quantityKg: string;
  pricePerKg: string;
}

export interface SupplyMatchingInitialValues {
  cropRefId?: ID;
  buyer?: string;
  orderDate?: string;
  deliveryDate?: string;
  deliveryMethod?: DeliveryMethod;
  /** Carried through unchanged — status only moves via the order's own action buttons. */
  status?: OrderStatus;
  notes?: string;
  allocations?: Record<ID, Allocation>;
}

/**
 * Supply Matching — the entry point for building an order.
 *
 * The agent states what a buyer needs, then allocates against real unsold
 * stock from any number of farmers until the target is met. Each allocation
 * becomes one order line item.
 */
export function SupplyMatching({
  initial,
  excludeOrderId,
  onSubmit,
  cancelHref,
  submitLabel = "Save Order",
}: {
  initial?: SupplyMatchingInitialValues;
  /** When editing, this order's own allocations return to the available pool. */
  excludeOrderId?: ID;
  onSubmit: (input: OrderInput) => Promise<void>;
  cancelHref: string;
  submitLabel?: string;
}) {
  const router = useRouter();

  const [cropRefId, setCropRefId] = useState<ID | "">(initial?.cropRefId ?? "");
  const [targetKg, setTargetKg] = useState("");
  const [allocations, setAllocations] = useState<Record<ID, Allocation>>(
    initial?.allocations ?? {},
  );

  const [buyer, setBuyer] = useState(initial?.buyer ?? "");
  const [orderDate, setOrderDate] = useState(initial?.orderDate ?? toISODate(new Date()));
  const [deliveryDate, setDeliveryDate] = useState(
    initial?.deliveryDate ?? initial?.orderDate ?? toISODate(new Date()),
  );
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(
    initial?.deliveryMethod ?? "pickup",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // All unsold stock, so already-allocated rows stay visible when the crop
  // filter changes; filtering for display happens below.
  const { data: allMatches, loading } = useQuery(
    () => listSupplyMatches({ excludeOrderId }),
    [excludeOrderId],
  );

  const matches = useMemo(
    () => (allMatches ?? []).filter((m) => (cropRefId ? m.cropRefId === cropRefId : true)),
    [allMatches, cropRefId],
  );

  const allocatedRows = useMemo(
    () =>
      (allMatches ?? []).filter(
        (m) => allocations[m.cropCycleId] && num(allocations[m.cropCycleId].quantityKg) > 0,
      ),
    [allMatches, allocations],
  );

  const allocatedKg = allocatedRows.reduce(
    (sum, m) => sum + num(allocations[m.cropCycleId].quantityKg),
    0,
  );
  const allocatedValue = allocatedRows.reduce(
    (sum, m) =>
      sum +
      num(allocations[m.cropCycleId].quantityKg) * num(allocations[m.cropCycleId].pricePerKg),
    0,
  );
  const target = num(targetKg);
  const progressPercent = target > 0 ? Math.min(100, (allocatedKg / target) * 100) : 0;

  function setAllocation(match: SupplyMatch, patch: Partial<Allocation>) {
    setAllocations((prev) => {
      const existing = prev[match.cropCycleId] ?? {
        quantityKg: "",
        pricePerKg: String(match.estimatedPricePerKg),
      };
      return { ...prev, [match.cropCycleId]: { ...existing, ...patch } };
    });
  }

  function clearAllocation(cropCycleId: ID) {
    setAllocations((prev) => {
      const next = { ...prev };
      delete next[cropCycleId];
      return next;
    });
  }

  /** Fills this row with whatever is still needed, capped at its availability. */
  function fillRemaining(match: SupplyMatch) {
    const stillNeeded = target > 0 ? Math.max(0, target - allocatedKg) : match.availableToSellKg;
    const amount = Math.min(match.availableToSellKg, stillNeeded || match.availableToSellKg);
    setAllocation(match, { quantityKg: String(amount) });
    haptic("light");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};

    if (allocatedRows.length === 0) next.allocations = "Allocate at least one crop cycle";
    if (!buyer.trim()) next.buyer = "Buyer is required";
    if (!orderDate) next.orderDate = "Order date is required";
    if (!deliveryDate) next.deliveryDate = "Delivery date is required";
    else if (orderDate && deliveryDate < orderDate) {
      next.deliveryDate = "Can't be before the order date";
    }

    // An allocation whose cycle is no longer in the supply pool would be
    // dropped silently on save — say so instead.
    const poolIds = new Set((allMatches ?? []).map((m) => m.cropCycleId));
    Object.entries(allocations).forEach(([cycleId, alloc]) => {
      if (allMatches && num(alloc.quantityKg) > 0 && !poolIds.has(cycleId)) {
        next.allocations =
          "One allocated crop cycle no longer has stock available. Clear it and allocate again.";
      }
    });

    allocatedRows.forEach((m) => {
      const alloc = allocations[m.cropCycleId];
      if (num(alloc.quantityKg) > m.availableToSellKg) {
        next.allocations = `${m.farmerName} only has ${formatKg(m.availableToSellKg)} available`;
      }
      if (num(alloc.pricePerKg) <= 0) {
        next.allocations = `Set a price for ${m.cropName} · ${m.farmerName}`;
      }
    });

    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    setSubmitError(null);
    haptic("medium");
    try {
      await onSubmit({
        buyer: buyer.trim(),
        orderDate,
        deliveryDate,
        deliveryMethod,
        status: initial?.status ?? "pending",
        notes,
        lineItems: allocatedRows.map((m) => ({
          cropCycleId: m.cropCycleId,
          quantityKg: num(allocations[m.cropCycleId].quantityKg),
          pricePerKg: num(allocations[m.cropCycleId].pricePerKg),
        })),
      });
    } catch (error) {
      setSubmitError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const cropOptions = CROP_REFS.map((c) => ({ value: c.id, label: c.name }));

  return (
    <form onSubmit={handleSubmit}>
      <SectionHeading title="What's needed" hint="Filter available supply by crop" />
      <Card className="mb-5">
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="Crop type" htmlFor="crop">
              <Select
                id="crop"
                value={cropRefId}
                onValueChange={(v) => setCropRefId(v)}
                options={cropOptions}
                placeholder="All crops"
              />
            </FieldGroup>
            <FieldGroup label="Target quantity" htmlFor="target" hint="Optional">
              <InputWithSuffix
                id="target"
                suffix="kg"
                type="number"
                inputMode="decimal"
                value={targetKg}
                onChange={(e) => setTargetKg(e.target.value)}
                placeholder="e.g. 1000"
              />
            </FieldGroup>
          </div>

          {/* Running progress toward the buyer's requirement. */}
          <div className="rounded-xl bg-canvas p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold text-ink">
                {formatNumber(allocatedKg)}
                {target > 0 ? ` / ${formatNumber(target)}` : ""} kg allocated
              </span>
              <span className="text-xs text-muted">{formatCurrency(allocatedValue)}</span>
            </div>
            {target > 0 ? (
              <>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      allocatedKg >= target ? "bg-brand-600" : "bg-status-pending",
                    )}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  {allocatedKg >= target
                    ? "Target met."
                    : `${formatKg(target - allocatedKg)} still to allocate.`}
                </p>
              </>
            ) : (
              <p className="mt-1 text-xs text-muted">
                {allocatedRows.length
                  ? `From ${new Set(allocatedRows.map((r) => r.farmerName)).size} farmer(s)`
                  : "Allocate from the available supply below."}
              </p>
            )}
          </div>
        </CardBody>
      </Card>

      <SectionHeading
        title="Available supply"
        hint="Harvested but unsold, across all farmers"
      />
      <div className="mb-5 space-y-2.5">
        {loading && !allMatches ? (
          <Card>
            <CardBody>
              <p className="py-4 text-center text-sm text-muted">Loading available supply...</p>
            </CardBody>
          </Card>
        ) : matches.length ? (
          matches.map((match) => {
            const alloc = allocations[match.cropCycleId];
            const allocatedForRow = alloc ? num(alloc.quantityKg) : 0;
            const isAllocated = allocatedForRow > 0;
            const overAllocated = allocatedForRow > match.availableToSellKg;

            return (
              <Card
                key={match.cropCycleId}
                className={cn(isAllocated && "border-brand-400 ring-1 ring-brand-100")}
              >
                <CardBody className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <Sprout className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">
                        {match.farmerName}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {match.cropName} · {match.plotName}
                      </p>
                      {match.lastHarvestDate ? (
                        <p className="truncate text-xs text-muted">
                          Last picked {formatDate(match.lastHarvestDate)}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-brand-700">
                        {formatKg(match.availableToSellKg)}
                      </p>
                      <p className="text-[11px] text-muted">available</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup label="Allocate" htmlFor={`qty-${match.cropCycleId}`}>
                      <InputWithSuffix
                        id={`qty-${match.cropCycleId}`}
                        suffix="kg"
                        type="number"
                        inputMode="decimal"
                        max={match.availableToSellKg}
                        value={alloc?.quantityKg ?? ""}
                        onChange={(e) => setAllocation(match, { quantityKg: e.target.value })}
                        placeholder="0"
                        className={overAllocated ? "border-red-400" : undefined}
                      />
                    </FieldGroup>
                    <FieldGroup label="Price" htmlFor={`price-${match.cropCycleId}`}>
                      <InputWithSuffix
                        id={`price-${match.cropCycleId}`}
                        suffix="$/kg"
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        value={alloc?.pricePerKg ?? ""}
                        onChange={(e) => setAllocation(match, { pricePerKg: e.target.value })}
                        placeholder={String(match.estimatedPricePerKg)}
                      />
                    </FieldGroup>
                  </div>

                  {overAllocated ? (
                    <p className="text-xs font-medium text-red-600">
                      Only {formatKg(match.availableToSellKg)} available from this cycle.
                    </p>
                  ) : null}

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => fillRemaining(match)}
                    >
                      {target > 0 ? "Fill remaining" : "Take all"}
                    </Button>
                    {isAllocated ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => clearAllocation(match.cropCycleId)}
                        >
                          <X /> Clear
                        </Button>
                        <span className="ml-auto text-sm font-semibold text-ink">
                          {formatCurrency(allocatedForRow * num(alloc?.pricePerKg ?? "0"))}
                        </span>
                      </>
                    ) : null}
                  </div>
                </CardBody>
              </Card>
            );
          })
        ) : (
          <EmptyState
            icon={Sprout}
            title="No unsold stock available"
            description={
              cropRefId
                ? "No farmer currently has unsold harvested stock of this crop. Try another crop, or log a harvest first."
                : "Nothing has been harvested and left unsold yet. Log a harvest on a crop cycle first."
            }
          />
        )}
      </div>

      {errors.allocations ? (
        <div className="mb-5 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-600">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>{errors.allocations}</p>
        </div>
      ) : null}

      <SectionHeading title="Order details" hint="Buyer and fulfilment" />
      <Card className="mb-5">
        <CardBody className="space-y-4">
          <FieldGroup label="Buyer" required error={errors.buyer} htmlFor="buyer">
            <Input
              id="buyer"
              value={buyer}
              onChange={(e) => setBuyer(e.target.value)}
              placeholder="e.g. Fresh Mart Phnom Penh"
            />
          </FieldGroup>

          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="Order date" required error={errors.orderDate} htmlFor="orderDate">
              <Input
                id="orderDate"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
            </FieldGroup>
            <FieldGroup
              label="Delivery date"
              required
              error={errors.deliveryDate}
              htmlFor="deliveryDate"
              hint="Shown on the calendar"
            >
              <Input
                id="deliveryDate"
                type="date"
                min={orderDate || undefined}
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </FieldGroup>
          </div>

          <FieldGroup label="Delivery method" htmlFor="delivery">
            <Select
              id="delivery"
              value={deliveryMethod}
              onValueChange={(v) => setDeliveryMethod(v as DeliveryMethod)}
              options={DELIVERY_OPTIONS}
            />
          </FieldGroup>

          <div className="grid grid-cols-2 gap-3">
            <DerivedField label="Total quantity" value={`${formatNumber(allocatedKg)} kg`} />
            <DerivedField label="Total price" value={formatCurrency(allocatedValue)} />
          </div>

          <FieldGroup label="Notes" htmlFor="notes">
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this order..."
            />
          </FieldGroup>
        </CardBody>
      </Card>

      <ErrorNotice message={submitError} className="mb-5" />

      <StickyFooter>
        <Button type="button" variant="secondary" block onClick={() => router.push(cancelHref)}>
          Cancel
        </Button>
        <Button type="submit" block disabled={saving}>
          <Save /> {saving ? "Saving..." : submitLabel}
        </Button>
      </StickyFooter>
    </form>
  );
}
