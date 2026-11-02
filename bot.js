// Gestor del bot de Discord: inicia, detiene, reinicia y expone datos reales.
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const store = require('./store');
let client = null, state = 'offline';
const events = [];
const log = (type, msg) => { events.unshift({ t: Date.now(), type, msg }); events.length = Math.min(events.length, 100); };

async function start() {
  if (client) return;
  if (!process.env.BOT_TOKEN) throw new Error('Falta BOT_TOKEN en .env');
  state = 'starting'; log('info', 'Iniciando bot…');
  const c = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
  c.once('ready', () => { state = 'online'; log('ok', `Conectado como ${c.user.tag}`); });
  c.on('guildCreate', async g => {
    log('info', `Añadido a ${g.name}`);
    const ch = g.systemChannel || g.channels.cache.find(x => x.isTextBased() && x.permissionsFor(g.members.me)?.has('SendMessages'));
    ch?.send(`Gracias por añadir Nexus. Para configurarlo, instala la app: ${process.env.BASE_URL}/download`).catch(() => {});
  });
  c.on('guildDelete', g => log('warn', `Eliminado de ${g.name}`));
  c.on('error', e => log('error', e.message));
  c.on('shardDisconnect', () => { state = 'offline'; log('warn', 'Desconectado de Discord'); });
  c.on('shardResume', () => { state = 'online'; log('ok', 'Conexión restablecida'); });
  c.on('guildMemberAdd', async m => {
    const w = store.get(m.guild.id).welcome;
    if (!w.enabled || !w.channelId) return;
    const ch = m.guild.channels.cache.get(w.channelId);
    if (ch?.isTextBased()) {
      await ch.send(w.message.replaceAll('{user}', `<@${m.id}>`).replaceAll('{server}', m.guild.name).slice(0, 2000))
        .then(() => log('info', `Bienvenida a ${m.user.tag} en ${m.guild.name}`)).catch(e => log('error', e.message));
    }
  });
  client = c;
  try { await c.login(process.env.BOT_TOKEN); }
  catch (e) { client = null; state = 'offline'; log('error', `Login fallido: ${e.message}`); throw e; }
}
async function stop() {
  if (!client) return;
  await client.destroy(); client = null; state = 'offline'; log('warn', 'Bot detenido');
}
async function restart() { await stop(); await start(); }

const ready = () => client && client.isReady();
function status() {
  if (!ready()) return { state, user: null, guilds: 0, users: 0, ping: null, uptime: 0 };
  return {
    state, ping: client.ws.ping, uptime: client.uptime,
    user: { tag: client.user.tag, avatar: client.user.displayAvatarURL({ size: 128 }) },
    guilds: client.guilds.cache.size,
    users: client.guilds.cache.reduce((n, g) => n + g.memberCount, 0),
  };
}
const guilds = () => ready() ? [...client.guilds.cache.values()].map(g => ({
  id: g.id, name: g.name, members: g.memberCount, icon: g.iconURL({ size: 64 }) })) : [];
function guildDetail(id) {
  const g = ready() && client.guilds.cache.get(id);
  if (!g) return null;
  return {
    id: g.id, name: g.name, members: g.memberCount,
    channels: g.channels.cache.filter(c => c.type === ChannelType.GuildText).map(c => ({ id: c.id, name: c.name })),
    roles: g.roles.cache.filter(r => r.id !== g.id).map(r => ({ id: r.id, name: r.name })),
    settings: store.get(id),
  };
}
module.exports = { start, stop, restart, status, guilds, guildDetail, guild: id => ready() ? client.guilds.cache.get(id) : null, events: () => events, log };