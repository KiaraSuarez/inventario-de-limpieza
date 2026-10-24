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

// ---------- MOVIMIENTOS: registrar entrada o salida ----------
app.post("/api/movimientos", async (req, res) => {
  const { insumo_codigo, tipo, cantidad, responsable } = req.body;

  // 1) Validar los datos
  const errores = [];
  if (!insumo_codigo) errores.push("Debes elegir un insumo.");
  if (tipo !== "entrada" && tipo !== "salida") {
    errores.push("El tipo debe ser 'entrada' o 'salida'.");
  }
  const cant = Number(cantidad);
  if (!Number.isInteger(cant) || cant <= 0) {
    errores.push("La cantidad debe ser un número entero mayor que 0.");
  }
  if (!responsable || !String(responsable).trim()) {
    errores.push("El responsable es obligatorio.");
  }
  if (errores.length) return res.status(400).json({ errores });

  // 2) Hacerlo todo dentro de una transacción
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Buscar el insumo y bloquearlo mientras trabajamos con él
    const insumo = await client.query(
      "SELECT stock FROM insumos WHERE codigo = $1 FOR UPDATE",
      [insumo_codigo]
    );
    if (insumo.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ errores: ["El insumo no existe."] });
    }

    const stockActual = insumo.rows[0].stock;

    // Regla: no se puede sacar más de lo que hay
    if (tipo === "salida" && cant > stockActual) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        errores: [`Stock insuficiente: hay ${stockActual} y quieres sacar ${cant}.`],
      });
    }

    const nuevoStock = tipo === "entrada" ? stockActual + cant : stockActual - cant;

    await client.query("UPDATE insumos SET stock = $1 WHERE codigo = $2", [nuevoStock, insumo_codigo]);

    const mov = await client.query(
      `INSERT INTO movimientos (insumo_codigo, tipo, cantidad, responsable)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [insumo_codigo, tipo, cant, String(responsable).trim()]
    );

    await client.query("COMMIT");
    res.status(201).json({ movimiento: mov.rows[0], stock_actual: nuevoStock });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ errores: ["Error interno del servidor."] });
  } finally {
    client.release(); // devolver la conexión al grupo
  }
});

// ---------- MOVIMIENTOS: historial (todos, o de un insumo con ?insumo=CODIGO) ----------
app.get("/api/movimientos", async (req, res) => {
  try {
    const { insumo } = req.query;
    const consulta = `
      SELECT m.id, m.insumo_codigo, i.nombre AS insumo_nombre,
             m.tipo, m.cantidad, m.fecha, m.responsable
      FROM movimientos m
      JOIN insumos i ON i.codigo = m.insumo_codigo
      ${insumo ? "WHERE m.insumo_codigo = $1" : ""}
      ORDER BY m.fecha DESC, m.id DESC`;
    const r = await pool.query(consulta, insumo ? [insumo] : []);
    res.json(r.rows);
  } catch (error) {
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

