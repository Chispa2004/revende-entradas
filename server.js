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

// Servir archivos estáticos desde /frontend
const frontendPath = path.join(__dirname, 'frontend');
app.use(express.static(frontendPath));

// Página de inicio
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'entradas.html'));
});

// Conexión a base de datos SQLite (ubicada en /backend/database.db)
const dbPath = path.join(__dirname, 'backend', 'database.db');
const db = new sqlite3.Database(dbPath, err => {
  if (err) {
    console.error('❌ Error al conectar a la base de datos:', err.message);
  } else {
    console.log('📦 Conectado a SQLite en /backend/database.db');
  }
});

// Ruta para obtener todas las entradas
app.get('/api/entries', (req, res) => {
  db.all('SELECT * FROM entries', (err, rows) => {
    if (err) {
      console.error('❌ Error al obtener entradas:', err.message);
      res.status(500).json({ error: 'Error al obtener entradas' });
    } else {
      res.json(rows);
    }
  });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});

// Ruta para registrar usuarios
app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  // Verificar si el usuario ya existe
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
    if (err) return res.status(500).json({ error: 'Error al verificar usuario' });

    if (row) {
      return res.status(400).json({ error: 'Ya existe un usuario con ese email' });
    }

    // Encriptar contraseña y guardar
    bcrypt.hash(password, saltRounds, (err, hash) => {
      if (err) return res.status(500).json({ error: 'Error al encriptar contraseña' });

      db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hash], function (err) {
        if (err) return res.status(500).json({ error: 'Error al registrar usuario' });

        res.json({ id: this.lastID });
      });
    });
  });
});
