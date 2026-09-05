"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Content } from "@/components/layout/app-shell";
import { ListSkeleton } from "@/components/ui/misc";
import { PlotForm } from "@/components/plots/plot-form";
import { createPlot } from "@/lib/api/plots";

function NewPlotForm() {
  const router = useRouter();
  // Optional: pre-selects the farmer when arriving from a farmer's profile.
  const farmerId = useSearchParams().get("farmerId") ?? undefined;

  return (
    <PlotForm
      defaultFarmerId={farmerId}
      cancelHref={farmerId ? `/farmers/${farmerId}` : "/plots"}
      onSubmit={async (input) => {
        const plot = await createPlot(input);
        router.replace(`/plots/${plot.id}`);
      }}
    />
  );
}

export default function NewPlotPage() {
  return (
    <>
      <ScreenHeader title="Add Plot" subtitle="Register a farm plot and trace its boundary" backHref="/plots" />
      <Content withFooter>
        <Suspense fallback={<ListSkeleton rows={4} />}>
          <NewPlotForm />
        </Suspense>
      </Content>
    </>
  );
}
