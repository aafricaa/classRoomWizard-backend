const db = require('../config/db');
const bcrypt = require('bcryptjs');

const registrarUsuario = (req, res) => {
  const { nombre, correo, password, respuestaSeguridad} = req.body;

  if (!nombre || !correo || !password || !respuestaSeguridad) {
    return res.status(400).json({ mensaje: 'Faltan campos obligatorios' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const hashedRespuesta = bcrypt.hashSync(respuestaSeguridad.toLowerCase(), 10);

  const query = 'INSERT INTO profesor (nombre, correo, password, respuesta_seguridad) VALUES (?, ?, ?, ?)';

  db.query(query, [nombre, correo, hashedPassword, hashedRespuesta], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ mensaje: 'Ese correo ya está registrado' });
      }
      return res.status(500).json({ mensaje: 'Error en el servidor' });
    }

   return res.status(201).json({ mensaje: 'Usuario registrado con éxito', id_profesor: result.insertId });
  });
};


const loginUsuario = (req, res) => {
  const { correo, password } = req.body;

  if (!correo || !password) {
    return res.status(400).json({ mensaje: 'Faltan campos' });
  }

  const query = 'SELECT * FROM profesor WHERE correo = ?';
  db.query(query, [correo], (err, results) => {
    if (err) return res.status(500).json({ mensaje: 'Error en el servidor' });

    if (results.length === 0) {
      return res.status(404).json({ mensaje: 'Correo no encontrado' });
    }

    const usuario = results[0];
    const passwordCorrecta = bcrypt.compareSync(password, usuario.password);

    if (!passwordCorrecta) {
      return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
    }

    // Eliminamos la contraseña antes de enviar
    delete usuario.password;
    res.status(200).json(usuario);
  });
};

const cambiarContrasena = (req, res) => {
  const { idProfesor, contrasenaActual, nuevaContrasena } = req.body;

  if (!idProfesor || !contrasenaActual || !nuevaContrasena) {
    return res.status(400).json({ mensaje: 'Faltan datos' });
  }

  const queryBuscar = 'SELECT password FROM profesor WHERE id_profesor = ?';
  db.query(queryBuscar, [idProfesor], (err, results) => {
    if (err) return res.status(500).json({ mensaje: 'Error en el servidor' });

    if (results.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const passwordCorrecta = bcrypt.compareSync(contrasenaActual, results[0].password);
    if (!passwordCorrecta) {
      return res.status(401).json({ mensaje: 'Contraseña actual incorrecta' });
    }

    const nuevaHashed = bcrypt.hashSync(nuevaContrasena, 10);
    const queryUpdate = 'UPDATE profesor SET password = ? WHERE id_profesor = ?';
    db.query(queryUpdate, [nuevaHashed, idProfesor], (err2, result) => {
      if (err2) return res.status(500).json({ mensaje: 'Error al actualizar contraseña' });
      return res.status(200).json({ mensaje: 'Contraseña actualizada correctamente' });
    });
  });
};
const recuperarContrasena = (req, res) => {
  const { correo, respuesta } = req.body;

  if (!correo || !respuesta) {
    return res.status(400).json({ mensaje: 'Faltan datos' });
  }

  const query = 'SELECT id_profesor, respuesta_seguridad FROM profesor WHERE correo = ?';
  db.query(query, [correo], (err, results) => {
    if (err) return res.status(500).json({ mensaje: 'Error en el servidor' });
    if (results.length === 0) return res.status(404).json({ mensaje: 'Correo no encontrado' });

    const hash = results[0].respuesta_seguridad;
    const respuestaValida = bcrypt.compareSync(respuesta.toLowerCase(), hash);

    if (!respuestaValida) {
      return res.status(401).json({ mensaje: 'Respuesta incorrecta' });
    }

    return res.status(200).json({ mensaje: 'Respuesta correcta', idProfesor: results[0].id_profesor });
  });
};
const cambiarContrasenaSinValidar = (req, res) => {
  const { idProfesor, nuevaContrasena } = req.body;

  if (!idProfesor || !nuevaContrasena) {
    return res.status(400).json({ mensaje: 'Faltan datos' });
  }

  const nuevaHashed = bcrypt.hashSync(nuevaContrasena, 10);
  const queryUpdate = 'UPDATE profesor SET password = ? WHERE id_profesor = ?';
  db.query(queryUpdate, [nuevaHashed, idProfesor], (err) => {
    if (err) return res.status(500).json({ mensaje: 'Error al actualizar contraseña' });
    return res.status(200).json({ mensaje: 'Contraseña actualizada correctamente' });
  });
};



module.exports = {
  registrarUsuario,
  loginUsuario,
  cambiarContrasena,
  cambiarContrasenaSinValidar,
  recuperarContrasena
};

