"use client";

import { useParams, useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Content } from "@/components/layout/app-shell";
import { EmptyState, ListSkeleton } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { SupplyMatching } from "@/components/orders/supply-matching";
import { getOrder, updateOrder } from "@/lib/api/orders";
import { useQuery } from "@/lib/hooks/use-query";

export default function EditOrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: order } = useQuery(() => getOrder(id), [id]);

  return (
    <>
      <ScreenHeader
        title="Edit Order"
        subtitle={order ? `${order.code} · ${order.buyer}` : undefined}
        backHref={`/orders/${id}`}
      />
      <Content withFooter>
        {!order ? (
          <ListSkeleton rows={4} />
        ) : order.status === "completed" ? (
          <EmptyState
            icon={Lock}
            title={`${order.code} is completed`}
            description="Completed orders are a record of what was sold and can't be changed."
            action={
              <Button variant="secondary" size="sm" onClick={() => router.replace(`/orders/${id}`)}>
                Back to order
              </Button>
            }
          />
        ) : (
          <SupplyMatching
            excludeOrderId={order.id}
            initial={{
              buyer: order.buyer,
              orderDate: order.orderDate,
              deliveryDate: order.deliveryDate,
              deliveryMethod: order.deliveryMethod,
              status: order.status,
              notes: order.notes,
              allocations: Object.fromEntries(
                order.lineItems.map((item) => [
                  item.cropCycleId,
                  { quantityKg: String(item.quantityKg), pricePerKg: String(item.pricePerKg) },
                ]),
              ),
            }}
            cancelHref={`/orders/${id}`}
            onSubmit={async (input) => {
              await updateOrder(id, input);
              router.replace(`/orders/${id}`);
            }}
          />
        )}
      </Content>
    </>
  );
}
