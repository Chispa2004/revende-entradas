const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Ruta correcta al frontend
const frontendPath = path.join(__dirname, 'frontend');
app.use(express.static(frontendPath));

// Página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'entradas.html'));
});

// Conexión a la base de datos
const db = new sqlite3.Database('./database.db', err => {
  if (err) return console.error(err.message);
  console.log('📦 Conectado a SQLite');
});

// Aquí irían tus rutas de usuarios, entradas, mensajes, etc.

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});

// GET /api/entries - devuelve todas las entradas
app.get('/api/entries', (req, res) => {
  db.all('SELECT * FROM entries', (err, rows) => {
    if (err) {
      console.error('Error al obtener entradas:', err.message);
      res.status(500).json({ error: 'Error al obtener entradas' });
    } else {
      res.json(rows);
    }
  });
});

