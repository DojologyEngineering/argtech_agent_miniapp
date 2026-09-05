"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Save } from "lucide-react";
import { Card, CardBody, SectionHeading } from "@/components/ui/card";
import { DerivedField, FieldGroup, Input, InputWithSuffix, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StickyFooter } from "@/components/layout/app-shell";
import { useQuery } from "@/lib/hooks/use-query";
import { listOrderableCropCycles } from "@/lib/api/crop-cycles";
import { formatCurrency, formatDate, formatKg } from "@/lib/format";
import { haptic } from "@/lib/telegram";
import type { DeliveryMethod, Order, OrderInput, OrderStatus, Unit } from "@/lib/types";

const UNIT_OPTIONS: { value: Unit; label: string }[] = [
  { value: "KG", label: "KG" },
  { value: "TON", label: "Ton" },
  { value: "SACK", label: "Sack" },
];

const DELIVERY_OPTIONS: { value: DeliveryMethod; label: string }[] = [
  { value: "pickup", label: "Pick up" },
  { value: "delivery", label: "Delivery" },
];

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
];

const num = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function OrderForm({
  order,
  defaultCropCycleId,
  onSubmit,
  cancelHref,
  submitLabel = "Save Order",
}: {
  order?: Order;
  defaultCropCycleId?: string;
  onSubmit: (input: OrderInput) => Promise<void>;
  cancelHref: string;
  submitLabel?: string;
}) {
  const router = useRouter();

  // Only harvested cycles with an actual output can be sold — plus the one
  // this order is already attached to, so editing never loses the link.
  const { data: cycles } = useQuery(
    () => listOrderableCropCycles(order?.cropCycleId),
    [order?.cropCycleId],
  );

  const [values, setValues] = useState({
    cropCycleId: order?.cropCycleId ?? defaultCropCycleId ?? "",
    quantity: order ? String(order.quantity) : "",
    unit: (order?.unit ?? "KG") as Unit,
    totalPrice: order ? String(order.totalPrice) : "",
    buyer: order?.buyer ?? "",
    deliveryMethod: (order?.deliveryMethod ?? "pickup") as DeliveryMethod,
    status: (order?.status ?? "pending") as OrderStatus,
    notes: order?.notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const selectedCycle = useMemo(
    () => cycles?.find((c) => c.id === values.cropCycleId) ?? null,
    [cycles, values.cropCycleId],
  );

  /** Picking a cycle carries its farmer, plot, crop and harvested quantity. */
  function selectCycle(cropCycleId: string) {
    const cycle = cycles?.find((c) => c.id === cropCycleId);
    setValues((prev) => ({
      ...prev,
      cropCycleId,
      quantity: prev.quantity || (cycle?.actualOutputKg != null ? String(cycle.actualOutputKg) : ""),
      totalPrice:
        prev.totalPrice ||
        (cycle?.actualOutputKg != null && cycle.actualPricePerKg != null
          ? String(Number((cycle.actualOutputKg * cycle.actualPricePerKg).toFixed(2)))
          : ""),
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!values.cropCycleId) next.cropCycleId = "Select the crop cycle being sold";
    if (num(values.quantity) <= 0) next.quantity = "Quantity is required";
    if (num(values.totalPrice) <= 0) next.totalPrice = "Total price is required";
    if (!values.buyer.trim()) next.buyer = "Buyer is required";
    if (
      selectedCycle?.actualOutputKg != null &&
      values.unit === "KG" &&
      num(values.quantity) > selectedCycle.actualOutputKg
    ) {
      next.quantity = `Only ${formatKg(selectedCycle.actualOutputKg)} were harvested`;
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    haptic("medium");
    try {
      await onSubmit({
        cropCycleId: values.cropCycleId,
        quantity: num(values.quantity),
        unit: values.unit,
        totalPrice: num(values.totalPrice),
        buyer: values.buyer.trim(),
        deliveryMethod: values.deliveryMethod,
        status: values.status,
        notes: values.notes,
      });
    } finally {
      setSaving(false);
    }
  }

  const noCycles = cycles && cycles.length === 0;

  return (
    <form onSubmit={handleSubmit}>
      <SectionHeading
        title="Crop Cycle"
        hint="Farmer, plot and crop come from the harvested cycle"
      />
      <Card className="mb-5">
        <CardBody className="space-y-4">
          <FieldGroup label="Harvested crop cycle" required error={errors.cropCycleId} htmlFor="cycle">
            <Select
              id="cycle"
              value={values.cropCycleId}
              onValueChange={selectCycle}
              placeholder={noCycles ? "No harvested cycles available" : "Select"}
              disabled={noCycles}
              options={(cycles ?? []).map((c) => ({
                value: c.id,
                label: `${c.cropName} · ${c.farmerName}`,
                description: `${c.plotName} · ${formatKg(c.actualOutputKg)} harvested ${formatDate(
                  c.actualHarvestDate,
                )}`,
              }))}
              invalid={Boolean(errors.cropCycleId)}
            />
          </FieldGroup>

          {noCycles ? (
            <div className="flex items-start gap-2 rounded-xl bg-canvas p-3 text-xs text-muted">
              <Info className="mt-0.5 size-4 shrink-0 text-status-pending" />
              <p>
                Every harvested crop cycle already has an order. Record an actual harvest on a crop
                cycle to raise a new purchase order.
              </p>
            </div>
          ) : null}

          {selectedCycle ? (
            <div className="grid grid-cols-2 gap-3">
              <DerivedField label="Farmer" value={selectedCycle.farmerName} />
              <DerivedField label="Plot name" value={selectedCycle.plotName} />
              <DerivedField label="Crop name" value={selectedCycle.cropName} />
              <DerivedField label="Variety type" value={selectedCycle.varietyType} />
              <DerivedField
                label="Harvested output"
                value={formatKg(selectedCycle.actualOutputKg)}
                className="col-span-2"
                hint="Recorded on the crop cycle"
              />
            </div>
          ) : null}
        </CardBody>
      </Card>

      <SectionHeading title="Order Details" hint="Quantity, price and buyer" />
      <Card className="mb-5">
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="Quantity" required error={errors.quantity} htmlFor="quantity">
              <Input
                id="quantity"
                type="number"
                inputMode="decimal"
                value={values.quantity}
                onChange={(e) => setValues((p) => ({ ...p, quantity: e.target.value }))}
                placeholder="e.g. 2000"
              />
            </FieldGroup>
            <FieldGroup label="Unit" htmlFor="unit">
              <Select
                id="unit"
                value={values.unit}
                onValueChange={(v) => setValues((p) => ({ ...p, unit: v as Unit }))}
                options={UNIT_OPTIONS}
              />
            </FieldGroup>
            <FieldGroup label="Total price" required error={errors.totalPrice} htmlFor="totalPrice">
              <InputWithSuffix
                id="totalPrice"
                suffix="$"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={values.totalPrice}
                onChange={(e) => setValues((p) => ({ ...p, totalPrice: e.target.value }))}
                placeholder="e.g. 1245.50"
              />
            </FieldGroup>
            <FieldGroup label="Buyer" required error={errors.buyer} htmlFor="buyer">
              <Input
                id="buyer"
                value={values.buyer}
                onChange={(e) => setValues((p) => ({ ...p, buyer: e.target.value }))}
                placeholder="e.g. Green Valley Co."
              />
            </FieldGroup>
          </div>

          <DerivedField
            label="Unit price"
            value={
              num(values.quantity) > 0
                ? `${formatCurrency(num(values.totalPrice) / num(values.quantity), 3)} per ${
                    values.unit === "KG" ? "kg" : values.unit.toLowerCase()
                  }`
                : "—"
            }
          />
        </CardBody>
      </Card>

      <SectionHeading title="Fulfilment" hint="Delivery method and current status" />
      <Card className="mb-5">
        <CardBody className="space-y-4">
          <FieldGroup label="Delivery Method" htmlFor="delivery">
            <Select
              id="delivery"
              value={values.deliveryMethod}
              onValueChange={(v) =>
                setValues((p) => ({ ...p, deliveryMethod: v as DeliveryMethod }))
              }
              options={DELIVERY_OPTIONS}
            />
          </FieldGroup>
          <FieldGroup label="Order Status" htmlFor="status">
            <Select
              id="status"
              value={values.status}
              onValueChange={(v) => setValues((p) => ({ ...p, status: v as OrderStatus }))}
              options={STATUS_OPTIONS}
            />
          </FieldGroup>
        </CardBody>
      </Card>

      <SectionHeading title="Notes" />
      <Card>
        <CardBody>
          <Textarea
            value={values.notes}
            onChange={(e) => setValues((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Additional notes about this order..."
          />
        </CardBody>
      </Card>

      <StickyFooter>
        <Button type="button" variant="secondary" block onClick={() => router.push(cancelHref)}>
          Cancel
        </Button>
        <Button type="submit" block disabled={saving || noCycles}>
          <Save /> {saving ? "Saving..." : submitLabel}
        </Button>
      </StickyFooter>
    </form>
  );
}
