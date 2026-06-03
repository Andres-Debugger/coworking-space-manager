const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123';
const DB_PATH = process.env.DB_PATH || './data/management.db';

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS spaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      price REAL NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
});

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'Token no enviado' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token inválido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ message: 'Token inválido' });
    }
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Se requiere rol Admin' });
  }
  next();
}

app.get('/spaces', verifyToken, (req, res) => {
  db.all('SELECT * FROM spaces', (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows);
  });
});

app.post('/spaces', verifyToken, requireAdmin, (req, res) => {
  const { name, capacity, price } = req.body;
  if (!name || !capacity || !price) {
    return res.status(400).json({ message: 'Faltan datos del espacio' });
  }
  db.run(
    'INSERT INTO spaces (name, capacity, price) VALUES (?, ?, ?)',
    [name, capacity, price],
    function (err) {
      if (err) return res.status(500).json({ message: err.message });
      res.status(201).json({ id: this.lastID, name, capacity, price });
    }
  );
});

app.get('/reports', verifyToken, requireAdmin, (req, res) => {
  db.get('SELECT COUNT(*) as total_spaces FROM spaces', (err, spacesRow) => {
    if (err) return res.status(500).json({ message: err.message });
    db.get('SELECT COUNT(*) as total_invoices, SUM(amount) as total_amount FROM invoices', (err2, invoicesRow) => {
      if (err2) return res.status(500).json({ message: err2.message });
      res.json({
        total_spaces: spacesRow.total_spaces,
        total_invoices: invoicesRow.total_invoices || 0,
        total_income: invoicesRow.total_amount || 0,
      });
    });
  });
});

app.post('/billing', verifyToken, requireAdmin, (req, res) => {
  const { user, amount, description } = req.body;
  if (!user || !amount || !description) {
    return res.status(400).json({ message: 'Faltan datos de facturación' });
  }
  const createdAt = new Date().toISOString();
  db.run(
    'INSERT INTO invoices (user, amount, description, created_at) VALUES (?, ?, ?, ?)',
    [user, amount, description, createdAt],
    function (err) {
      if (err) return res.status(500).json({ message: err.message });
      res.status(201).json({ id: this.lastID, user, amount, description, created_at: createdAt });
    }
  );
});

app.get('/invoices', verifyToken, requireAdmin, (req, res) => {
  db.all('SELECT * FROM invoices ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows);
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const port = 8002;
app.listen(port, () => {
  console.log(`Management service listening on http://0.0.0.0:${port}`);
});
