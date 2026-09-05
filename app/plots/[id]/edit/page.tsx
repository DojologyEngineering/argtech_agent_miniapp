"use client";

import { useParams, useRouter } from "next/navigation";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Content } from "@/components/layout/app-shell";
import { ListSkeleton } from "@/components/ui/misc";
import { PlotForm } from "@/components/plots/plot-form";
import { getPlot, updatePlot } from "@/lib/api/plots";
import { useQuery } from "@/lib/hooks/use-query";

export default function EditPlotPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: plot } = useQuery(() => getPlot(id), [id]);

  return (
    <>
      <ScreenHeader
        title={plot ? plot.name : "Edit Plot"}
        subtitle={plot?.farmerName}
        backHref={`/plots/${id}`}
        avatarName={plot?.name}
      />
      <Content withFooter>
        {plot ? (
          <PlotForm
            plot={plot}
            cancelHref={`/plots/${id}`}
            onSubmit={async (input) => {
              await updatePlot(id, input);
              router.replace(`/plots/${id}`);
            }}
          />
        ) : (
          <ListSkeleton rows={4} />
        )}
      </Content>
    </>
  );
}
