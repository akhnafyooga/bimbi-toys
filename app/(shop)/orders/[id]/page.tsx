import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OrderStatus from "@/components/OrderStatus";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/orders/${id}`);

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.userId !== (session.user as { id: string }).id) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-16">
      <OrderStatus
        orderId={order.id}
        initialOrder={{
          orderNumber: order.orderNumber,
          status: order.status,
          total: order.total,
          fulfillment: order.fulfillment,
        }}
      />
    </div>
  );
}
