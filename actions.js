const { ChannelType, PermissionFlagsBits: P } = require('discord.js');
const bot = require('./bot'), store = require('./store');
const MODULES = ['welcome', 'moderation', 'tickets', 'levels', 'security', 'entertainment', 'music'];
const txt = (s, n) => String(s ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, n);
const MAX = 25;

function validate(a, g) {
  if (!a || typeof a !== 'object') return null;
  switch (a.type) {
    case 'enable_module':
      return MODULES.includes(a.module) ? { type: a.type, module: a.module } : null;
    case 'set_welcome':
      if (typeof a.enabled === 'boolean' && typeof a.message === 'string' && a.message.length <= 500 &&
        ((a.channelId === '' && !a.enabled) || g.channels.some(c => c.id === a.channelId)))
        return { type: a.type, enabled: a.enabled, channelId: a.channelId, message: a.message };
      return null;
    case 'create_category': {
      const name = txt(a.name, 100); return name ? { type: a.type, name } : null; }
    case 'create_channel': {
      const name = txt(a.name, 100);
      if (!name || !['text', 'voice'].includes(a.kind)) return null;
      return { type: a.type, name, kind: a.kind, category: txt(a.category, 100), topic: txt(a.topic, 300),
        private: a.private === true, roleId: g.roles.some(r => r.id === a.roleId) ? a.roleId : '' };
    }
    case 'send_message': {
      const channel = txt(a.channel, 100), text = String(a.text ?? '').slice(0, 2000);
      return channel && text.trim() ? { type: a.type, channel, text } : null; }
  }
  return null;
}

async function run(guildId, actions) {
  const g = bot.guild(guildId);
  if (!g) throw new Error('Servidor no disponible');
  let ok = 0; const errors = [];
  const cat = n => g.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === n.toLowerCase());
  for (const a of actions) {
    try {
      if (a.type === 'enable_module') {
        const m = store.get(g.id).modules;
        if (!m.includes(a.module)) store.set(g.id, { modules: [...m, a.module] });
      } else if (a.type === 'set_welcome') {
        store.set(g.id, { welcome: { enabled: a.enabled, channelId: a.channelId, message: a.message } });
      } else if (a.type === 'create_category') {
        if (!cat(a.name)) await g.channels.create({ name: a.name, type: ChannelType.GuildCategory });
      } else if (a.type === 'create_channel') {
        const parent = a.category ? cat(a.category) : null;
        if (a.category && !parent) throw new Error(`No existe la categoría "${a.category}"`);
        const text = a.kind === 'text';
        const o = { name: text ? a.name.toLowerCase().replace(/\s+/g, '-') : a.name,
          type: text ? ChannelType.GuildText : ChannelType.GuildVoice, parent: parent?.id };
        if (text && a.topic) o.topic = a.topic;
        if (a.private) o.permissionOverwrites = [
          { id: g.id, deny: [P.ViewChannel] },
          ...(a.roleId ? [{ id: a.roleId, allow: [P.ViewChannel] }] : []),
          { id: g.members.me.id, allow: [P.ViewChannel] }];
        await g.channels.create(o);
      } else if (a.type === 'send_message') {
        const ch = g.channels.cache.get(a.channel) || g.channels.cache.find(c => c.isTextBased() && c.name === a.channel.replace(/^#/, '').toLowerCase());
        if (!ch || !ch.isTextBased()) throw new Error(`Canal no encontrado: ${a.channel}`);
        await ch.send({ content: a.text, allowedMentions: { parse: [] } });
      }
      ok++;
    } catch (e) { errors.push(`${a.type}: ${e.message}`.slice(0, 120)); }
  }
  return { applied: ok, errors };
}
module.exports = { validate, run, MAX, MODULES };