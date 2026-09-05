"use client";

import { useParams, useRouter } from "next/navigation";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Content } from "@/components/layout/app-shell";
import { ListSkeleton } from "@/components/ui/misc";
import { OrderForm } from "@/components/orders/order-form";
import { getOrder, updateOrder } from "@/lib/api/orders";
import { useQuery } from "@/lib/hooks/use-query";

export default function EditOrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: order } = useQuery(() => getOrder(id), [id]);

  return (
    <>
      <ScreenHeader
        title="Edit Purchase Detail"
        subtitle={order ? `${order.code} · ${order.buyer}` : undefined}
        backHref={`/orders/${id}`}
      />
      <Content withFooter>
        {order ? (
          <OrderForm
            order={order}
            cancelHref={`/orders/${id}`}
            onSubmit={async (input) => {
              await updateOrder(id, input);
              router.replace(`/orders/${id}`);
            }}
          />
        ) : (
          <ListSkeleton rows={4} />
        )}
      </Content>
    </>
  );
}
