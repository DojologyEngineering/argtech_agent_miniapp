"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, LayoutList, Sprout } from "lucide-react";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Content } from "@/components/layout/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState, FilterChips, ListSkeleton, SearchInput } from "@/components/ui/misc";
import { useQuery } from "@/lib/hooks/use-query";
import { ACTIVITY_LABEL, listCalendarActivities } from "@/lib/api/calendar";
import { formatDate, toISODate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ActivityType, CalendarActivity } from "@/lib/types";

/** Each activity type carries its own colour — no single hardcoded badge. */
const ACTIVITY_STYLE: Record<ActivityType, { chip: string; dot: string }> = {
  planting: { chip: "bg-brand-600 text-white", dot: "bg-brand-600" },
  harvesting: { chip: "bg-amber-400 text-amber-950", dot: "bg-amber-400" },
  irrigation: { chip: "bg-sky-500 text-white", dot: "bg-sky-500" },
  fertilization: { chip: "bg-violet-500 text-white", dot: "bg-violet-500" },
};

type View = "calendar" | "list";
type TypeFilter = ActivityType | "all";

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "planting", label: "Planting" },
  { value: "harvesting", label: "Harvest" },
  { value: "irrigation", label: "Irrigation" },
  { value: "fertilization", label: "Fertilization" },
];

export default function CalendarPage() {
  const [view, setView] = useState<View>("calendar");
  const { data: activities, loading } = useQuery(() => listCalendarActivities(), []);

  return (
    <>
      <ScreenHeader title="Crop Calendar" subtitle="Planting and harvest schedule">
        <div className="flex rounded-xl bg-white/15 p-1">
          <ViewTab active={view === "calendar"} onClick={() => setView("calendar")} icon={CalendarDays}>
            Calendar
          </ViewTab>
          <ViewTab active={view === "list"} onClick={() => setView("list")} icon={LayoutList}>
            List
          </ViewTab>
        </div>
      </ScreenHeader>

      <Content withNav>
        {loading && !activities ? (
          <ListSkeleton rows={5} />
        ) : view === "calendar" ? (
          <MonthView activities={activities ?? []} />
        ) : (
          <ListView activities={activities ?? []} />
        )}
      </Content>
    </>
  );
}

function ViewTab({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors",
        active ? "bg-white text-brand-700" : "text-white/85",
      )}
    >
      <Icon className="size-4" />
      {children}
    </button>
  );
}

/* -------------------------------------------------------------- Month view */

function MonthView({ activities }: { activities: CalendarActivity[] }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => toISODate(new Date()));

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarActivity[]>();
    activities.forEach((activity) => {
      const list = map.get(activity.date) ?? [];
      list.push(activity);
      map.set(activity.date, list);
    });
    return map;
  }, [activities]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const selectedActivities = byDate.get(selected) ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setMonth((m) => addMonths(m, -1))}
              className="rounded-lg p-2 text-muted hover:bg-canvas"
            >
              <ChevronLeft className="size-5" />
            </button>
            <p className="text-base font-bold text-ink">{format(month, "MMMM yyyy")}</p>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              className="rounded-lg p-2 text-muted hover:bg-canvas"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const iso = toISODate(day);
              const dayActivities = byDate.get(iso) ?? [];
              const types = Array.from(new Set(dayActivities.map((a) => a.type)));
              const isSelected = iso === selected;
              const outside = !isSameMonth(day, month);

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelected(iso)}
                  className={cn(
                    "flex min-h-[46px] flex-col items-center gap-1 rounded-lg border py-1.5 text-xs transition-colors",
                    isSelected
                      ? "border-brand-600 bg-brand-50"
                      : "border-transparent hover:bg-canvas",
                    outside ? "text-muted/50" : "text-ink",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full text-[12px] font-semibold",
                      isToday(day) && !isSelected && "bg-ink text-white",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <span className="flex gap-0.5">
                    {types.slice(0, 3).map((type) => (
                      <span
                        key={type}
                        title={ACTIVITY_LABEL[type]}
                        className={cn("size-1.5 rounded-full", ACTIVITY_STYLE[type].dot)}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <div>
        <p className="mb-2 px-1 text-sm font-bold text-ink">
          {format(parseISO(selected), "d MMM")} — {selectedActivities.length}{" "}
          {selectedActivities.length === 1 ? "activity" : "activities"}
        </p>

        {selectedActivities.length ? (
          <div className="space-y-2.5">
            {selectedActivities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="No activities on this day"
            description="Planting and harvest dates come from the crop cycles you record."
          />
        )}
      </div>

      <Legend />
    </div>
  );
}

/* --------------------------------------------------------------- List view */

function ListView({ activities }: { activities: CalendarActivity[] }) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TypeFilter>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activities
      .filter((a) => (type === "all" ? true : a.type === type))
      .filter((a) =>
        q
          ? a.cropName.toLowerCase().includes(q) ||
            a.farmerName.toLowerCase().includes(q) ||
            a.plotName.toLowerCase().includes(q)
          : true,
      );
  }, [activities, search, type]);

  const grouped = useMemo(() => {
    const map = new Map<string, CalendarActivity[]>();
    filtered.forEach((activity) => {
      const key = format(parseISO(activity.date), "MMMM yyyy");
      const list = map.get(key) ?? [];
      list.push(activity);
      map.set(key, list);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-4">
      <SearchInput value={search} onChange={setSearch} placeholder="Search plots or farmers..." />
      <FilterChips options={TYPE_FILTERS} value={type} onChange={setType} />

      {grouped.length ? (
        grouped.map(([month, items]) => (
          <div key={month}>
            <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-muted">{month}</p>
            <div className="space-y-2.5">
              {items.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} showDate />
              ))}
            </div>
          </div>
        ))
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="No activities found"
          description="Try another search or activity filter."
        />
      )}

      <Legend />
    </div>
  );
}

/* ------------------------------------------------------------------ Shared */

function ActivityCard({
  activity,
  showDate = false,
}: {
  activity: CalendarActivity;
  showDate?: boolean;
}) {
  return (
    <Link href={`/crops/${activity.cropCycleId}`} className="block">
      <Card className="flex items-center gap-3 p-3.5 active:bg-canvas">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Sprout className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-ink">{activity.farmerName}</p>
          <p className="truncate text-xs text-muted">
            {activity.cropName} · {activity.plotName}
          </p>
          {showDate ? (
            <p className="mt-0.5 text-xs text-muted">{formatDate(activity.date)}</p>
          ) : null}
        </div>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
              ACTIVITY_STYLE[activity.type].chip,
            )}
          >
            {ACTIVITY_LABEL[activity.type]}
          </span>
          {activity.projected ? (
            <span className="text-[10px] text-muted">Planned</span>
          ) : null}
        </span>
      </Card>
    </Link>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-dashed border-line px-3 py-3">
      {(Object.keys(ACTIVITY_STYLE) as ActivityType[]).map((type) => (
        <span key={type} className="flex items-center gap-1.5 text-xs text-muted">
          <span className={cn("size-2 rounded-full", ACTIVITY_STYLE[type].dot)} />
          {ACTIVITY_LABEL[type]}
        </span>
      ))}
      <span className="text-xs text-muted">· Read-only, from crop cycles</span>
    </div>
  );
}
