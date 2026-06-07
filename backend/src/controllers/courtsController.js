const { getDb } = require('../db/database');

function getAll(req, res) {
  const db = getDb();
  const courts = db.prepare('SELECT * FROM courts WHERE active = 1').all();
  return res.json(courts.map(c => ({ ...c, amenities: JSON.parse(c.amenities || '[]') })));
}

function getById(req, res) {
  const db = getDb();
  const court = db.prepare('SELECT * FROM courts WHERE id = ? AND active = 1').get(req.params.id);
  if (!court) return res.status(404).json({ error: 'Pista no encontrada' });
  return res.json({ ...court, amenities: JSON.parse(court.amenities || '[]') });
}

function create(req, res) {
  const { name, club, zone, address, type, surface, price, image, amenities, description } = req.body;
  if (!name || !club || !zone || !address || !type || !surface || !price)
    return res.status(400).json({ error: 'Faltan campos obligatorios' });

  const db = getDb();
  // Usamos un campo único (name+club) para recuperar tras insert
  db.prepare(`
    INSERT INTO courts (name, club, zone, address, type, surface, price, image, amenities, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, club, zone, address, type, surface, price, image || '', JSON.stringify(amenities || []), description || '');

  // Recuperar la pista recién insertada (última activa con ese nombre y club)
  const court = db.prepare('SELECT * FROM courts WHERE name=? AND club=? ORDER BY id DESC LIMIT 1').get(name, club);
  return res.status(201).json({ ...court, amenities: JSON.parse(court.amenities || '[]') });
}

function update(req, res) {
  const db = getDb();
  const court = db.prepare('SELECT * FROM courts WHERE id = ?').get(req.params.id);
  if (!court) return res.status(404).json({ error: 'Pista no encontrada' });

  const { name, club, zone, address, type, surface, price, image, amenities, description } = req.body;
  db.prepare(`UPDATE courts SET name=?,club=?,zone=?,address=?,type=?,surface=?,price=?,image=?,amenities=?,description=? WHERE id=?`).run(
    name ?? court.name, club ?? court.club, zone ?? court.zone, address ?? court.address,
    type ?? court.type, surface ?? court.surface, price ?? court.price,
    image ?? court.image, JSON.stringify(amenities || JSON.parse(court.amenities || '[]')),
    description ?? court.description, req.params.id
  );

  const updated = db.prepare('SELECT * FROM courts WHERE id = ?').get(req.params.id);
  return res.json({ ...updated, amenities: JSON.parse(updated.amenities || '[]') });
}

function remove(req, res) {
  const db = getDb();
  const court = db.prepare('SELECT * FROM courts WHERE id = ?').get(req.params.id);
  if (!court) return res.status(404).json({ error: 'Pista no encontrada' });
  db.prepare('UPDATE courts SET active = 0 WHERE id = ?').run(req.params.id);
  return res.json({ message: 'Pista eliminada correctamente' });
}

module.exports = { getAll, getById, create, update, remove };
