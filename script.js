/* ============================================================
   RIFA "TESORO PIRATA" — $200.000 EN EFECTIVO
   Lógica completa con Login Admin y Botón Eliminar Universal
   ============================================================ */
const API_URL = "/api/registros";
const PRECIO = 10000;

// DOM
const tablero = document.getElementById('tablero');
const modalApartar = document.getElementById('modal-apartar');
const modalPago = document.getElementById('modal-pago');
const modalComp = document.getElementById('modal-comp');
const modalLogin = document.getElementById('modal-login');
const numApartar = document.getElementById('num-apartar');
const numPago = document.getElementById('num-pago');
const formApartar = document.getElementById('form-apartar');
const formPago = document.getElementById('form-pago');
const formLogin = document.getElementById('form-login');
const toast = document.getElementById('toast');
const toastText = document.getElementById('toast-text');
const contador = document.getElementById('contador');
const loginError = document.getElementById('login-error');

let registros = {};
let numActual = null;

// Credenciales Admin
const ADMIN_USER = "sandra";
const ADMIN_PASS = "1014"; 

/* ============================================================
   NAVEGACIÓN Y LOGIN
   ============================================================ */
function cambiarPantalla(p) {
    if (p === 'admin') {
        if (sessionStorage.getItem('adminAuth') === 'true') {
            mostrarAdmin();
        } else {
            abrirModalLogin();
        }
        return;
    }
    
    document.querySelectorAll('.pantalla').forEach(x => x.classList.remove('activa'));
    document.querySelectorAll('.nav-btn').forEach(x => x.classList.remove('active'));
    document.getElementById('pantalla-' + p).classList.add('activa');
    document.getElementById('btn-' + p).classList.add('active');
    
    if (p === 'tablero') cargarTodo();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function abrirModalLogin() {
    document.getElementById('login-user').value = '';
    document.getElementById('login-pass').value = '';
    if (loginError) loginError.textContent = '';
    if (modalLogin) modalLogin.classList.add('is-open');
    setTimeout(() => document.getElementById('login-user').focus(), 100);
}

function cerrarModalLogin() {
    if (modalLogin) modalLogin.classList.remove('is-open');
}

if (formLogin) {
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('login-user').value.trim();
        const pass = document.getElementById('login-pass').value;
        
        if (user === ADMIN_USER && pass === ADMIN_PASS) {
            sessionStorage.setItem('adminAuth', 'true');
            cerrarModalLogin();
            mostrarAdmin();
            toastMsg('✅ Acceso concedido', 'success');
        } else {
            if (loginError) loginError.textContent = '❌ Usuario o contraseña incorrectos';
            document.getElementById('login-pass').value = '';
            document.getElementById('login-pass').focus();
        }
    });
}

