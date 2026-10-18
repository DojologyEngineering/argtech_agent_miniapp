"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus, Sprout } from "lucide-react";
import { ScreenHeader, HeaderIconButton } from "@/components/layout/screen-header";
import { Content } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Badge, EmptyState, FilterChips, ListSkeleton, SearchInput } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { useQuery } from "@/lib/hooks/use-query";
import { listCropCycles } from "@/lib/api/crop-cycles";
import { CROP_STATUS_LABEL, CROP_STATUS_TONE, productionDetailsMissing } from "@/lib/derive";
import { formatDate, formatHectares, formatKg } from "@/lib/format";
import type { CropCycleStatus, HarvestLogEntry } from "@/lib/types";

function latestHarvestDate(entries: HarvestLogEntry[]) {
  return entries.reduce((latest, e) => (e.date > latest ? e.date : latest), entries[0].date);
}

type StatusFilter = CropCycleStatus | "all";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "growing", label: "Growing" },
  { value: "ready_to_harvest", label: "Ready to harvest" },
  { value: "harvesting", label: "Harvesting" },
  { value: "completed", label: "Completed" },
];

export default function CropsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const { data: cycles, loading } = useQuery(
    () => listCropCycles({ search, status }),
    [search, status],
  );

  const count = cycles?.length ?? 0;

  return (
    <>
      <ScreenHeader
        title="Crop Cycles"
        subtitle={`${count} planting${count === 1 ? "" : "s"} tracked`}
        action={
          <HeaderIconButton href="/crops/new" label="Add crop cycle">
            <Plus className="size-5" />
          </HeaderIconButton>
        }
      >
        <div className="space-y-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search farmer, plot or crop..."
          />
          <FilterChips options={FILTERS} value={status} onChange={setStatus} />
        </div>
      </ScreenHeader>

      <Content withNav className="space-y-2.5">
        {loading && !cycles ? <ListSkeleton /> : null}

        {cycles?.map((cycle) => (
          <Link key={cycle.id} href={`/crops/${cycle.id}`} className="block">
            <Card className="p-3.5 active:bg-canvas">
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Sprout className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[15px] font-bold text-ink">{cycle.cropName}</p>
                    <Badge tone={CROP_STATUS_TONE[cycle.status]} dot>
                      {CROP_STATUS_LABEL[cycle.status]}
                    </Badge>
                    {productionDetailsMissing(cycle.production) ? (
                      <Badge tone="amber">Production details missing</Badge>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-muted">
                    {cycle.farmerName} · {cycle.plotName}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted">
                    Planted {formatDate(cycle.plantingDate)} ·{" "}
                    {cycle.harvestLog.length
                      ? `Last picked ${formatDate(latestHarvestDate(cycle.harvestLog))}`
                      : `Expected ${formatDate(cycle.expectedHarvestDate)}`}
                  </p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted/70" />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-2.5 text-xs text-muted">
                <span>{formatHectares(cycle.cultivatedAreaHectares)}</span>
                <span>
                  {cycle.harvestedQuantityKg > 0
                    ? `Harvested ${formatKg(cycle.harvestedQuantityKg)}`
                    : `Expected ${formatKg(cycle.expectedOutputKg)}`}
                </span>
                <span
                  className={
                    cycle.marginPercent != null && cycle.marginPercent >= 0
                      ? "font-semibold text-brand-700"
                      : "font-semibold text-red-600"
                  }
                >
                  {cycle.marginPercent == null ? "—" : `${cycle.marginPercent.toFixed(0)}% margin`}
                </span>
              </div>
            </Card>
          </Link>
        ))}

        {cycles && cycles.length === 0 ? (
          <EmptyState
            icon={Sprout}
            title={
              search || status !== "all" ? "No crop cycles match" : "No crop cycles recorded yet"
            }
            description={
              search || status !== "all"
                ? "Try another search or clear the status filter."
                : "Log what a farmer planted on one of their plots."
            }
            action={
              search || status !== "all" ? null : (
                <Button asChild size="sm">
                  <Link href="/crops/new">
                    <Plus /> Add crop cycle
                  </Link>
                </Button>
              )
            }
          />
        ) : null}
      </Content>
    </>
  );
}
