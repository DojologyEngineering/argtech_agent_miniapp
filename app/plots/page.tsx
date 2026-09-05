"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, MapPin, Plus } from "lucide-react";
import { ScreenHeader, HeaderIconButton } from "@/components/layout/screen-header";
import { Content } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Badge, EmptyState, ListSkeleton, SearchInput } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { useQuery } from "@/lib/hooks/use-query";
import { listPlots } from "@/lib/api/plots";
import { formatHectares } from "@/lib/format";

export default function PlotsPage() {
  const [search, setSearch] = useState("");
  const { data: plots, loading } = useQuery(() => listPlots(search), [search]);

  const count = plots?.length ?? 0;

  return (
    <>
      <ScreenHeader
        title="Farm Plots"
        subtitle={`${count} plot${count === 1 ? "" : "s"}`}
        action={
          <HeaderIconButton href="/plots/new" label="Add plot">
            <Plus className="size-5" />
          </HeaderIconButton>
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Search plots..." />
      </ScreenHeader>

      <Content withNav className="space-y-2.5">
        {loading && !plots ? <ListSkeleton /> : null}

        {plots?.map((plot) => (
          <Link key={plot.id} href={`/plots/${plot.id}`} className="block">
            <Card className="flex items-center gap-3 p-3.5 active:bg-canvas">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <MapPin className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold text-ink">{plot.name}</p>
                <p className="truncate text-xs text-muted">{plot.farmerName}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="truncate text-xs text-muted">{plot.locationText || "—"}</span>
                  <Badge tone="green" dot>
                    {plot.property === "own" ? "Own" : "Rent"}
                  </Badge>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-ink">{formatHectares(plot.areaHectares)}</p>
                <p className="text-[11px] text-muted">{plot.landType}</p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted/70" />
            </Card>
          </Link>
        ))}

        {plots && plots.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title={search ? "No plots match that search" : "No plots recorded yet"}
            description={
              search
                ? "Try a different plot, farmer or location."
                : "Add a plot and trace its boundary on the satellite map."
            }
            action={
              search ? null : (
                <Button asChild size="sm">
                  <Link href="/plots/new">
                    <Plus /> Add plot
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
