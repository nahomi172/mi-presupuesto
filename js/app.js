
const CATS = {
  'gf-alquiler':   { label:'Alquiler / Hipoteca', grupo:'Fijos' },
  'gf-luz':        { label:'Luz',                 grupo:'Fijos' },
  'gf-internet':   { label:'Internet',            grupo:'Fijos' },
  'gf-celular':    { label:'Celular',             grupo:'Fijos' },
  'gf-mant':       { label:'Mantenimiento',       grupo:'Fijos' },
  'gf-suscri':     { label:'Suscripciones',       grupo:'Fijos' },
  'gf-deudas':     { label:'Deudas / Crédito',    grupo:'Fijos' },
  'gvn-alim':      { label:'Alimentación',        grupo:'Var. Nec.' },
  'gvn-transp':    { label:'Transporte',          grupo:'Var. Nec.' },
  'gvn-gasolina':  { label:'Gasolina',            grupo:'Var. Nec.' },
  'gvn-salud':     { label:'Salud',               grupo:'Var. Nec.' },
  'gvn-mascbanos': { label:'Mascota Baños',       grupo:'Var. Nec.' },
  'gvn-vet':       { label:'Veterinario',         grupo:'Var. Nec.' },
  'gvnn-rest':     { label:'Restaurantes',        grupo:'Var. No Nec.' },
  'gvnn-bares':    { label:'Bares',               grupo:'Var. No Nec.' },
  'gvnn-compras':  { label:'Compras Personales',  grupo:'Var. No Nec.' },
  'gvnn-viajes':   { label:'Viajes',              grupo:'Var. No Nec.' },
};

const GRUPO_COLORS = { 'Fijos':'#D85A30', 'Var. Nec.':'#7F77DD', 'Var. No Nec.':'#EF9F27' };
const GRUPO_LABELS = { 'Fijos':'Gastos Fijos', 'Var. Nec.':'Variables Necesarios', 'Var. No Nec.':'Variables No Necesarios' };
const SUELDO = 5500;
const fmt = n => 'S/ ' + (+n).toFixed(2);

function mesKey(d) {
  const dt = d ? new Date(d) : new Date();
  return dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0');
}
function mesLabel(key) {
  const [y,m] = key.split('-');
  const names = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return names[parseInt(m)-1] + ' ' + y;
}
function catLabel(k) { return CATS[k] ? CATS[k].label : k; }
function catGrupo(k) { return CATS[k] ? CATS[k].grupo : 'Var. Nec.'; }

let state = { operativo: 0, emergencia: 0, gastos: [], plantilla: [] };

let fondoModalTarget = '';

function showView(v) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('view-'+v).classList.add('active');
  document.getElementById('nav-'+v).classList.add('active');
  if (v==='plantilla') renderPlantilla();
}

function openFondoModal(tipo) {
  fondoModalTarget = tipo;
  const actual = tipo==='emergencia' ? state.emergencia : state.operativo;
  document.getElementById('modal-fondo-title').textContent = 'Ajustar ' + (tipo==='emergencia' ? 'Fondo Emergencia' : 'Fondo Operativo');
  document.getElementById('modal-fondo-subtitle').textContent = 'Saldo actual: ' + fmt(actual);
  document.getElementById('fondo-monto').value = '';
  document.getElementById('modal-fondo').style.display = 'flex';
}
function closeFondoModal() { document.getElementById('modal-fondo').style.display = 'none'; }

