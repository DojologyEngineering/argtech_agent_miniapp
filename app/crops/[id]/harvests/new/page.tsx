"use client";

import { useParams, useRouter } from "next/navigation";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Content } from "@/components/layout/app-shell";
import { HarvestLogForm } from "@/components/crops/harvest-log-form";
import { addHarvestLogEntry } from "@/lib/api/crop-cycles";

export default function NewHarvestLogEntryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  return (
    <>
      <ScreenHeader
        title="Add Harvest"
        subtitle="Log a picking trip for this crop cycle"
        backHref={`/crops/${id}`}
      />
      <Content withFooter>
        <HarvestLogForm
          cancelHref={`/crops/${id}`}
          onSubmit={async (values) => {
            await addHarvestLogEntry(id, values);
            router.replace(`/crops/${id}`);
          }}
        />
      </Content>
    </>
  );
}
