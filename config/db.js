const mysql = require("mysql2");
require("dotenv").config();

let db;

function connectDB() {
  db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  db.connect((err) => {
    if (err) {
      console.error("❌ Error al conectar con la BD:", err.message);
      setTimeout(connectDB, 5000); // Reintentar en 5 segundos
    } else {
      console.log("✅ Conexión exitosa a la BD");
    }
  });

  // Si se pierde la conexión, se reconecta automáticamente
  db.on("error", (err) => {
    console.error("⚠️ Error de conexión:", err.code);
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      connectDB(); // Reintenta la conexión
    } else {
      throw err;
    }
  });
}

connectDB();

module.exports = db;
