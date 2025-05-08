require('dotenv').config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const PORT = 3000;

// Permitir peticiones desde otras apps (como Android)
app.use(cors());
app.use(express.json());

// Conexión a la base de datos

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Probar conexión
db.connect(err => {
  if (err) {
    console.error("Error al conectar con la BD:", err);
  } else {
    console.log("Conexión exitosa a la BD");
  }
});

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("API funcionando");
});

//CLASE GET
app.get("/clases", (req, res) => {
  db.query("SELECT * FROM clase", (err, results) => {
    if (err) {
      console.error("Error al obtener clases:", err);
      return res.status(500).json({ error: "Error al obtener las clases" });
    }

    res.status(200).json(results);
  });
});

// POST CLASE
app.post("/nuevaClase", (req, res) => {
  const { nombre, idProfesor, numAlumnos, numMesas } = req.body;

  if (!nombre || !idProfesor || !numAlumnos || !numMesas) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  const queryCheck = "SELECT * FROM clase WHERE nombre = ?";
  db.query(queryCheck, [nombre], (errCheck, resultsCheck) => {
    if (errCheck) {
      console.error("Error al verificar nombre:", errCheck);
      return res.status(500).json({ error: "Error al verificar el nombre de la clase" });
    }

    if (resultsCheck.length > 0) {
      return res.status(409).json({ error: "Ya existe una clase con ese nombre" });
    }

    if (numMesas < numAlumnos) {
      return res.status(400).json({ error: "El número de mesas no puede ser menor que el número de alumnos" });
    }

    const queryClase = "INSERT INTO clase (nombre, id_profesor, num_alumnos, num_mesas) VALUES (?,?,?,?)";
    db.query(queryClase, [nombre, idProfesor, numAlumnos, numMesas], (err, result) => {
      if (err) {
          console.error("Error al insertar la clase:", err);
          return res.status(500).json({ error: "Error al guardar la clase" });
      }

      const idClase = result.insertId;

      // Creamos las mesas con el número correspondiente
      const mesas = Array.from({ length: numMesas }, (_, i) => [idClase, i + 1]); // i + 1 para empezar la numeración desde 1
      const queryMesas = "INSERT INTO mesa (id_clase, numero) VALUES ?";

      db.query(queryMesas, [mesas], (errMesas, resultMesas) => {
          if (errMesas) {
              console.error("Error al crear mesas:", errMesas);
              return res.status(500).json({ error: "Error al crear las mesas" });
          }

          // Aquí ya no necesitamos el idPrimeraMesa porque ahora cada mesa tiene un número asignado
          const idsMesas = Array.from({ length: numMesas }, (_, i) => resultMesas.insertId + i);

          const alumnos = Array.from({ length: numAlumnos }, (_, i) => [`Alumno ${i + 1}`, idClase, false]);
          const queryAlumnos = "INSERT INTO alumno (nombre, id_clase, tiene_condiciones) VALUES ?";

          db.query(queryAlumnos, [alumnos], (errAlumnos, resultAlumnos) => {
              if (errAlumnos) {
                  console.error("Error al insertar alumnos:", errAlumnos);
                  return res.status(500).json({ error: "Error al guardar los alumnos" });
              }

              const idPrimerAlumno = resultAlumnos.insertId;
              const idsAlumnos = Array.from({ length: numAlumnos }, (_, i) => idPrimerAlumno + i);

              const alumnosDesordenados = idsAlumnos.sort(() => Math.random() - 0.5);
              const asignaciones = alumnosDesordenados.map((idAlumno, index) => {
                  const idMesa = idsMesas[index] || null;
                  return [idAlumno, idMesa];
              });

              const queryAsignacion = "INSERT INTO asignacion (id_alumno, id_mesa) VALUES ?";
              db.query(queryAsignacion, [asignaciones], (errAsignacion) => {
                  if (errAsignacion) {
                      console.error("Error al insertar asignaciones:", errAsignacion);
                      return res.status(500).json({ error: "Error al guardar las asignaciones" });
                  }

                  res.status(201).json({ message: "Clase creada con éxito", idClase });
              });
          });
      });
    });
  });
});


