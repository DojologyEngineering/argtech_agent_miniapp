"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Save } from "lucide-react";
import { Card, CardBody, SectionHeading } from "@/components/ui/card";
import { FieldGroup, Input } from "@/components/ui/field";
import { Select, toOptions } from "@/components/ui/select";
import { PhotoPicker } from "@/components/ui/photo-picker";
import { Button } from "@/components/ui/button";
import { StickyFooter } from "@/components/layout/app-shell";
import { CERTIFICATE_TYPES, type Certificate, type CertificateType } from "@/lib/types";
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
    type: certificate?.type ?? "GAP",
    issuer: certificate?.issuer ?? "",
    scope: certificate?.scope ?? "",
    expiryDate: certificate?.expiryDate ?? null,
    photo: certificate?.photo ?? null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!values.issuer.trim()) next.issuer = "Issuer is required";
    if (!values.scope.trim()) next.scope = "Say what the certificate covers";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    haptic("medium");
    try {
      await onSubmit({ ...values, issuer: values.issuer.trim(), scope: values.scope.trim() });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <SectionHeading title="Certificate Details" />
      <Card className="mb-5">
        <CardBody className="space-y-4">
          <FieldGroup label="Type" required htmlFor="type">
            <Select
              id="type"
              value={values.type}
              onValueChange={(v) => setValues((p) => ({ ...p, type: v as CertificateType }))}
              options={toOptions(CERTIFICATE_TYPES)}
            />
          </FieldGroup>

          <FieldGroup label="Issuer" required error={errors.issuer} htmlFor="issuer">
            <Input
              id="issuer"
              value={values.issuer}
              onChange={(e) => setValues((p) => ({ ...p, issuer: e.target.value }))}
              placeholder="Who issued it"
            />
          </FieldGroup>

          <FieldGroup
            label="Scope"
            required
            error={errors.scope}
            htmlFor="scope"
            hint="What it covers"
          >
            <Input
              id="scope"
              value={values.scope}
              onChange={(e) => setValues((p) => ({ ...p, scope: e.target.value }))}
              placeholder="e.g. Tomato production"
            />
          </FieldGroup>

          <FieldGroup label="Expiry date" htmlFor="expiry" hint="Leave empty if it doesn't expire">
            <Input
              id="expiry"
              type="date"
              value={values.expiryDate ?? ""}
              onChange={(e) => setValues((p) => ({ ...p, expiryDate: e.target.value || null }))}
            />
          </FieldGroup>
        </CardBody>
      </Card>

      <SectionHeading title="Photo" hint="Photograph the original certificate" />
      <Card>
        <CardBody className="space-y-3">
          <PhotoPicker
            photos={values.photo ? [values.photo] : []}
            onChange={(photos) => setValues((p) => ({ ...p, photo: photos[photos.length - 1] ?? null }))}
            max={1}
            label="certificate"
          />
          <div className="flex items-start gap-2 rounded-xl bg-canvas p-3 text-xs text-muted">
            <Info className="mt-0.5 size-4 shrink-0 text-brand-600" />
            <p>Staff prepare a buyer-safe copy before buyers see it.</p>
          </div>
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
