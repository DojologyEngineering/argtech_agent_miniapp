"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronRight, Pencil, Sprout, Trash2, X } from "lucide-react";
import { ScreenHeader, HeaderIconButton } from "@/components/layout/screen-header";
import { Content } from "@/components/layout/app-shell";
import { Card, CardBody, SectionHeading } from "@/components/ui/card";
import { Badge, DataPoint, EmptyState, ErrorNotice, ListSkeleton } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PlotAreaField } from "@/components/plots/plot-area-field";
import { useQuery } from "@/lib/hooks/use-query";
import { deletePlot, getPlot } from "@/lib/api/plots";
import { listCropCycles } from "@/lib/api/crop-cycles";
import { CROP_STATUS_LABEL, CROP_STATUS_TONE } from "@/lib/derive";
import { formatDate } from "@/lib/format";
import { errorMessage } from "@/lib/utils";

export default function PlotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: plot, error } = useQuery(() => getPlot(id), [id]);
  const { data: cycles } = useQuery(() => listCropCycles({ plotId: id }), [id]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (error) {
    return (
      <>
        <ScreenHeader title="Plot not found" backHref="/plots" />
        <Content>
          <EmptyState icon={X} title="This plot no longer exists" />
        </Content>
      </>
    );
  }

  if (!plot) {
    return (
      <>
        <ScreenHeader title="Loading..." backHref="/plots" />
        <Content>
          <ListSkeleton rows={3} />
        </Content>
      </>
    );
  }

  return (
    <>
      <ScreenHeader
        title={plot.name}
        subtitle={plot.farmerName}
        backHref="/plots"
        avatarName={plot.name}
        action={
          <HeaderIconButton href={`/plots/${plot.id}/edit`} label="Edit plot">
            <Pencil className="size-4" />
          </HeaderIconButton>
        }
      />

      <Content className="space-y-5">
        <ErrorNotice message={actionError} />

        <div>
          <SectionHeading title="Plot Details" />
          <Card>
            <CardBody className="grid grid-cols-2 gap-4">
              <DataPoint
                label="Farmer"
                value={
                  <Link href={`/farmers/${plot.farmerId}`} className="text-brand-700 underline">
                    {plot.farmerName}
                  </Link>
                }
              />
              <DataPoint
                label="Property"
                value={
                  <Badge tone="green" dot>
                    {plot.property === "own" ? "Own" : "Rent"}
                  </Badge>
                }
              />
              <DataPoint label="Land type" value={plot.landType} />
              <DataPoint label="Registered" value={formatDate(plot.createdAt)} />
              <DataPoint label="Location" value={plot.locationText || "—"} className="col-span-2" />
            </CardBody>
          </Card>
        </div>

        <div>
          <SectionHeading title="Area Calculation" hint="Calculated from the traced boundary" />
          <PlotAreaField boundary={plot.boundary} readOnly />
        </div>

        <div>
          <SectionHeading
            title={`Crop Cycles (${cycles?.length ?? 0})`}
            hint="Plantings recorded on this plot"
          />
          <Card>
            <CardBody className="space-y-2">
              {cycles?.length ? (
                cycles.map((cycle) => (
                  <Link
                    key={cycle.id}
                    href={`/crops/${cycle.id}`}
                    className="flex items-center gap-3 rounded-xl border border-line/70 p-3 active:bg-canvas"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <Sprout className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{cycle.cropName}</p>
                      <p className="truncate text-xs text-muted">
                        Planted {formatDate(cycle.plantingDate)}
                      </p>
                    </div>
                    <Badge tone={CROP_STATUS_TONE[cycle.status]}>
                      {CROP_STATUS_LABEL[cycle.status]}
                    </Badge>
                    <ChevronRight className="size-4 shrink-0 text-muted/70" />
                  </Link>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-muted">
                  No crop cycles recorded on this plot yet
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        <Button variant="danger" block onClick={() => setConfirmDelete(true)}>
          <Trash2 /> Delete plot
        </Button>
      </Content>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${plot.name}?`}
        description="Its crop cycles are removed and their produce is released from any requested or confirmed order. A plot that already supplied a delivered or completed order can't be deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          setActionError(null);
          try {
            await deletePlot(plot.id);
            router.replace("/plots");
          } catch (e) {
            setActionError(errorMessage(e));
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
      />
    </>
  );
}
