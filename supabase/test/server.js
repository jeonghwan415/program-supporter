// 시험용 가짜 Supabase (auth + REST 일부) — 실제 PostgreSQL에 schema.sql을 올려 RLS까지 그대로 시험
const http = require('http'); const { Pool } = require('pg'); const crypto = require('crypto');
const pool = new Pool({ host: '/tmp', port: 5433, user: 'postgres', database: process.env.DB || 't' });
const PORT = +process.env.PORT || 54321; const TTL = +process.env.TTL || 3600; const CONFIRM = process.env.CONFIRM === '1';
const refresh = new Map(); const log = [];
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (u, ttl) => b64({ alg: 'HS256' }) + '.' + b64({ sub: u.id, email: u.email, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + ttl }) + '.sig';
const parse = t => { try { const p = JSON.parse(Buffer.from(t.split('.')[1], 'base64url')); return p.exp * 1000 > Date.now() ? p : null; } catch (e) { return null; } };
function sess(u) { const r = crypto.randomUUID(); refresh.set(r, u); return { access_token: jwt(u, TTL), token_type: 'bearer', expires_in: TTL, refresh_token: r, user: { id: u.id, email: u.email } }; }
const TABLE_FNS = new Set(['my_centers', 'create_center', 'join_center', 'center_people', 'center_recent']);
async function asUser(claims, fn) {
  const c = await pool.connect();
  try { await c.query('begin'); await c.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)]); await c.query(`set local role ${claims.role}`); const r = await fn(c); await c.query('commit'); return r; }
  catch (e) { await c.query('rollback').catch(() => {}); throw e; } finally { c.release(); }
}
http.createServer(async (req, res) => {
  const send = (st, body) => { res.writeHead(st, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'apikey,authorization,content-type,prefer', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS' }); res.end(body === undefined ? '' : JSON.stringify(body)); };
  if (req.method === 'OPTIONS') return send(204);
  let raw = ''; for await (const ch of req) raw += ch; const body = raw ? JSON.parse(raw) : {};
  const u = new URL(req.url, 'http://x'); const path = u.pathname;
  log.push(req.method + ' ' + path);
  if (process.env.DOWN === '1' || require('fs').existsSync('/tmp/mock_down')) { req.socket.destroy(); return; }
  const tok = (req.headers.authorization || '').replace('Bearer ', ''); const claims = parse(tok);
  try {
    if (path === '/auth/v1/signup') {
      if (!body.password || body.password.length < 6) return send(422, { msg: 'Password should be at least 6 characters' });
      const ex = await pool.query('select 1 from auth.users where email=$1', [body.email]); if (ex.rowCount) return send(422, { msg: 'User already registered' });
      const r = await pool.query('insert into auth.users(email,pw) values($1,$2) returning id,email', [body.email, body.password]);
      return send(200, CONFIRM ? { id: r.rows[0].id, email: body.email } : sess(r.rows[0]));
    }
    if (path === '/auth/v1/token') {
      if (u.searchParams.get('grant_type') === 'password') { const r = await pool.query('select id,email from auth.users where email=$1 and pw=$2', [body.email, body.password]); return r.rowCount ? send(200, sess(r.rows[0])) : send(400, { error: 'invalid_grant', error_description: 'Invalid login credentials' }); }
      const us = refresh.get(body.refresh_token); if (!us) return send(400, { error_description: 'Invalid Refresh Token' }); refresh.delete(body.refresh_token); return send(200, sess(us));
    }
    if (path === '/auth/v1/recover') return send(200, {});
    if (!claims) return send(401, { message: 'JWT expired' });
    if (path === '/auth/v1/user' && req.method === 'PUT') { await pool.query('update auth.users set pw=$1 where id=$2', [body.password, claims.sub]); return send(200, { id: claims.sub }); }
    if (path === '/auth/v1/logout') return send(204);
    const m = path.match(/^\/rest\/v1\/rpc\/(\w+)$/);
    if (m) {
      const names = Object.keys(body); const args = names.map((n, i) => `${n} => $${i + 1}`).join(',');
      const out = await asUser(claims, c => c.query(TABLE_FNS.has(m[1]) ? `select to_jsonb(t) j from public.${m[1]}(${args}) t` : `select to_jsonb(public.${m[1]}(${args})) j`, names.map(n => body[n])));
      return send(200, TABLE_FNS.has(m[1]) ? out.rows.map(r => r.j) : out.rows[0].j);
    }
    if (path === '/rest/v1/center_data' && req.method === 'GET') {
      const q = u.searchParams, w = [], v = [];
      for (const [k, val] of q) { const mm = val.match(/^(eq|gt)\.(.*)$/); if (mm && ['center_id', 'app', 'updated_at'].includes(k)) { v.push(mm[2]); w.push(`${k} ${mm[1] === 'eq' ? '=' : '>'} $${v.length}`); } }
      const sql = `select key,value,updated_at,updated_by,updated_name from center_data ${w.length ? 'where ' + w.join(' and ') : ''} order by updated_at asc, key asc limit ${+q.get('limit') || 1000} offset ${+q.get('offset') || 0}`;
      const out = await asUser(claims, c => c.query(sql, v)); return send(200, out.rows);
    }
    if (path === '/rest/v1/center_data' && req.method === 'POST') {
      await asUser(claims, async c => { for (const r of body) await c.query(`insert into center_data(center_id,app,key,value) values($1,$2,$3,$4) on conflict (center_id,app,key) do update set value=excluded.value`, [r.center_id, r.app, r.key, r.value === null ? null : JSON.stringify(r.value)]); });
      return send(201);
    }
    send(404, { message: 'not found ' + path });
  } catch (e) { send(e.code === '42501' ? 403 : 400, { code: e.code, message: e.message }); }
}).listen(PORT, () => console.log('mock on', PORT));
process.on('SIGUSR2', () => console.log(log.join('\n')));
