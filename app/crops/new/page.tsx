"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Content } from "@/components/layout/app-shell";
import { ListSkeleton } from "@/components/ui/misc";
import { CropCycleForm } from "@/components/crops/crop-cycle-form";
import { createCropCycle } from "@/lib/api/crop-cycles";

function NewCropCycleForm() {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <CropCycleForm
      defaultFarmerId={params.get("farmerId") ?? undefined}
      defaultPlotId={params.get("plotId") ?? undefined}
      cancelHref="/crops"
      onSubmit={async (input) => {
        const cycle = await createCropCycle(input);
        router.replace(`/crops/${cycle.id}`);
      }}
    />
  );
}

export default function NewCropCyclePage() {
  return (
    <>
      <ScreenHeader
        title="Add Crop Cycle"
        subtitle="Log a planting for a farmer's plot"
        backHref="/crops"
      />
      <Content withFooter>
        <Suspense fallback={<ListSkeleton rows={5} />}>
          <NewCropCycleForm />
        </Suspense>
      </Content>
    </>
  );
}
