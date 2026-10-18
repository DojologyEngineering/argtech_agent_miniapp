"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Card, CardBody, SectionHeading } from "@/components/ui/card";
import { DerivedField, FieldGroup, Input, InputWithSuffix, Textarea } from "@/components/ui/field";
import { Select, toOptions } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StickyFooter } from "@/components/layout/app-shell";
import { useQuery } from "@/lib/hooks/use-query";
import { listFarmers } from "@/lib/api/farmers";
import { listPlots } from "@/lib/api/plots";
import { CROP_REFS, findCropRef } from "@/lib/mock/crop-refs";
import { formatCurrency, formatHectares, toISODate } from "@/lib/format";
import { haptic } from "@/lib/telegram";
import {
  DELIVERY_FREQUENCIES,
  FERTILIZER_OPTIONS,
  PESTICIDE_OPTIONS,
  PRODUCTION_METHODS,
  type CropCycle,
  type CropCycleInput,
  type PesticideUse,
  type Season,
} from "@/lib/types";

const SEASONS: Season[] = ["Wet Season", "Dry Season"];

interface FormState {
  farmerId: string;
  plotId: string;
  cropRefId: string;
  cropName: string;
  varietyType: string;
  season: Season;
  seedSource: string;
  referencePricePerKg: string;
  plantingDate: string;
  expectedHarvestDate: string;
  seedCost: string;
  fertilizerCost: string;
  laborCost: string;
  otherCost: string;
  expectedOutputKg: string;
  estimatedPricePerKg: string;
  method: string;
  deliveryFrequency: string;
  fertilizerType: string;
  pesticideUsed: PesticideUse | "";
  pesticideDetails: string;
  notes: string;
}

const num = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function initialState(cycle?: CropCycle): FormState {
  return {
    farmerId: cycle?.farmerId ?? "",
    plotId: cycle?.plotId ?? "",
    cropRefId: cycle?.cropRefId ?? "",
    cropName: cycle?.cropName ?? "",
    varietyType: cycle?.varietyType ?? "",
    season: cycle?.season ?? "Wet Season",
    seedSource: cycle?.seedSource ?? "",
    referencePricePerKg: cycle ? String(cycle.referencePricePerKg) : "",
    plantingDate: cycle?.plantingDate ?? "",
    expectedHarvestDate: cycle?.expectedHarvestDate ?? "",
    seedCost: cycle ? String(cycle.costs.seed) : "",
    fertilizerCost: cycle ? String(cycle.costs.fertilizer) : "",
    laborCost: cycle ? String(cycle.costs.labor) : "",
    otherCost: cycle ? String(cycle.costs.other) : "",
    expectedOutputKg: cycle ? String(cycle.expectedOutputKg) : "",
    estimatedPricePerKg: cycle ? String(cycle.estimatedPricePerKg) : "",
    method: cycle?.production.method ?? "",
    deliveryFrequency: cycle?.production.deliveryFrequency ?? "",
    fertilizerType: cycle?.production.fertilizerType ?? "",
    pesticideUsed: cycle?.production.pesticideUsed ?? "",
    pesticideDetails: cycle?.production.pesticideDetails ?? "",
    notes: cycle?.production.notes ?? "",
  };
}

