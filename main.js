// === Configuración ===
// Número con código de país, sin "+" ni espacios. Ej.: '5491112345678'.
// Si se deja vacío, las consultas se envían por email y los links de WhatsApp no aparecen.
const WHATSAPP = '5491122373236';
const EMAIL = 'contact@greva.ar';

// === Links internos: scrollear sin agregar #seccion a la URL ===
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#"]');
  const target = link && link.getAttribute('href').length > 1 && document.querySelector(link.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView(); // respeta scroll-behavior y scroll-padding del CSS
  // mover el foco para que el teclado siga desde la sección
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
});

// === Menú mobile ===
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('nav');
const closeNav = () => { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', false); };
toggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
});
nav.addEventListener('click', (e) => { if (e.target.closest('a')) closeNav(); });
nav.addEventListener('focusout', (e) => { if (!nav.contains(e.relatedTarget) && e.relatedTarget !== toggle) closeNav(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && nav.classList.contains('open')) { closeNav(); toggle.focus(); }
});

// === Calculadora ===
// Medidas en cm, peso en kg por bulto. Aéreo: factor 6000 (cm³/kg).
function calcular(largo, ancho, alto, bultos, peso) {
  const cm3 = largo * ancho * alto * bultos;
  const vol = cm3 / 6000;
  const real = peso * bultos;
  return { m3: cm3 / 1e6, real, vol, facturable: Math.max(real, vol) };
}

const fmt = (n, dec) => n.toLocaleString('es-AR', { maximumFractionDigits: dec });
const calcForm = document.getElementById('calc-form');
const calcBtn = document.getElementById('calc-to-quote');
const out = (id, text) => { document.getElementById(id).textContent = text; };
let ultimoCalculo = '';
let insertado = ''; // línea que el botón ya pegó en el formulario, para reemplazarla y no duplicarla

function actualizarCalculo() {
  const v = Object.fromEntries([...new FormData(calcForm)].map(([k, x]) => [k, parseFloat(x)]));
  const ok = v.largo > 0 && v.ancho > 0 && v.alto > 0 && v.bultos >= 1;
  calcBtn.disabled = !ok;
  if (!ok) { ['r-m3', 'r-real', 'r-vol', 'r-fact'].forEach((id) => out(id, '—')); ultimoCalculo = ''; return; }

  const bultos = Math.round(v.bultos);
  const peso = v.peso > 0 ? v.peso : 0;
  const r = calcular(v.largo, v.ancho, v.alto, bultos, peso);
  out('r-m3', `${fmt(r.m3, 3)} m³`);
  out('r-real', peso ? `${fmt(r.real, 1)} kg` : '—');
  out('r-vol', `${fmt(r.vol, 1)} kg`);
  // sin peso real no se puede saber cuál es mayor
  out('r-fact', peso ? `${fmt(r.facturable, 1)} kg` : '—');

  ultimoCalculo = `${bultos} bulto(s) de ${fmt(v.largo, 1)} × ${fmt(v.ancho, 1)} × ${fmt(v.alto, 1)} cm`
    + (peso ? `, ${fmt(peso, 1)} kg c/u` : '')
    + `. Volumen total: ${fmt(r.m3, 3)} m³`
    + (peso ? `. Peso real: ${fmt(r.real, 1)} kg` : '')
    + `. Peso volumétrico: ${fmt(r.vol, 1)} kg.`;
}
calcForm.addEventListener('input', actualizarCalculo);
actualizarCalculo(); // por si el navegador restauró valores al recargar

calcBtn.addEventListener('click', () => {
  const detalle = document.getElementById('detalle');
  if (insertado && detalle.value.includes(insertado)) {
    detalle.value = detalle.value.replace(insertado, () => ultimoCalculo);
  } else {
    detalle.value = detalle.value ? `${detalle.value}\n${ultimoCalculo}` : ultimoCalculo;
  }
  insertado = ultimoCalculo;
  document.getElementById('cotizar').scrollIntoView();
  document.querySelector('#quote-form [name="nombre"]').focus({ preventScroll: true });
});

// === Formulario de cotización ===
const quoteForm = document.getElementById('quote-form');
const status = document.getElementById('form-status');
const copyBtn = document.getElementById('copy-msg');
let ultimoMensaje = '';

if (WHATSAPP) {
  const waUrl = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hola GREVA, quiero hacer una consulta.')}`;
  document.querySelectorAll('.wa-link').forEach((a) => { a.href = waUrl; a.hidden = false; });
  document.getElementById('form-note').textContent = 'Al enviar se abre WhatsApp con tu consulta lista.';
}

quoteForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(quoteForm));
  const campos = [
    ['Nombre', d.nombre], ['Empresa', d.empresa], ['Teléfono', d.telefono], ['Email', d.email],
    ['Perfil', d.perfil], ['Destino', d.destino], ['Modalidad', d.modalidad],
    ['Producto', d.producto], ['Detalle', d.detalle],
  ];
  ultimoMensaje = 'Hola GREVA, quiero solicitar una cotización.\n\n'
    + campos.filter(([, x]) => x && x.trim()).map(([k, x]) => `${k}: ${x.trim()}`).join('\n');

  if (WHATSAPP) {
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(ultimoMensaje)}`, '_blank', 'noopener');
  } else {
    const asunto = `Solicitud de cotización - ${d.nombre.trim()}`;
    location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(ultimoMensaje.replace(/\n/g, '\r\n'))}`;
  }
  copyBtn.textContent = 'Copiar mensaje';
  status.hidden = false;
  status.focus();
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(ultimoMensaje);
    copyBtn.textContent = '¡Copiado!';
  } catch {
    copyBtn.textContent = 'No se pudo copiar';
  }
});
