import { NextResponse } from 'next/server';
import { parseStringPromise } from 'xml2js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { items, shipping, total, paymentMethod } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Amount in Agorot (multiply by 100) for CG
    const amountInAgorot = Math.round(total * 100);
    const orderId = `ORD-${Math.floor(Math.random() * 90000) + 10000}`;
    
    // Environment Variables
    const CG_USER = process.env.CG_USER;
    const CG_PASSWORD = process.env.CG_PASSWORD;
    const CG_TERMINAL = process.env.CG_TERMINAL;
    const CG_MID = process.env.CG_MID;
    const CG_ENDPOINT = process.env.CG_ENDPOINT;
    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    if (!CG_USER || !CG_ENDPOINT) {
        return NextResponse.json({ error: "CreditGuard configuration missing" }, { status: 500 });
    }

    // Build the XML Request for CreditGuard
    const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
      <ashrait>
          <request>
              <command>doDeal</command>
              <requestId></requestId>
              <version>1001</version>
              <language>HEB</language>
              <doDeal>
                  <terminalNumber>${CG_TERMINAL}</terminalNumber>
                  <cardNo>CGMPI</cardNo>
                  <total>${amountInAgorot}</total>
                  <validation>AutoComm</validation>
                  <creditType>RegularCredit</creditType>
                  <currency>ILS</currency>
                  <transactionCode>Phone</transactionCode>
                  <customerData>
                      <userData1>${orderId}</userData1>
                      <userData2>${shipping.phone1}</userData2>
                  </customerData>
                  <successUrl>${SITE_URL}/checkout/success?txId=${orderId}</successUrl>
                  <errorUrl>${SITE_URL}/checkout/error</errorUrl>
                  <cancelUrl>${SITE_URL}/checkout</cancelUrl>
                  <mpiValidation>
                      <mpiHostedPageUrl>true</mpiHostedPageUrl>
                  </mpiValidation>
              </doDeal>
          </request>
      </ashrait>`;

    // BYPASS FOR TESTING WITHOUT REAL CREDENTIALS
    if (CG_USER === 'cg_user_test') {
        console.log("Using Test Bypass Mode: Simulating successful gateway session.");
        return NextResponse.json({
            success: true,
            orderId: orderId,
            gatewayUrl: `${SITE_URL}/checkout/success?txId=${orderId}`, // Bypass the gateway and go straight to success
            cgUid: `TEST-UID-${Math.random().toString(36).substring(7)}`
        });
    }

    const formData = new URLSearchParams();
    formData.append('user', CG_USER);
    formData.append('password', CG_PASSWORD);
    formData.append('int_in', xmlData);

    console.log("Sending Request to CreditGuard...");

    const cgResponse = await fetch(CG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

    const responseText = await cgResponse.text();
    console.log("CreditGuard Raw Response:", responseText);

    // Parse the XML response
    const result = await parseStringPromise(responseText, { explicitArray: false });
    
    const ashraitResponse = result?.ashrait?.response;

    if (!ashraitResponse) {
        return NextResponse.json({ error: "Invalid response from CreditGuard" }, { status: 500 });
    }

    if (ashraitResponse.resultCode === "000") {
      // Success - Extract Hosted Page URL
      const mpiUrl = ashraitResponse.doDeal?.mpiHostedPageUrl;
      const cgUid = ashraitResponse.doDeal?.cgUid;

      if (!mpiUrl) {
          return NextResponse.json({ error: "No MPI URL returned from CreditGuard" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        orderId: orderId,
        gatewayUrl: mpiUrl,
        cgUid: cgUid
      });

    } else {
      // Failed Request
      console.error("CreditGuard Error:", ashraitResponse.message);
      return NextResponse.json({ 
          error: "Payment Gateway Error", 
          details: ashraitResponse.message || ashraitResponse.userMessage 
      }, { status: 400 });
    }

  } catch (error) {
    console.error("Error creating CG checkout session:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