function mostrarAdmin() {
    document.querySelectorAll('.pantalla').forEach(x => x.classList.remove('activa'));
    document.querySelectorAll('.nav-btn').forEach(x => x.classList.remove('active'));
    document.getElementById('pantalla-admin').classList.add('activa');
    document.getElementById('btn-admin').classList.add('active');
    cargarAdmin();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function logout() {
    sessionStorage.removeItem('adminAuth');
    cambiarPantalla('inicio');
    toastMsg('Sesión cerrada', 'info');
}

/* ============================================================
   CARGA DE DATOS Y TABLERO
   ============================================================ */
async function cargarTodo() {
    try {
        const resp = await fetch(API_URL);
        if (!resp.ok) throw new Error("Error del servidor");
        registros = await resp.json();
        crearTablero();
        actualizarContador();
        if (document.getElementById('pantalla-admin')?.classList.contains('activa')) {
            cargarAdmin();
        }
    } catch (err) {
        console.error(err);
    }
}

function crearTablero() {
    if (!tablero) return;
    tablero.innerHTML = '';
    for (let i = 1; i <= 99; i++) {
        const n = String(i).padStart(2, '0');
        const btn = document.createElement('button');
        btn.className = 'ticket';
        btn.textContent = n;
        const r = registros[i];
        if (r) {
            btn.classList.add(r.pagado ? 'is-paid' : 'is-taken');
            btn.disabled = true;
            btn.title = r.nombre;
        } else {
            btn.onclick = () => abrirApartar(i, n);
        }
        tablero.appendChild(btn);
    }
}

function actualizarContador() {
    if (!contador) return;
    const disp = 99 - Object.keys(registros).length;
    contador.textContent = disp + ' / 99';
}

/* ============================================================
   APARTAR Y PAGO
   ============================================================ */
function abrirApartar(num, txt) {
    numActual = num;
    numApartar.textContent = txt;
    formApartar.reset();
    modalApartar.classList.add('is-open');
}

formApartar.onsubmit = async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nombre-ap').value.trim();
    const tel = document.getElementById('tel-ap').value.trim();
    const email = document.getElementById('email-ap').value.trim();
    
    if (nombre.length < 3) return toastMsg('Nombre muy corto', 'error');
    if (tel.replace(/\D/g, '').length < 7) return toastMsg('Teléfono inválido', 'error');
    
    try {
        const resp = await fetch(`${API_URL}/${numActual}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, telefono: tel, email })
        });
        if (resp.status === 409) return toastMsg('Número ya tomado', 'error');
        if (!resp.ok) throw new Error('Error');
        
        cerrarModal('modal-apartar');
        toastMsg('¡Apartado! Ahora realiza el pago.', 'success');
        setTimeout(() => abrirPago(numActual), 500);
        cargarTodo();
    } catch (err) {
        toastMsg('Error al apartar', 'error');
    }
};

function abrirPago(num) {
    numPago.textContent = String(num).padStart(2, '0');
    formPago.reset();
    modalPago.classList.add('is-open');
}

formPago.onsubmit = async (e) => {
    e.preventDefault();
    const file = document.getElementById('comprobante').files[0];
    if (!file) return toastMsg('Sube el comprobante', 'error');
    if (file.size > 2 * 1024 * 1024) return toastMsg('Máximo 2MB', 'error');
    
    const reader = new FileReader();
    reader.onload = async (ev) => {
        try {
            const resp = await fetch(`${API_URL}/${numActual}/comprobante`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comprobante: ev.target.result })
            });
            if (!resp.ok) throw new Error('Error');
            cerrarModal('modal-pago');
            toastMsg('Comprobante enviado. Espera confirmación.', 'success');
            cargarTodo();
        } catch (err) {
            toastMsg('Error al enviar', 'error');
        }
    };
    reader.readAsDataURL(file);
};

/* ============================================================
   ADMIN (CON CORRECCIÓN DEL BOTÓN ELIMINAR)
   ============================================================ */
function cargarAdmin() {
    const total = Object.keys(registros).length;
    const pagados = Object.values(registros).filter(r => r.pagado).length;
    const pendientes = total - pagados;
    
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-pagados').textContent = pagados;
    document.getElementById('stat-pendientes').textContent = pendientes;
    document.getElementById('stat-recaudado').textContent = (pagados * PRECIO).toLocaleString();
    
    const tbody = document.getElementById('tabla-body');
    tbody.innerHTML = '';
    
    if (total === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">Sin registros</td></tr>';
        return;
    }
    
    Object.entries(registros).forEach(([num, r]) => {
        const tr = document.createElement('tr');
        const estado = r.pagado ? 
            '<span class="estado estado-pagado">✓ Pagado</span>' : 
            '<span class="estado estado-pendiente"> Pendiente</span>';
        
        const btnVer = r.comprobante ? 
            `<button class="btn-ver" onclick="verComp(${num})">👁 Ver</button>` : 
            '<span style="color:#999">Sin comprobante</span>';
        
        // ✅ CORRECCIÓN: El botón eliminar SIEMPRE está presente
        let btnAcc = `<button class="btn-eliminar" onclick="eliminar(${num})" title="Eliminar">🗑</button>`;
        
        // Si NO está pagado pero SÍ tiene comprobante, agregamos el botón de aprobar ANTES del eliminar
        if (!r.pagado && r.comprobante) {
            btnAcc = `<button class="btn-aprobar" onclick="aprobar(${num})" title="Aprobar">✓</button>` + btnAcc;
        }
        
        tr.innerHTML = `<td><strong>${String(num).padStart(2,'0')}</strong></td><td>${r.nombre}</td><td>${r.telefono}</td><td>${estado}</td><td>${btnVer}</td><td>${btnAcc}</td>`;
        tbody.appendChild(tr);
    });
}

function verComp(num) {
    const r = registros[num];
    if (!r || !r.comprobante) return;
    document.getElementById('comp-num').textContent = String(num).padStart(2,'0');
    document.getElementById('comp-img').src = r.comprobante;
    document.getElementById('comp-info').innerHTML = `<strong>${r.nombre}</strong> - ${r.telefono}<br><small>${new Date(r.fecha).toLocaleString()}</small>`;
    modalComp.classList.add('is-open');
}

async function aprobar(num) {
    if (!confirm('¿Aprobar pago del #' + String(num).padStart(2,'0') + ' y enviar mensaje de confirmación?')) return;
    
    try {
        // 1. Aprobar el pago en el servidor
        await fetch(`${API_URL}/${num}/aprobar`, { method: 'POST' });
        
        // 2. Obtener los datos del registro
        const registro = registros[num];
        
        if (registro && registro.telefono) {
            // 3. Preparar el mensaje de WhatsApp
            const numeroLimpio = registro.telefono.replace(/\D/g, ''); // Solo números
            const numeroWhatsApp = numeroLimpio.startsWith('57') ? numeroLimpio : '57' + numeroLimpio;
            
            const mensaje = `¡Hola ${registro.nombre}! 🏴‍☠️💰\n\n` +
                `✅ Tu pago para la Rifa del Tesoro de $200.000 ha sido APROBADO.\n\n` +
                `🎟️ Número: ${String(num).padStart(2, '0')}\n` +
                `💰 Valor pagado: $${PRECIO.toLocaleString()}\n\n` +
                `🎉 ¡Ya estás participando oficialmente! Te avisaremos cuando se realice el sorteo.\n\n` +
                `¡Mucha suerte, capitán! 🏴‍☠️⚓`;
            
            // 4. Crear el enlace de WhatsApp
            const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
            
            // 5. Abrir WhatsApp en nueva pestaña
            window.open(urlWhatsApp, '_blank');
        }
        
        toastMsg('✅ Pago aprobado y mensaje enviado', 'success');
        cargarTodo();
        
    } catch (err) { 
        console.error(err);
        toastMsg('Error al aprobar', 'error'); 
    }
}

async function eliminar(num) {
    if (!confirm('¿Eliminar registro #' + String(num).padStart(2,'0') + '?')) return;
    try {
        await fetch(`${API_URL}/${num}`, { method: 'DELETE' });
        toastMsg('Eliminado', 'success');
        cargarTodo();
    } catch (err) { toastMsg('Error', 'error'); }
}

async function reiniciarRifa() {
    if (!confirm('⚠️ ¿Reiniciar toda la rifa?')) return;
    if (!confirm('✋ ÚLTIMA ADVERTENCIA: ¿Continuar?')) return;
    try {
        await fetch('/api/reiniciar', { method: 'POST' });
        toastMsg('Rifa reiniciada', 'success');
        cargarTodo();
    } catch (err) { toastMsg('Error', 'error'); }
}

/* ============================================================
   UTILIDADES
   ============================================================ */
function cerrarModal(id) { 
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('is-open'); 
}

function copiar(id) {
    navigator.clipboard.writeText(document.getElementById(id).textContent).then(() => toastMsg('Copiado', 'success'));
}

function toastMsg(msg, tipo) {
    toastText.textContent = msg;
    toast.className = 'toast is-visible';
    toast.style.background = tipo === 'error' ? '#dc3545' : tipo === 'success' ? '#28a745' : '#5D3A1A';
    setTimeout(() => toast.classList.remove('is-visible'), 3000);
}

// Cerrar modales al hacer clic fuera
['modal-apartar', 'modal-pago', 'modal-comp', 'modal-login'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.onclick = (e) => { if (e.target.id === id) cerrarModal(id); };
    }
});

// Inicialización
cargarTodo();
setInterval(cargarTodo, 5000);
