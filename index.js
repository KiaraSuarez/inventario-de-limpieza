const express = require("express");
const { pool, iniciarBD } = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("¡Servidor de inventario funcionando!");
});

// Ruta de prueba: pregunta a la base de datos qué hora es
app.get("/api/salud", async (req, res) => {
  try {
    const r = await pool.query("SELECT NOW() AS ahora");
    res.json({ ok: true, ahora: r.rows[0].ahora });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: "No se pudo conectar a la base de datos" });
  }
});

// Primero creamos las tablas, y recién después encendemos el servidor
iniciarBD()
  .then(() => {
    app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
  })
  .catch((error) => {
    console.error("Error al iniciar la base de datos:", error.message);
  });