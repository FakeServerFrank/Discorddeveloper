const express = require('express');
const { ChannelType } = require('discord.js');
const bot = require('./bot'), store = require('./store');
const { canManage } = require('./auth');
const A = require('./actions');
const { AI_BASE_URL, AI_API_KEY, AI_MODEL } = process.env;
const r = express.Router();
const guard = (q, s, next) => canManage(q, q.params.id) ? next() : s.status(403).json({ error: 'Sin permisos en este servidor' });
const last = new Map();

r.put('/guilds/:id/modules', guard, (q, s) => {
  const m = (q.body || {}).modules;
  if (!Array.isArray(m) || !m.every(x => A.MODULES.includes(x))) return s.status(400).json({ error: 'Datos inválidos' });
  s.json(store.set(q.params.id, { modules: [...new Set(m)] }));
});

r.post('/guilds/:id/assistant', guard, async (q, s) => {
  if (!AI_BASE_URL || !AI_API_KEY || !AI_MODEL) return s.status(503).json({ error: 'La IA no está configurada en el servidor' });
  const text = String((q.body || {}).text || '').trim().slice(0, 800);
  if (!text) return s.status(400).json({ error: 'Escribe lo que quieres hacer' });
  const k = q.session.user.id;
  if (Date.now() - (last.get(k) || 0) < 3000) return s.status(429).json({ error: 'Espera unos segundos' });
  last.set(k, Date.now());
  const g = bot.guildDetail(q.params.id), raw = bot.guild(q.params.id);
  if (!g || !raw) return s.status(404).json({ error: 'Servidor no disponible' });
  const cats = raw.channels.cache.filter(c => c.type === ChannelType.GuildCategory).map(c => c.name);
  const system = `Eres el asistente de configuración de un bot de Discord. Responde SOLO con JSON: {"reply":"texto corto en español","actions":[...]}.
Acciones permitidas (nada más existe):
{"type":"create_category","name":"..."}
{"type":"create_channel","name":"...","kind":"text|voice","category":"nombre de categoría o vacío","topic":"opcional","private":false,"roleId":"id de la lista de roles si es privado"}
{"type":"send_message","channel":"nombre o id de canal existente","text":"..."}
{"type":"set_welcome","enabled":true,"channelId":"<id exacto de la lista>","message":"puedes usar {user} y {server}"}
{"type":"enable_module","module":"${A.MODULES.join('|')}"}
Reglas: crea las categorías ANTES que sus canales; máximo ${A.MAX} acciones; no inventes funciones. Moderación (ban/kick), tickets, música y juegos aún NO existen: dilo en reply y no propongas acciones para eso. Los mensajes los envía el bot con su propio nombre. Nunca uses @everyone ni @here.
Canales: ${JSON.stringify(g.channels)}
Categorías: ${JSON.stringify(cats)}
Roles: ${JSON.stringify(g.roles)}`;
  try {
    const res = await fetch(`${AI_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AI_API_KEY}` },
      body: JSON.stringify({ model: AI_MODEL, temperature: 0, messages: [{ role: 'system', content: system }, { role: 'user', content: text }] }),
    });
    const d = await res.json();
    const out = d.choices?.[0]?.message?.content;
    if (!out) { console.error('IA sin respuesta:', JSON.stringify(d).slice(0, 300)); return s.status(502).json({ error: 'La IA no respondió bien: ' + String(d.error?.message || res.status).slice(0, 150) }); }
    const j = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
    const actions = (Array.isArray(j.actions) ? j.actions : []).map(a => A.validate(a, g)).filter(Boolean).slice(0, A.MAX);
    s.json({ reply: String(j.reply || '').slice(0, 600), actions });
  } catch (e) { console.error('Error IA:', e.message); s.status(502).json({ error: 'Error con el proveedor de IA' }); }
});

r.post('/guilds/:id/assistant/apply', guard, async (q, s) => {
  const g = bot.guildDetail(q.params.id);
  if (!g) return s.status(404).json({ error: 'Servidor no disponible' });
  const acts = (Array.isArray((q.body || {}).actions) ? q.body.actions : []).map(a => A.validate(a, g)).filter(Boolean).slice(0, A.MAX);
  try {
    const out = await A.run(g.id, acts);
    bot.log('info', `${q.session.user.name} aplicó ${out.applied}/${acts.length} cambio(s) en ${g.name}`);
    s.json(out);
  } catch (e) { s.status(500).json({ error: e.message }); }
});
module.exports = r;