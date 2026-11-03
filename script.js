// ===== Mesa de Ayuda TI: lógica de la aplicación =====
const ANS = { // horas
  P1: { respuesta: 0.25, solucion: 4 },
  P2: { respuesta: 0.5, solucion: 8 },
  P3: { respuesta: 2, solucion: 24 },
  P4: { respuesta: 4, solucion: 72 }
};
const CLAVE = 'mesa-ayuda-tickets';

// Matriz impacto x urgencia -> prioridad
function calcularPrioridad(impacto, urgencia) {
  const suma = Number(impacto) + Number(urgencia);
  if (suma >= 6) return 'P1';
  if (suma === 5) return 'P2';
  if (suma === 4) return 'P3';
  return 'P4';
}

function nivelInicial(prioridad) {
  return prioridad === 'P1' ? 'N2' : 'N1';
}

function fechaLimite(creado, prioridad) {
  return new Date(new Date(creado).getTime() + ANS[prioridad].solucion * 3600000);
}

function formatear(fecha) {
  return new Date(fecha).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

// ----- Persistencia (localStorage con respaldo en memoria) -----
let tickets = [];
function cargar() {
  try {
    const datos = localStorage.getItem(CLAVE);
    if (datos) { tickets = JSON.parse(datos); return; }
  } catch (e) { /* almacenamiento no disponible */ }
  tickets = datosEjemplo();
}
function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(tickets)); } catch (e) { /* sin persistencia */ }
}

function datosEjemplo() {
  const ahora = Date.now(), h = 3600000;
  const base = [
    ['Incidente', 'Laura Gómez', 'Red y conectividad', 'Sin internet en el piso 3', 3, 3, 'En progreso', 2],
    ['Incidente', 'Carlos Pérez', 'Accesos y contraseñas', 'Usuario bloqueado en el sistema contable', 1, 3, 'Abierto', 1],
    ['Solicitud', 'Ana Rodríguez', 'Software', 'Instalación de Office en equipo nuevo', 1, 1, 'En espera', 30],
    ['Incidente', 'Jorge Díaz', 'Correo', 'No llegan correos externos', 2, 2, 'Resuelto', 20],
    ['Incidente', 'Marta Ruiz', 'Hardware', 'Impresora del área de nómina no imprime', 2, 3, 'Abierto', 10]
  ];
  const cont = { Incidente: 0, Solicitud: 0 };
  return base.map(b => {
    cont[b[0]]++;
    const prio = calcularPrioridad(b[4], b[5]);
    const creado = new Date(ahora - b[7] * h).toISOString();
    return {
      id: (b[0] === 'Incidente' ? 'INC-' : 'REQ-') + String(cont[b[0]]).padStart(4, '0'),
      tipo: b[0], usuario: b[1], correo: b[1].split(' ')[0].toLowerCase() + '@empresa.com',
      categoria: b[2], asunto: b[3], descripcion: 'Caso de ejemplo para demostración.',
      impacto: b[4], urgencia: b[5], prioridad: prio, nivel: nivelInicial(prio),
      estado: b[6], creado,
      log: [{ fecha: creado, texto: 'Ticket registrado con prioridad ' + prio + '.' }]
    };
  });
}

// ----- Navegación entre vistas -----
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === btn.dataset.view));
  });
});

// ----- Tablero -----
const lista = document.getElementById('lista');
['f-texto', 'f-estado', 'f-prioridad', 'f-nivel'].forEach(id =>
  document.getElementById(id).addEventListener('input', pintar));

function vencido(t) {
  return !['Resuelto', 'Cerrado'].includes(t.estado) && fechaLimite(t.creado, t.prioridad) < new Date();
}

function pintar() {
  const texto = document.getElementById('f-texto').value.toLowerCase();
  const est = document.getElementById('f-estado').value;
  const pri = document.getElementById('f-prioridad').value;
  const niv = document.getElementById('f-nivel').value;

  const filtrados = tickets.filter(t =>
    (!texto || (t.id + t.asunto + t.usuario).toLowerCase().includes(texto)) &&
    (!est || t.estado === est) && (!pri || t.prioridad === pri) && (!niv || t.nivel === niv));

  lista.innerHTML = '';
  filtrados.sort((a, b) => a.prioridad.localeCompare(b.prioridad) || new Date(a.creado) - new Date(b.creado))
    .forEach(t => {
      const tr = document.createElement('tr');
      const limite = fechaLimite(t.creado, t.prioridad);
      tr.innerHTML = `<td><b>${t.id}</b></td><td>${t.tipo}</td><td class="asunto"></td><td></td>
        <td><span class="badge ${t.prioridad.toLowerCase()}">${t.prioridad}</span></td><td>${t.nivel}</td>
        <td><span class="badge estado">${t.estado}</span></td>
        <td class="${vencido(t) ? 'vencido' : ''}">${formatear(limite)}${vencido(t) ? ' (vencido)' : ''}</td>`;
      tr.children[2].textContent = t.asunto;
      tr.children[3].textContent = t.usuario;
      tr.addEventListener('click', () => abrirDetalle(t.id));
      lista.appendChild(tr);
    });
  document.getElementById('vacio').hidden = filtrados.length > 0;

  document.getElementById('k-abiertos').textContent = tickets.filter(t => t.estado === 'Abierto').length;
  document.getElementById('k-progreso').textContent = tickets.filter(t => ['En progreso', 'En espera'].includes(t.estado)).length;
  document.getElementById('k-vencidos').textContent = tickets.filter(vencido).length;
  document.getElementById('k-resueltos').textContent = tickets.filter(t => ['Resuelto', 'Cerrado'].includes(t.estado)).length;
}

