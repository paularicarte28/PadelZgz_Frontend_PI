const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');

function register(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });
  if (password.length < 6)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'El email ya está registrado' });

  const hashedPassword = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(name, email, hashedPassword, 'user');

  // Recuperar por email (sql.js no devuelve lastInsertRowid fiable)
  const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE email = ?').get(email);
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
  return res.status(201).json({ user, token });
}

function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Credenciales incorrectas' });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
  const { password: _, ...userWithoutPassword } = user;
  return res.json({ user: userWithoutPassword, token });
}

function getMe(req, res) {
  const db = getDb();
  const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  return res.json(user);
}

module.exports = { register, login, getMe };
