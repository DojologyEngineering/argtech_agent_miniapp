import { delay, getState } from "../db";
import { toISODate } from "../format";
import { farmerFullName } from "./farmers";
import type { ActivityType, CalendarActivity, CropCycle } from "../types";

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  planting: "Planting",
  harvesting: "Harvesting",
  irrigation: "Irrigation",
  fertilization: "Fertilization",
};

/**
 * The calendar is read-only: every entry is derived from a crop cycle record,
 * and each badge carries its own real activity type.
 */
export async function listCalendarActivities(): Promise<CalendarActivity[]> {
  const db = getState();
  const today = toISODate(new Date());
  const activities: CalendarActivity[] = [];

  const context = (cycle: CropCycle) => {
    const farmer = db.farmers.find((f) => f.id === cycle.farmerId);
    const plot = db.plots.find((p) => p.id === cycle.plotId);
    return {
      cropCycleId: cycle.id,
      cropName: cycle.cropName,
      plotName: plot?.name ?? "Unassigned",
      farmerName: farmer ? farmerFullName(farmer) : "Unassigned",
    };
  };

  db.cropCycles.forEach((cycle) => {
    const ctx = context(cycle);

    if (cycle.plantingDate) {
      activities.push({
        id: `${cycle.id}:planting`,
        type: "planting",
        date: cycle.plantingDate,
        projected: cycle.plantingDate > today,
        ...ctx,
      });
    }

    // Actual harvest replaces the expected one once it is recorded.
    if (cycle.actualHarvestDate) {
      activities.push({
        id: `${cycle.id}:harvest`,
        type: "harvesting",
        date: cycle.actualHarvestDate,
        projected: false,
        ...ctx,
      });
    } else if (cycle.expectedHarvestDate) {
      activities.push({
        id: `${cycle.id}:harvest-expected`,
        type: "harvesting",
        date: cycle.expectedHarvestDate,
        projected: true,
        ...ctx,
      });
    }

    cycle.activities.forEach((activity) => {
      activities.push({
        id: `${cycle.id}:${activity.id}`,
        type: activity.type,
        date: activity.date,
        projected: activity.date > today,
        ...ctx,
      });
    });
  });

  return delay(activities.sort((a, b) => a.date.localeCompare(b.date)));
}
