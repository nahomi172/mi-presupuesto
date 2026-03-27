// ============================================================
//  IMPORTANTE: Reemplaza esta URL con la que te da Apps Script
//  después de implementar como App web
// ============================================================
const API_URL = 'https://script.google.com/macros/s/AKfycbwaOi1yyWKH3GnP6q81dYikf7_C75eTp7RzMrLHb_aLh8ri_uIX9lXy0VYwmXjUtf2S/exec';

const COLS = {
  Alimentacion: '#D4537E', Movilidad: '#7F77DD', Limpieza: '#1D9E75',
  Servicios: '#378ADD',    Ocio: '#EF9F27',       Creditos: '#D85A30',
  Vivienda:  '#AFA9EC',   Otro: '#888780'
};

const SUELDO = 5500;
const fmt    = n => 'S/ ' + (+n).toFixed(2);

function mesKey(d) {
  const dt = d ? new Date(d) : new Date();
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
}
function mesLabel(key) {
  const [y,m] = key.split('-');
  const names = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${names[parseInt(m)-1]} ${y}`;
}

let state = { operativo: 470.29, emergencia: 7000, gastos: [], plantilla: [], lastMonth: '' };

async function apiGet(action) {
  const res = await fetch(`${API_URL}?action=${action}`);
  return res.json();
}
async function apiPost(body) {
  const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(body) });
  return res.json();
}

function setLoading(on) {
  document.getElementById('loading').style.display = on ? 'flex' : 'none';
}

async function initApp() {
  setLoading(true);
  try {
    const [fondos, gastos, plantilla] = await Promise.all([
      apiGet('getFondos'), apiGet('getGastos'), apiGet('getPlantilla')
    ]);
    state.operativo  = fondos.operativo;
    state.emergencia = fondos.emergencia;
    state.gastos     = gastos.data || [];
    state.plantilla  = plantilla.data || [];
    state.lastMonth  = localStorage.getItem('lastMonth') || '';
    checkNewMonth();
    render();
  } catch(e) {
    alert('Error conectando. Verifica la URL en app.js');
    console.error(e);
  }
  setLoading(false);
}

function checkNewMonth() {
  const cur = mesKey();
  if (state.lastMonth && state.lastMonth !== cur && state.plantilla.length > 0) showModal();
  state.lastMonth = cur;
  localStorage.setItem('lastMonth', cur);
}

function showModal() {
  document.getElementById('modal-preview').innerHTML = state.plantilla.map(f =>
    `<div class="modal-preview-row"><span>${f.desc}</span><span style="font-weight:500;">${fmt(f.monto)}</span></div>`
  ).join('');
  document.getElementById('modal-fijos').style.display = 'flex';
}
function closeModal() { document.getElementById('modal-fijos').style.display = 'none'; }

async function cargarFijos() {
  setLoading(true); closeModal();
  const res = await apiPost({ action: 'cargarFijos', mes: mesKey() });
  if (res.ok) {
    state.operativo = res.operativo;
    state.gastos    = (await apiGet('getGastos')).data || [];
    render();
  }
  setLoading(false);
}

async function addGasto() {
  const desc  = document.getElementById('desc').value.trim();
  const monto = parseFloat(document.getElementById('monto').value);
  const cat   = document.getElementById('cat').value;
  if (!desc || isNaN(monto) || monto <= 0) { alert('Completa descripcion y monto válido.'); return; }
  if (monto > state.operativo) { alert('Saldo insuficiente. Tienes ' + fmt(state.operativo)); return; }
  setLoading(true);
  const res = await apiPost({ action: 'addGasto', desc, cat, monto, fecha: new Date().toISOString(), mes: mesKey() });
  if (res.ok) {
    state.operativo -= monto;
    state.gastos.push({ id: res.id, fecha: new Date().toISOString(), desc, cat, monto, mes: mesKey() });
    document.getElementById('desc').value = '';
    document.getElementById('monto').value = '';
    render();
  }
  setLoading(false);
}

async function delGasto(id) {
  const g = state.gastos.find(x => x.id == id);
  if (!g) return;
  setLoading(true);
  const res = await apiPost({ action: 'delGasto', id });
  if (res.ok) {
    state.operativo += parseFloat(g.monto);
    state.gastos     = state.gastos.filter(x => x.id != id);
    render();
  }
  setLoading(false);
}

async function addPlantilla() {
  const desc  = document.getElementById('p-desc').value.trim();
  const monto = parseFloat(document.getElementById('p-monto').value);
  const cat   = document.getElementById('p-cat').value;
  if (!desc || isNaN(monto) || monto <= 0) { alert('Completa descripcion y monto.'); return; }
  setLoading(true);
  const res = await apiPost({ action: 'addPlantilla', desc, cat, monto });
  if (res.ok) {
    state.plantilla = (await apiGet('getPlantilla')).data || [];
    document.getElementById('p-desc').value = '';
    document.getElementById('p-monto').value = '';
    renderPlantilla();
  }
  setLoading(false);
}

async function delPlantilla(rowIndex) {
  setLoading(true);
  const res = await apiPost({ action: 'delPlantilla', rowIndex });
  if (res.ok) {
    state.plantilla = (await apiGet('getPlantilla')).data || [];
    renderPlantilla();
  }
  setLoading(false);
}

function showView(v) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('view-' + v).classList.add('active');
  document.getElementById('nav-' + v).classList.add('active');
  if (v === 'historial') renderHistorial();
  if (v === 'plantilla') renderPlantilla();
}

function render() {
  document.getElementById('val-emergencia').textContent = fmt(state.emergencia);
  document.getElementById('val-operativo').textContent  = fmt(state.operativo);
  document.getElementById('mes-actual').textContent     = mesLabel(mesKey());

  const cur          = mesKey();
  const gastosDelMes = state.gastos.filter(g => g.mes === cur);
  const tot          = gastosDelMes.reduce((s,g) => s + parseFloat(g.monto), 0);

  document.getElementById('stat-gastado').textContent = 'Gastado: ' + fmt(tot);
  const aEl = document.getElementById('stat-ahorro');
  aEl.textContent = 'Disponible: ' + fmt(state.operativo);
  aEl.className   = state.operativo >= 0 ? 'ahorro-pos' : 'ahorro-neg';
  document.getElementById('total-gastado').textContent = fmt(tot);

  const lista = document.getElementById('lista-gastos');
  if (!gastosDelMes.length) {
    lista.innerHTML = '<p class="empty-msg">Sin gastos aún...</p>';
  } else {
    lista.innerHTML = '';
    gastosDelMes.slice().reverse().forEach(g => {
      const col = COLS[g.cat] || '#888780';
      const d   = new Date(g.fecha);
      const dia = `${d.getDate()}/${d.getMonth()+1}`;
      const el  = document.createElement('div');
      el.className = 'row-item';
      el.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;">
          <span style="width:7px;height:7px;border-radius:50%;background:${col};display:inline-block;flex-shrink:0;"></span>
          <span style="font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${g.desc}</span>
          <span style="font-size:10px;color:#C06090;flex-shrink:0;">${dia}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
          <span style="font-weight:500;font-size:13px;">${fmt(g.monto)}</span>
          <button class="btn-del" onclick="delGasto('${g.id}')">x</button>
        </div>`;
      lista.appendChild(el);
    });
  }

  const bycat = {};
  gastosDelMes.forEach(g => { bycat[g.cat] = (bycat[g.cat]||0) + parseFloat(g.monto); });
  const catsEl = document.getElementById('cats-resumen');
  catsEl.innerHTML = '';
  Object.entries(bycat).sort((a,b)=>b[1]-a[1]).forEach(([c,m]) => {
    const pct = tot > 0 ? (m/tot*100) : 0;
    const col = COLS[c] || '#888780';
    const el  = document.createElement('div');
    el.style.marginBottom = '8px';
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:2px;">
        <span style="color:#993056;">${c}</span><span style="font-weight:500;color:#6B1A3A;">${fmt(m)}</span>
      </div>
      <div class="bar-bg"><div class="bar-fill" style="width:${pct.toFixed(1)}%;background:${col};"></div></div>`;
    catsEl.appendChild(el);
  });
  document.getElementById('cats-card').style.display = gastosDelMes.length ? 'block' : 'none';
}

function renderHistorial() {
  const cont = document.getElementById('historial-content');
  if (!state.gastos.length) { cont.innerHTML = '<p class="empty-msg">Aún no hay historial.</p>'; return; }
  const meses = {};
  state.gastos.forEach(g => { if (!meses[g.mes]) meses[g.mes]=[]; meses[g.mes].push(g); });
  cont.innerHTML = '';
  Object.keys(meses).sort((a,b)=>b.localeCompare(a)).forEach(mes => {
    const lista=meses[mes], tot=lista.reduce((s,g)=>s+parseFloat(g.monto),0), ahorro=SUELDO-tot;
    const bloque=document.createElement('div'); bloque.className='mes-bloque';
    const header=document.createElement('div'); header.className='mes-header';
    header.innerHTML=`<span class="mes-nombre">${mesLabel(mes)}</span><div class="mes-stats"><span style="color:#D85A30;">Gastado: ${fmt(tot)}</span><span style="${ahorro>=0?'color:#1D9E75':'color:#D4537E'};">Ahorro: ${fmt(ahorro)}</span></div>`;
    const body=document.createElement('div'); body.className='mes-body'; body.style.display='none';
    lista.forEach(g=>{
      const d=new Date(g.fecha),dia=`${d.getDate()}/${d.getMonth()+1}`;
      const row=document.createElement('div'); row.className='mes-gasto-row';
      row.innerHTML=`<span style="color:#C06090;min-width:36px;">${dia}</span><span style="flex:1;padding:0 8px;">${g.desc}</span><span style="font-size:11px;color:#C06090;margin-right:8px;">${g.cat}</span><span style="font-weight:500;">${fmt(g.monto)}</span>`;
      body.appendChild(row);
    });
    header.onclick=()=>{ body.style.display=body.style.display==='none'?'block':'none'; };
    bloque.appendChild(header); bloque.appendChild(body); cont.appendChild(bloque);
  });
}

function renderPlantilla() {
  const lista = document.getElementById('plantilla-lista');
  if (!state.plantilla.length) { lista.innerHTML='<p class="empty-msg">Sin gastos fijos aún.</p>'; return; }
  lista.innerHTML='';
  state.plantilla.forEach(f=>{
    const row=document.createElement('div'); row.className='plantilla-row';
    row.innerHTML=`<div style="display:flex;align-items:center;gap:6px;flex:1;"><span style="width:7px;height:7px;border-radius:50%;background:${COLS[f.cat]||'#888'};display:inline-block;"></span><span>${f.desc}</span><span style="font-size:11px;color:#C06090;">${f.cat}</span></div><div style="display:flex;align-items:center;gap:8px;"><span style="font-weight:500;">${fmt(f.monto)}</span><button class="btn-danger" onclick="delPlantilla(${f.rowIndex})">x</button></div>`;
    lista.appendChild(row);
  });
}

function exportXLS() {
  const cur=mesKey(), wb=XLSX.utils.book_new(), gdm=state.gastos.filter(g=>g.mes===cur);
  const s1=[['Fondo','Monto (S/)'],['Emergencia',state.emergencia],['Operativo',state.operativo]];
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(s1),'Saldos');
  const s2=[['Fecha','Descripcion','Categoria','Monto (S/)']];
  gdm.forEach(g=>{const d=new Date(g.fecha);s2.push([`${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`,g.desc,g.cat,g.monto]);});
  s2.push([],['Total','','',gdm.reduce((s,g)=>s+parseFloat(g.monto),0)]);
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(s2),'Gastos del mes');
  const bycat={};gdm.forEach(g=>{bycat[g.cat]=(bycat[g.cat]||0)+parseFloat(g.monto);});
  const s3=[['Categoria','Monto (S/)']];Object.entries(bycat).sort((a,b)=>b[1]-a[1]).forEach(([c,m])=>s3.push([c,m]));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(s3),'Por categoria');
  const s4=[['Descripcion','Categoria','Monto (S/)']];state.plantilla.forEach(f=>s4.push([f.desc,f.cat,f.monto]));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(s4),'Gastos fijos');
  const meses={};state.gastos.forEach(g=>{meses[g.mes]=(meses[g.mes]||0)+parseFloat(g.monto);});
  const s5=[['Mes','Gastado (S/)','Ahorro (S/)']];Object.keys(meses).sort().forEach(m=>s5.push([mesLabel(m),meses[m],SUELDO-meses[m]]));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(s5),'Historial');
  XLSX.writeFile(wb,`presupuesto_${cur}.xlsx`);
}

initApp();
