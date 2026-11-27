// CVRCVMO Creative Studio · experiencia: idioma, precios, WhatsApp, revelación, escultura, menú, exposición y sonido.
import {dirigirEscultura} from './escultura.js';
import {crearSonido} from './sonido.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const EN = window.LANG === 'en';
const WA = '529843182480';
const T = (es, en) => (EN ? en : es);

/* ---------------- idioma: el español está en el HTML; el inglés en data-en ---------------- */
if (EN) {
  $$('[data-en]').forEach((el) => { el.innerHTML = el.getAttribute('data-en'); });
  $$('[data-en-href]').forEach((el) => el.setAttribute('href', el.getAttribute('data-en-href')));
  $$('[data-en-aria]').forEach((el) => el.setAttribute('aria-label', el.getAttribute('data-en-aria')));
  $$('[data-en-alt]').forEach((el) => el.setAttribute('alt', el.getAttribute('data-en-alt')));
  $$('[data-en-placeholder]').forEach((el) => el.setAttribute('placeholder', el.getAttribute('data-en-placeholder')));
  $$('[data-en-content]').forEach((el) => el.setAttribute('content', el.getAttribute('data-en-content')));
  $$('[data-en-value]').forEach((el) => { el.value = el.getAttribute('data-en-value'); });
  $$('[data-en-t]').forEach((el) => el.setAttribute('data-t', el.getAttribute('data-en-t')));
  $$('[data-en-fmt]').forEach((el) => el.setAttribute('data-fmt', el.getAttribute('data-en-fmt')));
  $('.lang').setAttribute('lang', 'es');
  $('#selloTxt').textContent = 'CVRCVMO GUARANTEE · PROTECTED DEPOSIT · CVRCVMO GUARANTEE · PROTECTED DEPOSIT ·';
  root.classList.remove('i18n-pending');
}
// Cambio de idioma: si la dirección no trae ?lang, se guarda la preferencia y se recarga la misma página
$('.lang').addEventListener('click', (e) => {
  if (new URLSearchParams(location.search).has('lang')) return;
  try { localStorage.setItem('lang', EN ? 'es' : 'en'); e.preventDefault(); location.reload(); } catch (err) { /* sigue el enlace */ }
});

/* ---------------- WhatsApp: mensajes ya escritos ---------------- */
const MSG = {
  muestra: T('Hola Diego, vi su página y me gustaría solicitar una muestra gratuita para mi negocio.', "Hi Diego, I saw your website and I'd like to request a free sample for my business."),
  hola: T('Hola Diego, vi su página y tengo una pregunta.', 'Hi Diego, I saw your website and I have a question.'),
  marca: T('Hola Diego, vi el antes y después en su página y me gustaría solicitar una propuesta para mi marca.', "Hi Diego, I saw the before & after on your website and I'd like to request a proposal for my brand."),
  revision: T('Hola Diego, me gustaría solicitar la revisión gratuita de mi perfil. Mi cuenta es: @', "Hi Diego, I'd like to request the free review of my profile. My account is: @"),
};
const waLink = (text) => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
$$('[data-wa]').forEach((a) => { a.href = waLink(MSG[a.getAttribute('data-wa')]); });
$$('[data-wa-svc]').forEach((a) => {
  const svc = EN ? a.getAttribute('data-en-svc') : a.getAttribute('data-wa-svc');
  a.href = waLink(T(`Hola Diego, vi su página y me interesa: ${svc}.`, `Hi Diego, I saw your website and I'm interested in: ${svc}.`));
});
$('#quote').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target, n = f.nombre.value.trim(), b = f.negocio.value.trim(), s = f.servicio.value;
  const text = T(`Hola Diego, soy ${n} de ${b}. Vi su página y me interesa ${s}.`, `Hi Diego, I'm ${n} from ${b}. I saw your website and I'm interested in ${s}.`);
  // enlace real (no window.open): funciona donde las ventanas emergentes están bloqueadas
  const a = document.createElement('a');
  a.href = waLink(text); a.target = '_blank'; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  $('#formMsg').textContent = T('Abrimos WhatsApp con su mensaje. Si no se abrió, escríbanos al 984 318 2480.', "We've opened WhatsApp with your message. If it didn't open, write to us at +52 984 318 2480.");
});

