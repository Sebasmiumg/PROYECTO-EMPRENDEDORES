const Usuario = require("../modelos/Usuario");
const jwt = require("jsonwebtoken");

exports.crearUsuario = async (req, res) => {
  const { nombre, telefono, rol } = req.body;

  if (!nombre || !telefono || !rol) {
    return res.status(400).json({ mensaje: "Faltan datos requeridos" });
  }

  const emailBase = nombre.toLowerCase().replace(/\s+/g, "") + Date.now().toString().slice(-4);
  const correo = `${emailBase}@sistema.com`;

  const contrasena = Math.random().toString(36).slice(-8);

  try {
    const nuevoUsuario = await Usuario.create({
      nombre,
      telefono,
      email: correo, // guardamos como 'email' en BD
      contrasena,
      rol
      
    });

    res.status(201).json({
      mensaje: "Usuario creado correctamente",
      usuario: {
        nombre: nuevoUsuario.nombre,
        correo: nuevoUsuario.email, // mostramos como 'correo' al frontend
        contrasena,
        rol: nuevoUsuario.rol
      }
    });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al crear usuario", error });
  }
};

exports.obtenerUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.find();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener usuarios", error });
  }
};

exports.iniciarSesion = async (req, res) => {
  const { correo, contrasena } = req.body;

  try {
    const usuario = await Usuario.findOne({ email: correo });

    if (!usuario) {
      return res.status(401).json({ mensaje: "Usuario no encontrado" });
    }

    if (usuario.contrasena.trim() !== contrasena.trim()) {
      return res.status(401).json({ mensaje: "Contraseña incorrecta" });
    }

    if (usuario.rol === "cliente") {
      return res.status(403).json({ mensaje: "Los clientes no necesitan iniciar sesión." });
    }

    const token = jwt.sign(
      {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      },
      process.env.JWT_SECRETO,
      { expiresIn: "3h" }
    );

    res.json({
      token,
      rol: usuario.rol,
      nombre: usuario.nombre
    });
  } catch (error) {
    res.status(500).json({ mensaje: "Error en inicio de sesión", error });
  }
};

exports.eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    await Usuario.findByIdAndDelete(id);
    res.json({ mensaje: "Usuario eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al eliminar usuario", error });
  }
};