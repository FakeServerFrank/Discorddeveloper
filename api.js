const express = require('express');
const bot = require('./bot'), store = require('./store');
const { need, ownerOnly, canManage } = require('./auth');
const api = express.Router();
api.use(need);
api.use(require('./assistant'));

api.get('/me', (q, s) => { const { id, name, avatar, isOwner } = q.session.user; s.json({ id, name, avatar, isOwner }); });
api.get('/status', ownerOnly, (q, s) => s.json(bot.status()));
api.get('/events', ownerOnly, (q, s) => s.json(bot.events()));
api.get('/guilds', (q, s) => s.json(bot.guilds().filter(g => canManage(q, g.id))));
api.post('/bot/:action', ownerOnly, async (q, s) => {
  const fn = { start: bot.start, stop: bot.stop, restart: bot.restart }[q.params.action];
  if (!fn) return s.status(404).json({ error: 'Acción desconocida' });
  try { await fn(); bot.log('info', `${q.session.user.name}: ${q.params.action}`); s.json(bot.status()); }
  catch (e) { s.status(500).json({ error: e.message }); }
});

const guard = (q, s, next) => canManage(q, q.params.id) ? next() : s.status(403).json({ error: 'Sin permisos en este servidor' });
api.get('/guilds/:id', guard, (q, s) => {
  const g = bot.guildDetail(q.params.id);
  g ? s.json(g) : s.status(404).json({ error: 'Servidor no disponible (¿bot offline?)' });
});
api.put('/guilds/:id/welcome', guard, (q, s) => {
  const g = bot.guildDetail(q.params.id);
  if (!g) return s.status(404).json({ error: 'Servidor no disponible' });
  const { enabled, channelId, message } = q.body || {};
  if (typeof enabled !== 'boolean' || typeof message !== 'string' || message.length > 500) return s.status(400).json({ error: 'Datos inválidos' });
  if (enabled && !g.channels.some(c => c.id === channelId)) return s.status(400).json({ error: 'Canal inválido' });
  s.json(store.set(q.params.id, { welcome: { enabled, channelId: channelId || '', message } }));
});
module.exports = api;