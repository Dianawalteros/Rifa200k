/* ============================================================
   RIFA "TESORO PIRATA" — $200.000 EN EFECTIVO
   Lógica del tablero
   ============================================================ */
const API_URL = "/api/registros";
const POLL_INTERVAL_MS = 4000;
const TOTAL_NUMEROS = 99;

// Referencias al DOM
const tablero = document.getElementById('tablero');
const modal = document.getElementById('modal');
const numeroSel = document.getElementById('numero-seleccionado');
const form = document.getElementById('form-registro');
const modalClose = document.getElementById('modal-close');
const submitBtn = document.getElementById('submit-btn');
const toast = document.getElementById('toast');
const toastText = document.getElementById('toast-text');
const contadorEl = document.getElementById('contador-vendidos');

let registros = {};
let numeroSeleccionado = null;
let ultimoTomadoPorMi = null;
let cargando = false;

/* ---------- Comunicación con la API ---------- */
async function cargarRegistros() {
  if (cargando) return;
  cargando = true;
  try {
    const resp = await fetch(API_URL);
    if (!resp.ok) throw new Error("Respuesta no válida del servidor");
    registros = await resp.json();
    crearTablero();
    actualizarContador();
  } catch (err) {
    console.error("No se pudo cargar el tablero:", err);
  } finally {
    cargando = false;
  }
}

/* ---------- Construcción del tablero ---------- */
function crearTablero() {
  if (!tablero) return;
  tablero.innerHTML = "";
  
  for (let i = 1; i <= TOTAL_NUMEROS; i++) {
    const numeroTexto = String(i).padStart(2, "0");
    const ticket = document.createElement("button");
    ticket.type = "button";
    ticket.className = "ticket";
    ticket.textContent = numeroTexto;
    ticket.setAttribute("data-number", i);
    
    const tomado = !!registros[i];
    if (tomado) {
      ticket.classList.add("is-taken");
      ticket.disabled = true;
      ticket.setAttribute("aria-label", `Número ${i}, ya tomado`);
    } else {
      ticket.setAttribute("aria-label", `Número ${i}, disponible`);
      ticket.addEventListener("click", () => abrirModal(i, numeroTexto));
    }
    
    if (i === ultimoTomadoPorMi) {
      ticket.classList.add("just-taken");
    }
    
    tablero.appendChild(ticket);
  }
  ultimoTomadoPorMi = null;
}

function actualizarContador() {
  if (!contadorEl) return;
  const disponibles = TOTAL_NUMEROS - Object.keys(registros).length;
  contadorEl.textContent = `${disponibles} / ${TOTAL_NUMEROS}`;
}

/* ---------- Modal ---------- */
function abrirModal(numero, numeroTexto) {
  numeroSeleccionado = numero;
  if (numeroSel) numeroSel.textContent = numeroTexto;
  if (form) form.reset();
  limpiarErrores();
  if (modal) {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }
  document.body.style.overflow = "hidden";
  setTimeout(() => {
    const primerInput = document.getElementById("nombre");
    if (primerInput) primerInput.focus();
  }, 100);
}

function cerrarModal() {
  if (modal) {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }
  document.body.style.overflow = "";
  numeroSeleccionado = null;
}

if (modalClose) modalClose.addEventListener("click", cerrarModal);

if (modal) {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) cerrarModal();
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal && modal.classList.contains("is-open")) {
    cerrarModal();
  }
});

/* ---------- Validación ---------- */
function limpiarErrores() {
  document.querySelectorAll(".field").forEach((f) => f.classList.remove("has-error"));
}

function validarFormulario(nombre, telefono, email) {
  limpiarErrores();
  let valido = true;
  
  if (nombre.trim().length < 3) {
    document.getElementById("fieldNombre")?.classList.add("has-error");
    valido = false;
  }
  
  const telefonoLimpio = telefono.replace(/\D/g, "");
  if (telefonoLimpio.length < 7) {
    document.getElementById("fieldTelefono")?.classList.add("has-error");
    valido = false;
  }
  
  if (email.trim() !== "") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      document.getElementById("fieldEmail")?.classList.add("has-error");
      valido = false;
    }
  }
  
  return valido;
}

/* ---------- Envío del formulario ---------- */
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (numeroSeleccionado === null) return;
    
    const nombre = document.getElementById("nombre").value;
    const telefono = document.getElementById("telefono").value;
    const email = document.getElementById("email").value;
    
    if (!validarFormulario(nombre, telefono, email)) return;
    
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Guardando...";
    }
    
    try {
      const resp = await fetch(`${API_URL}/${numeroSeleccionado}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          email: email.trim()
        })
      });
      
      if (resp.status === 409) {
        mostrarToast("Ese número ya fue apartado. Elige otro.", "error");
        cerrarModal();
        await cargarRegistros();
        return;
      }
      
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || "Error del servidor");
      }
      
      ultimoTomadoPorMi = numeroSeleccionado;
      const numeroGuardado = String(numeroSeleccionado).padStart(2, "0");
      cerrarModal();
      mostrarToast(`¡Tesoro en vista! La coordenada ${numeroGuardado} es tuya. 🏴️💰`, "success");
      await cargarRegistros();
      
    } catch (err) {
      console.error("Error al guardar:", err);
      mostrarToast("Hubo un error al guardar. Intenta de nuevo.", "error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "¡Apartar este número!";
      }
    }
  });
}

/* ---------- Toast ---------- */
let toastTimeout;
function mostrarToast(mensaje, tipo = "info") {
  if (!toast || !toastText) return;
  toastText.textContent = mensaje;
  toast.dataset.type = tipo;
  toast.classList.add("is-visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 3500);
}

/* ---------- Navegación entre pantallas ---------- */
function cambiarPantalla(pantalla) {
  document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('pantalla-' + pantalla).classList.add('activa');
  document.getElementById('btn-' + pantalla).classList.add('active');
  if (pantalla === 'tablero') cargarRegistros();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- Inicio ---------- */
cargarRegistros();
setInterval(cargarRegistros, POLL_INTERVAL_MS);
