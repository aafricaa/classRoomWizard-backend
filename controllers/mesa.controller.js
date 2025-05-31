const db = require('../config/db');

exports.getMesasPorClase = (req, res) => {
  const idClase = req.params.idClase;

  const query = "SELECT * FROM mesa WHERE id_clase = ?";
  db.query(query, [idClase], (err, results) => {
    if (err) {
      console.error("Error al obtener mesas:", err);
      return res.status(500).json({ error: "Error al obtener las mesas de la clase" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "No se encontraron mesas para la clase especificada" });
    }

    res.status(200).json(results);
  });
};

