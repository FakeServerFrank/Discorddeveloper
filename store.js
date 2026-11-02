// Persistencia JSON con escritura atómica. Cada servidor guarda su propia configuración.
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, 'data', 'db.json');
const DEFAULT = { modules: [], welcome: { enabled: false, channelId: '', message: 'Bienvenido {user} a {server}!' } };
fs.mkdirSync(path.dirname(FILE), { recursive: true });
let db = {};
try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch {}
function save() { fs.writeFileSync(FILE + '.tmp', JSON.stringify(db, null, 2)); fs.renameSync(FILE + '.tmp', FILE); }
module.exports = {
  get: id => { const d = db[id] || {}; return { ...DEFAULT, ...d, welcome: { ...DEFAULT.welcome, ...(d.welcome || {}) } }; },
  set(id, patch) { db[id] = { ...this.get(id), ...patch }; save(); return db[id]; },
};