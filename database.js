const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(process.env.DB_NAME || 'inventario.db', (err) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite');
  }
});

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS insumos (
      codigo TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      categoria TEXT,
      unidad TEXT,
      stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      precio REAL DEFAULT 0,
      comentario TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS movimientos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      insumo_codigo TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
      cantidad INTEGER NOT NULL CHECK (cantidad > 0),
      fecha TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      responsable TEXT NOT NULL,
      FOREIGN KEY (insumo_codigo) REFERENCES insumos(codigo)
    )
  `);
});

module.exports = db;