/*
 * 비밀번호 찾기 — 로그인할 수 없는 사람이 부르는 함수라 JWT 검사 없이 열어 두고, 아이디 · 복구 이메일 · 인증번호로 직접 확인한다.
 *  start  { id, email }            등록된 복구 이메일과 맞으면 6자리 인증번호를 메일로(10분, 1분에 한 번, 하루 5번)
 *  finish { id, code, password }   인증번호가 맞으면(5번 틀리면 무효) 새 비밀번호로
 * 메일: 비밀(Secrets)에 RESEND_API_KEY 또는 BREVO_API_KEY, 그리고 MAIL_FROM(보내는 주소) · MAIL_FROM_NAME(선택)
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ID_RE = /^[a-z0-9_]{4,16}$/;
const CODE_TTL = 10 * 60_000;
const RESEND_GAP = 60_000;
const DAILY_MAX = 5;
const TRY_MAX = 5;

async function sha(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sendMail(to: string, code: string, id: string) {
  const from = Deno.env.get('MAIL_FROM');
  const name = Deno.env.get('MAIL_FROM_NAME') || 'KBO 드림 드래프트';
  const subject = `비밀번호 찾기 인증번호 ${code}`;
  const text = `아이디 ${id}\n인증번호 ${code}\n10분 안에 입력\n\n요청하지 않았다면 이 메일은 무시`;
  const html = `<div style="font-family:sans-serif;line-height:1.7"><p>아이디 <b>${id}</b></p>`
    + `<p style="font-size:28px;letter-spacing:6px;font-weight:800">${code}</p><p>10분 안에 입력</p>`
    + `<p style="color:#888;font-size:12px">요청하지 않았다면 이 메일은 무시</p></div>`;
  const resend = Deno.env.get('RESEND_API_KEY');
  const brevo = Deno.env.get('BREVO_API_KEY');
  if (!from || (!resend && !brevo)) { console.error('mail provider not configured'); return false; }
  const r = resend
    ? await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resend}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${name} <${from}>`, to: [to], subject, text, html }),
    })
    : await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': brevo!, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name, email: from }, to: [{ email: to }], subject, textContent: text, htmlContent: html }),
    });
  if (!r.ok) console.error('mail failed', r.status, await r.text());
  return r.ok;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'bad_request' }, 400); }

  const id = String(body.id ?? '').trim().toLowerCase();
  if (!ID_RE.test(id)) return json({ error: 'bad_id' }, 400);
  const { data: prof, error: pErr } = await admin.from('profiles').select('id').eq('login_id', id).maybeSingle();
  if (pErr) console.error('profiles lookup', pErr.message);

  if (body.action === 'start') {
    const email = String(body.email ?? '').trim().toLowerCase();
    // 아이디가 없거나 이메일이 다르면 똑같이 ok — 어느 아이디에 어떤 이메일이 있는지 알려 주지 않는다
    // 까닭은 서버 기록에만(아이디 · 이메일은 남기지 않는다)
    if (!prof) { console.log('start: no_profile'); return json({ ok: true }); }
    const { data: rec, error: rErr } = await admin.from('recovery').select('email').eq('user_id', prof.id).maybeSingle();
    if (rErr) console.error('recovery lookup', rErr.message);
    if (!rec) { console.log('start: no_recovery'); return json({ ok: true }); }
    if (rec.email.toLowerCase() !== email) { console.log('start: email_mismatch'); return json({ ok: true }); }

    const now = Date.now();
    const today = new Date(now).toISOString().slice(0, 10);
    const { data: prev } = await admin.from('recovery_codes').select('sent_at, sent_day, sent_count').eq('user_id', prof.id).maybeSingle();
    if (prev && now - Date.parse(prev.sent_at) < RESEND_GAP) return json({ error: 'wait' }, 429);
    const count = prev && prev.sent_day === today ? prev.sent_count + 1 : 1;
    if (count > DAILY_MAX) return json({ error: 'daily' }, 429);

    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
    const { error } = await admin.from('recovery_codes').upsert({
      user_id: prof.id, code_hash: await sha(`${prof.id}:${code}`), expires_at: new Date(now + CODE_TTL).toISOString(),
      tries: 0, sent_at: new Date(now).toISOString(), sent_day: today, sent_count: count,
    });
    if (error) { console.error(error); return json({ error: 'server' }, 500); }
    if (!(await sendMail(rec.email, code, id))) return json({ error: 'mail' }, 502);
    console.log('start: sent');
    return json({ ok: true });
  }

  if (body.action === 'finish') {
    const code = String(body.code ?? '').trim();
    const pw = String(body.password ?? '');
    if (!/^\d{6}$/.test(code)) return json({ error: 'bad_code' }, 400);
    if (pw.length < 8 || pw.length > 72) return json({ error: 'bad_password' }, 400);
    if (!prof) return json({ error: 'bad_code' }, 400);
    const { data: row } = await admin.from('recovery_codes').select('code_hash, expires_at, tries').eq('user_id', prof.id).maybeSingle();
    if (!row || Date.parse(row.expires_at) < Date.now() || row.tries >= TRY_MAX) return json({ error: 'expired' }, 400);
    if (row.code_hash !== (await sha(`${prof.id}:${code}`))) {
      await admin.from('recovery_codes').update({ tries: row.tries + 1 }).eq('user_id', prof.id);
      return json({ error: 'bad_code' }, 400);
    }
    const { error } = await admin.auth.admin.updateUserById(prof.id, { password: pw });
    if (error) return json({ error: 'update', message: error.message }, 400);
    // 쓴 번호는 바로 무효 — 줄은 남겨 하루 발송 횟수를 센다
    await admin.from('recovery_codes').update({ expires_at: new Date(0).toISOString() }).eq('user_id', prof.id);
    return json({ ok: true });
  }

  return json({ error: 'bad_action' }, 400);
});
