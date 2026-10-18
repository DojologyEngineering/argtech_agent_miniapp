"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  MapPin,
  Package,
  ShoppingCart,
  Sprout,
  TrendingDown,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { Content } from "@/components/layout/app-shell";
import { Card, CardBody, SectionHeading } from "@/components/ui/card";
import { Badge, ListSkeleton, Skeleton } from "@/components/ui/misc";
import { HarvestChart } from "@/components/dashboard/harvest-chart";
import { ResetDemoData } from "@/components/dashboard/reset-demo-data";
import { useQuery } from "@/lib/hooks/use-query";
import { getDashboard } from "@/lib/api/dashboard";
import { ORDER_STATUS_LABEL } from "@/lib/derive";
import { formatDate, formatNumber } from "@/lib/format";
import { useTelegram } from "./providers";

const ORDER_TONE = { pending: "amber", delivered: "green", completed: "blue" } as const;

export default function DashboardPage() {
  const { user } = useTelegram();
  const { data } = useQuery(() => getDashboard(), []);

  return (
    <>
      <header className="sticky top-0 z-[800] border-b border-line bg-white px-4 pb-3 pt-[calc(var(--safe-top)+14px)]">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
            AG
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-extrabold leading-tight text-ink">Dashboard</p>
            <p className="truncate text-xs text-muted">
              {user.firstName} {user.lastName}
            </p>
          </div>
          <button
            type="button"
            aria-label="Notifications"
            className="relative flex size-9 items-center justify-center rounded-full text-muted"
          >
            <Bell className="size-5" />
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-500" />
          </button>
          <span className="flex size-9 items-center justify-center rounded-full bg-brand-600 text-white">
            <User className="size-4" />
          </span>
        </div>
      </header>

      <Content withNav className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            icon={Users}
            label="Total Farmers"
            value={data?.stats.totalFarmers}
            href="/farmers"
          />
          <StatTile icon={MapPin} label="Farm Plots" value={data?.stats.totalPlots} href="/plots" />
          <StatTile
            icon={Sprout}
            label="Active Crops"
            value={data?.stats.activeCrops}
            href="/crops"
          />
          <StatTile
            icon={ShoppingCart}
            label="Purchase Orders"
            value={data?.stats.purchaseOrders}
            href="/orders"
          />
        </div>

        <Card>
          <CardBody>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-ink">Harvest Overview</h2>
                <p className="mt-0.5 text-xs text-muted">Monthly harvest volume in tons</p>
              </div>
              {data?.harvestChangePercent != null ? (
                <span
                  className={
                    data.harvestChangePercent >= 0
                      ? "flex items-center gap-1 text-xs font-semibold text-brand-700"
                      : "flex items-center gap-1 text-xs font-semibold text-red-600"
                  }
                >
                  {data.harvestChangePercent >= 0 ? (
                    <TrendingUp className="size-4" />
                  ) : (
                    <TrendingDown className="size-4" />
                  )}
                  {data.harvestChangePercent >= 0 ? "+" : ""}
                  {data.harvestChangePercent.toFixed(1)}%
                  <span className="font-normal text-muted">vs last month</span>
                </span>
              ) : null}
            </div>

            {data ? <HarvestChart data={data.harvestSeries} /> : <Skeleton className="h-40 w-full" />}
          </CardBody>
        </Card>

        <div>
          <SectionHeading title="Upcoming Harvests" hint="Crop cycles not yet harvested" />
          <Card>
            <CardBody className="space-y-2">
              {!data ? (
                <ListSkeleton rows={2} />
              ) : data.upcomingHarvests.length ? (
                data.upcomingHarvests.map((harvest) => (
                  <Link
                    key={harvest.cropCycleId}
                    href={`/crops/${harvest.cropCycleId}`}
                    className="flex items-center gap-3 rounded-xl border border-line/70 p-3 active:bg-canvas"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <CalendarDays className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{harvest.cropName}</p>
                      <p className="truncate text-xs text-muted">
                        {formatDate(harvest.date)} · {harvest.farmerName}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-brand-700">{harvest.tons} Tons</p>
                      <p className="text-[11px] uppercase text-muted">
                        {harvest.overdue ? "Overdue" : harvest.province}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-muted">No harvests scheduled</p>
              )}

              <Link
                href="/calendar"
                className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-brand-700"
              >
                View Full Calendar <ArrowRight className="size-4" />
              </Link>
            </CardBody>
          </Card>
        </div>

        <div>
          <SectionHeading
            title="Recent Purchase Orders"
            hint="Latest transactions from the marketplace"
          />
          <Card>
            <CardBody className="space-y-2">
              {!data ? (
                <ListSkeleton rows={3} />
              ) : data.recentOrders.length ? (
                data.recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center gap-3 rounded-xl border border-line/70 p-3 active:bg-canvas"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-canvas text-muted">
                      <Package className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-ink">{order.code}</p>
                        <Badge tone={ORDER_TONE[order.status]} dot>
                          {ORDER_STATUS_LABEL[order.status]}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-muted">
                        {order.cropSummary} · {order.buyer}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-ink">
                      {formatNumber(order.quantityKg)} kg
                    </span>
                  </Link>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-muted">No purchase orders yet</p>
              )}
            </CardBody>
          </Card>
        </div>
        <ResetDemoData />
      </Content>
    </>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | undefined;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="p-4 active:bg-canvas">
        <span className="mb-3 flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon className="size-5" />
        </span>
        {value === undefined ? (
          <Skeleton className="h-7 w-12" />
        ) : (
          <p className="text-2xl font-extrabold leading-none text-ink">{formatNumber(value)}</p>
        )}
        <p className="mt-1 text-xs text-muted">{label}</p>
      </Card>
    </Link>
  );
}
