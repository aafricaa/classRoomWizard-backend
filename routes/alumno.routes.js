const express = require('express');
const router = express.Router();
const alumnoController = require('../controllers/alumno.controller');

// Obtener todos los alumnos
router.get('/', alumnoController.obtenerAlumnos);

// Crear un nuevo alumno
router.post('/', alumnoController.crearAlumno);

// Después (correcto)
router.get('/clase/:idClase', alumnoController.obtenerAlumnosPorClase);
router.put('/:id', alumnoController.actualizarAlumno);
router.get('/profesor/:id', alumnoController.getAlumnosByProfesor);


module.exports = router;
 