"use client";

import { useState } from "react";
import { CheckCircle2, ClipboardCheck } from "lucide-react";
import { Badge, DataPoint, ErrorNotice } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { DerivedField, FieldGroup, InputWithSuffix, Textarea } from "@/components/ui/field";
import { Select, toOptions } from "@/components/ui/select";
import { PhotoGrid, PhotoPicker } from "@/components/ui/photo-picker";
import { saveHandoverCheck } from "@/lib/api/orders";
import { findCropSpec } from "@/lib/mock/crop-refs";
import { formatDate, formatKg } from "@/lib/format";
import { haptic } from "@/lib/telegram";
import { errorMessage } from "@/lib/utils";
import {
  REJECT_REASONS,
  type OrderLineItemSummary,
  type OrderSummary,
  type RejectReason,
} from "@/lib/types";

const num = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * One farmer's produce is checked on its own line. Shows what the buyer expects
 * (crop specification + any order requirements) so the agent can judge against
 * it, then records received / accepted / rejected kg. Locked once saved — the
 * agent never changes the order status.
 */
export function HandoverCheckSection({
  order,
  line,
}: {
  order: OrderSummary;
  line: OrderLineItemSummary;
}) {
  const check = line.handoverCheck;
  const spec = findCropSpec(line.cropRefId);
  const { ripeness, size } = order.requirements;
  const requirements = [ripeness && `Ripeness: ${ripeness}`, size && `Size: ${size}`].filter(
    Boolean,
  );

  return (
    <div className="space-y-3 rounded-xl bg-canvas/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
          <ClipboardCheck className="size-4 text-brand-600" /> Handover check
        </p>
        {check ? (
          <Badge tone="green" dot>
            Checked
          </Badge>
        ) : null}
      </div>

      {/* Read-only reference: what good looks like. */}
      <div className="space-y-2 rounded-lg border border-line/70 bg-white p-3 text-xs">
        <div>
          <p className="font-semibold text-ink">Crop specification</p>
          {spec ? (
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-muted">
              <dt>Ripeness</dt>
              <dd className="text-ink">{spec.ripeness}</dd>
              <dt>Size</dt>
              <dd className="text-ink">{spec.size}</dd>
              <dt>Condition</dt>
              <dd className="text-ink">{spec.condition}</dd>
              <dt>Best used within</dt>
              <dd className="text-ink">{spec.bestUsedWithin}</dd>
            </dl>
          ) : (
            <p className="mt-1 text-muted">No specification on file for this crop.</p>
          )}
        </div>
        <div className="border-t border-line/70 pt-2">
          <p className="font-semibold text-ink">Buyer requirements</p>
          <p className="mt-0.5 text-muted">
            {requirements.length ? requirements.join(" · ") : "Standard"}
          </p>
        </div>
      </div>

      {check ? (
        <HandoverSummary check={check} />
      ) : order.status === "confirmed" ? (
        <HandoverForm order={order} line={line} />
      ) : (
        <p className="text-xs text-muted">No handover check was recorded for this line.</p>
      )}
    </div>
  );
}

function HandoverSummary({ check }: { check: NonNullable<OrderLineItemSummary["handoverCheck"]> }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <DataPoint label="Received" value={formatKg(check.receivedKg)} />
        <DataPoint label="Accepted" value={formatKg(check.acceptedKg)} />
        <DataPoint
          label="Rejected"
          value={
            <span className={check.rejectedKg > 0 ? "text-red-600" : undefined}>
              {formatKg(check.rejectedKg)}
            </span>
          }
        />
      </div>
      {check.rejectReason ? <DataPoint label="Reason" value={check.rejectReason} /> : null}
      {check.buyerRepPresent !== null ? (
        <DataPoint
          label="Buyer representative present"
          value={check.buyerRepPresent ? "Yes" : "No"}
        />
      ) : null}
      {check.note ? <DataPoint label="Note" value={check.note} /> : null}
      {check.photos.length ? <PhotoGrid photos={check.photos} /> : null}
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <CheckCircle2 className="size-3.5 text-brand-600" />
        Checked {formatDate(check.checkedAt)} · locked
      </p>
    </div>
  );
}