//DELETE CLASE
app.delete("/clase/:id", (req, res) => {
  const idClase = req.params.id;

  const eliminarAsignaciones = "DELETE FROM asignacion WHERE id_mesa IN (SELECT id_mesa FROM mesa WHERE id_clase = ?)";
  const eliminarAlumnos = "DELETE FROM alumno WHERE id_clase = ?";
  const eliminarMesas = "DELETE FROM mesa WHERE id_clase = ?";
  const eliminarClase = "DELETE FROM clase WHERE id_clase = ?";

  db.query(eliminarAsignaciones, [idClase], (err) => {
    if (err) return res.status(500).json({ error: "Error al eliminar asignaciones" });

    db.query(eliminarAlumnos, [idClase], (err) => {
      if (err) return res.status(500).json({ error: "Error al eliminar alumnos" });

      db.query(eliminarMesas, [idClase], (err) => {
        if (err) return res.status(500).json({ error: "Error al eliminar mesas" });

        db.query(eliminarClase, [idClase], (err) => {
          if (err) return res.status(500).json({ error: "Error al eliminar clase" });

          res.sendStatus(204);
        });
      });
    });
  });
});

// GET /clases/:id
app.get('/clases/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.query('SELECT * FROM clase WHERE id_clase = ?', [id], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error al obtener la clase' });
    }
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: 'Clase no encontrada' });
    }
  });
});


// PUT /clases/:id
const { promisify } = require('util');
const dbQuery = promisify(db.query).bind(db);

app.put('/clases/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { nombre, numAlumnos, numMesas } = req.body;

  console.log(`Iniciando actualización de clase con ID ${id}...`);

  try {
    // Paso 1: Obtener datos actuales de la clase
    const results = await dbQuery('SELECT num_alumnos, num_mesas FROM clase WHERE id_clase = ?', [id]);

    if (results.length === 0) {
      console.warn('Clase no encontrada');
      return res.status(404).json({ message: 'Clase no encontrada' });
    }

    const oldNumMesas = results[0].num_mesas;
    const oldNumAlumnos = results[0].num_alumnos;
    console.log(`Clase encontrada. Antiguo numMesas: ${oldNumMesas}, antiguo numAlumnos: ${oldNumAlumnos}`);

    // Paso 2: Actualizar clase
    await dbQuery(
      'UPDATE clase SET nombre = ?, id_profesor = 1, num_alumnos = ?, num_mesas = ? WHERE id_clase = ?',
      [nombre, numAlumnos, numMesas, id]
    );
    console.log('Clase actualizada correctamente.');

    // Paso 3: Eliminar mesas sobrantes
    if (numMesas < oldNumMesas) {
      const mesasAEliminar = await dbQuery('SELECT id_mesa FROM mesa WHERE id_clase = ? AND numero > ?', [id, numMesas]);
      if (mesasAEliminar.length > 0) {
        const idsMesas = mesasAEliminar.map(m => m.id_mesa);
        console.log(`Mesas a eliminar: ${idsMesas.join(', ')}`);

        await dbQuery('DELETE FROM asignacion WHERE id_mesa IN (?)', [idsMesas]);
        await dbQuery('DELETE FROM mesa WHERE id_mesa IN (?)', [idsMesas]);
        console.log('Mesas y sus asignaciones eliminadas.');
      } else {
        console.log('No hay mesas que eliminar.');
      }
    }

    // Paso 4: Crear nuevas mesas
    if (numMesas > oldNumMesas) {
      const nuevasMesas = [];
      for (let i = oldNumMesas + 1; i <= numMesas; i++) {
        nuevasMesas.push([i, id]);
      }
      await dbQuery('INSERT INTO mesa (numero, id_clase) VALUES ?', [nuevasMesas]);
      console.log('Nuevas mesas creadas.');
    }

    // Paso 5: Eliminar alumnos sobrantes
    if (numAlumnos < oldNumAlumnos) {
      const alumnosAEliminar = await dbQuery(
        'SELECT id_alumno FROM alumno WHERE id_clase = ? ORDER BY id_alumno DESC LIMIT ?',
        [id, oldNumAlumnos - numAlumnos]
      );
      if (alumnosAEliminar.length > 0) {
        const idsAlumnos = alumnosAEliminar.map(a => a.id_alumno);
        console.log(`Alumnos a eliminar: ${idsAlumnos.join(', ')}`);

        await dbQuery('DELETE FROM asignacion WHERE id_alumno IN (?)', [idsAlumnos]);
        await dbQuery('DELETE FROM alumno WHERE id_alumno IN (?)', [idsAlumnos]);
        console.log('Alumnos y sus asignaciones eliminadas.');
      } else {
        console.log('No hay alumnos que eliminar.');
      }
    }

    // Paso 6: Crear nuevos alumnos si el número ha aumentado
    if (numAlumnos > oldNumAlumnos) {
      const nuevosAlumnos = [];
      const diferencia = numAlumnos - oldNumAlumnos;
      for (let i = 0; i < diferencia; i++) {
        nuevosAlumnos.push([`Alumno ${oldNumAlumnos + i + 1}`, id, false]);
      }
      const resultAlumnos = await dbQuery('INSERT INTO alumno (nombre, id_clase, tiene_condiciones) VALUES ?', [nuevosAlumnos]);
      console.log(`Nuevos alumnos creados: ${nuevosAlumnos.length}`);
    }

    // Paso 7: Reasignar todos los alumnos a las mesas desde cero
    await dbQuery('DELETE FROM asignacion WHERE id_mesa IN (SELECT id_mesa FROM mesa WHERE id_clase = ?)', [id]);
    console.log('Asignaciones anteriores eliminadas.');

    const alumnosActuales = await dbQuery('SELECT id_alumno FROM alumno WHERE id_clase = ?', [id]);
    const mesasActuales = await dbQuery('SELECT id_mesa FROM mesa WHERE id_clase = ?', [id]);

    const idsAlumnos = alumnosActuales.map(a => a.id_alumno);
    const idsMesas = mesasActuales.map(m => m.id_mesa);

    const alumnosDesordenados = idsAlumnos.sort(() => Math.random() - 0.5);
    const asignaciones = alumnosDesordenados.map((idAlumno, index) => {
      const idMesa = idsMesas[index % idsMesas.length];
      return [idAlumno, idMesa];
    });

    await dbQuery('INSERT INTO asignacion (id_alumno, id_mesa) VALUES ?', [asignaciones]);
    console.log('Asignaciones nuevas realizadas correctamente.');

    console.log('Actualización completa.');
    return res.status(200).json({ message: 'Clase y datos relacionados actualizados correctamente' });

  } catch (err) {
    console.error('Error en la actualización:', err);
    return res.status(500).json({ message: 'Error al actualizar clase o datos relacionados' });
  }
});

