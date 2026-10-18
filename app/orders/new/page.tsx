"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Content } from "@/components/layout/app-shell";
import { ListSkeleton } from "@/components/ui/misc";
import { SupplyMatching } from "@/components/orders/supply-matching";
import { createOrder } from "@/lib/api/orders";

function NewOrderFlow() {
  const router = useRouter();
  // Optional: pre-filters the crop when arriving from a cycle's "Sell surplus".
  const cropRefId = useSearchParams().get("cropRefId") ?? undefined;

  return (
    <SupplyMatching
      initial={{ cropRefId }}
      cancelHref="/orders"
      onSubmit={async (input) => {
        const order = await createOrder(input);
        router.replace(`/orders/${order.id}`);
      }}
    />
  );
}

export default function NewOrderPage() {
  return (
    <>
      <ScreenHeader
        title="Supply Matching"
        subtitle="Match a buyer's need to available stock"
        backHref="/orders"
      />
      <Content withFooter>
        <Suspense fallback={<ListSkeleton rows={4} />}>
          <NewOrderFlow />
        </Suspense>
      </Content>
    </>
  );
}
