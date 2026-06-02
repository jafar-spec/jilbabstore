import twilio from 'twilio';

// Best-effort E.164 normalization. Local IL mobile (05XXXXXXXX) → +9725XXXXXXXX.
const toE164 = (raw) => {
  const v = String(raw || '').trim().replace(/[\s-]/g, '');
  if (!v) return null;
  if (v.startsWith('+')) return v;
  if (v.startsWith('00')) return '+' + v.slice(2);
  if (v.startsWith('0')) return '+972' + v.slice(1);
  return '+' + v;
};

export async function sendSms(to, body) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM; // your Twilio number, e.g. +1...
  const dest = toE164(to);
  if (!sid || !token || !from || !dest) return { skipped: true };
  try {
    const client = twilio(sid, token);
    await client.messages.create({ to: dest, from, body });
    return { ok: true };
  } catch (e) {
    console.error('SMS failed:', e.message);
    return { error: e.message };
  }
}
