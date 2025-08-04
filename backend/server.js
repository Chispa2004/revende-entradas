const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const saltRounds = 10;



const app = express();


// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));


// Conexión a la base de datos
const db = new sqlite3.Database('./database.db', err => {
  if (err) return console.error(err.message);
  console.log('📦 Conectado a SQLite');
});

// Crear tablas si no existen
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT
  )
`);
db.run(`
  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT,
    ciudad TEXT,
    fecha TEXT,
    precio REAL,
    vendedor_id INTEGER,
    comprador_id INTEGER
  )
`);
db.run(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER,
    entry_id INTEGER,
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Añadir columna 'leido' si no existe
db.run(`ALTER TABLE messages ADD COLUMN leido INTEGER DEFAULT 0`, err => {
  if (err && !err.message.includes('duplicate column name')) {
    console.error('❌ Error al añadir columna leido:', err.message);
  } else if (!err) {
    console.log('✅ Columna leido añadida a messages');
  }
});

// Registro
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    db.run(`INSERT INTO users (name, email, password) VALUES (?, ?, ?)`,
      [name, email, hashedPassword],
      function (err) {
        if (err) return res.status(400).json({ error: 'Correo ya registrado' });
        res.json({ id: this.lastID, name, email });
      });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});


// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, row) => {
    if (err || !row) return res.status(401).json({ error: 'Credenciales inválidas' });

    const match = await bcrypt.compare(password, row.password);
    if (!match) return res.status(401).json({ error: 'Credenciales inválidas' });

    res.json({ id: row.id, name: row.name, email: row.email });
  });
});


// Crear entrada
app.post('/api/entries', (req, res) => {
  const { titulo, ciudad, fecha, precio, vendedor_id } = req.body;
  db.run(`
    INSERT INTO entries (titulo, ciudad, fecha, precio, vendedor_id)
    VALUES (?, ?, ?, ?, ?)`,
    [titulo, ciudad, fecha, precio, vendedor_id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Error al guardar la entrada' });
      res.json({ id: this.lastID });
    });
});

// Obtener todas las entradas
app.get('/api/entries', (req, res) => {
  db.all(`SELECT * FROM entries ORDER BY fecha ASC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al obtener entradas' });
    res.json(rows);
  });
});

// Comprar entrada
app.post('/api/entries/:id/comprar', (req, res) => {
  const entryId = req.params.id;
  const { comprador_id } = req.body;

  db.run(`
    UPDATE entries SET comprador_id = ? WHERE id = ? AND comprador_id IS NULL
  `, [comprador_id, entryId], function (err) {
    if (err) return res.status(500).json({ error: 'Error al comprar' });
    if (this.changes === 0) return res.status(400).json({ error: 'Ya comprada' });
    res.json({ success: true });
  });
});

// Eliminar entrada no vendida
app.delete('/api/entries/:id', (req, res) => {
  const entryId = req.params.id;
  db.run(`DELETE FROM entries WHERE id = ? AND comprador_id IS NULL`,
    [entryId],
    function (err) {
      if (err) return res.status(500).json({ error: 'Error al eliminar' });
      if (this.changes === 0) return res.status(400).json({ error: 'No se puede eliminar' });
      res.json({ success: true });
    });
});

// Obtener perfil
app.get('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  db.get(`SELECT id, name, email FROM users WHERE id = ?`,
    [userId],
    (err, row) => {
      if (err || !row) return res.status(404).json({ error: 'Usuario no encontrado' });
      res.json(row);
    });
});


// Enviar mensaje
app.post('/api/messages', (req, res) => {
  const { sender_id, receiver_id, entry_id, content } = req.body;
  db.run(`
    INSERT INTO messages (sender_id, receiver_id, entry_id, content, leido)
    VALUES (?, ?, ?, ?, 0)
  `, [sender_id, receiver_id, entry_id, content],
  function (err) {
    if (err) return res.status(500).json({ error: 'Error al enviar mensaje' });
    res.json({ id: this.lastID, success: true });
  });
});

// Obtener mensajes de una conversación
app.get('/api/messages/:entryId/:user1/:user2', (req, res) => {
  const { entryId, user1, user2 } = req.params;
  db.all(`
    SELECT * FROM messages
    WHERE entry_id = ?
    AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
    ORDER BY timestamp ASC
  `,
  [entryId, user1, user2, user2, user1],
  (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al obtener mensajes' });
    res.json(rows);
  });
});

// Marcar mensajes como leídos
app.post('/api/messages/marcar-leidos', (req, res) => {
  const { entry_id, sender_id, receiver_id } = req.body;
  db.run(`
    UPDATE messages
    SET leido = 1
    WHERE entry_id = ? AND sender_id = ? AND receiver_id = ? AND leido = 0
  `, [entry_id, sender_id, receiver_id],
  function (err) {
    if (err) return res.status(500).json({ error: 'Error al marcar mensajes como leídos' });
    res.json({ success: true, actualizados: this.changes });
  });
});

// Obtener conversaciones de un usuario con cantidad de no leídos
app.get('/api/conversaciones/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);

  const query = `
    SELECT 
      m.entry_id,
      e.titulo,
      u.id AS otro_usuario_id,
      u.name AS nombre_otro_usuario,
      SUM(CASE WHEN m.receiver_id = ? AND m.leido = 0 THEN 1 ELSE 0 END) AS no_leidos,
      MAX(m.timestamp) AS ultimo_mensaje
    FROM messages m
    JOIN entries e ON e.id = m.entry_id
    JOIN users u ON u.id = 
      CASE 
        WHEN m.sender_id = ? THEN m.receiver_id
        ELSE m.sender_id
      END
    WHERE m.sender_id = ? OR m.receiver_id = ?
    GROUP BY m.entry_id, otro_usuario_id
    ORDER BY ultimo_mensaje DESC
  `;

  db.all(query, [userId, userId, userId, userId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al obtener conversaciones' });
    res.json(rows);
  });
});



