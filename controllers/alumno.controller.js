const db = require('../config/db');
const { promisify } = require('util');
const dbQuery = promisify(db.query).bind(db);

exports.obtenerAlumnos = (req, res) => {
  db.query("SELECT * FROM alumno", (err, results) => {
    if (err) return res.status(500).json({ error: "Error al obtener los alumnos" });
    if (results.length === 0) return res.status(200).json({ message: "No hay alumnos en la base de datos" });
    res.status(200).json(results);
  });
};

exports.crearAlumno = (req, res) => {
  const { nombre, idClase, tieneCondiciones } = req.body;

  if (!nombre || !idClase || tieneCondiciones === undefined) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  const query = "INSERT INTO alumno (nombre, id_clase, tiene_condiciones) VALUES (?,?,?)";
  db.query(query, [nombre, idClase, tieneCondiciones], (err, result) => {
    if (err) return res.status(500).json({ error: "Error al guardar el alumno" });
    res.status(201).json({ message: "Alumno creado con éxito", id: result.insertId });
  });
};

// alumnos.controller.js (nuevo método)
exports.obtenerAlumnosPorClase = async (req, res) => {
  const idClase = parseInt(req.params.idClase);
  if (isNaN(idClase)) return res.status(400).json({ error: "ID de clase no válido" });

  try {
    const alumnos = await dbQuery("SELECT * FROM alumno WHERE id_clase = ?", [idClase]);
    res.status(200).json(alumnos);
  } catch (err) {
    console.error("Error al obtener alumnos:", err);
    res.status(500).json({ error: "Error al obtener alumnos de la clase" });
  }
};

// Actualizar alumno
exports.actualizarAlumno = async (req, res) => {
  const idAlumno = parseInt(req.params.id);
  const { nombre, tieneCondiciones } = req.body;

  if (!nombre || typeof tieneCondiciones !== 'boolean') {
    return res.status(400).json({ error: "Nombre y tieneCondiciones son obligatorios y válidos" });
  }

  try {
    const resultado = await dbQuery(
      "UPDATE alumno SET nombre = ?, tiene_condiciones = ? WHERE id_alumno = ?",
      [nombre, tieneCondiciones, idAlumno]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: "Alumno no encontrado" });
    }

    res.status(200).json({ mensaje: "Alumno actualizado correctamente" });
  } catch (err) {
    console.error("Error al actualizar alumno:", err);
    res.status(500).json({ error: "Error al actualizar el alumno" });
  }
};
exports.getAlumnosByProfesor = (req, res) => {
  const idProfesor = req.params.id;

  const query = `
    SELECT a.id_alumno, a.nombre, c.nombre AS nombreClase, c.id_clase AS idClase
    FROM alumno a
    JOIN clase c ON a.id_clase = c.id_clase
    WHERE c.id_profesor = ?
  `;

  db.query(query, [idProfesor], (err, results) => {
    if (err) {
      console.error('Error al recuperar alumnos:', err); 
      return res.status(500).json({ mensaje: 'Error en el servidor' });
    }

    return res.status(200).json(results);
  });
};



