require("dotenv").config();
const { Pool } = require("pg");

// Pool = grupo de conexiones a la base de datos (Neon).
// La dirección secreta viene del archivo .env, nunca va escrita en el código.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Crea las tablas si todavía no existen
async function iniciarBD() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS insumos (
      codigo     TEXT PRIMARY KEY,
      nombre     TEXT NOT NULL,
      categoria  TEXT,
      unidad     TEXT,
      stock      INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      precio     NUMERIC(10,2) DEFAULT 0 CHECK (precio >= 0),
      comentario TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS movimientos (
      id            SERIAL PRIMARY KEY,
      insumo_codigo TEXT NOT NULL REFERENCES insumos(codigo),
      tipo          TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
      cantidad      INTEGER NOT NULL CHECK (cantidad > 0),
      fecha         TIMESTAMP NOT NULL DEFAULT NOW(),
      responsable   TEXT NOT NULL
    )
  `);
}

module.exports = { pool, iniciarBD };