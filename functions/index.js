const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require('firebase-admin');

admin.initializeApp();

setGlobalOptions({ region: 'europe-west1' });

exports.sendOrderReceiptGen2 = onDocumentCreated('orders/{orderId}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  
  const orderData = snap.data();
  const orderId = event.params.orderId;

  const emailParamsCustomer = {
    service_id: 'service_5juk9zr',
    template_id: 'template_z4cjhn7',
    user_id: 'DE0aqc893NCUM2_kY', // EmailJS Public Key
    template_params: {
      to_email: orderData.customerInfo.email,
      to_name: orderData.customerInfo.fullName,
      order_id: orderId,
      total_amount: orderData.total
    }
  };

  const emailParamsAdmin = {
    service_id: 'service_5juk9zr',
    template_id: 'template_z4cjhn7', // Using the same template to send a copy to the admin
    user_id: 'DE0aqc893NCUM2_kY', 
    template_params: {
      to_email: 'jafar.01.salama@gmail.com',
      to_name: 'Admin (New Order)',
      order_id: orderId,
      total_amount: orderData.total
    }
  };

  try {
    // Send to customer
    const responseCustomer = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailParamsCustomer)
    });

    if (!responseCustomer.ok) {
      const errorText = await responseCustomer.text();
      throw new Error(`EmailJS Customer Error: ${errorText}`);
    }

    // Send to admin
    const responseAdmin = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailParamsAdmin)
    });

    if (!responseAdmin.ok) {
      const errorText = await responseAdmin.text();
      throw new Error(`EmailJS Admin Error: ${errorText}`);
    }

    console.log(`Successfully sent email receipts for order ${orderId}`);
  } catch (error) {
    console.error(`Failed to send email receipt for order ${orderId}:`, error);
  }
});
