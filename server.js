const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

const DB_FILE = path.join(__dirname, 'rifa-data.json');

function cargarDatos() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error cargando datos:', err);
  }
  return {};
}

function guardarDatos(datos) {
  fs.writeFileSync(DB_FILE, JSON.stringify(datos, null, 2));
}

app.get('/api/registros', (req, res) => {
  res.json(cargarDatos());
});

app.post('/api/registros/:numero', (req, res) => {
  const numero = req.params.numero;
  const datos = cargarDatos();
  
  if (datos[numero]) {
    return res.status(409).json({ error: 'Número ya apartado' });
  }
  
  datos[numero] = {
    nombre: req.body.nombre || '',
    telefono: req.body.telefono || '',
    email: req.body.email || null,
    fecha: new Date().toISOString(),
    pagado: false,
    comprobante: null
  };
  
  guardarDatos(datos);
  console.log(`✅ Número ${numero} apartado`);
  res.json({ success: true });
});

app.post('/api/registros/:numero/comprobante', (req, res) => {
  const numero = req.params.numero;
  const datos = cargarDatos();
  if (datos[numero]) {
    datos[numero].comprobante = req.body.comprobante;
    datos[numero].fechaPago = new Date().toISOString();
    guardarDatos(datos);
  }
  res.json({ success: true });
});

app.post('/api/registros/:numero/aprobar', (req, res) => {
  const numero = req.params.numero;
  const datos = cargarDatos();
  if (datos[numero]) {
    datos[numero].pagado = true;
    datos[numero].fechaAprobacion = new Date().toISOString();
    guardarDatos(datos);
  }
  res.json({ success: true });
});

app.delete('/api/registros/:numero', (req, res) => {
  const numero = req.params.numero;
  const datos = cargarDatos();
  delete datos[numero];
  guardarDatos(datos);
  res.json({ success: true });
});

app.post('/api/reiniciar', (req, res) => {
  guardarDatos({});
  console.log('🗑 Rifa reiniciada');
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`🏴‍☠️ Servidor corriendo en puerto ${PORT}`);
});
