"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Card, CardBody, SectionHeading } from "@/components/ui/card";
import { FieldGroup, Input, InputWithSuffix, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { StickyFooter } from "@/components/layout/app-shell";
import { ErrorNotice } from "@/components/ui/misc";
import type { HarvestLogEntry } from "@/lib/types";
import { haptic } from "@/lib/telegram";
import { errorMessage } from "@/lib/utils";

export type HarvestLogValues = Omit<HarvestLogEntry, "id">;

export function HarvestLogForm({
  entry,
  onSubmit,
  cancelHref,
  submitLabel = "Save Harvest",
}: {
  entry?: HarvestLogEntry;
  onSubmit: (values: HarvestLogValues) => Promise<void>;
  cancelHref: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState(entry?.date ?? "");
  const [quantityKg, setQuantityKg] = useState(entry ? String(entry.quantityKg) : "");
  const [note, setNote] = useState(entry?.note ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const quantity = Number.parseFloat(quantityKg);
    const next: Record<string, string> = {};
    if (!date) next.date = "Date picked is required";
    if (!Number.isFinite(quantity) || quantity <= 0) next.quantityKg = "Quantity is required";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    setSubmitError(null);
    haptic("medium");
    try {
      await onSubmit({ date, quantityKg: quantity, note });
    } catch (error) {
      setSubmitError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <SectionHeading
        title="Harvest Details"
        hint="One picking trip = one entry. Selling is recorded on orders, not here."
      />
      <Card>
        <CardBody className="space-y-4">
          <FieldGroup label="Date picked" required error={errors.date} htmlFor="date">
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FieldGroup>

          <FieldGroup label="Quantity harvested" required error={errors.quantityKg} htmlFor="qty">
            <InputWithSuffix
              id="qty"
              suffix="kg"
              type="number"
              inputMode="decimal"
              value={quantityKg}
              onChange={(e) => setQuantityKg(e.target.value)}
              placeholder="e.g. 150"
            />
          </FieldGroup>

          <FieldGroup label="Note" htmlFor="note">
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. First picking, morning harvest..."
            />
          </FieldGroup>
        </CardBody>
      </Card>

      <ErrorNotice message={submitError} className="mt-4" />

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