function HandoverForm({ order, line }: { order: OrderSummary; line: OrderLineItemSummary }) {
  const [received, setReceived] = useState("");
  const [accepted, setAccepted] = useState("");
  const [reason, setReason] = useState<RejectReason | "">("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [buyerRep, setBuyerRep] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const receivedKg = num(received);
  const acceptedKg = num(accepted);
  const rejectedKg = Math.max(0, Math.round((receivedKg - acceptedKg) * 100) / 100);
  const id = `check-${line.id}`;

  async function handleSave() {
    const next: Record<string, string> = {};
    if (!(receivedKg > 0)) next.received = "Enter the kg received";
    if (accepted.trim() === "") next.accepted = "Enter the kg accepted";
    else if (acceptedKg > receivedKg) next.accepted = "Can't be more than received";
    if (rejectedKg > 0 && !reason) next.reason = "Choose a reason for the rejected kg";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    setSubmitError(null);
    haptic("medium");
    try {
      await saveHandoverCheck(order.id, line.id, {
        receivedKg,
        acceptedKg,
        rejectReason: rejectedKg > 0 ? (reason as RejectReason) : null,
        photos,
        note,
        buyerRepPresent: order.deliveryMethod === "pickup" ? buyerRep : null,
      });
    } catch (error) {
      setSubmitError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FieldGroup label="Received" required error={errors.received} htmlFor={`${id}-received`}>
          <InputWithSuffix
            id={`${id}-received`}
            suffix="kg"
            type="number"
            inputMode="decimal"
            value={received}
            onChange={(e) => setReceived(e.target.value)}
            placeholder="Weighed"
          />
        </FieldGroup>
        <FieldGroup label="Accepted" required error={errors.accepted} htmlFor={`${id}-accepted`}>
          <InputWithSuffix
            id={`${id}-accepted`}
            suffix="kg"
            type="number"
            inputMode="decimal"
            max={receivedKg > 0 ? receivedKg : undefined}
            value={accepted}
            onChange={(e) => setAccepted(e.target.value)}
            placeholder="0"
          />
        </FieldGroup>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DerivedField label="Rejected" value={formatKg(rejectedKg)} />
        <FieldGroup
          label="Reason"
          required={rejectedKg > 0}
          error={errors.reason}
          htmlFor={`${id}-reason`}
        >
          <Select
            id={`${id}-reason`}
            value={reason}
            onValueChange={(v) => setReason(v as RejectReason)}
            options={toOptions(REJECT_REASONS)}
            placeholder={rejectedKg > 0 ? "Select" : "Not needed"}
            disabled={rejectedKg <= 0}
            invalid={Boolean(errors.reason)}
          />
        </FieldGroup>
      </div>

      <FieldGroup label="Photos" hint="Up to 4 — camera or gallery">
        <PhotoPicker photos={photos} onChange={setPhotos} max={4} label="handover photo" />
      </FieldGroup>

      <FieldGroup label="Note" htmlFor={`${id}-note`}>
        <Textarea
          id={`${id}-note`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional"
        />
      </FieldGroup>

      {order.deliveryMethod === "pickup" ? (
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={buyerRep}
            onChange={(e) => setBuyerRep(e.target.checked)}
            className="size-5 accent-brand-600"
          />
          Buyer representative present
        </label>
      ) : null}

      <ErrorNotice message={submitError} />

      <Button type="button" block disabled={saving} onClick={handleSave}>
        <CheckCircle2 /> {saving ? "Saving..." : "Save check"}
      </Button>
      <p className="text-center text-xs text-muted">
        The check locks once saved. Staff mark the order Delivered in the Admin Portal.
      </p>
    </div>
  );
}
