const express = require('express'); 
const router = express.Router();
const claseController = require('../controllers/clase.controller');

// Obtener todas las clases
router.get('/', claseController.obtenerClases);

// Obtener clase por ID
router.get('/:id', claseController.obtenerClasePorId);

// Obtener clases por profesor
router.get('/profesor/:idProfesor', claseController.obtenerClasesPorProfesor);

// Obtener asignaciones de una clase
router.get('/asignaciones/:idClase', claseController.obtenerAsignacionesPorClase);

// Crear clase en modo rápido
router.post('/rapida', claseController.crearClase);

// Crear clase en modo personalizado
router.post('/personalizada', claseController.crearClasePersonalizada);

// Asignar alumnos con o sin condiciones
router.post('/asignar/:idClase', claseController.asignarAlumnos);

// Actualizar clase
router.put('/:id', claseController.actualizarClase);

// Eliminar clase
router.delete('/:id', claseController.eliminarClase);

router.get('/:idClase/alumnos-condiciones', claseController.obtenerAlumnosConCondiciones);


module.exports = router;
