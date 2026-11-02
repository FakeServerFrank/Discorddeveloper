const express = require('express'), crypto = require('crypto');
const { CLIENT_ID, CLIENT_SECRET, BASE_URL, OWNER_IDS = '' } = process.env;
const owners = OWNER_IDS.split(',').map(s => s.trim()).filter(Boolean);
const REDIRECT = `${BASE_URL}/auth/callback`;
const router = express.Router();

function begin(req, scope, extra = {}) {
  req.session.state = crypto.randomBytes(16).toString('hex');
  return 'https://discord.com/oauth2/authorize?' + new URLSearchParams({
    client_id: CLIENT_ID, redirect_uri: REDIRECT, response_type: 'code',
    scope, state: req.session.state, ...extra });
}
router.get('/auth/login', (req, res) => res.redirect(begin(req, 'identify guilds')));
router.get('/invite', (req, res) => res.redirect(begin(req, 'bot identify guilds', { permissions: '8' })));

router.get('/auth/callback', async (req, res) => {
  try {
    if (!req.query.code || req.query.state !== req.session.state) return res.status(400).send('Estado inválido. Vuelve a intentarlo.');
    const t = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'authorization_code', code: req.query.code, redirect_uri: REDIRECT }),
    }).then(x => x.json());
    if (!t.access_token) return res.status(400).send('No se pudo autenticar con Discord.');
    const H = { Authorization: `Bearer ${t.access_token}` };
    const [u, gs] = await Promise.all([
      fetch('https://discord.com/api/users/@me', { headers: H }).then(x => x.json()),
      fetch('https://discord.com/api/users/@me/guilds', { headers: H }).then(x => x.json()),
    ]);
    const manage = (Array.isArray(gs) ? gs : []).filter(g => g.owner || (BigInt(g.permissions) & 0x28n)).map(g => g.id);
    delete req.session.state;
    req.session.user = { id: u.id, name: u.global_name || u.username,
      avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64` : null,
      isOwner: owners.includes(u.id), manage };
    res.redirect('/');
  } catch (e) { res.status(500).send('Error de autenticación.'); }
});
router.post('/auth/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));

const need = (req, res, next) => req.session.user ? next() : res.status(401).json({ error: 'No autenticado' });
const ownerOnly = (req, res, next) => req.session.user.isOwner ? next() : res.status(403).json({ error: 'Solo el propietario' });
const canManage = (req, id) => req.session.user.isOwner || req.session.user.manage.includes(id);
module.exports = { router, need, ownerOnly, canManage };