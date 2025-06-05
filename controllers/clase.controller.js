const db = require('../config/db');
const { promisify } = require('util');
const dbQuery = promisify(db.query).bind(db);

// --- FUNCIONES REUTILIZABLES ---

const crearMesas = async (idClase, numMesas) => {
  const columnas = 4; // número de columnas por fila
  const mesas = Array.from({ length: numMesas }, (_, i) => {
    const fila = Math.floor(i / columnas) + 1;   // empieza en 1
    const columna = (i % columnas) + 1;          // de 1 a 4
    const zona = 'normal';
    const numero = i + 1;                        // número de mesa (desde 1)
    return [idClase, numero, fila, columna, zona];
  });

  await dbQuery("INSERT INTO mesa (id_clase, numero, fila, columna, zona) VALUES ?", [mesas]);
};


const crearAlumnos = async (idClase, numAlumnos, conCondiciones = false) => {
  const alumnos = Array.from({ length: numAlumnos }, (_, i) => [`Alumno ${i + 1}`, idClase, conCondiciones]);
  const result = await dbQuery("INSERT INTO alumno (nombre, id_clase, tiene_condiciones) VALUES ?", [alumnos]);
  return Array.from({ length: numAlumnos }, (_, i) => result.insertId + i);
};

const asignarAleatoriamente = async (idsAlumnos, idClase) => {
  const mesas = await dbQuery("SELECT id_mesa FROM mesa WHERE id_clase = ?", [idClase]);
  const idsMesas = mesas.map(m => m.id_mesa);
  const mezclados = idsAlumnos.sort(() => Math.random() - 0.5);
  const asignaciones = mezclados.map((idAlumno, index) => [idAlumno, idsMesas[index]]);
  await dbQuery("INSERT INTO asignacion (id_alumno, id_mesa) VALUES ?", [asignaciones]);
};

const crearClaseBase = async (nombre, idProfesor, alumnos, mesas) => {
  const result = await dbQuery("INSERT INTO clase (nombre, id_profesor, num_alumnos, num_mesas) VALUES (?,?,?,?)",
    [nombre, idProfesor, alumnos, mesas]);
  return result.insertId;
};

// --- CONTROLADORES PRINCIPALES ---

exports.obtenerClases = async (req, res) => {
  try {
    const clases = await dbQuery("SELECT * FROM clase");
    res.status(200).json(clases);
  } catch {
    res.status(500).json({ error: "Error al obtener las clases" });
  }
};

exports.obtenerClasesPorProfesor = async (req, res) => {
  const idProfesor = parseInt(req.params.idProfesor);
  if (!idProfesor) return res.status(400).json({ error: "ID de profesor no válido" });

  try {
    const clases = await dbQuery("SELECT * FROM clase WHERE id_profesor = ?", [idProfesor]);
    res.status(200).json(clases);
  } catch {
    res.status(500).json({ error: "Error al obtener clases del profesor" });
  }
};

exports.obtenerClasePorId = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const rows = await dbQuery("SELECT * FROM clase WHERE id_clase = ?", [id]);
    if (rows.length > 0) res.json(rows[0]);
    else res.status(404).json({ message: "Clase no encontrada" });
  } catch {
    res.status(500).json({ message: "Error al obtener la clase" });
  }
};

exports.obtenerAsignacionesPorClase = async (req, res) => {
  const idClase = parseInt(req.params.idClase);
  const idProfesor = req.query.idProfesor ? parseInt(req.query.idProfesor) : null;

  if (isNaN(idClase)) return res.status(400).json({ error: "ID de clase no válido" });

  try {
   let query = `
  SELECT 
    m.id_mesa,
    m.numero AS numeroMesa,
    m.fila,
    m.columna,
    COALESCE(al.nombre, 'Libre') AS nombreAlumno
  FROM mesa m
  LEFT JOIN asignacion a ON m.id_mesa = a.id_mesa
  LEFT JOIN alumno al ON a.id_alumno = al.id_alumno
  JOIN clase c ON m.id_clase = c.id_clase
  WHERE m.id_clase = ?
`;


    const params = [idClase];
    if (idProfesor) {
      query += " AND c.id_profesor = ?";
      params.push(idProfesor);
    }

    query += " ORDER BY m.numero ASC";
    const resultados = await dbQuery(query, params);
    res.status(200).json(resultados);
  } catch (error) {
    console.error("Error al obtener asignaciones:", error);
    res.status(500).json({ error: "Error al obtener las asignaciones de la clase" });
  }
};

