const express = require("express");
const db = require('./database');
const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/",(req, res) => {
 res.send("¡Servidor de inventario funcionando!");
});

app.get("/Hola",(req, res) => {
 res.send("¡Hola Leandro! Como estas?");
});

app.listen(PORT,() =>{
 console.log("Servidor corriendo en http://localhost:"+PORT);
});

