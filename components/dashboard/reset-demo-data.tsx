"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { resetDatabase } from "@/lib/db";

/**
 * Phase-1 only. Local edits live in localStorage; this puts the demo dataset
 * back so the UI can be reviewed from a known state. It disappears with the
 * mock data layer once the backend lands.
 */
export function ResetDemoData() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-auto flex items-center gap-1.5 py-2 text-xs text-muted"
      >
        <RotateCcw className="size-3.5" />
        Reset demo data
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Reset demo data?"
        description="Everything you added or edited on this device is discarded and the sample farmers, plots, crop cycles and orders come back."
        confirmLabel="Reset"
        destructive
        onConfirm={() => resetDatabase()}
      />
    </>
  );
}