exports.crearClase = async (req, res) => {
  const { nombre, idProfesor, numAlumnos, numMesas } = req.body;

  if (!nombre || !idProfesor || !numAlumnos || !numMesas) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  const alumnos = parseInt(numAlumnos);
  const mesas = parseInt(numMesas);

  // Validación básica
  if (isNaN(alumnos) || isNaN(mesas) || mesas < alumnos) {
    return res.status(400).json({ error: "Datos inválidos" });
  }

  // 👉 Nuevos límites máximos
  const MAX_ALUMNOS = 50;
  const MAX_MESAS = 60;

  if (alumnos > MAX_ALUMNOS || mesas > MAX_MESAS) {
    return res.status(400).json({
      error: `No puedes crear más de ${MAX_ALUMNOS} alumnos ni más de ${MAX_MESAS} mesas`
    });
  }

  try {
    const existe = await dbQuery("SELECT * FROM clase WHERE nombre = ? AND id_profesor = ?", [nombre, idProfesor]);
    if (existe.length > 0) return res.status(409).json({ error: "Ya tienes una clase con ese nombre" });


   const idClase = await crearClaseBase(nombre, idProfesor, alumnos, mesas);
await crearMesas(idClase, mesas);
    const idsAlumnos = await crearAlumnos(idClase, alumnos, false);
    await asignarAleatoriamente(idsAlumnos, idClase);

   const clase = await dbQuery("SELECT * FROM clase WHERE id_clase = ?", [idClase]);
res.status(201).json(clase[0]);
  } catch (err) {
    console.error("Error en crearClase:", err);
    res.status(500).json({ error: "Error al crear la clase" });
  }
};

