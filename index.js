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

// ---------- Validación de datos de un insumo ----------
function validarInsumo(d, esNuevo) {
  const errores = [];
  if (esNuevo && (!d.codigo || !String(d.codigo).trim())) {
    errores.push("El código es obligatorio.");
  }
  if (!d.nombre || !String(d.nombre).trim()) {
    errores.push("El nombre es obligatorio.");
  }
  const stock = d.stock === undefined || d.stock === "" ? 0 : Number(d.stock);
  if (!Number.isInteger(stock) || stock < 0) {
    errores.push("El stock debe ser un número entero de 0 o más.");
  }
  const precio = d.precio === undefined || d.precio === "" ? 0 : Number(d.precio);
  if (Number.isNaN(precio) || precio < 0) {
    errores.push("El precio debe ser un número de 0 o más.");
  }
  return errores;
}

// ---------- CREATE: registrar insumo ----------
app.post("/api/insumos", async (req, res) => {
  const errores = validarInsumo(req.body, true);
  if (errores.length) return res.status(400).json({ errores });

  const { codigo, nombre, categoria, unidad, comentario } = req.body;
  const stock = Number(req.body.stock || 0);
  const precio = Number(req.body.precio || 0);

  try {
    const r = await pool.query(
      `INSERT INTO insumos (codigo, nombre, categoria, unidad, stock, precio, comentario)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [String(codigo).trim(), String(nombre).trim(), categoria, unidad, stock, precio, comentario]
    );
    res.status(201).json(r.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ errores: ["Ya existe un insumo con ese código."] });
    }
    console.error(error);
    res.status(500).json({ errores: ["Error interno del servidor."] });
  }
});

// ---------- READ: lista de insumos ----------
app.get("/api/insumos", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM insumos ORDER BY nombre");
    res.json(r.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ errores: ["Error interno del servidor."] });
  }
});

// ---------- READ: un insumo ----------
app.get("/api/insumos/:codigo", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM insumos WHERE codigo = $1", [req.params.codigo]);
    if (r.rowCount === 0) return res.status(404).json({ errores: ["Insumo no encontrado."] });
    res.json(r.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ errores: ["Error interno del servidor."] });
  }
});

// ---------- UPDATE: editar insumo ----------
app.put("/api/insumos/:codigo", async (req, res) => {
  const errores = validarInsumo(req.body, false);
  if (errores.length) return res.status(400).json({ errores });

  const { nombre, categoria, unidad, comentario } = req.body;
  const stock = Number(req.body.stock || 0);
  const precio = Number(req.body.precio || 0);

  try {
    const r = await pool.query(
      `UPDATE insumos
       SET nombre = $1, categoria = $2, unidad = $3, stock = $4, precio = $5, comentario = $6
       WHERE codigo = $7 RETURNING *`,
      [String(nombre).trim(), categoria, unidad, stock, precio, comentario, req.params.codigo]
    );
    if (r.rowCount === 0) return res.status(404).json({ errores: ["Insumo no encontrado."] });
    res.json(r.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ errores: ["Error interno del servidor."] });
  }
});

// ---------- DELETE: eliminar insumo ----------
app.delete("/api/insumos/:codigo", async (req, res) => {
  try {
    const r = await pool.query("DELETE FROM insumos WHERE codigo = $1 RETURNING codigo", [req.params.codigo]);
    if (r.rowCount === 0) return res.status(404).json({ errores: ["Insumo no encontrado."] });
    res.json({ mensaje: "Insumo eliminado." });
  } catch (error) {
    if (error.code === "23503") {
      return res.status(409).json({ errores: ["No se puede eliminar: el insumo tiene movimientos registrados."] });
    }
    console.error(error);
    res.status(500).json({ errores: ["Error interno del servidor."] });
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

