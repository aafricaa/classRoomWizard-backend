const db = require('../config/db');
const { promisify } = require('util');
const dbQuery = promisify(db.query).bind(db);

// Crear condición entre alumnos
exports.crearOActualizarCondicionEntreAlumnos = (req, res) => {
  const { idAlumno1, idAlumno2, tipoCondicion } = req.body;

  if (!idAlumno1 || !idAlumno2 || !tipoCondicion) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  const checkQuery = `
    SELECT * FROM condicionentrealumnos
    WHERE (id_alumno_1 = ? AND id_alumno_2 = ?)
       OR (id_alumno_1 = ? AND id_alumno_2 = ?)
  `;

  db.query(checkQuery, [idAlumno1, idAlumno2, idAlumno2, idAlumno1], (err, results) => {
    if (err) {
      console.error("Error al verificar condición:", err);
      return res.status(500).json({ error: "Error al verificar condición existente" });
    }

    if (results.length > 0) {
      // Ya existe, entonces actualizamos
      const condicionExistente = results[0];
      const updateQuery = `
        UPDATE condicionentrealumnos
        SET tipo_condicion = ?
        WHERE id_alumno_1 = ? AND id_alumno_2 = ?
      `;

      db.query(updateQuery, [tipoCondicion, condicionExistente.id_alumno_1, condicionExistente.id_alumno_2], (err) => {
        if (err) {
          console.error("Error al actualizar condición:", err);
          return res.status(500).json({ error: "Error al actualizar condición entre alumnos" });
        }

        return res.status(200).json({ message: "Condición entre alumnos actualizada con éxito" });
      });
    } else {
      // No existe, entonces insertamos
      const insertQuery = `
        INSERT INTO condicionentrealumnos (id_alumno_1, id_alumno_2, tipo_condicion)
        VALUES (?, ?, ?)
      `;

      db.query(insertQuery, [idAlumno1, idAlumno2, tipoCondicion], (err) => {
        if (err) {
          console.error("Error al guardar la condición entre alumnos:", err);
          return res.status(500).json({ error: "Error al guardar la condición entre alumnos" });
        }

        return res.status(201).json({ message: "Condición entre alumnos creada con éxito" });
      });
    }
  });
};


// Crear condición de sitio (preferencia de fila)
exports.crearOActualizarCondicionSitio = async (req, res) => {
  const { idAlumno, tipoCondicion, valor } = req.body;

  if (
    isNaN(parseInt(idAlumno)) ||
    !tipoCondicion || !valor ||
    !['fila'].includes(tipoCondicion.toLowerCase()) // Puedes añadir más tipos si los tienes
  ) {
    return res.status(400).json({ error: "Datos inválidos o tipoCondicion no permitido" });
  }

  try {
    // Verificamos si ya existe una condición de este tipo para el alumno
    const existing = await dbQuery(
      "SELECT * FROM condicionsitio WHERE id_alumno = ? AND tipo_condicion = ?",
      [idAlumno, tipoCondicion.toLowerCase()]
    );

    if (existing.length > 0) {
      // Actualizamos si ya existe
      await dbQuery(
        "UPDATE condicionsitio SET valor = ? WHERE id_alumno = ? AND tipo_condicion = ?",
        [valor, idAlumno, tipoCondicion.toLowerCase()]
      );
      return res.status(200).json({ message: "Condición de sitio actualizada con éxito" });
    } else {
      // Insertamos si no existe
      await dbQuery(
        "INSERT INTO condicionsitio (id_alumno, tipo_condicion, valor) VALUES (?, ?, ?)",
        [idAlumno, tipoCondicion.toLowerCase(), valor]
      );
      return res.status(201).json({ message: "Condición de sitio creada con éxito" });
    }
  } catch (err) {
    console.error("Error al guardar/actualizar la condición de sitio:", err);
    res.status(500).json({ error: "Error interno al guardar/actualizar condición de sitio" });
  }
};

exports.eliminarCondicionEntreAlumnos = async (req, res) => {
  const { idAlumno1, idAlumno2 } = req.body;

  if (!idAlumno1 || !idAlumno2) {
    return res.status(400).json({ error: "Faltan los IDs de los alumnos" });
  }

  try {
    await dbQuery(
      "DELETE FROM condicionentrealumnos WHERE (id_alumno_1 = ? AND id_alumno_2 = ?) OR (id_alumno_1 = ? AND id_alumno_2 = ?)",
      [idAlumno1, idAlumno2, idAlumno2, idAlumno1]
    );

    res.status(200).json({ message: "Condición eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar la condición:", error);
    res.status(500).json({ error: "Error al eliminar la condición entre alumnos" });
  }
};

exports.eliminarCondicionSitio = async (req, res) => {
  const idAlumno = req.params.idAlumno;

  if (!idAlumno) {
    return res.status(400).json({ error: "ID del alumno requerido" });
  }

  try {
    await dbQuery("DELETE FROM condicionsitio WHERE id_alumno = ?", [idAlumno]);
    res.status(200).json({ message: "Condición de sitio eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar condición de sitio:", error);
    res.status(500).json({ error: "Error al eliminar condición de sitio" });
  }
};