exports.crearClasePersonalizada = async (req, res) => {
  const { nombre, idProfesor, numAlumnos, numMesas } = req.body;

  if (!nombre || !idProfesor || !numAlumnos || !numMesas) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  const alumnos = parseInt(numAlumnos);
  const mesas = parseInt(numMesas);

  // Validación básica
  if (isNaN(alumnos) || isNaN(mesas) || mesas < alumnos) {
    return res.status(400).json({ error: "Datos inválidos" });
  }

  // 👉 Nuevos límites máximos
  const MAX_ALUMNOS = 50;
  const MAX_MESAS = 60;

  if (alumnos > MAX_ALUMNOS || mesas > MAX_MESAS) {
    return res.status(400).json({
      error: `No puedes crear más de ${MAX_ALUMNOS} alumnos ni más de ${MAX_MESAS} mesas`
    });
  }

  try {
    const existe = await dbQuery("SELECT * FROM clase WHERE nombre = ? AND id_profesor = ?", [nombre, idProfesor]);
    if (existe.length > 0) return res.status(409).json({ error: "Ya tienes una clase con ese nombre" });

    const idClase = await crearClaseBase(nombre, idProfesor, alumnos, mesas);
    await crearMesas(idClase, mesas);

    const clase = await dbQuery("SELECT * FROM clase WHERE id_clase = ?", [idClase]);
res.status(201).json(clase[0]);

  } catch (err) {
    console.error("Error en crearClasePersonalizada:", err);
    res.status(500).json({ error: "Error al crear la clase personalizada" });
  }
};
// Lógica corregida para aplicar condiciones con prioridad:
exports.asignarAlumnos = async (req, res) => {
  const idClase = parseInt(req.params.idClase);
  if (isNaN(idClase)) return res.status(400).json({ error: "ID de clase no válido" });

  try {
    const alumnos = await dbQuery("SELECT id_alumno, tiene_condiciones FROM alumno WHERE id_clase = ?", [idClase]);
    const hayCondiciones = alumnos.some(a => a.tiene_condiciones);
    const idsAlumnos = alumnos.map(a => a.id_alumno);

    await dbQuery("DELETE FROM asignacion WHERE id_mesa IN (SELECT id_mesa FROM mesa WHERE id_clase = ?)", [idClase]);

    if (!hayCondiciones) {
      await asignarAleatoriamente(idsAlumnos, idClase);
      return res.status(200).json({ message: "Asignación aleatoria realizada" });
    }

    const condicionesEntre = await dbQuery(`SELECT * FROM condicionentrealumnos WHERE id_alumno_1 IN (?) OR id_alumno_2 IN (?)`, [idsAlumnos, idsAlumnos]);
    const condicionesSitio = await dbQuery(`SELECT * FROM condicionsitio WHERE id_alumno IN (?)`, [idsAlumnos]);
    const mesas = await dbQuery(`SELECT * FROM mesa WHERE id_clase = ? ORDER BY fila ASC, columna ASC`, [idClase]);

    const condicionesPorAlumno = {};
    idsAlumnos.forEach(id => {
      condicionesPorAlumno[id] = {
        filaPreferida: null,
        juntosCon: [],
        separadosDe: []
      };
    });

    for (const c of condicionesEntre) {
      if (c.tipo_condicion === 'junto') {
        condicionesPorAlumno[c.id_alumno_1].juntosCon.push(c.id_alumno_2);
        condicionesPorAlumno[c.id_alumno_2].juntosCon.push(c.id_alumno_1);
      } else if (c.tipo_condicion === 'separado') {
        condicionesPorAlumno[c.id_alumno_1].separadosDe.push(c.id_alumno_2);
        condicionesPorAlumno[c.id_alumno_2].separadosDe.push(c.id_alumno_1);
      }
    }

    for (const c of condicionesSitio) {
      const fila = parseInt(String(c.valor).trim());
      if (!isNaN(fila)) condicionesPorAlumno[c.id_alumno].filaPreferida = fila;
    }

    const asignaciones = [];
    const asignados = new Set();
    let mesasDisponibles = [...mesas];

    const mismaPareja = (m1, m2) => m1.fila === m2.fila && ((m1.columna <= 2 && m2.columna <= 2) || (m1.columna >= 3 && m2.columna >= 3));

    // 1. Separar alumnos con condición 'separado', intentando cumplir también preferencia de fila
for (const id of idsAlumnos) {
  if (asignados.has(id)) continue;
  const separados = condicionesPorAlumno[id].separadosDe;

  for (const otro of separados) {
    if (asignados.has(otro)) continue;

    const filaPreferida = condicionesPorAlumno[id].filaPreferida;

    const niveles = [
      // Nivel 1: máxima seguridad
      (m1, m2) => !mismaPareja(m1, m2) && m1.fila !== m2.fila &&
                  m2.columna !== m1.columna &&
                  m2.fila !== m1.fila - 1 && m2.columna !== m1.columna &&
                  m2.fila !== m1.fila + 1 && m2.columna !== m1.columna,
      // Nivel 2
      (m1, m2) => !mismaPareja(m1, m2) && m1.fila !== m2.fila &&
                  m2.fila !== m1.fila + 1 && m2.columna !== m1.columna,
      // Nivel 3
      (m1, m2) => !mismaPareja(m1, m2) && m1.fila !== m2.fila &&
                  m2.fila !== m1.fila - 1 && m2.columna !== m1.columna,
      // Nivel 4
      (m1, m2) => !mismaPareja(m1, m2) && m1.fila !== m2.fila,
      // Nivel 5
      (m1, m2) => !mismaPareja(m1, m2)
    ];

    let asignado = false;

    for (const nivel of niveles) {
      // Buscar todas las combinaciones válidas para este nivel
      const combinacionesValidas = [];

      for (const m1 of mesasDisponibles) {
        for (const m2 of mesasDisponibles) {
          if (m1.id_mesa === m2.id_mesa) continue;
          if (nivel(m1, m2)) {
            combinacionesValidas.push({ m1, m2 });
          }
        }
      }

      // Si hay combinaciones válidas, priorizar las que cumplan la fila preferida
      if (combinacionesValidas.length > 0) {
        let seleccion = null;

        const calcularDistancia = (m1, m2) =>
          Math.abs(m1.fila - m2.fila) + Math.abs(m1.columna - m2.columna);

        // 1. Si hay fila preferida, filtrar combinaciones que la cumplan
        let candidatas = combinacionesValidas;
        if (filaPreferida) {
          const filtradas = combinacionesValidas.filter(pair => pair.m1.fila === filaPreferida);
          if (filtradas.length > 0) {
            candidatas = filtradas;
          }
        }

        // 2. Ordenar combinaciones de mayor a menor distancia
        candidatas.sort((a, b) => {
          const distA = calcularDistancia(a.m1, a.m2);
          const distB = calcularDistancia(b.m1, b.m2);
          return distB - distA;
        });

        // 3. Elegir la segunda más lejana si existe, si no, la primera
        if (candidatas.length >= 2) {
          seleccion = candidatas[1]; // segunda más lejana
        } else if (candidatas.length === 1) {
          seleccion = candidatas[0];
        }


        if (seleccion) {
          const { m1, m2 } = seleccion;
          asignaciones.push([id, m1.id_mesa]);
          asignaciones.push([otro, m2.id_mesa]);
          asignados.add(id);
          asignados.add(otro);
          mesasDisponibles = mesasDisponibles.filter(m => m.id_mesa !== m1.id_mesa && m.id_mesa !== m2.id_mesa);
          asignado = true;
          break;
        }
      }
    }

    if (!asignado) {
      return res.status(400).json({
        error: `Imposible cumplir la condición 'separado' entre los alumnos ${id} y ${otro}. Revisa las condiciones o la disposición de mesas.`
      });
    }
  }
}

    // 2. Asignar combinaciones de fila + junto
    const yaAgrupados = new Set();

    for (const id of idsAlumnos) {
      if (asignados.has(id) || yaAgrupados.has(id)) continue;

      const fila = condicionesPorAlumno[id].filaPreferida;
      const grupo = [id, ...condicionesPorAlumno[id].juntosCon.filter(id2 => !asignados.has(id2))];

      if (grupo.length <= 1) continue;
      grupo.forEach(i => yaAgrupados.add(i));

      if (fila) {
        const disponibles = mesasDisponibles.filter(m => m.fila === fila);
        if (disponibles.length >= grupo.length) {
          grupo.forEach((idA, i) => {
            const mesa = disponibles[i];
            asignaciones.push([idA, mesa.id_mesa]);
            asignados.add(idA);
            mesasDisponibles = mesasDisponibles.filter(m => m.id_mesa !== mesa.id_mesa);
          });
          continue;
        }
      }

      // Si no hay fila preferida suficiente, intenta en cualquier fila
            // Si no hay suficientes mesas en la fila preferida, se da prioridad a la fila (NO se sientan juntos en otra fila)
      if (fila) {
        const mesa = mesasDisponibles.find(m => m.fila === fila);
        if (mesa) {
          asignaciones.push([id, mesa.id_mesa]);
          asignados.add(id);
          mesasDisponibles = mesasDisponibles.filter(m => m.id_mesa !== mesa.id_mesa);
        }
      }

    }

    // 3. Asignar alumnos con solo fila preferida
    for (const id of idsAlumnos) {
      if (asignados.has(id)) continue;
      const fila = condicionesPorAlumno[id].filaPreferida;
      if (!fila) continue;

      const mesa = mesasDisponibles.find(m => m.fila === fila);
      if (mesa) {
        asignaciones.push([id, mesa.id_mesa]);
        asignados.add(id);
        mesasDisponibles = mesasDisponibles.filter(m => m.id_mesa !== mesa.id_mesa);
      }
    }

    // 4. Asignar alumnos con solo condición 'junto'
    for (const id of idsAlumnos) {
      if (asignados.has(id)) continue;

      const grupo = [id, ...condicionesPorAlumno[id].juntosCon.filter(id2 => !asignados.has(id2))];
      if (grupo.length <= 1) continue;

      const disponibles = mesasDisponibles.slice(0, grupo.length);
      if (disponibles.length >= grupo.length) {
        grupo.forEach((idA, i) => {
          const mesa = disponibles[i];
          asignaciones.push([idA, mesa.id_mesa]);
          asignados.add(idA);
          mesasDisponibles = mesasDisponibles.filter(m => m.id_mesa !== mesa.id_mesa);
        });
      }
    }

    // 5. Asignar los restantes sin condiciones
    const restantes = idsAlumnos.filter(id => !asignados.has(id));
    for (const id of restantes) {
      const mesa = mesasDisponibles.shift();
      if (!mesa) break;
      asignaciones.push([id, mesa.id_mesa]);
      asignados.add(id);
    }

    await dbQuery("INSERT INTO asignacion (id_alumno, id_mesa) VALUES ?", [asignaciones]);
    res.status(200).json({ message: "Asignaciones completadas", asignaciones });

  } catch (err) {
    console.error("❌ Error en asignarAlumnos:", err);
    res.status(500).json({ error: "Error interno al asignar alumnos" });
  }
};