// ----- Nuevo ticket -----
const imp = document.getElementById('t-impacto'), urg = document.getElementById('t-urgencia');
function previsualizar() {
  const p = calcularPrioridad(imp.value, urg.value);
  document.getElementById('t-prio').textContent = p;
  document.getElementById('t-ans').textContent =
    `Respuesta: ${ANS[p].respuesta * 60 < 60 ? ANS[p].respuesta * 60 + ' min' : ANS[p].respuesta + ' h'} · Solución: ${ANS[p].solucion} h · Nivel inicial: ${nivelInicial(p)}`;
}
imp.addEventListener('change', previsualizar);
urg.addEventListener('change', previsualizar);
previsualizar();

document.getElementById('form-ticket').addEventListener('submit', e => {
  e.preventDefault();
  const tipo = document.getElementById('t-tipo').value;
  const prefijo = tipo === 'Incidente' ? 'INC-' : 'REQ-';
  const consecutivo = Math.max(0, ...tickets.filter(t => t.id.startsWith(prefijo)).map(t => Number(t.id.slice(4)))) + 1;
  const prio = calcularPrioridad(imp.value, urg.value);
  const ahora = new Date().toISOString();
  const t = {
    id: prefijo + String(consecutivo).padStart(4, '0'), tipo,
    usuario: document.getElementById('t-usuario').value.trim(),
    correo: document.getElementById('t-correo').value.trim(),
    categoria: document.getElementById('t-categoria').value,
    asunto: document.getElementById('t-asunto').value.trim(),
    descripcion: document.getElementById('t-desc').value.trim(),
    impacto: Number(imp.value), urgencia: Number(urg.value),
    prioridad: prio, nivel: nivelInicial(prio), estado: 'Abierto', creado: ahora,
    log: [{ fecha: ahora, texto: `Ticket registrado con prioridad ${prio} y asignado a ${nivelInicial(prio)}.` }]
  };
  tickets.push(t);
  guardar();
  pintar();
  e.target.reset();
  previsualizar();
  document.getElementById('t-ok').textContent = `Ticket ${t.id} creado. Prioridad ${prio}, solución antes de ${formatear(fechaLimite(t.creado, prio))}.`;
});

// ----- Detalle y gestión -----
const dlg = document.getElementById('detalle');
let actual = null;
function abrirDetalle(id) {
  actual = tickets.find(t => t.id === id);
  const t = actual;
  const body = document.getElementById('d-body');
  body.innerHTML = `<h3>${t.id} · <span class="badge ${t.prioridad.toLowerCase()}">${t.prioridad}</span></h3>
    <p><b>Asunto:</b> <span id="d-asunto"></span></p>
    <p><b>Solicitante:</b> <span id="d-usuario"></span> · <b>Categoría:</b> ${t.categoria} · <b>Tipo:</b> ${t.tipo}</p>
    <p><b>Creado:</b> ${formatear(t.creado)} · <b>Límite ANS:</b> ${formatear(fechaLimite(t.creado, t.prioridad))}</p>
    <p><b>Descripción:</b> <span id="d-desc"></span></p>`;
  document.getElementById('d-asunto').textContent = t.asunto;
  document.getElementById('d-usuario').textContent = `${t.usuario} (${t.correo})`;
  document.getElementById('d-desc').textContent = t.descripcion;
  document.getElementById('d-estado').value = t.estado;
  document.getElementById('d-nivel').value = t.nivel;
  document.getElementById('d-nota').value = '';
  pintarLog();
  dlg.showModal();
}
function pintarLog() {
  const ul = document.getElementById('d-log');
  ul.innerHTML = '';
  [...actual.log].reverse().forEach(l => {
    const li = document.createElement('li');
    li.innerHTML = `<time>${formatear(l.fecha)}</time>`;
    li.appendChild(document.createTextNode(l.texto));
    ul.appendChild(li);
  });
}
document.getElementById('d-guardar').addEventListener('click', () => {
  const est = document.getElementById('d-estado').value;
  const niv = document.getElementById('d-nivel').value;
  const nota = document.getElementById('d-nota').value.trim();
  const ahora = new Date().toISOString();
  if (est !== actual.estado) actual.log.push({ fecha: ahora, texto: `Estado: ${actual.estado} → ${est}.` });
  if (niv !== actual.nivel) actual.log.push({ fecha: ahora, texto: `Escalado: ${actual.nivel} → ${niv}.` });
  if (nota) actual.log.push({ fecha: ahora, texto: nota });
  actual.estado = est;
  actual.nivel = niv;
  guardar();
  pintar();
  pintarLog();
  document.getElementById('d-nota').value = '';
});

cargar();
pintar();
