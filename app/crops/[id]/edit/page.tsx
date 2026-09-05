"use client";

import { useParams, useRouter } from "next/navigation";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Content } from "@/components/layout/app-shell";
import { ListSkeleton } from "@/components/ui/misc";
import { CropCycleForm } from "@/components/crops/crop-cycle-form";
import { getCropCycle, updateCropCycle } from "@/lib/api/crop-cycles";
import { useQuery } from "@/lib/hooks/use-query";

export default function EditCropCyclePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: cycle } = useQuery(() => getCropCycle(id), [id]);

  return (
    <>
      <ScreenHeader
        title={cycle ? cycle.cropName : "Edit Crop Cycle"}
        subtitle={cycle ? `${cycle.varietyType} · ${cycle.plotName}` : undefined}
        backHref={`/crops/${id}`}
        avatarName={cycle?.cropName}
      />
      <Content withFooter>
        {cycle ? (
          <CropCycleForm
            cycle={cycle}
            cancelHref={`/crops/${id}`}
            onSubmit={async (input) => {
              await updateCropCycle(id, input);
              router.replace(`/crops/${id}`);
            }}
          />
        ) : (
          <ListSkeleton rows={5} />
        )}
      </Content>
    </>
  );
}
