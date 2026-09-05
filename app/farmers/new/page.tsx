"use client";

import { useRouter } from "next/navigation";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Content } from "@/components/layout/app-shell";
import { FarmerForm } from "@/components/farmers/farmer-form";
import { createFarmer } from "@/lib/api/farmers";

export default function NewFarmerPage() {
  const router = useRouter();

  return (
    <>
      <ScreenHeader title="Add Farmer" subtitle="Register a new farmer" backHref="/farmers" />
      <Content withFooter>
        <FarmerForm
          cancelHref="/farmers"
          onSubmit={async (input) => {
            const farmer = await createFarmer(input);
            router.replace(`/farmers/${farmer.id}`);
          }}
        />
      </Content>
    </>
  );
}
