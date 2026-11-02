require('dotenv').config();
const express = require('express'), session = require('express-session'), helmet = require('helmet');
const crypto = require('crypto'), path = require('path');
const bot = require('./bot'), store = require('./store');
const { PORT = 3000, CLIENT_ID, CLIENT_SECRET, BASE_URL, SESSION_SECRET, OWNER_IDS = '' } = process.env;
const owners = OWNER_IDS.split(',').map(s => s.trim()).filter(Boolean);
if (!CLIENT_ID || !CLIENT_SECRET || !BASE_URL || !SESSION_SECRET || !owners.length) {
  console.error('Configura CLIENT_ID, CLIENT_SECRET, BASE_URL, SESSION_SECRET y OWNER_IDS en .env'); process.exit(1);
}
const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '50kb' }));
app.use(session({
  secret: SESSION_SECRET, resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: BASE_URL.startsWith('https'), maxAge: 7 * 864e5 },
}));
const REDIRECT = `${BASE_URL}/auth/callback`;

// --- Discord OAuth2 ---
app.get('/auth/login', (req, res) => {
  req.session.state = crypto.randomBytes(16).toString('hex');
  const q = new URLSearchParams({ client_id: CLIENT_ID, redirect_uri: REDIRECT, response_type: 'code', scope: 'identify', state: req.session.state });
  res.redirect(`https://discord.com/oauth2/authorize?${q}`);
});
app.get('/auth/callback', async (req, res) => {
  try {
    if (!req.query.code || req.query.state !== req.session.state) return res.status(400).send('Estado inválido. Vuelve a iniciar sesión.');
    const t = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'authorization_code', code: req.query.code, redirect_uri: REDIRECT }),
    }).then(r => r.json());
    if (!t.access_token) return res.status(400).send('No se pudo autenticar con Discord.');
    const u = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${t.access_token}` } }).then(r => r.json());
    if (!owners.includes(u.id)) { bot.log('warn', `Acceso denegado a ${u.username}`); return res.status(403).send('Tu cuenta no está autorizada