//GET ASIGNACION CLASE
app.get("/asignaciones/:idClase", (req, res) => {
  const idClase = req.params.idClase;

  const query = `
      SELECT m.id_mesa AS id_mesa, a.nombre AS nombre_alumno
      FROM mesa m
      LEFT JOIN asignacion ag ON ag.id_mesa = m.id_mesa
      LEFT JOIN alumno a ON a.id_alumno = ag.id_alumno
      WHERE m.id_clase = ?
      ORDER BY m.id_mesa DESC
  `;

  db.query(query, [idClase], (err, results) => {
      if (err) {
          console.error("Error al obtener asignaciones:", err);
          return res.status(500).json({ error: "Error al obtener asignaciones" });
      }

      const mesas = results.map(row => ({
          id_mesa: row.id_mesa,
          nombre_alumno: row.nombre_alumno || "Libre"
      }));

      res.json(mesas);
  });
});

  //ALUMNO POST (Crear)
  app.post("/nuevoAlumno", (req, res)=> {
    const {nombre, idClase, tieneCondiciones} = req.body;

    if(!nombre|| !idClase|| !tieneCondiciones){
        return res.status(400).json({error: "Todos los campos son obligatorios"});
    }

    const query = "INSERT INTO alumno (nombre, id_clase, tiene_condiciones) VALUES (?,?,?)";
    db.query(query, [nombre, idClase, tieneCondiciones], (err, result)=>{
        if(err){
            console.error("Error al insertar el alumno:", err);
            return res.status(500).json({error: "Error al guardar el alumno"});
        }
        res.status(201).json({ message: "Alumno creado con éxito", id: result.inserId});
    });
});
  //CLASE 
  app.get("/alumnos", (req, res) => {
    db.query("SELECT * FROM alumno", (err, results) => {
      if (err) {
        console.error("Error al obtener alumnos:", err);
        return res.status(500).json({ error: "Error al obtener los alumnos" });
      }if (results.length === 0) {
        return res.status(200).json({ message: "No hay alumnos en la base de datos" });
      }
      res.status(200).json(results);
    });
  });
// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
