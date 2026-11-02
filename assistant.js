const express = require('express');
const bot = require('./bot'), store = require('./store');
const { canManage } = require('./auth');
const { AI_BASE_URL, AI_API_KEY, AI_MODEL } = process.env;
const MODULES = ['welcome', 'moderation', 'tickets', 'levels', 'security'];
const r = express.Router();
const guard = (q, s, next) => canManage(q, q.params.id) ? next() : s.status(403).json({ error: 'Sin permisos en este servidor' });
const last = new Map();

// El servidor revisa cada acción: la IA solo puede pedir lo que está en esta lista.
function validate(a, g) {
  if (!a || typeof a !== 'object') return null;
  if (a.type === 'enable_module' && MODULES.includes(a.module)) return { type: a.type, module: a.module };
  if (a.type === 'set_welcome' && typeof a.enabled === 'boolean' && typeof a.message === 'string' && a.message.length <= 500
    && ((a.channelId === '' && !a.enabled) || g.channels.some(c => c.id === a.channelId)))
    return { type: a.type, enabled: a.enabled, channelId: a.channelId, message: a.message };
  return null;
}

r.put('/guilds/:id/modules', guard, (q, s) => {
  const m = (q.body || {}).modules;
  if (!Array.isArray(m) || !m.every(x => MODULES.includes(x))) return s.status(400).json({ error: 'Datos inválidos' });
  s.json(store.set(q.params.id, { modules: [...new Set(m)] }));
});

r.post('/guilds/:id/assistant', guard, async (q, s) => {
  if (!AI_BASE_URL || !AI_API_KEY || !AI_MODEL) return s.status(503).json({ error: 'La IA no está configurada en el servidor' });
  const text = String((q.body || {}).text || '').trim().slice(0, 500);
  if (!text) return s.status(400).json({ error: 'Escribe lo que quieres hacer' });
  const k = q.session.user.id;
  if (Date.now() - (last.get(k) || 0) < 3000) return s.status(429).json({ error: 'Espera unos segundos' });
  last.set(k, Date.now());
  const g = bot.guildDetail(q.params.id);
  if (!g) return s.status(404).json({ error: 'Servidor no disponible' });
  const system = `Eres el asistente de configuración de un bot de Discord. Responde SOLO con JSON: {"reply":"texto corto en español","actions":[...]}.
Acciones permitidas:
{"type":"enable_module","module":"welcome|moderation|tickets|levels|security"}
{"type":"set_welcome","enabled":true,"channelId":"<id exacto de la lista>","message":"texto; puedes usar {user} y {server}"}
Si lo pedido no es posible con estas acciones, devuelve actions vacío y explícalo en reply.
Canales: ${JSON.stringify(g.channels)}`;
  try {
    const res = await fetch(`${AI_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AI_API_KEY}` },
      body: JSON.stringify({ model: AI_MODEL, temperature: 0, messages: [{ role: 'system', content: system }, { role: 'user', content: text }] }),
    });
    const d = await res.json();
    const raw = d.choices?.[0]?.message?.content;
    if (!raw) { console.error('IA sin respuesta:', JSON.stringify(d).slice(0, 300)); return s.status(502).json({ error: 'La IA no respondió bien' }); }
    const j = JSON.parse(raw.replace(/```json|```/g, '').trim());
    const actions = (Array.isArray(j.actions) ? j.actions : []).map(a => validate(a, g)).filter(Boolean).slice(0, 5);
    s.json({ reply: String(j.reply || '').slice(0, 500), actions });
  } catch (e) { console.error('Error IA:', e.message); s.status(502).json({ error: 'Error con el proveedor de IA' }); }
});

r.post('/guilds/:id/assistant/apply', guard, (q, s) => {
  const g = bot.guildDetail(q.params.id);
  if (!g) return s.status(404).json({ error: 'Servidor no disponible' });
  const acts = (Array.isArray((q.body || {}).actions) ? q.body.actions : []).map(a => validate(a, g)).filter(Boolean).slice(0, 5);
  for (const a of acts) {
    if (a.type === 'enable_module') { const m = store.get(g.id).modules; if (!m.includes(a.module)) store.set(g.id, { modules: [...m, a.module] }); }
    else store.set(g.id, { welcome: { enabled: a.enabled, channelId: a.channelId, message: a.message } });
  }
  bot.log('info', `${q.session.user.name} aplicó ${acts.length} cambio(s) del asistente en ${g.name}`);
  s.json({ applied: acts.length });
});
module.exports = r;