async function ajustarFondo(op) {
  const monto = parseFloat(document.getElementById('fondo-monto').value);
  if (isNaN(monto) || monto <= 0) { alert('Ingresa un monto válido.'); return; }
  const actual = fondoModalTarget==='emergencia' ? state.emergencia : state.operativo;
  if (op==='restar' && monto > actual) { alert('No puedes restar más de lo disponible.'); return; }
  closeFondoModal();
  setLoading(true);
  const delta = op==='sumar' ? monto : -monto;
  if (fondoModalTarget==='emergencia') state.emergencia = +(state.emergencia+delta).toFixed(2);
  else state.operativo = +(state.operativo+delta).toFixed(2);
  await apiPost({ action:'updateFondos', operativo:state.operativo, emergencia:state.emergencia });
  
const API_URL = 'https://script.google.com/macros/s/AKfycbwaOi1yyWKH3GnP6q81dYikf7_C75eTp7RzMrLHb_aLh8ri_uIX9lXy0VYwmXjUtf2S/exec';
const ALLOWED_EMAILS = ['nahomi172@gmail.com'];
let fondoModalTarget = '';

function setLoading(on) {
  document.getElementById('loading').style.display = on ? 'flex' : 'none';
}
async function apiGet(action) {
  const res = await fetch(API_URL + '?action=' + action);
  return res.json();
}
async function apiPost(body) {
  const res = await fetch(API_URL, { method:'POST', body:JSON.stringify(body) });
  return res.json();
}

function handleLogin(response) {
  const payload = JSON.parse(atob(response.credential.split('.')[1]));
  if (ALLOWED_EMAILS.includes(payload.email)) {
    localStorage.setItem('user_email', payload.email);
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    initApp();
  } else {
    document.getElementById('login-error').style.display = 'block';
  }
}
function logout() { localStorage.removeItem('user_email'); location.reload(); }

async function initApp() {
  setLoading(true);
  try {
    const [fondos, gastos] = await Promise.all([ apiGet('getFondos'), apiGet('getGastos') ]);
    state.operativo  = fondos.operativo;
    state.emergencia = fondos.emergencia;
    const seen = new Set();
    state.gastos = (gastos.data || []).filter(g => { if(seen.has(g.id)) return false; seen.add(g.id); return true; });
    render();
  } catch(e) { alert('Error conectando con Google Sheets.'); console.error(e); }
  setLoading(false);
}

window.addEventListener('load', () => {
  const saved = localStorage.getItem('user_email');
  if (saved && ALLOWED_EMAILS.includes(saved)) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    initApp();
  }
});

  setLoading(false);
}

async function addGasto() {
  const desc  = document.getElementById('desc').value.trim();
  const monto = parseFloat(document.getElementById('monto').value);
  const cat   = document.getElementById('cat').value;
  if (!desc || isNaN(monto) || monto <= 0) { alert('Completa descripcion y monto válido.'); return; }
  if (monto > state.operativo) { alert('Saldo insuficiente. Tienes ' + fmt(state.operativo)); return; }
  setLoading(true);
  const res = await apiPost({ action:'addGasto', desc, cat, monto, fecha:new Date().toISOString(), mes:mesKey() });
  if (res.ok) {
    state.operativo = +(state.operativo - monto).toFixed(2);
    state.gastos.push({ id:res.id, fecha:new Date().toISOString(), desc, cat, monto:+monto, mes:mesKey() });
    document.getElementById('desc').value  = '';
    document.getElementById('monto').value = '';
    render();
  }
  setLoading(false);
}

async function delGasto(id) {
  const g = state.gastos.find(x => x.id == id);
  if (!g) return;
  setLoading(true);
  const res = await apiPost({ action:'delGasto', id });
  if (res.ok) {
    state.operativo = +(state.operativo + parseFloat(g.monto)).toFixed(2);
    state.gastos    = state.gastos.filter(x => x.id != id);
    render();
  }
  setLoading(false);
}

async function guardarAhorro(mes, valor) {
  const monto = parseFloat(valor);
  if (isNaN(monto) || monto < 0) { alert('Ingresa un monto válido.'); return; }
  const anterior   = parseFloat(localStorage.getItem('ahorro-'+mes) || '0');
  const diferencia = monto - anterior;
  localStorage.setItem('ahorro-'+mes, monto.toFixed(2));
  if (diferencia !== 0) {
    state.emergencia = +(state.emergencia + diferencia).toFixed(2);
    setLoading(true);
    await apiPost({ action:'updateFondos', operativo:state.operativo, emergencia:state.emergencia });
    setLoading(false);
  }
  render();
}