exports.actualizarClase = async (req, res) => {
  const idClase = parseInt(req.params.id);
  const { numAlumnos, numMesas } = req.body;

  const MAX_ALUMNOS = 50;
  const MAX_MESAS = 60;

  if (numAlumnos > MAX_ALUMNOS || numMesas > MAX_MESAS) {
    return res.status(400).json({
      error: `No puedes crear más de ${MAX_ALUMNOS} alumnos ni más de ${MAX_MESAS} mesas`
    });
  }

  if (isNaN(idClase) || !numAlumnos || !numMesas) {
    return res.status(400).json({ error: "Datos inválidos" });
  }

  if (numMesas < numAlumnos) {
    return res.status(400).json({ error: "Debe haber al menos tantas mesas como alumnos" });
  }

  try {
    const claseActual = await dbQuery("SELECT num_alumnos, num_mesas FROM clase WHERE id_clase = ?", [idClase]);
    if (claseActual.length === 0) {
      return res.status(404).json({ error: "Clase no encontrada" });
    }

    // Actualizar número de alumnos y mesas
    await dbQuery("UPDATE clase SET num_alumnos = ?, num_mesas = ? WHERE id_clase = ?", [
      numAlumnos, numMesas, idClase
    ]);

    // ----- GESTIÓN DE MESAS -----
    const mesasActuales = await dbQuery("SELECT * FROM mesa WHERE id_clase = ?", [idClase]);
    const diferenciaMesas = numMesas - mesasActuales.length;

    if (diferenciaMesas > 0) {
      const columnas = 4;
      const nuevasMesas = Array.from({ length: diferenciaMesas }, (_, i) => {
        const index = mesasActuales.length + i;
        const fila = Math.floor(index / columnas) + 1;
        const columna = (index % columnas) + 1;
        const numero = index + 1;
        return [idClase, numero, fila, columna, 'normal'];
      });
      await dbQuery("INSERT INTO mesa (id_clase, numero, fila, columna, zona) VALUES ?", [nuevasMesas]);
    } else if (diferenciaMesas < 0) {
      const idsEliminar = mesasActuales.slice(diferenciaMesas).map(m => m.id_mesa);
      if (idsEliminar.length > 0) {
        await dbQuery("DELETE FROM asignacion WHERE id_mesa IN (?)", [idsEliminar]);
        await dbQuery("DELETE FROM mesa WHERE id_mesa IN (?)", [idsEliminar]);
      }
    }

    // ----- GESTIÓN DE ALUMNOS -----
    const alumnosActuales = await dbQuery("SELECT * FROM alumno WHERE id_clase = ?", [idClase]);
    const diferenciaAlumnos = numAlumnos - alumnosActuales.length;
    let idsAlumnosEliminados = [];

    if (diferenciaAlumnos > 0) {
      const nuevosAlumnos = Array.from({ length: diferenciaAlumnos }, (_, i) => [
        `Alumno ${alumnosActuales.length + i + 1}`, idClase, false
      ]);
      await dbQuery("INSERT INTO alumno (nombre, id_clase, tiene_condiciones) VALUES ?", [nuevosAlumnos]);
    } else if (diferenciaAlumnos < 0) {
      const alumnosOrdenados = alumnosActuales.sort((a, b) => a.id_alumno - b.id_alumno);
      idsAlumnosEliminados = alumnosOrdenados.slice(diferenciaAlumnos).map(a => a.id_alumno);

      if (idsAlumnosEliminados.length > 0) {
        // ✅ Eliminar solo condiciones de los alumnos eliminados
        await dbQuery("DELETE FROM condicionentrealumnos WHERE id_alumno_1 IN (?) OR id_alumno_2 IN (?)", [idsAlumnosEliminados, idsAlumnosEliminados]);
        await dbQuery("DELETE FROM condicionsitio WHERE id_alumno IN (?)", [idsAlumnosEliminados]);
        await dbQuery("UPDATE alumno SET tiene_condiciones = false WHERE id_alumno IN (?)", [idsAlumnosEliminados]);

        await dbQuery("DELETE FROM asignacion WHERE id_alumno IN (?)", [idsAlumnosEliminados]);
        await dbQuery("DELETE FROM alumno WHERE id_alumno IN (?)", [idsAlumnosEliminados]);
      }
    }

    // ----- REASIGNACIÓN -----
    await dbQuery("DELETE FROM asignacion WHERE id_mesa IN (SELECT id_mesa FROM mesa WHERE id_clase = ?)", [idClase]);

    const alumnosFinales = await dbQuery("SELECT id_alumno FROM alumno WHERE id_clase = ?", [idClase]);
    const mesasFinales = await dbQuery("SELECT id_mesa FROM mesa WHERE id_clase = ?", [idClase]);

    const idsAlumnos = alumnosFinales.map(a => a.id_alumno).sort(() => Math.random() - 0.5);
    const idsMesas = mesasFinales.map(m => m.id_mesa);
    const nuevasAsignaciones = idsAlumnos.map((idAlumno, index) => [idAlumno, idsMesas[index]]);

    await dbQuery("INSERT INTO asignacion (id_alumno, id_mesa) VALUES ?", [nuevasAsignaciones]);

    res.status(200).json({ message: "Clase actualizada y redistribuida" });
  } catch (error) {
    console.error("Error al actualizar clase:", error);
    res.status(500).json({ error: "Error al actualizar la clase" });
  }
};