// Marcar mensajes como leídos
app.post('/api/messages/marcar-leidos', (req, res) => {
  const { entry_id, user_id } = req.body;
  db.run(`
    UPDATE messages SET leido = 1
    WHERE entry_id = ? AND receiver_id = ? AND leido = 0
  `, [entry_id, user_id], function (err) {
    if (err) return res.status(500).json({ error: 'Error al marcar como leídos' });
    res.json({ updated: this.changes });
  });
});

// Obtener mensajes de una conversación
app.get('/api/messages/:entryId/:user1/:user2', (req, res) => {
  const { entryId, user1, user2 } = req.params;
  db.all(`
    SELECT * FROM messages
    WHERE entry_id = ?
    AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
    ORDER BY timestamp ASC
  `,
  [entryId, user1, user2, user2, user1],
  (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al obtener mensajes' });
    res.json(rows);
  });
});

// Obtener conversaciones de un usuario con mensajes no leídos

// Obtener conversaciones de un usuario (con mensajes no leídos)
app.get('/api/conversaciones/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);

  const query = `
    SELECT 
      m.entry_id,
      e.titulo,
      u.id AS otro_usuario_id,
      u.name AS nombre_otro_usuario,
      SUM(CASE WHEN m.receiver_id = ? AND m.leido = 0 THEN 1 ELSE 0 END) AS no_leidos
    FROM messages m
    JOIN entries e ON e.id = m.entry_id
    JOIN users u ON u.id = 
      CASE 
        WHEN m.sender_id = ? THEN m.receiver_id
        ELSE m.sender_id
      END
    WHERE m.sender_id = ? OR m.receiver_id = ?
    GROUP BY m.entry_id, otro_usuario_id
    ORDER BY MAX(m.timestamp) DESC
  `;

  db.all(query, [userId, userId, userId, userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error al obtener conversaciones' });
    }
    res.json(rows);
  });
});



// Actualizar nombre y correo del usuario
app.put('/api/users/:id', (req, res) => {
  const { name, email } = req.body;
  const userId = req.params.id;

  db.run(
    `UPDATE users SET name = ?, email = ? WHERE id = ?`,
    [name, email, userId],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'El correo ya está registrado.' });
        }
        return res.status(500).json({ error: 'Error al actualizar el usuario' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      res.json({ success: true });
    }
  );
});

app.get('/api/debug/users', (req, res) => {
  db.all(`SELECT * FROM users`, [], (err, rows) => {
    if (err) {
      console.error('❌ Error al obtener usuarios:', err.message);
      return res.status(500).json({ error: 'Error en la base de datos' });
    }
    res.json(rows);
  });
});


// Iniciar servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
});


// Marcar mensajes como leídos
app.post('/api/messages/marcar-leidos', (req, res) => {
  const { entry_id, sender_id, receiver_id } = req.body;

  db.run(`
    UPDATE messages
    SET leido = 1
    WHERE entry_id = ? AND sender_id = ? AND receiver_id = ? AND leido = 0
  `,
  [entry_id, sender_id, receiver_id],
  function (err) {
    if (err) return res.status(500).json({ error: 'Error al marcar mensajes como leídos' });
    res.json({ success: true });
  });
});

// Actualizar entrada
app.put('/api/entries/:id', (req, res) => {
  const { titulo, ciudad, fecha, precio } = req.body;
  const entryId = req.params.id;

  db.run(`
    UPDATE entries
    SET titulo = ?, ciudad = ?, fecha = ?, precio = ?
    WHERE id = ?
  `, [titulo, ciudad, fecha, precio, entryId], function (err) {
    if (err) return res.status(500).json({ error: 'Error al actualizar la entrada' });
    res.json({ success: true });
  });
});

app.get('/api/stats/registrations', (req, res) => {
  db.get(`SELECT COUNT(*) AS count FROM users`, [], (err, row) => {
    if (err) {
      console.error('❌ Error al obtener registros:', err.message);
      return res.status(500).json({ error: 'Error en la base de datos' });
    }
    res.json({ total: row.count });
  });
});

app.get('/api/stats/entradas-publicadas', (req, res) => {
  db.get(`SELECT COUNT(*) AS count FROM entries`, [], (err, row) => {
    if (err) return res.status(500).json({ error: 'Error al contar entradas' });
    res.json({ total: row.count });
  });
});

app.get('/api/stats/entradas-vendidas', (req, res) => {
  db.get(`SELECT COUNT(*) AS count FROM entries WHERE comprador_id IS NOT NULL`, [], (err, row) => {
    if (err) return res.status(500).json({ error: 'Error al contar entradas vendidas' });
    res.json({ total: row.count });
  });
});

app.get('/api/stats/mensajes', (req, res) => {
  db.get(`SELECT COUNT(*) AS count FROM messages`, [], (err, row) => {
    if (err) return res.status(500).json({ error: 'Error al contar mensajes' });
    res.json({ total: row.count });
  });
});

app.get('/api/stats/conversaciones', (req, res) => {
  const query = `
    SELECT COUNT(*) AS count FROM (
      SELECT entry_id,
             CASE 
               WHEN sender_id < receiver_id THEN sender_id || '-' || receiver_id
               ELSE receiver_id || '-' || sender_id
             END AS duo
      FROM messages
      GROUP BY entry_id, duo
    )`;
  db.get(query, [], (err, row) => {
    if (err) return res.status(500).json({ error: 'Error al contar conversaciones' });
    res.json({ total: row.count });
  });
});

