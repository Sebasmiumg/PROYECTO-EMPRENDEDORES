const Trabajador = require("../modelos/Trabajador");

// Crear nuevo trabajador
exports.crearTrabajador = async (req, res) => {
  try {
    const nuevoTrabajador = new Trabajador(req.body);
    await nuevoTrabajador.save();
    res.status(201).json(nuevoTrabajador);
  } catch (error) {
    res.status(400).json({ mensaje: "Error al crear trabajador", error });
  }
};


// Obtener todos los trabajadores
exports.obtenerTrabajadores = async (req, res) => {
  try {
    const trabajadores = await Trabajador.find();
    res.json(trabajadores);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener trabajadores", error });
  }
};

// Obtener un trabajador por ID
exports.obtenerTrabajadorPorId = async (req, res) => {
  try {
    const trabajador = await Trabajador.findById(req.params.id);
    if (!trabajador) {
      return res.status(404).json({ mensaje: "Trabajador no encontrado" });
    }
    res.json(trabajador);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener trabajador", error });
  }
};

// Actualizar un trabajador
exports.actualizarTrabajador = async (req, res) => {
  try {
    const actualizado = await Trabajador.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(actualizado);
  } catch (error) {
    res.status(400).json({ mensaje: "Error al actualizar trabajador", error });
  }
};

// Eliminar un trabajador
exports.eliminarTrabajador = async (req, res) => {
  try {
    await Trabajador.findByIdAndDelete(req.params.id);
    res.json({ mensaje: "Trabajador eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al eliminar trabajador", error });
  }
};