/* ---------------- precios: de lanzamiento hasta el 30 de noviembre; desde el 1 de diciembre, tarifas nuevas ---------------- */
// 1 de diciembre de 2026, 00:00 en Cancún (UTC−5) = 05:00 UTC
const LAUNCH_ENDS = Date.UTC(2026, 11, 1, 5, 0, 0);
const fmt = (n) => '$' + Number(n).toLocaleString('en-US');
if (Date.now() < LAUNCH_ENDS) {
  $('#promo').hidden = false;
  $$('[data-promo]').forEach((el) => { el.hidden = false; });
  $$('[data-launch]').forEach((el) => {
    el.textContent = fmt(el.getAttribute('data-launch'));
    if (!el.hasAttribute('data-note')) return;
    const note = document.createElement('span');
    note.className = 'next-price';
    note.textContent = T('Desde el 1 de diciembre: ', 'From December 1: ') + fmt(el.getAttribute('data-p'));
    const price = el.closest('.svc-price');
    if (price) price.appendChild(note);
    else (el.closest('.amt') || el).insertAdjacentElement('afterend', note);
  });
}

/* ---------------- texto que se revela por palabras ---------------- */
function splitWords(el, cls, wrapInner) {
  let i = 0;
  const walk = (node) => {
    [...node.childNodes].forEach((ch) => {
      if (ch.nodeType === 3) {
        const frag = document.createDocumentFragment();
        ch.textContent.split(/(\s+)/).forEach((p) => {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
          const w = document.createElement('span'); w.className = cls;
          if (wrapInner) { const s = document.createElement('span'); s.textContent = p; s.style.setProperty('--d', `${Math.min(i, 12) * 0.06}s`); w.appendChild(s); }
          else w.textContent = p;
          i++; frag.appendChild(w);
        });
        ch.replaceWith(frag);
      } else if (ch.nodeType === 1 && ch.tagName !== 'BR') walk(ch);
    });
  };
  walk(el);
}
$$('.split').forEach((el) => splitWords(el, 'w', true));
const statement = $('#statement');
if (statement) splitWords(statement, 'sw', false);
const statementWords = statement ? $$('.sw', statement) : [];

const revealables = $$('.rise, .split');
if (!reduce && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), {rootMargin: '0px 0px -8% 0px', threshold: 0.01});
  revealables.forEach((el) => io.observe(el));
  $$('.svc-list, .packs, .g-list, .nichos, .faq-list, .pactos, .ba-notes, .datos').forEach((g) => $$('.rise', g).forEach((el, i) => el.style.setProperty('--d', `${(i % 6) * 0.07}s`)));
} else revealables.forEach((el) => el.classList.add('in'));

/* ---------------- sonido (solo si el visitante lo enciende) ---------------- */
const sonido = crearSonido();
const soundBtn = $('#soundBtn');
if (!sonido) soundBtn.hidden = true;
else soundBtn.addEventListener('click', async () => {
  const on = await sonido.toggle();
  soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  soundBtn.setAttribute('aria-label', on ? T('Apagar sonido ambiental', 'Turn off ambient sound') : T('Activar sonido ambiental', 'Turn on ambient sound'));
});
const sfx = (k) => { if (sonido && sonido.on) sonido[k](); };

/* ---------------- escultura ---------------- */
const escultura = dirigirEscultura($('#escultura'), {reduce, onMorph: () => sfx('morph')});

// Revelación: oscuridad → luz sobre el metal → aparece el nombre. Con menos movimiento, todo aparece de una vez.
if (reduce) $$('.reveal-late').forEach((el) => el.style.setProperty('--d', '0s'));
else if (!escultura) $$('.reveal-late').forEach((el) => el.style.setProperty('--d', `${parseFloat(el.style.getPropertyValue('--d') || 0) * 0.35}s`));
requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('revealed')));

// Foto de Diego: si existe img/diego.jpg se muestra en lugar de la escultura
(() => {
  const img = $('#retratoImg'), slot = $('#retratoSlot');
  const probe = new Image();
  probe.onload = () => { img.src = probe.src; img.hidden = false; if (slot) { slot.remove(); escultura && escultura.remove(slot); } };
  probe.src = img.dataset.src;
})();

/* ---------------- menú de pantalla completa ---------------- */
const top = $('#top'), menu = $('#menu'), menuBtn = $('#menuBtn');
const behind = [$('main'), $('.pie'), $('#rail'), $('#waFloat')];
let lastFocus = null;
function setMenu(open) {
  root.classList.toggle('menu-open', open);
  menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  menu.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (open) { menu.removeAttribute('inert'); behind.forEach((el) => el && el.setAttribute('inert', '')); lastFocus = document.activeElement; setTimeout(() => $('.menu-list a', menu).focus({preventScroll: true}), 350); }
  else { menu.setAttribute('inert', ''); behind.forEach((el) => el && el.removeAttribute('inert')); if (lastFocus && lastFocus.focus) lastFocus.focus({preventScroll: true}); }
  document.body.style.overflow = open ? 'hidden' : '';
  $('.menu-l', menuBtn).textContent = open ? T('Cerrar', 'Close') : T('Menú', 'Menu');
  sfx('whoosh');
}
menuBtn.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
$$('a', menu).forEach((a) => a.addEventListener('click', () => { if (a.getAttribute('href').startsWith('#')) setMenu(false); }));
addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('menu-open')) setMenu(false); });
$$('.menu-list a, .rail a, .btn, .svc-ask').forEach((el) => el.addEventListener('pointerenter', () => sfx('tick')));