function addPlantilla() {
  const desc  = document.getElementById('p-desc').value.trim();
  const monto = parseFloat(document.getElementById('p-monto').value);
  const cat   = document.getElementById('p-cat').value;
  if (!desc || isNaN(monto) || monto <= 0) { alert('Completa descripcion y monto.'); return; }
  state.plantilla.push({ rowIndex: state.plantilla.length+2, desc, cat, monto: +monto });
  document.getElementById('p-desc').value  = '';
  document.getElementById('p-monto').value = '';
  renderPlantilla();
}

function delPlantilla(rowIndex) {
  state.plantilla = state.plantilla.filter(f => f.rowIndex !== rowIndex);
  renderPlantilla();
}

function render() {
  document.getElementById('val-emergencia').textContent = fmt(state.emergencia);
  document.getElementById('val-operativo').textContent  = fmt(state.operativo);
  renderHistorial();
}

function renderHistorial() {
  const cont = document.getElementById('historial-inicio');
  const meses = {};
  state.gastos.forEach(g => {
    if (!meses[g.mes]) meses[g.mes] = {};
    meses[g.mes][g.id] = g;
  });
  const keys = Object.keys(meses).sort((a,b)=>b.localeCompare(a));
  if (!keys.length) { cont.innerHTML = '<p class="empty-msg">Sin historial aún.</p>'; return; }
  cont.innerHTML = '';
  keys.forEach(mes => {
    const lista  = Object.values(meses[mes]);
    const tot    = lista.reduce((s,g)=>s+parseFloat(g.monto),0);
    const ahorro = SUELDO - tot;
    const ahorroId = 'ahorro-' + mes.replace('-','');
    const ahorroGuardado = localStorage.getItem('ahorro-'+mes) || '';

    const grupos = { 'Fijos':[], 'Var. Nec.':[], 'Var. No Nec.':[] };
    lista.forEach(g => {
      const gr = catGrupo(g.cat);
      if (grupos[gr]) grupos[gr].push(g);
      else grupos['Var. Nec.'].push(g);
    });

    const bloque = document.createElement('div');
    bloque.style.cssText = 'margin-bottom:12px;border:1px solid #F4C0D1;border-radius:12px;overflow:hidden;';

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#FBEAF0;cursor:pointer;flex-wrap:wrap;gap:8px;';
    header.innerHTML = `
      <span style="font-size:14px;font-weight:600;color:#6B1A3A;">${mesLabel(mes)}</span>
      <div style="display:flex;align-items:center;gap:10px;font-size:12px;font-weight:500;flex-wrap:wrap;">
        <span style="color:#D85A30;">Gastado: ${fmt(tot)}</span>
        <div style="display:flex;align-items:center;gap:5px;">
          <span style="color:#085041;font-weight:600;">Ahorro:</span>
          <input id="${ahorroId}" type="number" value="${ahorroGuardado}" placeholder="0.00" step="0.01"
            style="width:80px;border:1.5px solid #9FE1CB;border-radius:8px;background:#E1F5EE;font-family:'Raleway',sans-serif;font-size:12px;font-weight:600;color:#0F6E56;outline:none;text-align:center;padding:3px 6px;"
            onclick="event.stopPropagation()"
            onkeydown="if(event.key==='Enter'){event.stopPropagation();guardarAhorro('${mes}',this.value);}" />
          <button onclick="event.stopPropagation();guardarAhorro('${mes}',document.getElementById('${ahorroId}').value)"
            style="border:none;background:#1D9E75;color:white;border-radius:8px;padding:4px 8px;font-size:10px;font-family:'Raleway',sans-serif;font-weight:700;cursor:pointer;">✓</button>
        </div>
      </div>`;

    const body = document.createElement('div');
    body.style.cssText = 'display:none;padding:12px 14px;';

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;';

    Object.entries(grupos).forEach(([grKey, items]) => {
      const col    = document.createElement('div');
      col.className = 'hist-col';
      const subtot = items.reduce((s,g)=>s+parseFloat(g.monto),0);
      const color  = GRUPO_COLORS[grKey] || '#888';
      col.innerHTML = `<div class="hist-col-title" style="color:${color};">${GRUPO_LABELS[grKey]}</div>`;
      if (!items.length) {
        col.innerHTML += `<p class="hist-col-empty">Sin gastos</p>`;
      } else {
        items.sort((a,b)=>parseFloat(b.monto)-parseFloat(a.monto)).forEach(g => {
          col.innerHTML += `<div class="hist-col-item"><span>${catLabel(g.cat)}</span><span>${fmt(g.monto)}</span></div>`;
        });
        col.innerHTML += `<div class="hist-col-total"><span>Subtotal</span><span>${fmt(subtot)}</span></div>`;
      }
      grid.appendChild(col);
    });

    body.appendChild(grid);
    header.onclick = (e) => { if(e.target.tagName!=='INPUT' && e.target.tagName!=='BUTTON') body.style.display = body.style.display==='none' ? 'block' : 'none'; };
    bloque.appendChild(header);
    bloque.appendChild(body);
    cont.appendChild(bloque);
  });
}

