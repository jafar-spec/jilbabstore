import { Resend } from 'resend';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

// Provide a dummy key during build time if environment variables aren't loaded yet
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_build_purposes');

export async function POST(req) {
  try {
    // 1. Verify Authorization Header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing token' }), { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    
    let decodedToken;
    try {
      if (!adminAuth) throw new Error("Admin SDK not initialized");
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (verifyErr) {
      console.error("Token verification failed:", verifyErr);
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), { status: 401 });
    }

    // 2. Verify user is an admin — not just any logged-in user
    if (!adminDb) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500 });
    }
    const adminDoc = await adminDb.collection('admins').doc(decodedToken.uid).get();
    if (!adminDoc.exists) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), { status: 403 });
    }
    
    const { to, subject, html } = await req.json();

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const data = await resend.emails.send({
      from: 'Jilbab Store <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      html: html,
    });

    return new Response(JSON.stringify({ success: true, data }), { status: 200 });
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
