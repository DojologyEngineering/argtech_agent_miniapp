"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Card, CardBody, SectionHeading } from "@/components/ui/card";
import { FieldGroup, Input, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StickyFooter } from "@/components/layout/app-shell";
import { ACTIVITY_LABEL } from "@/lib/api/calendar";
import { MANUAL_ACTIVITY_TYPES, type CropActivity, type ManualActivityType } from "@/lib/types";
import { haptic } from "@/lib/telegram";

export type ActivityValues = Omit<CropActivity, "id">;

/**
 * Planting and harvesting are deliberately absent: those already derive from
 * the cycle's Schedule and Harvest Log, so offering them here would create a
 * second, conflicting source for the same fact.
 */
const TYPE_OPTIONS = MANUAL_ACTIVITY_TYPES.map((type) => ({
  value: type,
  label: ACTIVITY_LABEL[type],
}));

export function ActivityForm({
  activity,
  onSubmit,
  cancelHref,
  submitLabel = "Save Activity",
}: {
  activity?: CropActivity;
  onSubmit: (values: ActivityValues) => Promise<void>;
  cancelHref: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [type, setType] = useState<ManualActivityType>(
    activity && (MANUAL_ACTIVITY_TYPES as readonly string[]).includes(activity.type)
      ? (activity.type as ManualActivityType)
      : "irrigation",
  );
  const [date, setDate] = useState(activity?.date ?? "");
  const [note, setNote] = useState(activity?.note ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!date) next.date = "Date is required";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    haptic("medium");
    try {
      await onSubmit({ type, date, note });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <SectionHeading title="Activity Details" hint="Shows on the calendar with its own badge" />
      <Card>
        <CardBody className="space-y-4">
          <FieldGroup label="Activity type" required htmlFor="type">
            <Select
              id="type"
              value={type}
              onValueChange={(v) => setType(v as ManualActivityType)}
              options={TYPE_OPTIONS}
            />
          </FieldGroup>

          <FieldGroup label="Date" required error={errors.date} htmlFor="date">
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FieldGroup>

          <FieldGroup label="Note" htmlFor="note">
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. NPK top dressing, pump irrigation..."
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
