import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // In a real application, the payment gateway (e.g., Tranzila, CreditGuard)
    // will send a webhook payload containing the transaction status.
    const { transactionToken, status, orderId, amount } = body;

    // VERIFICATION: Check the gateway signature to ensure the webhook is authentic
    // e.g., using a secret API key or hash signature provided by the gateway

    if (status === 'SUCCESS') {
      console.log(`Payment confirmed for Order ID: ${orderId}. Amount: ₪${amount}`);
      
      // Update order status in the Database
      // await db.orders.update({ where: { id: orderId }, data: { status: 'PAID' }});

      return NextResponse.json({ received: true, status: "Order updated to PAID" });
    } else {
      console.warn(`Payment failed for Order ID: ${orderId}. Reason: ${status}`);
      return NextResponse.json({ received: true, status: "Order marked as FAILED" });
    }

  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook Error" }, { status: 500 });
  }
}
