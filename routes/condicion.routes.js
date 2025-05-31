const express = require("express");
const router = express.Router();
const condicionesController = require("../controllers/condicion.controller");

// Crear o actualizar condición entre alumnos
router.post("/condicionentrealumnos", condicionesController.crearOActualizarCondicionEntreAlumnos);

// (opcional) eliminar condición
router.post("/condicionentrealumnos/eliminar", condicionesController.eliminarCondicionEntreAlumnos);

// Crear o actualizar condición de sitio (preferencia)
router.post("/condicionsitio", condicionesController.crearOActualizarCondicionSitio);

router.delete("/condicionsitio/:idAlumno", condicionesController.eliminarCondicionSitio);


module.exports = router;
