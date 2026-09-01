const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Base de datos SQLite
const db = new Database('rifa.db');

// Crear tabla si no existe
db.exec(`
  CREATE TABLE IF NOT EXISTS registros (
    numero INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL,
    telefono TEXT NOT NULL,
    email TEXT,
    fecha TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// API: Obtener todos los registros
app.get('/api/registros', (req, res) => {
  try {
    const registros = db.prepare('SELECT * FROM registros').all();
    const formato = {};
    registros.forEach(r => {
      formato[r.numero] = {
        nombre: r.nombre,
        telefono: r.telefono,
        email: r.email,
        fecha: r.fecha
      };
    });
    res.json(formato);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Apartar un número
app.post('/api/registros/:numero', (req, res) => {
  const numero = parseInt(req.params.numero);
  const { nombre, telefono, email } = req.body;

  if (!nombre || !telefono) {
    return res.status(400).json({ error: 'Nombre y teléfono son obligatorios' });
  }

  try {
    // Verificar si ya está tomado
    const existe = db.prepare('SELECT * FROM registros WHERE numero = ?').get(numero);
    if (existe) {
      return res.status(409).json({ error: 'Número ya apartado' });
    }

    // Insertar registro
    db.prepare(`
      INSERT INTO registros (numero, nombre, telefono, email)
      VALUES (?, ?, ?, ?)
    `).run(numero, nombre, telefono, email || null);

    res.json({ success: true, numero, nombre });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Eliminar registro (para admin)
app.delete('/api/registros/:numero', (req, res) => {
  const numero = parseInt(req.params.numero);
  
  try {
    db.prepare('DELETE FROM registros WHERE numero = ?').run(numero);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ENDPOINT PARA REINICIAR TODA LA RIFA
app.post('/api/reiniciar', (req, res) => {
  try {
    db.exec('DELETE FROM registros');
    console.log('🗑 Rifa reiniciada - Todos los registros eliminados');
    res.json({ success: true, message: 'Rifa reiniciada correctamente' });
  } catch (err) {
    console.error('Error al reiniciar:', err);
    res.status(500).json({ error: 'Error al reiniciar la rifa' });
  }
});
// DELETE: Eliminar un registro individual
app.delete('/api/registros/:numero', (req, res) => {
    const numero = parseInt(req.params.numero);
    try {
        db.prepare('DELETE FROM registros WHERE numero = ?').run(numero);
        console.log(`🗑 Registro #${numero} eliminado`);
        res.json({ success: true });
    } catch (err) {
        console.error('Error al eliminar:', err);
        res.status(500).json({ error: 'Error al eliminar' });
    }
});
// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🏴‍️ Servidor corriendo en http://localhost:${PORT}`);
  console.log(` Base de datos: rifa.db`);
});
