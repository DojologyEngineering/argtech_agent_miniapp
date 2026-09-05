"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Content } from "@/components/layout/app-shell";
import { ListSkeleton } from "@/components/ui/misc";
import { OrderForm } from "@/components/orders/order-form";
import { createOrder } from "@/lib/api/orders";

function NewOrderForm() {
  const router = useRouter();
  const cropCycleId = useSearchParams().get("cropCycleId") ?? undefined;

  return (
    <OrderForm
      defaultCropCycleId={cropCycleId}
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
        title="Create Order"
        subtitle="Raise a purchase order for a harvested crop"
        backHref="/orders"
      />
      <Content withFooter>
        <Suspense fallback={<ListSkeleton rows={4} />}>
          <NewOrderForm />
        </Suspense>
      </Content>
    </>
  );
}
