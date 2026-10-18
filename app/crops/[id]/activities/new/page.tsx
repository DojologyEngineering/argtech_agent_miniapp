"use client";

import { useParams, useRouter } from "next/navigation";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Content } from "@/components/layout/app-shell";
import { ActivityForm } from "@/components/crops/activity-form";
import { addActivity } from "@/lib/api/crop-cycles";

export default function NewActivityPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  return (
    <>
      <ScreenHeader
        title="Add Activity"
        subtitle="Log irrigation or fertilization"
        backHref={`/crops/${id}`}
      />
      <Content withFooter>
        <ActivityForm
          cancelHref={`/crops/${id}`}
          onSubmit={async (values) => {
            await addActivity(id, values);
            router.replace(`/crops/${id}`);
          }}
        />
      </Content>
    </>
  );
}
