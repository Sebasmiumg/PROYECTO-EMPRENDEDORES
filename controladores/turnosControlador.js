const Turno = require("../modelos/Turno");
const Trabajador = require("../modelos/Trabajador");
const Usuario = require("../modelos/Usuario");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envData = fs.readFileSync(envPath, "utf-8");
  envData.split("\n").forEach(line => {
    const [key, value] = line.split("=");
    if (key && value) process.env[key.trim()] = value.trim();
  });
  
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.CORREO_USUARIO,
    pass: process.env.CORREO_CONTRASENA
  }
});

const crearTurno = async (req, res) => {
  try {
    let trabajadorId = req.body.trabajador;

    if (!trabajadorId) {
      const dia = new Date(req.body.fecha).toLocaleDateString("es-GT", { weekday: "long" });
      const trabajadores = await Trabajador.find({ "horarios.dia": { $regex: dia, $options: "i" } });

      for (const t of trabajadores) {
        const turnosAsignados = await Turno.find({ trabajador: t._id, fecha: req.body.fecha, hora: req.body.hora });
        if (turnosAsignados.length === 0) {
          trabajadorId = t._id;
          break;
        }
      }

      if (!trabajadorId) {
        return res.status(400).json({ mensaje: "No hay trabajadores disponibles en esa fecha y hora." });
      }
    }

    if (!req.usuario && (!req.body.correoCliente || !req.body.telefono)) {
      return res.status(400).json({ mensaje: "correoCliente y teléfono son obligatorios si no hay usuario autenticado." });
    }

    const turnoData = {
      fecha: req.body.fecha,
      hora: req.body.hora,
      negocio: req.body.negocio,
      telefono: req.body.telefono,
      correoCliente: req.body.correoCliente,
      trabajador: trabajadorId
    };

    if (req.usuario) {
      turnoData.usuario = req.usuario._id;
    } else if (req.body.usuario) {
      turnoData.usuario = req.body.usuario;
    }

    const nuevoTurno = new Turno(turnoData);
    await nuevoTurno.save();

    const trabajador = await Trabajador.findById(trabajadorId);
    if (trabajador) {
      const mensaje = `Hola ${trabajador.nombre}, se te ha asignado un nuevo turno:\n\n🗓️ Fecha: ${nuevoTurno.fecha}\n⏰ Hora: ${nuevoTurno.hora}\n👤 Cliente: ${req.usuario?.nombre || req.body.correoCliente || req.body.telefono || "Anónimo"}`;
      await transporter.sendMail({
        from: process.env.CORREO_USUARIO,
        to: trabajador.email || process.env.CORREO_USUARIO,
        subject: "📌 Nuevo turno asignado",
        text: mensaje
      });
    }

    const correoCliente = req.usuario?.email || req.body.correoCliente;
    if (correoCliente) {
      const mensajeCliente = `Hola,\n\nTu turno ha sido agendado correctamente:\n\n🗓️ Fecha: ${nuevoTurno.fecha}\n⏰ Hora: ${nuevoTurno.hora}\n📍 Negocio: ${req.body.negocio || "Sucursal"}\n\nGracias por utilizar nuestro sistema.`;
      await transporter.sendMail({
        from: process.env.CORREO_USUARIO,
        to: correoCliente,
        subject: "✅ Confirmación de turno",
        text: mensajeCliente
      });
    }

    res.status(201).json(nuevoTurno);
  } catch (error) {
    console.error("❌ Error en crearTurno:", error);
    res.status(500).json({ mensaje: "Error al crear el turno", error });
  }
};

const asignarClienteATrabajador = async (req, res) => {
  try {
    const { trabajador } = req.body;
    const { id } = req.params;

    if (!trabajador || !id) {
      return res.status(400).json({ mensaje: "ID del turno y del trabajador son obligatorios" });
    }

    const turno = await Turno.findByIdAndUpdate(
      id,
      { trabajador },
      { new: true }
    );

    if (!turno) {
      return res.status(404).json({ mensaje: "Turno no encontrado" });
    }

    res.json({ mensaje: "✅ Turno asignado correctamente", turno });
  } catch (error) {
    res.status(500).json({ mensaje: "❌ Error al asignar turno manual", error });
  }
};

const obtenerTurnosPorTrabajador = async (req, res) => {
  try {
    const turnos = await Turno.find({ trabajador: req.params.id }).populate("usuario");
    res.json(turnos);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener turnos del trabajador", error });
  }
};

const obtenerHistorialCliente = async (req, res) => {
  try {
    const historial = await Turno.find({ usuario: req.params.id }).populate("trabajador");
    res.json(historial);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener historial del cliente", error });
  }
};

const marcarTurnoAtendido = async (req, res) => {
  try {
    const { id } = req.params;
    const turno = await Turno.findByIdAndUpdate(id, { estado: "completado" }, { new: true });
    if (!turno) return res.status(404).json({ mensaje: "Turno no encontrado" });
    res.json({ mensaje: "Turno marcado como completado", turno });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al actualizar el turno", error });
  }
};

const filtrarTurnos = async (req, res) => {
  try {
    const { fecha, estado } = req.query;
    const filtro = {};
    if (fecha) filtro.fecha = fecha;
    if (estado) filtro.estado = estado;

    const turnos = await Turno.find(filtro).populate("usuario trabajador");
    res.json(turnos);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al filtrar turnos", error });
  }
};

const { enviarRecordatorios } = require("../servicios/recordatorioServicio");

const reenviarRecordatorio = async (req, res) => {
  try {
    await enviarRecordatorios();
    res.json({ mensaje: "Recordatorios reenviados exitosamente" });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al reenviar recordatorios", error });
  }
};

const listarTodosTurnos = async (req, res) => {
  try {
    const turnos = await Turno.find().populate("usuario trabajador");
    res.json(turnos);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al listar turnos", error });
  }
};

const obtenerEstadisticas = async (req, res) => {
  try {
    const total = await Turno.countDocuments();
    const confirmados = await Turno.countDocuments({ estado: "confirmado" });
    const completados = await Turno.countDocuments({ estado: "completado" });
    const cancelados = await Turno.countDocuments({ estado: "cancelado" });
    const pendientes = await Turno.countDocuments({ estado: "pendiente" });

    res.json({ total, confirmados, completados, cancelados, pendientes });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener estadísticas", error });
  }
};

const actualizarSeguimientoTurno = async (req, res) => {
  try {
    const { id } = req.params;
    const { nota, atendidoHora } = req.body;

    const turno = await Turno.findByIdAndUpdate(id, { $set: { nota, atendidoHora } }, { new: true });
    if (!turno) return res.status(404).json({ mensaje: "Turno no encontrado" });

    res.json(turno);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al actualizar turno", error });
  }
};

const confirmarTurnoLlegada = async (req, res) => {
  try {
    const { id } = req.params;
    const turno = await Turno.findByIdAndUpdate(id, { estado: "confirmado", llegada: new Date() }, { new: true });
    if (!turno) return res.status(404).json({ mensaje: "Turno no encontrado" });

    res.json({ mensaje: "✅ Turno confirmado correctamente", turno });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al confirmar llegada", error });
  }
};

module.exports = {
  crearTurno,
  asignarClienteATrabajador,
  obtenerTurnosPorTrabajador,
  obtenerHistorialCliente,
  marcarTurnoAtendido,
  filtrarTurnos,
  reenviarRecordatorio,
  listarTodosTurnos,
  obtenerEstadisticas,
  actualizarSeguimientoTurno,
  confirmarTurnoLlegada
};