"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldGroup, Textarea } from "@/components/ui/field";
import { ErrorNotice } from "@/components/ui/misc";
import { Select, toOptions } from "@/components/ui/select";
import { reportProblem } from "@/lib/api/orders";
import { haptic } from "@/lib/telegram";
import { errorMessage } from "@/lib/utils";
import {
  PROBLEM_REASONS,
  type OrderLineItemSummary,
  type OrderSummary,
  type ProblemReason,
} from "@/lib/types";

/**
 * The only action an agent can take on an order itself: flag a line for staff.
 * It adds a "Problem reported" badge and never changes the order status —
 * staff pick it up in the Admin Portal.
 */
export function ReportProblemButton({
  order,
  line,
}: {
  order: OrderSummary;
  line: OrderLineItemSummary;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ProblemReason | "">(line.problem?.reason ?? "");
  const [note, setNote] = useState(line.problem?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleOpenChange(next: boolean) {
    if (next) {
      // Reopen on the latest saved report, not a half-typed earlier draft.
      setReason(line.problem?.reason ?? "");
      setNote(line.problem?.note ?? "");
      setError(null);
    }
    setOpen(next);
  }

  async function handleSave() {
    if (!reason) {
      setError("Choose a reason.");
      return;
    }
    setSaving(true);
    setError(null);
    haptic("medium");
    try {
      await reportProblem(order.id, line.id, { reason, note });
      setOpen(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <Button type="button" variant="secondary" size="sm" block>
          <TriangleAlert /> {line.problem ? "Update problem report" : "Report a problem"}
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1300] bg-black/40" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-[1301] mx-auto w-full max-w-md rounded-t-2xl bg-white p-5 pb-[max(var(--safe-bottom),20px)] shadow-xl focus:outline-none">
          <Dialog.Title className="text-base font-bold text-ink">Report a problem</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted">
            {line.farmerName} · {line.cropName}. Staff are told and handle it in the Admin Portal —
            the order status doesn&apos;t change.
          </Dialog.Description>

          <div className="mt-4 space-y-4">
            <FieldGroup label="Reason" required htmlFor={`problem-reason-${line.id}`}>
              <Select
                id={`problem-reason-${line.id}`}
                value={reason}
                onValueChange={(v) => setReason(v as ProblemReason)}
                options={toOptions(PROBLEM_REASONS)}
              />
            </FieldGroup>

            <FieldGroup label="Note" htmlFor={`problem-note-${line.id}`}>
              <Textarea
                id={`problem-note-${line.id}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What happened?"
              />
            </FieldGroup>

            <ErrorNotice message={error} />
          </div>

          <div className="mt-5 flex gap-3">
            <Dialog.Close asChild>
              <Button type="button" variant="secondary" block>
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="button" block disabled={saving} onClick={handleSave}>
              {saving ? "Saving..." : "Save report"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
