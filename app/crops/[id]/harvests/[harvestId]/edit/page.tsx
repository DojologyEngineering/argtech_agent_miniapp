"use client";

import { useParams, useRouter } from "next/navigation";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Content } from "@/components/layout/app-shell";
import { ListSkeleton } from "@/components/ui/misc";
import { HarvestLogForm } from "@/components/crops/harvest-log-form";
import { getHarvestLogEntry, updateHarvestLogEntry } from "@/lib/api/crop-cycles";
import { useQuery } from "@/lib/hooks/use-query";

export default function EditHarvestLogEntryPage() {
  const { id, harvestId } = useParams<{ id: string; harvestId: string }>();
  const router = useRouter();
  const { data: entry } = useQuery(() => getHarvestLogEntry(id, harvestId), [id, harvestId]);

  return (
    <>
      <ScreenHeader
        title="Edit Harvest"
        subtitle="Update this picking record"
        backHref={`/crops/${id}`}
      />
      <Content withFooter>
        {entry ? (
          <HarvestLogForm
            entry={entry}
            cancelHref={`/crops/${id}`}
            onSubmit={async (values) => {
              await updateHarvestLogEntry(id, harvestId, values);
              router.replace(`/crops/${id}`);
            }}
          />
        ) : (
          <ListSkeleton rows={2} />
        )}
      </Content>
    </>
  );
}