function renderPlantilla() {
  const lista = document.getElementById('plantilla-lista');
  if (!state.plantilla.length) { lista.innerHTML='<p class="empty-msg">Sin gastos fijos aún.</p>'; return; }
  lista.innerHTML='';
  state.plantilla.forEach(f => {
    const row = document.createElement('div'); row.className='plantilla-row';
    row.innerHTML=`
      <div style="display:flex;align-items:center;gap:6px;flex:1;">
        <span>${catLabel(f.cat) || f.desc}</span>
        <span style="font-size:11px;color:#C06090;">${catGrupo(f.cat)}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-weight:500;">${fmt(f.monto)}</span>
        <button style="padding:2px 8px;font-size:11px;color:white;border:none;border-radius:8px;background:#D4537E;cursor:pointer;" onclick="delPlantilla(${f.rowIndex})">x</button>
      </div>`;
    lista.appendChild(row);
  });
}

render();

function exportXLS() {
  const cur = mesKey();
  const wb  = XLSX.utils.book_new();
  const gdm = state.gastos.filter(g => g.mes === cur);

  const s1 = [['Fondo','Monto (S/)'],['Emergencia',state.emergencia],['Operativo',state.operativo]];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s1), 'Saldos');

  const s2 = [['Fecha','Descripcion','Categoria','Grupo','Monto (S/)']];
  gdm.forEach(g => {
    const d = new Date(g.fecha);
    s2.push([`${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`, g.desc, catLabel(g.cat), catGrupo(g.cat), g.monto]);
  });
  s2.push([], ['Total','','','', gdm.reduce((s,g)=>s+parseFloat(g.monto),0)]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s2), 'Gastos del mes');

  const bycat = {};
  gdm.forEach(g => { bycat[g.cat] = (bycat[g.cat]||0) + parseFloat(g.monto); });
  const s3 = [['Categoria','Grupo','Monto (S/)']];
  Object.entries(bycat).sort((a,b)=>b[1]-a[1]).forEach(([c,m]) => s3.push([catLabel(c), catGrupo(c), m]));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s3), 'Por categoria');

  const meses = {};
  state.gastos.forEach(g => { meses[g.mes] = (meses[g.mes]||0) + parseFloat(g.monto); });
  const s4 = [['Mes','Gastado (S/)','Ahorro (S/)']];
  Object.keys(meses).sort().forEach(m => s4.push([mesLabel(m), meses[m], 5500 - meses[m]]));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s4), 'Historial');

  XLSX.writeFile(wb, `presupuesto_${cur}.xlsx`);
}

function showView(v) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('view-'+v).classList.add('active');
  document.getElementById('nav-'+v).classList.add('active');
}
