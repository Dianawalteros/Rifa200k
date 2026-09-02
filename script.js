/* ============================================================
   RIFA "TESORO PIRATA" — $200.000 EN EFECTIVO
   Lógica del tablero
   ============================================================ */
const API_URL = "/api/registros";
const TOTAL = 99;
const PRECIO = 10000;

// DOM
const tablero = document.getElementById('tablero');
const modalApartar = document.getElementById('modal-apartar');
const modalPago = document.getElementById('modal-pago');
const modalComp = document.getElementById('modal-comp');
const numApartar = document.getElementById('num-apartar');
const numPago = document.getElementById('num-pago');
const formApartar = document.getElementById('form-apartar');
const formPago = document.getElementById('form-pago');
const toast = document.getElementById('toast');
const toastText = document.getElementById('toast-text');
const contador = document.getElementById('contador');

let registros = {};
let numActual = null;

// Cargar/Guardar
function cargar() {
    const d = localStorage.getItem('rifa200');
    if (d) registros = JSON.parse(d);
    crearTablero();
    actualizarContador();
}

function guardar() {
    localStorage.setItem('rifa200', JSON.stringify(registros));
}

// Navegación
function cambiarPantalla(p) {
    document.querySelectorAll('.pantalla').forEach(x => x.classList.remove('activa'));
    document.querySelectorAll('.nav-btn').forEach(x => x.classList.remove('active'));
    document.getElementById('pantalla-' + p).classList.add('activa');
    document.getElementById('btn-' + p).classList.add('active');
    if (p === 'tablero') cargar();
    if (p === 'admin') cargarAdmin();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Tablero
function crearTablero() {
    if (!tablero) return;
    tablero.innerHTML = '';
    for (let i = 1; i <= TOTAL; i++) {
        const n = String(i).padStart(2, '0');
        const btn = document.createElement('button');
        btn.className = 'ticket';
        btn.textContent = n;
        const r = registros[i];
        if (r) {
            if (r.pagado) {
                btn.classList.add('is-paid');
                btn.title = 'Pagado por ' + r.nombre;
            } else {
                btn.classList.add('is-taken');
                btn.title = 'Apartado por ' + r.nombre;
            }
            btn.disabled = true;
        } else {
            btn.onclick = (function(num, txt) {
                return function() { abrirApartar(num, txt); };
            })(i, n);
        }
        tablero.appendChild(ticket);
    }
}

function actualizarContador() {
    if (!contador) return;
    const disp = TOTAL - Object.keys(registros).length;
    contador.textContent = disp + ' / ' + TOTAL;
}

// Modal apartar
function abrirApartar(num, txt) {
    numActual = num;
    numApartar.textContent = txt;
    document.getElementById('form-apartar').reset();
    modalApartar.classList.add('is-open');
    document.getElementById('nombre-ap').focus();
}

formApartar.onsubmit = function(e) {
    e.preventDefault();
    const nombre = document.getElementById('nombre-ap').value.trim();
    const tel = document.getElementById('tel-ap').value.trim();
    const email = document.getElementById('email-ap').value.trim();
    
    if (nombre.length < 3) {
        mostrarToast('Nombre muy corto', 'error');
        return;
    }
    if (tel.replace(/\D/g, '').length < 7) {
        mostrarToast('Teléfono inválido', 'error');
        return;
    }
    
    registros[numActual] = {
        nombre: nombre,
        tel: tel,
        email: email,
        pagado: false,
        comprobante: null,
        fecha: new Date().toISOString()
    };
    guardar();
    cerrarModal('modal-apartar');
    mostrarToast('Número ' + String(numActual).padStart(2,'0') + ' apartado. Ahora paga.', 'success');
    setTimeout(function() { abrirPago(numActual); }, 500);
    crearTablero();
    actualizarContador();
};

// Modal pago
function abrirPago(num) {
    numPago.textContent = String(num).padStart(2, '0');
    document.getElementById('form-pago').reset();
    modalPago.classList.add('is-open');
}

formPago.onsubmit = function(e) {
    e.preventDefault();
    const file = document.getElementById('comprobante').files[0];
    if (!file) {
        mostrarToast('Sube el comprobante', 'error');
        return;
    }
    if (file.size > 2 * 1024 * 1024) {
        mostrarToast('Máximo 2MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(ev) {
        const num = Object.keys(registros).find(function(k) {
            return !registros[k].pagado && String(k).padStart(2,'0') === numPago.textContent;
        });
        if (num) {
            registros[num].comprobante = ev.target.result;
            registros[num].fechaPago = new Date().toISOString();
            guardar();
            cerrarModal('modal-pago');
            mostrarToast('Comprobante enviado. Espera confirmación.', 'success');
            crearTablero();
        }
    };
    reader.readAsDataURL(file);
};

// Admin
function cargarAdmin() {
    const total = Object.keys(registros).length;
    const pagados = Object.values(registros).filter(function(r) { return r.pagado; }).length;
    const pendientes = total - pagados;
    const recaudado = pagados * PRECIO;
    
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-pagados').textContent = pagados;
    document.getElementById('stat-pendientes').textContent = pendientes;
    document.getElementById('stat-recaudado').textContent = recaudado.toLocaleString();
    
    const tbody = document.getElementById('tabla-body');
    tbody.innerHTML = '';
    
    if (total === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">Sin registros</td></tr>';
        return;
    }
    
    Object.entries(registros).forEach(function(entry) {
        const num = entry[0];
        const r = entry[1];
        const tr = document.createElement('tr');
        const estado = r.pagado ? 
            '<span class="estado estado-pagado">✓ Pagado</span>' : 
            '<span class="estado estado-apartado">⏳ Pendiente</span>';
        
        const btnVer = r.comprobante ? 
            '<button class="btn-ver" onclick="verComp(' + num + ')">👁 Ver</button>' : 
            '<span style="color:#999">Sin comprobante</span>';
        
        const btnAcc = r.pagado ? 
            '<button class="btn-eliminar" onclick="eliminar(' + num + ')">🗑</button>' :
            (r.comprobante ? '<button class="btn-aprobar" onclick="aprobar(' + num + ')">✓ Aprobar</button>' : '');
        
        tr.innerHTML = '<td><strong>' + String(num).padStart(2,'0') + '</strong></td>' +
            '<td>' + r.nombre + '</td>' +
            '<td>' + r.tel + '</td>' +
            '<td>' + estado + '</td>' +
            '<td>' + btnVer + '</td>' +
            '<td>' + btnAcc + '</td>';
        tbody.appendChild(tr);
    });
}
// Función para eliminar un registro individual
async function eliminar(num) {
    if (!confirm('¿Estás seguro de eliminar el registro #' + String(num).padStart(2,'0') + '?')) {
        return;
    }
    
    try {
        const resp = await fetch(`${API_URL}/${num}`, {
            method: 'DELETE'
        });
        
        if (!resp.ok) {
            throw new Error('Error al eliminar');
        }
        
        toastMsg('Registro eliminado', 'success');
        cargarTodo(); // Recargar todo
    } catch (err) {
        console.error('Error:', err);
        toastMsg('Error al eliminar', 'error');
    }
}
async function reiniciarRifa() {
    // Primera confirmación
    if (!confirm('⚠️ ¿ESTÁS SEGURO DE REINICIAR TODA LA RIFA?\n\nEsto eliminará TODOS los registros y no se puede deshacer.')) {
        return;
    }
    
    // Segunda confirmación
    if (!confirm('✋ ÚLTIMA ADVERTENCIA:\n\n¿Realmente quieres borrar todos los datos?')) {
        return;
    }
    
    try {
        console.log('🔄 Iniciando reinicio...');
        const resp = await fetch('/api/reiniciar', { method: 'POST' });
        const data = await resp.json();
        
        console.log('Respuesta del servidor:', data);
        
        if (!resp.ok) {
            throw new Error(data.error || 'Error desconocido');
        }
        
        toastMsg('✅ Rifa reiniciada desde cero', 'success');
        cargarTodo();
    } catch (err) {
        console.error('❌ Error al reiniciar:', err);
        toastMsg('Error: ' + err.message, 'error');
    }
}
function verComp(num) {
    const r = registros[num];
    if (!r || !r.comprobante) return;
    document.getElementById('comp-num').textContent = String(num).padStart(2,'0');
    document.getElementById('comp-img').src = r.comprobante;
    document.getElementById('comp-info').innerHTML = 
        '<strong>' + r.nombre + '</strong> - ' + r.tel + '<br>' +
        (r.email || '') + '<br>' +
        '<small>' + new Date(r.fechaPago).toLocaleString() + '</small>';
    modalComp.classList.add('is-open');
}

function aprobar(num) {
    if (!confirm('¿Aprobar pago del #' + String(num).padStart(2,'0') + '?')) return;
    registros[num].pagado = true;
    registros[num].fechaAprob = new Date().toISOString();
    guardar();
    cargarAdmin();
    mostrarToast('Pago #' + String(num).padStart(2,'0') + ' aprobado', 'success');
}

function eliminar(num) {
    if (!confirm('¿Eliminar registro #' + String(num).padStart(2,'0') + '?')) return;
    delete registros[num];
    guardar();
    cargarAdmin();
    crearTablero();
    mostrarToast('Registro eliminado', 'info');
}

// Utilidades
function cerrarModal(id) {
    document.getElementById(id).classList.remove('is-open');
}

function copiar(id) {
    const txt = document.getElementById(id).textContent;
    navigator.clipboard.writeText(txt).then(function() {
        mostrarToast('Copiado al portapapeles', 'success');
    });
}

function mostrarToast(msg, tipo) {
    toastText.textContent = msg;
    toast.className = 'toast is-visible';
    if (tipo === 'error') {
        toast.style.background = '#ff4444';
    } else if (tipo === 'success') {
        toast.style.background = '#28a745';
    } else {
        toast.style.background = '#5D3A1A';
    }
    setTimeout(function() { toast.classList.remove('is-visible'); }, 3000);
}

// Cerrar modales al clic fuera
modalApartar.onclick = function(e) {
    if (e.target === modalApartar) cerrarModal('modal-apartar');
};
modalPago.onclick = function(e) {
    if (e.target === modalPago) cerrarModal('modal-pago');
};
modalComp.onclick = function(e) {
    if (e.target === modalComp) cerrarModal('modal-comp');
};
/* ============================================================
   AUTENTICACIÓN ADMIN
   ============================================================ */
const ADMIN_USER = "sami";
const ADMIN_PASS = "1234"; // ️ CAMBIA ESTA CONTRASEÑA

const modalLogin = document.getElementById('modal-login');
const formLogin = document.getElementById('form-login');
const loginError = document.getElementById('login-error');

// Modificar la función cambiarPantalla para pedir contraseña
function cambiarPantalla(pantalla) {
    if (pantalla === 'admin') {
        // Verificar si ya está autenticado
        if (sessionStorage.getItem('adminAuth') === 'true') {
            mostrarAdmin();
        } else {
            abrirModalLogin();
        }
        return;
    }
    
    // Para otras pantallas, comportamiento normal
    document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('pantalla-' + pantalla).classList.add('activa');
    document.getElementById('btn-' + pantalla).classList.add('active');
    
    if (pantalla === 'tablero') cargarRegistros();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function abrirModalLogin() {
    document.getElementById('login-user').value = '';
    document.getElementById('login-pass').value = '';
    loginError.textContent = '';
    modalLogin.classList.add('is-open');
    setTimeout(() => document.getElementById('login-user').focus(), 100);
}

function cerrarModalLogin() {
    modalLogin.classList.remove('is-open');
}

formLogin.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value;
    
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        // Autenticación exitosa
        sessionStorage.setItem('adminAuth', 'true');
        cerrarModalLogin();
        mostrarAdmin();
        mostrarToast('✅ Acceso concedido', 'success');
    } else {
        loginError.textContent = '❌ Usuario o contraseña incorrectos';
        document.getElementById('login-pass').value = '';
        document.getElementById('login-pass').focus();
    }
});

function mostrarAdmin() {
    document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('pantalla-admin').classList.add('activa');
    document.getElementById('btn-admin').classList.add('active');
    cargarAdmin();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function logout() {
    sessionStorage.removeItem('adminAuth');
    cambiarPantalla('inicio');
    mostrarToast('Sesión cerrada', 'info');
}

// Cerrar modal login al hacer clic fuera
modalLogin.addEventListener('click', (e) => {
    if (e.target === modalLogin) cerrarModalLogin();
});

// Cerrar con tecla Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalLogin.classList.contains('is-open')) {
        cerrarModalLogin();
    }
});

// Inicio
cargar();