exports.eliminarClase = async (req, res) => {
  const idClase = req.params.id;

  try {
    await dbQuery("DELETE FROM asignacion WHERE id_mesa IN (SELECT id_mesa FROM mesa WHERE id_clase = ?)", [idClase]);
    await dbQuery("DELETE FROM alumno WHERE id_clase = ?", [idClase]);
    await dbQuery("DELETE FROM mesa WHERE id_clase = ?", [idClase]);
    await dbQuery("DELETE FROM clase WHERE id_clase = ?", [idClase]);

    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar la clase" });
  }
};

exports.obtenerAlumnosConCondiciones = async (req, res) => {
  const idClase = parseInt(req.params.idClase);
  if (isNaN(idClase)) return res.status(400).json({ error: "ID de clase no válido" });

  try {
    const alumnos = await dbQuery("SELECT * FROM alumno WHERE id_clase = ?", [idClase]);

    const alumnosConTodo = await Promise.all(alumnos.map(async (alumno) => {
      const condicionesEntre = await dbQuery(
        "SELECT * FROM condicionentrealumnos WHERE id_alumno_1 = ? OR id_alumno_2 = ?",
        [alumno.id_alumno, alumno.id_alumno]
      );

      const condicionesSitio = await dbQuery(
        "SELECT * FROM condicionsitio WHERE id_alumno = ?",
        [alumno.id_alumno]
      );

      return {
        idAlumno: alumno.id_alumno,
        nombre: alumno.nombre,
        tieneCondiciones: alumno.tiene_condiciones,
        condicionesEntre: condicionesEntre,
        condicionesSitio: condicionesSitio
      };
    }));

    res.status(200).json(alumnosConTodo);
  } catch (err) {
    console.error("Error al obtener alumnos con condiciones:", err);
    res.status(500).json({ error: "Error al obtener condiciones de los alumnos" });
  }
};


