"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Map, Plus, ShoppingCart, Users } from "lucide-react";
import { ScreenHeader, HeaderIconButton } from "@/components/layout/screen-header";
import { Content } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Avatar, EmptyState, ListSkeleton, SearchInput } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { useQuery } from "@/lib/hooks/use-query";
import { listFarmers } from "@/lib/api/farmers";

export default function FarmersPage() {
  const [search, setSearch] = useState("");
  const { data: farmers, loading } = useQuery(() => listFarmers(search), [search]);

  const count = farmers?.length ?? 0;

  return (
    <>
      <ScreenHeader
        title="Farmers"
        subtitle={`${count} registered farmer${count === 1 ? "" : "s"}`}
        action={
          <HeaderIconButton href="/farmers/new" label="Add farmer">
            <Plus className="size-5" />
          </HeaderIconButton>
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Search farmers..." />
      </ScreenHeader>

      <Content withNav className="space-y-2.5">
        {loading && !farmers ? <ListSkeleton /> : null}

        {farmers?.map((farmer) => (
          <Link key={farmer.id} href={`/farmers/${farmer.id}`} className="block">
            <Card className="flex items-center gap-3 p-3.5 active:bg-canvas">
              <Avatar name={farmer.fullName} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold text-ink">{farmer.fullName}</p>
                <p className="truncate text-xs text-muted">{farmer.locationLabel}</p>
                <div className="mt-1.5 flex items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Map className="size-3.5" />
                    {farmer.plotCount} plot{farmer.plotCount === 1 ? "" : "s"}
                  </span>
                  <span className="flex items-center gap-1">
                    <ShoppingCart className="size-3.5" />
                    {farmer.orderCount} order{farmer.orderCount === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted/70" />
            </Card>
          </Link>
        ))}

        {farmers && farmers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? "No farmers match that search" : "No farmers registered yet"}
            description={
              search
                ? "Try a different name, village or phone number."
                : "Register the first farmer to start collecting plot and crop data."
            }
            action={
              search ? null : (
                <Button asChild size="sm">
                  <Link href="/farmers/new">
                    <Plus /> Add farmer
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
