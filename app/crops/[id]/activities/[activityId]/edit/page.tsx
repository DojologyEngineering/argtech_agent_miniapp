"use client";

import { useParams, useRouter } from "next/navigation";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Content } from "@/components/layout/app-shell";
import { ListSkeleton } from "@/components/ui/misc";
import { ActivityForm } from "@/components/crops/activity-form";
import { getActivity, updateActivity } from "@/lib/api/crop-cycles";
import { useQuery } from "@/lib/hooks/use-query";

export default function EditActivityPage() {
  const { id, activityId } = useParams<{ id: string; activityId: string }>();
  const router = useRouter();
  const { data: activity } = useQuery(() => getActivity(id, activityId), [id, activityId]);

  return (
    <>
      <ScreenHeader
        title="Edit Activity"
        subtitle="Update this field activity"
        backHref={`/crops/${id}`}
      />
      <Content withFooter>
        {activity ? (
          <ActivityForm
            activity={activity}
            cancelHref={`/crops/${id}`}
            onSubmit={async (values) => {
              await updateActivity(id, activityId, values);
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
