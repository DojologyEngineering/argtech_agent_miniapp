"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Card, CardBody, SectionHeading } from "@/components/ui/card";
import { FieldGroup, Input, Textarea } from "@/components/ui/field";
import { Select, toOptions } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StickyFooter } from "@/components/layout/app-shell";
import { PlotAreaField } from "./plot-area-field";
import { useQuery } from "@/lib/hooks/use-query";
import { listFarmers } from "@/lib/api/farmers";
import { LAND_TYPES, type LandType, type LatLng, type Plot, type PlotInput } from "@/lib/types";
import { haptic } from "@/lib/telegram";

const PROPERTY_OPTIONS = [
  { value: "own", label: "Own" },
  { value: "rent", label: "Rent" },
];

export function PlotForm({
  plot,
  defaultFarmerId,
  onSubmit,
  cancelHref,
  submitLabel = "Save Plot",
}: {
  plot?: Plot;
  defaultFarmerId?: string;
  onSubmit: (input: PlotInput) => Promise<void>;
  cancelHref: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const { data: farmers } = useQuery(() => listFarmers(), []);

  const [values, setValues] = useState<PlotInput>(() => ({
    farmerId: plot?.farmerId ?? defaultFarmerId ?? "",
    name: plot?.name ?? "",
    property: plot?.property ?? "own",
    landType: plot?.landType ?? "Clay Soil",
    locationText: plot?.locationText ?? "",
    boundary: plot?.boundary ?? [],
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof PlotInput>(key: K, value: PlotInput[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!values.name.trim()) next.name = "Plot name is required";
    if (!values.farmerId) next.farmerId = "Select the farmer this plot belongs to";
    if (values.boundary.length < 3) next.boundary = "Draw the plot boundary on the map";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    haptic("medium");
    try {
      await onSubmit(values);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <SectionHeading title="Plot Details" hint="A plot always belongs to one farmer" />
      <Card className="mb-5">
        <CardBody className="space-y-4">
          <FieldGroup label="Plot Name" required error={errors.name} htmlFor="name">
            <Input
              id="name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Rice Paddy A"
            />
          </FieldGroup>

          <FieldGroup label="Farmer" required error={errors.farmerId} htmlFor="farmer">
            <Select
              id="farmer"
              value={values.farmerId}
              onValueChange={(v) => set("farmerId", v)}
              options={(farmers ?? []).map((f) => ({
                value: f.id,
                label: f.fullName,
                description: f.locationLabel,
              }))}
              invalid={Boolean(errors.farmerId)}
            />
          </FieldGroup>

          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="Property" htmlFor="property">
              <Select
                id="property"
                value={values.property}
                onValueChange={(v) => set("property", v as PlotInput["property"])}
                options={PROPERTY_OPTIONS}
              />
            </FieldGroup>
            <FieldGroup label="Land type" htmlFor="landType">
              <Select
                id="landType"
                value={values.landType}
                onValueChange={(v) => set("landType", v as LandType)}
                options={toOptions(LAND_TYPES)}
              />
            </FieldGroup>
          </div>

          <FieldGroup label="Location" htmlFor="location">
            <Textarea
              id="location"
              value={values.locationText}
              onChange={(e) => set("locationText", e.target.value)}
              placeholder="Village, commune, district, province"
            />
          </FieldGroup>
        </CardBody>
      </Card>

      <SectionHeading
        title="Area Calculation"
        hint="Draw the field on the satellite map to calculate its size"
      />
      <PlotAreaField
        boundary={values.boundary}
        onChange={(boundary: LatLng[]) => set("boundary", boundary)}
      />
      {errors.boundary ? (
        <p className="mt-2 px-1 text-xs font-medium text-red-600">{errors.boundary}</p>
      ) : null}

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