export function CropCycleForm({
  cycle,
  defaultFarmerId,
  defaultPlotId,
  onSubmit,
  cancelHref,
  submitLabel = "Save Crop Cycle",
}: {
  cycle?: CropCycle;
  defaultFarmerId?: string;
  defaultPlotId?: string;
  onSubmit: (input: CropCycleInput) => Promise<void>;
  cancelHref: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<FormState>(() => {
    const base = initialState(cycle);
    return {
      ...base,
      farmerId: base.farmerId || defaultFarmerId || "",
      plotId: base.plotId || defaultPlotId || "",
    };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data: farmers } = useQuery(() => listFarmers(), []);
  // Plots are always scoped to the selected farmer.
  const { data: plots } = useQuery(
    () => (values.farmerId ? listPlots("", values.farmerId) : Promise.resolve([])),
    [values.farmerId],
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  // Clear a plot that no longer belongs to the selected farmer.
  useEffect(() => {
    if (!plots || !values.plotId) return;
    if (!plots.some((p) => p.id === values.plotId)) {
      setValues((prev) => ({ ...prev, plotId: "" }));
    }
  }, [plots, values.plotId]);

  const selectedPlot = useMemo(
    () => plots?.find((p) => p.id === values.plotId) ?? null,
    [plots, values.plotId],
  );

  /** Cultivated area is inherited from the plot — never re-entered here. */
  const cultivatedAreaHectares = selectedPlot?.areaHectares ?? cycle?.cultivatedAreaHectares ?? 0;

  const totalCost =
    num(values.seedCost) + num(values.fertilizerCost) + num(values.laborCost) + num(values.otherCost);
  const outputKg = num(values.expectedOutputKg);
  const pricePerKg = num(values.estimatedPricePerKg);
  const breakEven = outputKg > 0 ? totalCost / outputKg : null;
  const revenue = outputKg * pricePerKg;
  const margin = revenue > 0 ? ((revenue - totalCost) / revenue) * 100 : null;

  /** Picking a crop pre-fills its reference values; each stays editable. */
  function applyCropRef(cropRefId: string) {
    const ref = findCropRef(cropRefId);
    if (!ref) return;
    setValues((prev) => {
      const expectedHarvestDate =
        prev.plantingDate && !prev.expectedHarvestDate
          ? addDays(prev.plantingDate, ref.daysToHarvest)
          : prev.expectedHarvestDate;
      return {
        ...prev,
        cropRefId,
        cropName: ref.name,
        varietyType: ref.varietyType,
        season: ref.season,
        seedSource: ref.seedSource,
        referencePricePerKg: String(ref.referencePricePerKg),
        estimatedPricePerKg: prev.estimatedPricePerKg || String(ref.referencePricePerKg),
        expectedHarvestDate,
      };
    });
  }

  function handlePlantingDate(date: string) {
    setValues((prev) => {
      const ref = findCropRef(prev.cropRefId);
      return {
        ...prev,
        plantingDate: date,
        expectedHarvestDate:
          ref && date && !prev.expectedHarvestDate
            ? addDays(date, ref.daysToHarvest)
            : prev.expectedHarvestDate,
      };
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!values.farmerId) next.farmerId = "Select a farmer";
    if (!values.plotId) next.plotId = "Select a plot";
    if (!values.cropRefId) next.cropRefId = "Select a crop";
    if (!values.plantingDate) next.plantingDate = "Planting date is required";
    if (!values.expectedHarvestDate) next.expectedHarvestDate = "Expected harvest is required";
    if (
      values.expectedHarvestDate &&
      values.plantingDate &&
      values.expectedHarvestDate < values.plantingDate
    ) {
      next.expectedHarvestDate = "Harvest cannot be before planting";
    }
    if (num(values.expectedOutputKg) <= 0) next.expectedOutputKg = "Expected output is required";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    haptic("medium");
    try {
      await onSubmit({
        farmerId: values.farmerId,
        plotId: values.plotId,
        cropRefId: values.cropRefId,
        cropName: values.cropName,
        varietyType: values.varietyType,
        season: values.season,
        seedSource: values.seedSource,
        referencePricePerKg: num(values.referencePricePerKg),
        plantingDate: values.plantingDate,
        expectedHarvestDate: values.expectedHarvestDate,
        cultivatedAreaHectares,
        costs: {
          seed: num(values.seedCost),
          fertilizer: num(values.fertilizerCost),
          labor: num(values.laborCost),
          other: num(values.otherCost),
        },
        expectedOutputKg: num(values.expectedOutputKg),
        estimatedPricePerKg: num(values.estimatedPricePerKg),
        // Harvest Log and completion are managed on the detail screen, not this form.
        completedAt: cycle?.completedAt ?? null,
        production: {
          method: values.method || null,
          deliveryFrequency: values.deliveryFrequency || null,
          fertilizerType: values.fertilizerType || null,
          pesticideUsed: values.pesticideUsed || null,
          // Details only mean something when pesticide was used (or the agent isn't sure).
          pesticideDetails: values.pesticideUsed === "Not used" ? "" : values.pesticideDetails.trim(),
          notes: values.notes,
        },
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <SectionHeading
        title="Crop & Plot Selection"
        hint="Select the farmer first to filter their plots"
      />
      <Card className="mb-5">
        <CardBody className="space-y-4">
          <FieldGroup label="Farmer name" required error={errors.farmerId} htmlFor="farmer">
            <Select
              id="farmer"
              value={values.farmerId}
              onValueChange={(v) => setValues((prev) => ({ ...prev, farmerId: v, plotId: "" }))}
              options={(farmers ?? []).map((f) => ({
                value: f.id,
                label: f.fullName,
                description: f.locationLabel,
              }))}
              invalid={Boolean(errors.farmerId)}
            />
          </FieldGroup>

          <FieldGroup label="Plot name" required error={errors.plotId} htmlFor="plot">
            <Select
              id="plot"
              value={values.plotId}
              onValueChange={(v) => set("plotId", v)}
              disabled={!values.farmerId}
              placeholder={values.farmerId ? "Select" : "Select a farmer first"}
              options={(plots ?? []).map((p) => ({
                value: p.id,
                label: p.name,
                description: `${formatHectares(p.areaHectares)} · ${p.landType}`,
              }))}
              invalid={Boolean(errors.plotId)}
            />
          </FieldGroup>

          <FieldGroup label="Crop name" required error={errors.cropRefId} htmlFor="crop">
            <Select
              id="crop"
              value={values.cropRefId}
              onValueChange={applyCropRef}
              options={CROP_REFS.map((c) => ({
                value: c.id,
                label: c.name,
                description: `${c.varietyType} · ${c.season}`,
              }))}
              invalid={Boolean(errors.cropRefId)}
            />
          </FieldGroup>

          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="Variety type" htmlFor="variety">
              <Input
                id="variety"
                value={values.varietyType}
                onChange={(e) => set("varietyType", e.target.value)}
                placeholder="Pre-filled from crop"
              />
            </FieldGroup>
            <FieldGroup label="Season" htmlFor="season">
              <Select
                id="season"
                value={values.season}
                onValueChange={(v) => set("season", v as Season)}
                options={toOptions(SEASONS)}
              />
            </FieldGroup>
            <FieldGroup label="Seed source" htmlFor="seedSource">
              <Input
                id="seedSource"
                value={values.seedSource}
                onChange={(e) => set("seedSource", e.target.value)}
                placeholder="Pre-filled from crop"
              />
            </FieldGroup>
            <FieldGroup label="Reference price" htmlFor="refPrice" hint="Market reference">
              <InputWithSuffix
                id="refPrice"
                suffix="/kg"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={values.referencePricePerKg}
                onChange={(e) => set("referencePricePerKg", e.target.value)}
                placeholder="0.45"
              />
            </FieldGroup>
          </div>
        </CardBody>
      </Card>

      <SectionHeading title="Schedule" hint="Planting and harvest dates" />
      <Card className="mb-5">
        <CardBody className="space-y-4">
          <FieldGroup label="Planting date" required error={errors.plantingDate} htmlFor="planting">
            <Input
              id="planting"
              type="date"
              value={values.plantingDate}
              onChange={(e) => handlePlantingDate(e.target.value)}
            />
          </FieldGroup>
          <FieldGroup
            label="Expected harvest"
            required
            error={errors.expectedHarvestDate}
            htmlFor="expectedHarvest"
            hint="Suggested from the crop's growing period — adjust as needed"
          >
            <Input
              id="expectedHarvest"
              type="date"
              value={values.expectedHarvestDate}
              onChange={(e) => set("expectedHarvestDate", e.target.value)}
            />
          </FieldGroup>
        </CardBody>
      </Card>

      <SectionHeading title="Cultivated Area" hint="Taken from the selected plot" />
      <Card className="mb-5">
        <CardBody>
          <DerivedField
            label="Cultivated area"
            value={formatHectares(cultivatedAreaHectares)}
            hint={
              selectedPlot
                ? `From ${selectedPlot.name}'s traced boundary. Change it by editing the plot.`
                : "Select a plot to inherit its calculated area."
            }
          />
        </CardBody>
      </Card>

      <SectionHeading title="Cost Inputs" hint="Itemised cost of this cycle" />
      <Card className="mb-5">
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <MoneyField label="Seed cost" id="seedCost" value={values.seedCost} onChange={(v) => set("seedCost", v)} />
            <MoneyField
              label="Fertilizer cost"
              id="fertilizerCost"
              value={values.fertilizerCost}
              onChange={(v) => set("fertilizerCost", v)}
            />
            <MoneyField label="Labor cost" id="laborCost" value={values.laborCost} onChange={(v) => set("laborCost", v)} />
            <MoneyField label="Other cost" id="otherCost" value={values.otherCost} onChange={(v) => set("otherCost", v)} />
          </div>
          <DerivedField label="Total cost" value={formatCurrency(totalCost)} />
        </CardBody>
      </Card>

      <SectionHeading title="Output & Pricing" hint="Upfront estimate for this cycle" />
      <Card className="mb-5">
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup
              label="Expected output"
              required
              error={errors.expectedOutputKg}
              htmlFor="expectedOutput"
            >
              <InputWithSuffix
                id="expectedOutput"
                suffix="kg"
                type="number"
                inputMode="decimal"
                value={values.expectedOutputKg}
                onChange={(e) => set("expectedOutputKg", e.target.value)}
                placeholder="2000"
              />
            </FieldGroup>
            <FieldGroup label="Estimated price" htmlFor="estimatedPrice">
              <InputWithSuffix
                id="estimatedPrice"
                suffix="$/kg"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={values.estimatedPricePerKg}
                onChange={(e) => set("estimatedPricePerKg", e.target.value)}
                placeholder="0.45"
              />
            </FieldGroup>
          </div>
        </CardBody>
      </Card>

      <SectionHeading title="Projected Break-even & Margin" hint="Based on the estimates above" />
      <Card className="mb-5">
        <CardBody className="grid grid-cols-2 gap-3">
          <DerivedField
            label="Break-even price"
            value={breakEven === null ? "—" : `${formatCurrency(breakEven, 3)}/kg`}
          />
          <DerivedField
            label="Margin"
            value={margin === null ? "—" : `${margin.toFixed(1)}%`}
          />
          <div className="col-span-2 rounded-xl bg-canvas p-3 text-xs text-muted">
            Revenue {formatCurrency(revenue)} − cost {formatCurrency(totalCost)} ={" "}
            <span className={revenue - totalCost >= 0 ? "font-semibold text-brand-700" : "font-semibold text-red-600"}>
              {formatCurrency(revenue - totalCost)}
            </span>
            . This updates automatically once harvests are logged on the crop cycle's detail screen.
          </div>
        </CardBody>
      </Card>

      <SectionHeading title="Production Details" hint="Optional — not required to save" />
      <Card>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="Production method" htmlFor="method">
              <Select
                id="method"
                value={values.method}
                onValueChange={(v) => set("method", v)}
                options={toOptions(PRODUCTION_METHODS)}
              />
            </FieldGroup>
            <FieldGroup label="Delivery Frequency" htmlFor="deliveryFrequency">
              <Select
                id="deliveryFrequency"
                value={values.deliveryFrequency}
                onValueChange={(v) => set("deliveryFrequency", v)}
                options={toOptions(DELIVERY_FREQUENCIES)}
              />
            </FieldGroup>
            <FieldGroup label="Fertilizer type" htmlFor="fertilizerType">
              <Select
                id="fertilizerType"
                value={values.fertilizerType}
                onValueChange={(v) => set("fertilizerType", v)}
                options={FERTILIZER_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.value,
                  group: o.group,
                }))}
              />
            </FieldGroup>
            <FieldGroup label="Pesticide used" htmlFor="pesticide">
              <Select
                id="pesticide"
                value={values.pesticideUsed}
                onValueChange={(v) => set("pesticideUsed", v as PesticideUse)}
                options={toOptions(PESTICIDE_OPTIONS)}
              />
            </FieldGroup>
          </div>
          {values.pesticideUsed === "Used" || values.pesticideUsed === "Not sure" ? (
            <FieldGroup label="Pesticide details" htmlFor="pesticideDetails" hint="Optional">
              <Input
                id="pesticideDetails"
                value={values.pesticideDetails}
                onChange={(e) => set("pesticideDetails", e.target.value)}
                placeholder="Which product, how often"
              />
            </FieldGroup>
          ) : null}
          <FieldGroup label="Notes" htmlFor="notes">
            <Textarea
              id="notes"
              value={values.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Additional notes about this crop cycle..."
            />
          </FieldGroup>
        </CardBody>
      </Card>

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

function MoneyField({
  label,
  id,
  value,
  onChange,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <FieldGroup label={label} htmlFor={id}>
      <InputWithSuffix
        id={id}
        suffix="$"
        type="number"
        step="0.01"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.00"
      />
    </FieldGroup>
  );
}

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + days);
  return toISODate(date);
}
