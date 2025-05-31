const express = require('express');
const router = express.Router();
const { registrarUsuario, loginUsuario, cambiarContrasena, recuperarContrasena, cambiarContrasenaSinValidar} = require('../controllers/auth.controller');

router.post('/register', registrarUsuario);
router.post('/login', loginUsuario);
router.post('/cambiar-contrasena', cambiarContrasena);
router.post('/recuperar-contrasena', recuperarContrasena);
router.post('/recuperar-cambiar-contrasena', cambiarContrasenaSinValidar);



module.exports = router;
