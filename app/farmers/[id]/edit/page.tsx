"use client";

import { useParams, useRouter } from "next/navigation";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Content } from "@/components/layout/app-shell";
import { ListSkeleton } from "@/components/ui/misc";
import { FarmerForm } from "@/components/farmers/farmer-form";
import { getFarmer, updateFarmer } from "@/lib/api/farmers";
import { useQuery } from "@/lib/hooks/use-query";

export default function EditFarmerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: farmer } = useQuery(() => getFarmer(id), [id]);

  return (
    <>
      <ScreenHeader
        title={farmer ? farmer.fullName : "Edit Farmer"}
        subtitle={farmer ? farmer.locationLabel : undefined}
        backHref={`/farmers/${id}`}
        avatarName={farmer?.fullName}
      />
      <Content withFooter>
        {farmer ? (
          <FarmerForm
            farmer={farmer}
            cancelHref={`/farmers/${id}`}
            onSubmit={async (input) => {
              await updateFarmer(id, input);
              router.replace(`/farmers/${id}`);
            }}
          />
        ) : (
          <ListSkeleton rows={4} />
        )}
      </Content>
    </>
  );
}
