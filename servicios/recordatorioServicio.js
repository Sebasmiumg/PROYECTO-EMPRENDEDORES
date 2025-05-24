const cron = require("node-cron");
const nodemailer = require("nodemailer");
const Turno = require("../modelos/Turno");
const Trabajador = require("../modelos/Trabajador");
const Usuario = require("../modelos/Usuario");
const fs = require("fs");
const path = require("path");

// Cargar .env manualmente si es necesario
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envData = fs.readFileSync(envPath, "utf-8");
  envData.split("\n").forEach((line) => {
    const [key, value] = line.split("=");
    if (key && value) process.env[key.trim()] = value.trim();
  });
  
}

console.log("📦 Variables de entorno de correo cargadas");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.CORREO_USUARIO,
    pass: process.env.CORREO_CONTRASENA, // ✅ SIN Ñ
  },
});

async function enviarRecordatorios() {
  const turnos = await Turno.find({ estado: "pendiente" }).populate("trabajador usuario");

  for (const turno of turnos) {
    try {
      const ahora = new Date();

      // Asegura formato correcto de fecha y hora
      const hora24 = turno.hora?.includes("a. m.") || turno.hora?.includes("p. m.")
        ? new Date(`${turno.fecha} ${new Date(`1970-01-01T${turno.hora}`).toLocaleTimeString("en-US", { hour12: false })}`)
        : new Date(`${turno.fecha}T${turno.hora}`);

      const diffHoras = (hora24 - ahora) / (1000 * 60 * 60);

      if (diffHoras > 23 && diffHoras < 25) {
        const urlConfirmar = `https://tusitio.com/confirmar-turno/${turno._id}`;
        const urlCancelar = `https://tusitio.com/cancelar-turno/${turno._id}`;

        const html = `
          <p>Hola,</p>
          <p>Este es un recordatorio de tu cita el <strong>${turno.fecha}</strong> a las <strong>${turno.hora}</strong>.</p>
          <p>Con: <strong>${turno.trabajador?.nombre || "el especialista"}</strong></p>
          <p>
            <a href="${urlConfirmar}" style="color: green;">✅ Confirmar</a> |
            <a href="${urlCancelar}" style="color: red;">❌ Cancelar</a>
          </p>
        `;

        const destinatario = turno.usuario?.email || turno.correoCliente || null;

        if (destinatario) {
          try {
            await transporter.sendMail({
              from: process.env.CORREO_USUARIO,
              to: destinatario,
              subject: "⏰ Recordatorio de tu cita",
              html,
            });
            console.log(`📧 Recordatorio enviado a ${destinatario}`);
          } catch (error) {
            console.error("❌ Error al enviar correo a cliente:", error);
          }
        } else {
          console.warn(`⚠️ Turno ${turno._id} sin correo de cliente.`);
        }

        if (turno.trabajador?.email) {
          try {
            await transporter.sendMail({
              from: process.env.CORREO_USUARIO,
              to: turno.trabajador.email,
              subject: "📅 Nuevo turno programado",
              html: `<p>Tienes una cita con un cliente el <strong>${turno.fecha}</strong> a las <strong>${turno.hora}</strong>.</p>`,
            });
            console.log(`📩 Correo enviado al trabajador: ${turno.trabajador.email}`);
          } catch (error) {
            console.error("❌ Error al enviar correo a trabajador:", error);
          }
        }
      }
    } catch (err) {
      console.error(`❌ Error procesando turno ${turno._id}:`, err);
    }
  }
}

// Ejecutar cada minuto (modificar en producción si es necesario)
cron.schedule("* * * * *", () => {
  console.log("⏱️ Ejecutando recordatorio de turnos...");
  enviarRecordatorios();
});

module.exports = { enviarRecordatorios };