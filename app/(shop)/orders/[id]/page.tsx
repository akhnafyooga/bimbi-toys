import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OrderStatus from "@/components/OrderStatus";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/orders/${id}`);

  const order = await prisma.order.findUnique({ where: { id }, include: { store: true } });
  if (!order || order.userId !== (session.user as { id: string }).id) notFound();

  // Same gate as /api/orders/[id]: for buyer-arranged courier orders the
  // pickup store stays hidden until staff mark the order ready.
  const storeLocked =
    order.fulfillment === "SELF_COURIER" &&
    ["PENDING_PAYMENT", "PAID", "PACKED"].includes(order.status);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-16">
      <OrderStatus
        orderId={order.id}
        initialOrder={{
          orderNumber: order.orderNumber,
          status: order.status,
          total: order.total,
          fulfillment: order.fulfillment,
          store:
            !storeLocked && order.store
              ? { name: order.store.name, address: order.store.address, city: order.store.city }
              : null,
        }}
      />
    </div>
  );
}
