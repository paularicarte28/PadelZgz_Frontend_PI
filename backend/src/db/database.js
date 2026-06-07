const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../padelzgz.db');

let _sqlDb = null;
let db = null;

function persist() {
  if (!_sqlDb) return;
  const data = _sqlDb.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Ejecuta sql y devuelve array de objetos (como .all())
function execQuery(sql, params = []) {
  const stmt = _sqlDb.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Ejecuta INSERT/UPDATE/DELETE y devuelve lastInsertRowid
function execWrite(sql, params = []) {
  _sqlDb.run(sql, params);
  persist();
  // Obtener el rowid justo después del run sobre la misma conexión
  const rows = execQuery('SELECT last_insert_rowid() as rid');
  return { lastInsertRowid: rows[0]?.rid ?? null };
}

function wrapDb() {
  return {
    exec(sql) {
      _sqlDb.run(sql);
      persist();
    },
    prepare(sql) {
      return {
        run(...params) {
          return execWrite(sql, params);
        },
        get(...params) {
          const results = execQuery(sql, params);
          return results[0];
        },
        all(...params) {
          return execQuery(sql, params);
        },
      };
    },
    close() {
      if (_sqlDb) _sqlDb.close();
    },
    pragma() {},
  };
}

function getDb() { return db; }

async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    _sqlDb = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    _sqlDb = new SQL.Database();
  }

  db = wrapDb();

  _sqlDb.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  _sqlDb.run(`CREATE TABLE IF NOT EXISTS courts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, club TEXT NOT NULL, zone TEXT NOT NULL,
    address TEXT NOT NULL, type TEXT NOT NULL, surface TEXT NOT NULL,
    price REAL NOT NULL, rating REAL NOT NULL DEFAULT 0,
    reviews INTEGER NOT NULL DEFAULT 0, image TEXT, amenities TEXT,
    description TEXT, active INTEGER NOT NULL DEFAULT 1
  )`);
  _sqlDb.run(`CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL, court_id INTEGER NOT NULL,
    date TEXT NOT NULL, time_slot TEXT NOT NULL,
    players INTEGER NOT NULL DEFAULT 2,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (court_id) REFERENCES courts(id)
  )`);

  const countRes = execQuery('SELECT COUNT(*) as c FROM users');
  if ((countRes[0]?.c ?? 0) === 0) {
    seedData();
  }

  persist();
  return db;
}

function seedData() {
  const hashAdmin = bcrypt.hashSync('admin123', 10);
  const hashUser  = bcrypt.hashSync('user123', 10);

  execWrite('INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)', ['Admin PadelZGZ','admin@padelzgz.com',hashAdmin,'admin']);
  execWrite('INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)', ['Carlos Martínez','carlos@email.com',hashUser,'user']);
  execWrite('INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)', ['Laura Gómez','laura@email.com',hashUser,'user']);

  const courts = [
    ['Pista 1 - Cristal Indoor','Club Pádel Centro','Centro','C/ Alfonso I, 14','indoor','cristal',14,4.8,132,'https://images.unsplash.com/photo-1599586120429-48281b6f0ece?w=800&q=80',JSON.stringify(['vestuarios','cafetería','parking']),'Pista de cristal cubierta en el centro de Zaragoza.'],
    ['Pista 2 - Outdoor Premium','Club Pádel Centro','Centro','C/ Alfonso I, 14','outdoor','hormigón',10,4.5,89,'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80',JSON.stringify(['vestuarios','cafetería']),'Pista exterior con vistas al jardín.'],
    ['Pista 3 - Moqueta Cubierta','Club Pádel Delicias','Delicias','Av. de Madrid, 112','indoor','moqueta',12,4.6,201,'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80',JSON.stringify(['vestuarios','tienda','parking']),'Moderna pista de moqueta en Delicias.'],
    ['Pista 4 - Hierba Artificial','Club Pádel Gran Vía','Gran Vía','C/ Bilbao, 3','outdoor','césped',11,4.3,67,'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&q=80',JSON.stringify(['vestuarios','cafetería']),'Pista exterior con césped artificial en Gran Vía.'],
    ['Pista 5 - Cristal Actur','Club Pádel Actur','Actur','Av. de Ranillas, 50','indoor','cristal',15,4.9,312,'https://images.unsplash.com/photo-1547347298-4074fc3086f0?w=800&q=80',JSON.stringify(['vestuarios','cafetería','parking','fisioterapeuta']),'La pista mejor valorada de Zaragoza.'],
    ['Pista 6 - Oliver Sport','Club Oliver','Oliver','C/ Compromiso de Caspe, 8','outdoor','hormigón',8,4.1,44,'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',JSON.stringify(['vestuarios','parking']),'Pista económica en el barrio de Oliver.'],
  ];
  for (const c of courts) {
    execWrite('INSERT INTO courts (name,club,zone,address,type,surface,price,rating,reviews,image,amenities,description) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', c);
  }

  execWrite("INSERT INTO reservations (user_id,court_id,date,time_slot,players,status) VALUES (2,1,'2026-06-10','10:30',4,'confirmed')");
  execWrite("INSERT INTO reservations (user_id,court_id,date,time_slot,players,status) VALUES (2,3,'2026-06-12','18:30',2,'confirmed')");
  execWrite("INSERT INTO reservations (user_id,court_id,date,time_slot,players,status) VALUES (3,5,'2026-06-11','09:00',4,'confirmed')");
  execWrite("INSERT INTO reservations (user_id,court_id,date,time_slot,players,status) VALUES (3,2,'2026-06-08','17:00',2,'cancelled')");
  execWrite("INSERT INTO reservations (user_id,court_id,date,time_slot,players,status) VALUES (2,5,'2026-06-15','20:00',2,'confirmed')");
}

module.exports = { getDb, initDb };
