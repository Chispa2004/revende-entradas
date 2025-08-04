const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const app = express();
const PORT = process.env.PORT || 3000; // Compatible con Render

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Ruta absoluta al frontend
const frontendPath = path.resolve(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Redirigir "/" a login.html (o index.html si usas ese)
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'login.html'));
});

// Conexión a la base de datos
const db = new sqlite3.Database('./database.db', err => {
  if (err) return console.error(err.message);
  console.log('📦 Conectado a SQLite');
});

// ... aquí iría todo tu código de rutas y lógica que ya tienes ...
// (usuarios, entradas, mensajes, etc.)
// ✅ Puedes copiar y pegar el resto del contenido de tu server.js justo aquí.

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
