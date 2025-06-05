require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./config/db");

const claseRoutes = require("./routes/clase.routes");
const alumnoRoutes = require("./routes/alumno.routes");
const authRoutes = require("./routes/auth.routes");
const condicionRoutes = require("./routes/condicion.routes");
const mesasRoutes = require("./routes/mesa.routes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

console.log("Inicializando servidor...");
console.log("Conectando a la base de datos...");

async function intentarConexion(reintentos = 0) {
  try {
    const connection = await db.getConnection();
    connection.release();
    console.log("✅ Conexión exitosa a la BD");
    return true;
  } catch (err) {
    console.error(`❌ Fallo de conexión (${reintentos + 1}/10): ${err.message}`);
    if (reintentos < 9) {
      await new Promise((res) => setTimeout(res, 5000)); // espera 5 segundos
      return intentarConexion(reintentos + 1);
    } else {
      return false;
    }
  }
}

async function iniciarServidor() {
  const conectado = await intentarConexion();
  if (!conectado) {
    console.error("🚫 No se pudo conectar con la base de datos tras varios intentos.");
    process.exit(1);
  }

  // Rutas
  app.get("/", (req, res) => res.send("✅ API funcionando correctamente"));
  app.get("/ping", (req, res) => res.send("pong"));

  app.use("/clases", claseRoutes);
  app.use("/alumnos", alumnoRoutes);
  app.use("/auth", authRoutes);
  app.use("/condiciones", condicionRoutes);
  app.use("/mesas", mesasRoutes);

  // Middleware de errores
  app.use((err, req, res, next) => {
    console.error("❗ Error inesperado:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  });

  process.on("uncaughtException", (err) => {
    console.error("💥 Excepción no controlada:", err);
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("💥 Promesa rechazada no manejada:", reason);
  });

  // Arrancar servidor
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);

    // 🔁 Evita que la base de datos se duerma haciendo un ping cada 4 minutos
    setInterval(async () => {
      try {
        await db.query("SELECT 1");
        console.log("🟢 Ping automático enviado a la base de datos");
      } catch (err) {
        console.error("🔴 Error en el ping automático:", err.message);
      }
    }, 1000 * 60 * 4); // Cada 4 minutos
  });
}

iniciarServidor();
