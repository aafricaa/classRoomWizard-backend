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

// Middlewares
app.use(cors());
app.use(express.json());

// Probar conexión
db.connect((err) => {
  if (err) {
    console.error("Error al conectar con la BD:", err);
  } else {
    console.log("Conexión exitosa a la BD");
  }
});

// Rutas
app.get("/", (req, res) => res.send("API funcionando"));
app.use("/clases", claseRoutes);
app.use("/alumnos", alumnoRoutes);
app.use("/auth", authRoutes);
app.use('/condiciones', condicionRoutes);
app.use("/mesas", mesasRoutes);


// Arrancar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
