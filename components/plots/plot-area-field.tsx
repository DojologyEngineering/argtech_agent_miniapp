"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Info, Pencil, Trash2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { boundingDimensions, hectaresFromBoundary } from "@/lib/geo";
import { formatHectares, formatNumber, formatSquareMeters } from "@/lib/format";
import type { LatLng } from "@/lib/types";

// Leaflet touches `window` on import, so the map never renders on the server.
const PlotMap = dynamic(() => import("@/components/map/plot-map"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

/**
 * The plot's area calculation section.
 *
 * The drawn polygon is the single source of truth: hectares come from Turf,
 * and the length/width read-outs are the bounding box of that same polygon —
 * informational only, never an independent way to set the area.
 */
export function PlotAreaField({
  boundary,
  onChange,
  readOnly = false,
}: {
  boundary: LatLng[];
  onChange?: (boundary: LatLng[]) => void;
  readOnly?: boolean;
}) {
  const hectares = useMemo(() => hectaresFromBoundary(boundary), [boundary]);
  const { lengthM, widthM } = useMemo(() => boundingDimensions(boundary), [boundary]);
  const hasBoundary = boundary.length >= 3;

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="rounded-xl bg-brand-50 py-5 text-center">
          <p className="text-3xl font-extrabold text-brand-700">{formatHectares(hectares)}</p>
          <p className="mt-0.5 text-xs text-muted">{formatSquareMeters(hectares)}</p>
        </div>

        <div className="h-64 overflow-hidden rounded-xl border border-line">
          <PlotMap
            boundary={boundary}
            onChange={onChange}
            readOnly={readOnly}
            className="size-full"
          />
        </div>

        {!readOnly ? (
          <div className="flex items-start gap-2 rounded-xl bg-canvas p-3 text-xs text-muted">
            <Info className="mt-0.5 size-4 shrink-0 text-brand-600" />
            <p>
              {hasBoundary
                ? "Tap the edit tool to move corner points, or draw again to replace the boundary. The area updates automatically."
                : "Use the polygon or rectangle tool on the map to trace the field boundary. The area in hectares is calculated from the shape you draw."}
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <DerivedDimension label="Length (bounding)" value={lengthM} />
          <DerivedDimension label="Width (bounding)" value={widthM} />
        </div>
        <p className="text-xs text-muted">
          Length and width are derived from the drawn boundary for reference only — plot size always
          comes from the calculated hectares above.
        </p>

        {!readOnly && hasBoundary && onChange ? (
          <Button type="button" variant="danger" size="sm" block onClick={() => onChange([])}>
            <Trash2 /> Clear boundary
          </Button>
        ) : null}

        {!readOnly && !hasBoundary ? (
          <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-status-pending">
            <Pencil className="size-3.5" /> No boundary drawn yet
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}

function DerivedDimension({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-ink">{label}</p>
      <div className="flex h-12 items-center justify-between rounded-xl border border-dashed border-line bg-canvas px-3.5">
        <span className="text-[15px] font-semibold text-ink">{formatNumber(value)}</span>
        <span className="text-sm text-muted">m</span>
      </div>
    </div>
  );
}
