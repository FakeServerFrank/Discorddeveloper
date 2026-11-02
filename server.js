require('dotenv').config();
const express = require('express'), session = require('express-session'), helmet = require('helmet');
const path = require('path');
const bot = require('./bot');
const { PORT = 3000, CLIENT_ID, CLIENT_SECRET, BASE_URL, SESSION_SECRET, OWNER_IDS = '', DOWNLOAD_URL = '', REQUIRE_APP = 'true' } = process.env;
if (!CLIENT_ID || !CLIENT_SECRET || !BASE_URL || !SESSION_SECRET || !OWNER_IDS.trim()) {
  console.error('Configura CLIENT_ID, CLIENT_SECRET, BASE_URL, SESSION_SECRET y OWNER_IDS en .env'); process.exit(1);
}
const requireApp = REQUIRE_APP !== 'false';
const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '50kb' }));
app.use(session({
  secret: SESSION_SECRET, resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: BASE_URL.startsWith('https'), maxAge: 7 * 864e5 },
}));
const inApp = req => (req.get('user-agent') || '').includes('NexusApp') || /(^|; )nexusapp=1/.test(req.get('cookie') || '');
const appOnly = (req, res, next) => (!requireApp || inApp(req)) ? next() : res.status(403).json({ error: 'Usa la app Nexus' });

app.get('/config', (q, s) => s.json({ requireApp }));
app.get('/download', (q, s) => DOWNLOAD_URL ? s.redirect(DOWNLOAD_URL) : s.status(404).send('Descarga aún no disponible.'));
app.use(['/auth/login', '/invite', '/api'], appOnly);
app.use(require('./auth').router);
app.use('/api', require('./api'));
app.use(express.static(path.join(__dirname, 'public')));
app.listen(PORT, () => {
  console.log(`Nexus en ${BASE_URL} (puerto ${PORT})`);
  bot.start().catch(e => console.error('Bot no iniciado:', e.message));
});