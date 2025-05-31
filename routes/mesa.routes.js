const express = require("express");
const router = express.Router();
const mesasController = require("../controllers/mesa.controller");


// Ruta: Obtener mesas por clase
router.get("/:idClase", mesasController.getMesasPorClase);

module.exports = router;
