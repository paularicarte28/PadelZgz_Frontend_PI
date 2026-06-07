require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db/database');

const authRoutes = require('./routes/auth');
const courtsRoutes = require('./routes/courts');
const reservationsRoutes = require('./routes/reservations');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/courts', courtsRoutes);
app.use('/api/reservations', reservationsRoutes);

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

async function start() {
  await initDb();
  if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => console.log(`PadelZGZ API corriendo en http://localhost:${PORT}`));
  }
}

if (process.env.NODE_ENV !== 'test') {
  start();
}

module.exports = app;
module.exports.start = start;