/* ---------------- exposición ---------------- */
const hall = $('#hall'), track = $('#hallTrack'), piezas = $$('.pieza', track), hallNow = $('#hallNow');
let pinDist = 0;
function layoutHall() {
  const pin = !reduce && innerWidth >= 1000;
  hall.classList.toggle('pinned', pin);
  if (pin) { pinDist = Math.max(0, track.scrollWidth - innerWidth); hall.style.height = `${pinDist + innerHeight}px`; }
  else { hall.style.height = ''; track.style.removeProperty('--x'); pinDist = 0; }
}
let playing = null;
function updateHall() {
  const vw = innerWidth, mid = vw / 2, hr = hall.getBoundingClientRect();
  const inView = hr.bottom > 0 && hr.top < innerHeight;
  if (!inView && !playing) return;
  let best = null, bd = Infinity;
  piezas.forEach((p) => {
    const r = p.getBoundingClientRect(), d = r.left + r.width / 2 - mid;
    if (Math.abs(d) < bd && r.bottom > 0 && r.top < innerHeight) { bd = Math.abs(d); best = p; }
    const v = $('video', p);
    if (!v.src && r.left < vw * 1.6 && r.right > -vw * 0.6 && r.top < innerHeight * 1.5 && r.bottom > -innerHeight * 0.5) { v.src = v.dataset.src; v.preload = 'metadata'; }
    if (!reduce) { const k = Math.max(-1, Math.min(1, d / vw)); const m = $('.pieza-marco', p); m.style.setProperty('--ry', `${(-k * 20).toFixed(2)}deg`); m.style.setProperty('--sc', (1 - Math.abs(k) * 0.07).toFixed(3)); }
  });
  if (best && hallNow) hallNow.textContent = String(piezas.indexOf(best) + 1).padStart(2, '0');
  const want = inView && !reduce && !salaOpen() ? best : null;
  if (want !== playing) {
    if (playing) $('video', playing).pause();
    playing = want;
    if (playing) { const v = $('video', playing); if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); }
  }
}
track.addEventListener('scroll', () => requestAnimationFrame(updateHall), {passive: true});

