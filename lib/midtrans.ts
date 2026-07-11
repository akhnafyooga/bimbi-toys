import midtransClient from "midtrans-client";
import crypto from "crypto";

// Midtrans is the recommended gateway here: it's the most widely used
// payment aggregator in Indonesia, has a native QRIS payment_type on its
// Core API (works with GoPay, OVO, Dana, ShopeePay, mobile banking — any
// QRIS-compatible app scans the same code), free sandbox for development,
// and straightforward webhook-based status updates.

const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

export const coreApi = new midtransClient.CoreApi({
  isProduction,
  // trim() guards against a stray space/newline accidentally copied into .env
  serverKey: process.env.MIDTRANS_SERVER_KEY?.trim(),
  clientKey: process.env.MIDTRANS_CLIENT_KEY?.trim(),
});

export async function createQrisTransaction(params: {
  orderId: string;
  grossAmount: number;
  customerName: string;
  customerEmail: string;
}) {
  const response = await coreApi.charge({
    payment_type: "qris",
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.grossAmount,
    },
    customer_details: {
      first_name: params.customerName,
      email: params.customerEmail,
    },
    qris: {
      acquirer: "gopay",
    },
  });

  // response.actions contains a "generate-qr-code" action with the QR image URL
  const qrAction = (response.actions as { name: string; url: string }[] | undefined)?.find(
    (a) => a.name === "generate-qr-code"
  );

  return {
    transactionId: response.transaction_id as string,
    qrisUrl: qrAction?.url as string | undefined,
    rawStatus: response.transaction_status as string,
  };
}

export function verifyNotificationSignature(body: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}) {
  const expected = crypto
    .createHash("sha512")
    .update(body.order_id + body.status_code + body.gross_amount + process.env.MIDTRANS_SERVER_KEY)
    .digest("hex");
  return expected === body.signature_key;
}
