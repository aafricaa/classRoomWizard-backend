require('dotenv').config();
const express = require("express");
const cors = require("cors");
const db = require("./config/db");

const claseRoutes = require("./routes/clase.routes");
const alumnoRoutes = require("./routes/alumno.routes");
const authRoutes = require("./routes/auth.routes");
const condicionRoutes = require('./routes/condicion.routes');
const mesasRoutes = require("./routes/mesa.routes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Logs de arranque
console.log("Inicializando servidor...");
console.log("Conectando a la base de datos...");

db.connect((err) => {
  if (err) {
    console.error("❌ Error al conectar con la BD:", err);
    process.exit(1); // ⚠️ Detener si la conexión falla
  } else {
    console.log("✅ Conexión exitosa a la BD");

    // Rutas
    app.get("/", (req, res) => res.send("✅ API funcionando correctamente"));
    app.get("/ping", (req, res) => res.send("pong"));

    app.use("/clases", claseRoutes);
    app.use("/alumnos", alumnoRoutes);
    app.use("/auth", authRoutes);
    app.use('/condiciones', condicionRoutes);
    app.use("/mesas", mesasRoutes);

    // Middleware para errores no controlados en rutas
    app.use((err, req, res, next) => {
      console.error("❗ Error inesperado:", err);
      res.status(500).json({ error: "Error interno del servidor" });
    });

    // Captura de errores globales
    process.on('uncaughtException', (err) => {
      console.error("💥 Excepción no controlada:", err);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error("💥 Promesa rechazada no manejada:", reason);
    });

    // ✅ Solo arrancar el servidor si la BD está bien
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  }
});
