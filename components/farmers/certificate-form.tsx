"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Card, CardBody, SectionHeading } from "@/components/ui/card";
import { FieldGroup, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { StickyFooter } from "@/components/layout/app-shell";
import type { Certificate } from "@/lib/types";
import { haptic } from "@/lib/telegram";

export type CertificateValues = Omit<Certificate, "id" | "farmerId">;

export function CertificateForm({
  certificate,
  onSubmit,
  cancelHref,
  submitLabel = "Save Certificate",
}: {
  certificate?: Certificate;
  onSubmit: (values: CertificateValues) => Promise<void>;
  cancelHref: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<CertificateValues>({
    title: certificate?.title ?? "",
    issuedDate: certificate?.issuedDate ?? "",
    expiryDate: certificate?.expiryDate ?? null,
    notes: certificate?.notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!values.title.trim()) next.title = "Certificate title is required";
    if (!values.issuedDate) next.issuedDate = "Issued date is required";
    if (values.expiryDate && values.issuedDate && values.expiryDate < values.issuedDate) {
      next.expiryDate = "Expiry cannot be before the issued date";
    }
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
      <SectionHeading title="Certificate Details" />
      <Card>
        <CardBody className="space-y-4">
          <FieldGroup label="Certificate Title" required error={errors.title} htmlFor="title">
            <Input
              id="title"
              value={values.title}
              onChange={(e) => setValues((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g., Organic Certification"
            />
          </FieldGroup>

          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="Issued Date" required error={errors.issuedDate} htmlFor="issued">
              <Input
                id="issued"
                type="date"
                value={values.issuedDate}
                onChange={(e) => setValues((p) => ({ ...p, issuedDate: e.target.value }))}
              />
            </FieldGroup>
            <FieldGroup label="Expiry Date" error={errors.expiryDate} htmlFor="expiry">
              <Input
                id="expiry"
                type="date"
                value={values.expiryDate ?? ""}
                onChange={(e) => setValues((p) => ({ ...p, expiryDate: e.target.value || null }))}
              />
            </FieldGroup>
          </div>

          <FieldGroup label="Notes" htmlFor="notes">
            <Textarea
              id="notes"
              value={values.notes}
              onChange={(e) => setValues((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Additional notes about this certificate..."
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
