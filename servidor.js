const express = require("express");
const cors = require("cors");
const path = require("path");

// Configuración y conexión a base de datos
const conectarDB = require("./configuracion/baseDeDatos");

// Modelos
const Usuario = require("./modelos/Usuario");
const Trabajador = require("./modelos/Trabajador");
const Turno = require("./modelos/Turno");

// Rutas API
const usuarioRoutes = require("./rutas/autenticacionRutas");
const usuariosRoutes = require("./rutas/usuariosRutas");
const turnoRoutes = require("./rutas/turnosRutas");
const trabajadorRoutes = require("./rutas/trabajadoresRutas");
const loginAdminRoutes = require("./rutas/loginAdministradorRutas");
const loginTrabajadorRoutes = require("./rutas/loginTrabajadorRutas");

const app = express();

// Configurar EJS como motor de plantillas
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "vistas"));

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Crear administrador predeterminado si no existe
async function crearAdmin() {
  const admin = await Usuario.findOne({ email: "admin@correo.com" });
  if (!admin) {
    await Usuario.create({
      nombre: "Administrador",
      email: "admin@correo.com",
      telefono: "12345678",
      contrasena: "admin123",
      rol: "admin",
    });
    console.log("✅ Usuario administrador creado: admin@correo.com / admin123");
  } else {
    console.log("ℹ️ Usuario administrador ya existe.");
  }
}

// Conexión a MongoDB y creación de admin
conectarDB().then(async () => {
  await crearAdmin();
});

// Rutas API
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/turnos", turnoRoutes);
app.use("/api/trabajadores", trabajadorRoutes);
app.use("/api/login/admin", loginAdminRoutes);
app.use("/api/login/trabajador", loginTrabajadorRoutes);

// Rutas para mostrar vistas EJS

// Ruta principal - Vista Home
app.get("/", (req, res) => {
  res.render("principal");
});

// 🧑 Trabajadores
app.get("/trabajadores", async (req, res) => {
  const trabajadores = await Trabajador.find();
  res.render("trabajador/index", { trabajadores });
});

app.get("/trabajadores/crear", (req, res) => {
  res.render("trabajador/create");
});

app.get("/trabajadores/:id/editar", async (req, res) => {
  const trabajador = await Trabajador.findById(req.params.id);
  res.render("trabajador/edit", { trabajador });
});

// 👤 Usuarios
app.get("/usuarios", async (req, res) => {
  const usuarios = await Usuario.find();
  res.render("usuario/index", { usuarios });
});

app.get("/usuarios/crear", (req, res) => {
  res.render("usuario/create");
});

app.get("/usuarios/:id/editar", async (req, res) => {
  const usuario = await Usuario.findById(req.params.id);
  res.render("usuario/edit", { usuario });
});

// 🕒 Turnos
app.get("/turnos", async (req, res) => {
  const turnos = await Turno.find();
  res.render("turno/index", { turnos });
});

app.get("/turnos/crear", (req, res) => {
  res.render("turno/create");
});

app.get("/turnos/:id/editar", async (req, res) => {
  const turno = await Turno.findById(req.params.id);
  res.render("turno/edit", { turno });
});

// Servicio de recordatorio (correo)
require("./servicios/recordatorioServicio");

// Configurar puerto y arrancar el servidor
const PORT = process.env.PUERTO || 4000;
app.listen(PORT, () => {
  console.log(`✅ Servidor funcionando en puerto ${PORT}`);
});