// sala: cada pieza a pantalla completa, con su placa y sonido
const sala = $('#sala'), salaV = $('#salaVideo');
let salaI = 0;
const salaOpen = () => sala.open;
function showPieza(i) {
  salaI = (i + piezas.length) % piezas.length;
  const p = piezas[salaI];
  salaV.src = p.dataset.video; salaV.muted = false;
  $('#salaN').textContent = `Nº ${String(salaI + 1).padStart(2, '0')} / ${String(piezas.length).padStart(2, '0')}`;
  $('#salaT').textContent = $('.placa b', p).textContent;
  const tag = $('.placa-m .tag', p);
  const marca = [...$('.placa-m', p).childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('');
  $('#salaM').textContent = [marca, tag ? tag.textContent : ''].filter(Boolean).join(' · ');
  $('#salaD').textContent = `${p.dataset.disc} · ${p.dataset.fmt}`;
  salaV.play().catch(() => {});
}
piezas.forEach((p, i) => $('.pieza-obra', p).addEventListener('click', () => {
  if (typeof sala.showModal !== 'function') { window.open(p.dataset.video, '_blank'); return; }
  if (playing) { $('video', playing).pause(); playing = null; }
  sala.showModal(); showPieza(i); sfx('whoosh');
}));
$('#salaPrev').addEventListener('click', () => { showPieza(salaI - 1); sfx('tick'); });
$('#salaNext').addEventListener('click', () => { showPieza(salaI + 1); sfx('tick'); });
$('#salaClose').addEventListener('click', () => sala.close());
sala.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') showPieza(salaI + 1); if (e.key === 'ArrowLeft') showPieza(salaI - 1); });
sala.addEventListener('click', (e) => { if (e.target === sala) sala.close(); });
sala.addEventListener('close', () => { salaV.pause(); salaV.removeAttribute('src'); salaV.load(); requestTick(); });

/* ---------------- antes y después ---------------- */
(() => {
  const ba = $('#ba'); if (!ba) return;
  const before = $('#baBefore'), line = $('#baLine'), range = $('#baRange');
  let drag = false, touched = false;
  const set = (p) => { p = Math.max(0, Math.min(100, p)); before.style.clipPath = `inset(0 ${100 - p}% 0 0)`; line.style.left = `${p}%`; range.value = Math.round(p); };
  const at = (e) => { const r = ba.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * 100; };
  ba.addEventListener('pointerdown', (e) => { drag = touched = true; set(at(e)); });
  addEventListener('pointermove', (e) => { if (drag) set(at(e)); });
  addEventListener('pointerup', () => { drag = false; });
  addEventListener('pointercancel', () => { drag = false; });
  range.addEventListener('input', () => { touched = true; set(+range.value); });
  set(50);
  if (!reduce && 'IntersectionObserver' in window) {
    let shown = false;
    new IntersectionObserver((es) => {
      if (!es[0].isIntersecting || shown) return; shown = true;
      const t0 = performance.now();
      const step = (now) => { const k = (now - t0) / 2400; if (touched) return; if (k >= 1) { set(50); return; } set(50 + Math.sin(k * Math.PI * 2) * 28 * (1 - k * 0.3)); requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }, {threshold: 0.6}).observe(ba);
  }
})();

/* ---------------- preguntas: abrir y cerrar con suavidad ---------------- */
$$('.faq-list details').forEach((d) => {
  const sum = $('summary', d), ans = $('.ans', d);
  sum.addEventListener('click', (e) => {
    if (reduce || !ans.animate) return;
    e.preventDefault();
    sfx('tick');
    if (d.open) {
      const h = ans.offsetHeight;
      ans.animate([{height: `${h}px`, opacity: 1}, {height: '0px', opacity: 0}], {duration: 450, easing: 'cubic-bezier(.76,0,.24,1)'}).onfinish = () => { d.open = false; };
    } else {
      d.open = true;
      const h = ans.offsetHeight;
      ans.animate([{height: '0px', opacity: 0}, {height: `${h}px`, opacity: 1}], {duration: 600, easing: 'cubic-bezier(.2,.8,.2,1)'});
    }
  });
});

/* ---------------- cursor: botones magnéticos y obras con inclinación ---------------- */
if (fine && !reduce) {
  $$('.magnet').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--tx', `${((e.clientX - r.left - r.width / 2) * 0.2).toFixed(1)}px`);
      el.style.setProperty('--ty', `${((e.clientY - r.top - r.height / 2) * 0.28).toFixed(1)}px`);
    });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--tx', '0px'); el.style.setProperty('--ty', '0px'); });
  });
  $$('.tilt').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - 0.5) * 7).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${(-((e.clientY - r.top) / r.height - 0.5) * 7).toFixed(2)}deg`);
    });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--ry', '0deg'); el.style.setProperty('--rx', '0deg'); });
  });
}

/* ---------------- scroll: un solo bucle, solo cuando hay movimiento ---------------- */
const heroSec = $('.hero'), heroTrack = $('#heroTrack');
const progressSecs = $$('main > section');
const claros = $$('.claro');
const rail = $('#rail'), railLinks = $$('a', rail);
const menuLinks = $$('.menu-list a');
const nowN = $('#nowN'), nowT = $('#nowT');
const discLinks = $$('.disc-nav a'), caps = discLinks.map((a) => $(a.getAttribute('href')));
const pasos = $('#pasos'), pasoEls = $$('.paso', pasos);
const pieLogo = $('.pie-logo'), casoImg = $('.caso-media img');
const waFloat = $('#waFloat'), contacto = $('#contacto');
const ids = ['inicio', 'manifiesto', 'obras', 'disciplinas', 'industrias', 'garantia', 'comparar', 'proceso', 'estudio', 'preguntas', 'contacto'];
const navSecs = ids.map((id) => document.getElementById(id));
let ticking = false;

function onScroll() {
  ticking = false;
  const vh = innerHeight, y = scrollY, max = root.scrollHeight - vh;
  top.classList.toggle('scrolled', y > 30);

  // portada: avance dentro del tramo fijo; la escultura se acerca a la cámara
  const hr = heroTrack.getBoundingClientRect();
  const hp = reduce ? 0 : clamp01(-hr.top / Math.max(1, hr.height - vh));
  heroSec.style.setProperty('--hp', hp.toFixed(4));
  if (escultura) { escultura.setHero(hp); heroSec.style.setProperty('--glow', escultura.light.toFixed(3)); }

  // tema bajo la cabecera y bajo el índice lateral
  const themeAt = (py) => { for (const s of progressSecs) { const r = s.getBoundingClientRect(); if (r.top <= py && r.bottom > py) return s.dataset.theme; } return 'dark'; };
  top.classList.toggle('on-light', !root.classList.contains('menu-open') && themeAt(38) === 'light');
  rail.classList.toggle('on-light', themeAt(vh / 2) === 'light');
  rail.classList.toggle('away', y < vh * 0.5);

  // ventanas de marfil que se abren
  if (!reduce) claros.forEach((s) => { const t = s.getBoundingClientRect().top; s.style.setProperty('--win', clamp01((t - vh * 0.1) / (vh * 0.7)).toFixed(4)); });

  // manifiesto: las palabras se encienden con el scroll
  if (statement && !reduce) {
    const r = statement.getBoundingClientRect();
    const n = Math.round(clamp01((vh * 0.85 - r.top) / (r.height + vh * 0.35)) * statementWords.length);
    statementWords.forEach((w, i) => w.classList.toggle('lit', i < n));
  }

  // sección actual: índice lateral, menú y etiqueta de la cabecera
  let cur = 0;
  navSecs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < vh * 0.45) cur = i; });
  railLinks.forEach((a, i) => a.classList.toggle('on', i === cur));
  menuLinks.forEach((a, i) => a.classList.toggle('on', i === cur));
  const centerSec = progressSecs.find((s) => { const r = s.getBoundingClientRect(); return r.top <= vh * 0.45 && r.bottom > vh * 0.45; });
  if (centerSec && nowT) { nowN.textContent = centerSec.dataset.n || '00'; if (nowT.textContent !== centerSec.dataset.t) nowT.textContent = centerSec.dataset.t || ''; }

  // disciplinas
  let dc = -1;
  caps.forEach((c, i) => { if (c && c.getBoundingClientRect().top < vh * 0.5) dc = i; });
  discLinks.forEach((a, i) => a.classList.toggle('on', i === dc));

  // galería fija horizontal
  if (pinDist > 0) { const r = hall.getBoundingClientRect(); track.style.setProperty('--x', `${(-clamp01(-r.top / pinDist) * pinDist).toFixed(1)}px`); }
  updateHall();

  // proceso
  if (pasos) {
    const r = pasos.getBoundingClientRect();
    pasos.style.setProperty('--p', clamp01((vh * 0.62 - r.top) / r.height).toFixed(4));
    pasoEls.forEach((s) => s.classList.toggle('on', s.getBoundingClientRect().top < vh * 0.62));
  }
  if (!reduce) {
    if (casoImg) { const r = casoImg.parentElement.getBoundingClientRect(); casoImg.style.setProperty('--py', `${((r.top + r.height / 2 - vh / 2) * -0.06).toFixed(1)}px`); }
    if (pieLogo) pieLogo.style.setProperty('--fy', `${Math.min(140, (max - y) * 0.2).toFixed(1)}px`);
  }
  // WhatsApp flotante: aparece al salir de la portada y se esconde en el contacto
  const cr = contacto.getBoundingClientRect();
  waFloat.classList.toggle('show', hp >= 0.98 && y > vh && !(cr.top < vh * 0.7 && cr.bottom > 0));
}
const requestTick = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } };
addEventListener('scroll', requestTick, {passive: true});
let lastW = innerWidth;
addEventListener('resize', () => { if (innerWidth !== lastW || !hall.classList.contains('pinned')) { lastW = innerWidth; layoutHall(); } requestTick(); });
layoutHall();
onScroll();
// la luz de la portada sube durante la revelación: se refleja en el halo detrás del nombre
if (escultura && !reduce) { const t0 = performance.now(); const glow = () => { heroSec.style.setProperty('--glow', escultura.light.toFixed(3)); if (escultura.light < 1 && performance.now() - t0 < 6000) requestAnimationFrame(glow); }; requestAnimationFrame(glow); }
(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { layoutHall(); requestTick(); });


/* ---------------- Visual Studies: se carga al acercarse y suena nada; solo se mueve a la vista ---------------- */
{
  const v = $('.vs-video');
  if (v) {
    const en = EN;
    const src = (en && v.dataset.srcEn) || v.dataset.src;
    if (reduce) { v.controls = true; v.preload = 'metadata'; v.src = src; v.removeAttribute('loop'); }
    else if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting) { if (!v.src) v.src = src; v.play().catch(() => {}); } else v.pause();
      }), {threshold: 0.35}).observe(v);
    } else { v.src = src; v.controls = true; }
  }
}
