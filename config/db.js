const mysql = require("mysql2/promise");
require("dotenv").config();

// Crear pool de conexiones
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 10000,
});

pool.getConnection()
  .then(() => {
    console.log("✅ Conexión exitosa a la BD");
  })
  .catch((err) => {
    console.error("❌ Error al conectar con la BD:", err.message);
  });

module.exports = pool;

