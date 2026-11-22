// Perchero 3D · Hustler's Ambition
// Una sola escena de three.js: el perchero negro, las prendas colgadas (fotos recortadas
// con volumen), la vista de producto que gira y el carrito.
// ?video  → modo de render cuadro por cuadro (lo usa tools/render-perchero.cjs para hacer el MP4).
import * as THREE from 'three';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';

const VIDEO = new URLSearchParams(location.search).has('video');
// En la versión de un solo archivo (para mandar por mensaje) las imágenes vienen incrustadas
const asset = (p) => (window.__ASSETS && window.__ASSETS[p]) || p;
const REDUCE = !VIDEO && matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = !VIDEO && matchMedia('(hover: hover) and (pointer: fine)').matches;
if (VIDEO) document.documentElement.classList.add('video');

// ---------------------------------------------------------------- datos
const CATALOGO = {
	'naci-pa-ganar': {nombre: 'Naci Pa Ganar', precio: 650},
	'only-cash': {nombre: 'Only Cash', precio: 550},
	'2pac': {nombre: '2Pac', extra: 'All Eyez On Me', precio: 650},
	'santa-grifa': {nombre: 'Santa Grifa', precio: 550},
	'snoop-dogg': {nombre: 'Snoop Dogg', precio: 650},
	sayonara: {nombre: 'Sayonara', precio: 550},
	tyga: {nombre: 'Tyga', precio: 550},
	'good-am': {nombre: 'GO:OD AM', extra: 'Mac Miller', precio: 550},
	'el-vicio-y-la-fama': {nombre: 'El Vicio y La Fama', precio: 650},
	'charles-ans': {nombre: 'Charles Ans', precio: 550},
	grillz: {nombre: 'Grillz', precio: 550},
	'dont-be-dumb': {nombre: 'Dont Be Dumb', extra: 'A$AP Rocky', precio: 550},
};
// canción de la portada de cada prenda: a = artista, k = álbum o canción de la portada, q = lo que se busca.
// Suena el adelanto oficial de 30 s de Apple Music (iTunes Search API); la página no guarda ningún audio.
// Para fijar una canción exacta se puede poner id: <número de la canción en Apple Music>.
const MUSICA = {
	'naci-pa-ganar': {a: 'Faruz Feet', k: 'Naci Pa Ganar', q: 'Faruz Feet Naci Pa Ganar'},
	'only-cash': {a: 'Wu-Tang Clan', k: 'C.R.E.A.M.', q: 'Wu-Tang Clan C.R.E.A.M.'},
	'2pac': {a: '2Pac', k: 'All Eyez On Me', q: '2Pac All Eyez On Me'},
	'santa-grifa': {a: 'Santa Grifa', k: 'Frenia', q: 'Santa Grifa Frenia'},
	'snoop-dogg': {a: 'Snoop Dogg', k: 'Top Dogg', q: 'Snoop Dogg No Limit Top Dogg'},
	sayonara: {a: null, k: 'Sayonara', q: 'Sayonara', genre: /urbano|latin|reggaet|hip|rap/i},
	tyga: {a: 'Tyga', k: '', q: 'Tyga'},
	'good-am': {a: 'Mac Miller', k: 'GO:OD AM', q: 'Mac Miller GO:OD AM'},
	'el-vicio-y-la-fama': {a: 'Gera MX', k: 'El Vicio y La Fama', q: 'Gera MX El Vicio y La Fama'},
	'charles-ans': {a: 'Charles Ans', k: '', q: 'Charles Ans'},
	grillz: {a: 'Nelly', k: 'Grillz', q: 'Nelly Grillz'},
	'dont-be-dumb': {a: 'A$AP Rocky', k: "Don't Be Dumb", q: "A$AP Rocky Don't Be Dumb"},
};
const LINEA = {playera: 'Playera boxy fit', hoodie: 'Hoodie', sudadera: 'Sudadera'};
const ALTO = {playera: 0.7, sudadera: 0.7, hoodie: 0.86}; // metros
const GROSOR = {playera: 0.024, sudadera: 0.03, hoodie: 0.04};
const HERO = '2pac'; // la prenda que se abre en el video

const RAIL_Y = 1.5;
const RACK_L = 2.0;
const SP = 0.138; // separación entre ganchos
const NECK = 0.112; // del tubo al cuello de la prenda

// ---------------------------------------------------------------- utilidades
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const damp = (a, b, l, dt) => b + (a - b) * Math.exp(-l * dt);
const smooth = (a, b, x) => {
	const t = clamp((x - a) / (b - a), 0, 1);
	return t * t * (3 - 2 * t);
};
class Spring {
	constructor(v, k = 70, c = 11) {
		this.v = v;
		this.t = v;
		this.vel = 0;
		this.k = k;
		this.c = c;
	}
	step(dt) {
		const n = Math.max(1, Math.ceil(dt / 0.004));
		const h = dt / n;
		for (let i = 0; i < n; i++) {
			this.vel += (this.k * (this.t - this.v) - this.c * this.vel) * h;
			this.v += this.vel * h;
		}
	}
}

// ---------------------------------------------------------------- DOM
const $ = (id) => document.getElementById(id);
const canvas = $('gl');
const ui = {
	label: $('label'), panel: $('panel'), back: $('backBtn'), drawer: $('drawer'), hint: $('hint'),
	badge: $('badge'), cartBtn: $('cartBtn'), tabs: $('tabs'), top: document.querySelector('.top'),
	fly: $('fly'), touch: $('touch'), ripple: $('ripple'), outro: $('outro'), intro: $('intro'), loader: $('loader'), bar: $('bar'),
	sizes: [...$('sizes').children], add: $('addBtn'), items: $('items'), total: $('total'),
	song: $('song'), songBtn: $('songBtn'), songTitle: $('songTitle'), songArtist: $('songArtist'), songLink: $('songLink'),
	pName: $('pName'), pLine: $('pLine'), pPrice: $('pPrice'), pSizeTxt: $('pSizeTxt'), pKicker: $('pKicker'),
};
ui.hint.textContent = FINE ? 'Pasa el mouse por el perchero · clic para verla' : 'Desliza el dedo por el perchero · toca una prenda';

// ---------------------------------------------------------------- render
let renderer;
try {
	renderer = new THREE.WebGLRenderer({canvas, antialias: true, preserveDrawingBuffer: VIDEO, powerPreference: 'high-performance'});
} catch (e) {
	ui.loader.innerHTML = '<p class="err">Tu navegador no pudo abrir el 3D. Prueba en Chrome o Safari actualizados.</p>';
	throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, VIDEO ? 2 : 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
scene.fog = new THREE.Fog(0x050505, 7, 15);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.32;

const cam = new THREE.PerspectiveCamera(30, 1, 0.05, 80);
scene.add(cam);

// ---------------------------------------------------------------- luces
const hemi = new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 0.35);
scene.add(hemi);
const key = new THREE.SpotLight(0xfff3e6, 90, 0, 0.5, 0.8, 2);
key.position.set(0.55, 4.7, 2.3);
key.target.position.set(0, 0.75, 0);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 1.5;
key.shadow.camera.far = 9;
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;
key.shadow.radius = 5;
scene.add(key, key.target);
const rim = new THREE.SpotLight(0xdde5ff, 70, 0, 0.62, 0.9, 2);
rim.position.set(-1.9, 3.4, -2.7);
rim.target.position.set(0, 1.0, 0);
scene.add(rim, rim.target);
const prodLight = new THREE.DirectionalLight(0xffffff, 0);
scene.add(prodLight, prodLight.target);
const KEY_I = key.intensity, RIM_I = rim.intensity, HEMI_I = hemi.intensity;

// ---------------------------------------------------------------- texturas de apoyo
const loadMgr = new THREE.LoadingManager();
loadMgr.onProgress = (_u, done, total) => (ui.bar.style.width = Math.round((done / total) * 100) + '%');
const texLoader = new THREE.TextureLoader(loadMgr);
const maxAniso = renderer.capabilities.getMaxAnisotropy();

function radialTexture(stops) {
	const c = document.createElement('canvas');
	c.width = c.height = 128;
	const g = c.getContext('2d');
	const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
	stops.forEach(([o, a]) => gr.addColorStop(o, `rgba(255,255,255,${a})`));
	g.fillStyle = gr;
	g.fillRect(0, 0, 128, 128);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
}

// ---------------------------------------------------------------- piso y pared
const cementP = texLoader.loadAsync(asset('cemento.jpg'));
const floorMat = new THREE.MeshStandardMaterial({color: 0x9a9a9a, roughness: 0.94, metalness: 0});
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const wallMat = new THREE.MeshStandardMaterial({color: 0x5a5a5a, roughness: 0.96});
const wall = new THREE.Mesh(new THREE.PlaneGeometry(18, 8), wallMat);
wall.position.set(0, 4, -2.9);
wall.receiveShadow = true;
scene.add(wall);
function applyCement(tex) {
	tex.colorSpace = THREE.SRGBColorSpace;
	const make = (rx, ry) => {
		const t = tex.clone();
		t.wrapS = t.wrapT = THREE.RepeatWrapping;
		t.repeat.set(rx, ry);
		t.anisotropy = maxAniso;
		t.needsUpdate = true;
		return t;
	};
	floorMat.map = make(22, 22);
	wallMat.map = make(9, 4);
	floorMat.needsUpdate = wallMat.needsUpdate = true;
}

// ---------------------------------------------------------------- perchero (el de la foto)
const metal = new THREE.MeshPhysicalMaterial({color: 0x0c0c0d, metalness: 0.55, roughness: 0.34, clearcoat: 0.5, clearcoatRoughness: 0.25});
const rubber = new THREE.MeshStandardMaterial({color: 0x2a2a2a, roughness: 0.9});
const rack = new THREE.Group();
scene.add(rack);
const TUBE_R = 0.0135;
const FOOT_TOP = 0.148;
{
	const hx = RACK_L / 2, cr = 0.075;
	const V = (x, y) => new THREE.Vector3(x, y, 0);
	const path = new THREE.CurvePath();
	path.add(new THREE.LineCurve3(V(-hx, FOOT_TOP - 0.01), V(-hx, RAIL_Y - cr)));
	path.add(new THREE.QuadraticBezierCurve3(V(-hx, RAIL_Y - cr), V(-hx, RAIL_Y), V(-hx + cr, RAIL_Y)));
	path.add(new THREE.LineCurve3(V(-hx + cr, RAIL_Y), V(hx - cr, RAIL_Y)));
	path.add(new THREE.QuadraticBezierCurve3(V(hx - cr, RAIL_Y), V(hx, RAIL_Y), V(hx, RAIL_Y - cr)));
	path.add(new THREE.LineCurve3(V(hx, RAIL_Y - cr), V(hx, FOOT_TOP - 0.01)));
	const frame = new THREE.Mesh(new THREE.TubeGeometry(path, 700, TUBE_R, 20, false), metal);
	rack.add(frame);
	// perillas de arriba
	const knobG = new THREE.SphereGeometry(0.019, 24, 16);
	const neckG = new THREE.CylinderGeometry(0.007, 0.009, 0.02, 16);
	for (const s of [-1, 1]) {
		const k = new THREE.Mesh(knobG, metal);
		k.position.set(s * (hx - 0.095), RAIL_Y + TUBE_R + 0.026, 0);
		const n = new THREE.Mesh(neckG, metal);
		n.position.set(s * (hx - 0.095), RAIL_Y + TUBE_R + 0.008, 0);
		rack.add(k, n);
	}
	// patas en forma de arco (tubo rectangular)
	const sh = new THREE.Shape();
	const a = 0.26, t = 0.03, R = 0.05, r = 0.022, top = FOOT_TOP, inner = FOOT_TOP - t;
	sh.moveTo(-a, 0);
	sh.lineTo(-a, top - R);
	sh.quadraticCurveTo(-a, top, -a + R, top);
	sh.lineTo(a - R, top);
	sh.quadraticCurveTo(a, top, a, top - R);
	sh.lineTo(a, 0);
	sh.lineTo(a - t, 0);
	sh.lineTo(a - t, inner - r);
	sh.quadraticCurveTo(a - t, inner, a - t - r, inner);
	sh.lineTo(-a + t + r, inner);
	sh.quadraticCurveTo(-a + t, inner, -a + t, inner - r);
	sh.lineTo(-a + t, 0);
	sh.lineTo(-a, 0);
	const footG = new THREE.ExtrudeGeometry(sh, {depth: 0.03, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 3, curveSegments: 14});
	footG.translate(0, 0.008, -0.015);
	footG.rotateY(Math.PI / 2);
	const padG = new THREE.BoxGeometry(0.042, 0.01, 0.04);
	for (const s of [-1, 1]) {
		const f = new THREE.Mesh(footG, metal);
		f.position.x = s * hx;
		rack.add(f);
		for (const z of [-a + t / 2, a - t / 2]) {
			const p = new THREE.Mesh(padG, rubber);
			p.position.set(s * hx, 0.005, z);
			rack.add(p);
		}
	}
	// las dos barras de abajo
	const barG = new THREE.CylinderGeometry(0.0115, 0.0115, RACK_L, 20);
	barG.rotateZ(Math.PI / 2);
	for (const z of [-0.085, 0.085]) {
		const b = new THREE.Mesh(barG, metal);
		b.position.set(0, FOOT_TOP - 0.006, z);
		rack.add(b);
	}
	rack.traverse((o) => {
		if (o.isMesh) {
			o.castShadow = true;
			o.receiveShadow = true;
		}
	});
}

// ---------------------------------------------------------------- gancho cromado
// cromo cepillado: rayitas finas a lo largo del alambre (roughness disparejo) y brillo estirado (anisotropy)
function scratchTex() {
	const c = document.createElement('canvas');
	c.width = 512;
	c.height = 64;
	const g = c.getContext('2d');
	g.fillStyle = 'rgb(0,70,0)';
	g.fillRect(0, 0, 512, 64);
	let s = 11;
	const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
	for (let i = 0; i < 900; i++) {
		const y = r() * 64, x = r() * 512, l = 20 + r() * 160, v = 40 + r() * 90;
		g.strokeStyle = `rgba(0,${v | 0},0,${0.25 + r() * 0.5})`;
		g.lineWidth = 0.5 + r();
		g.beginPath();
		g.moveTo(x, y);
		g.lineTo(x + l, y + (r() - 0.5) * 1.5);
		g.stroke();
	}
	// manchitas de uso
	for (let i = 0; i < 40; i++) {
		g.fillStyle = `rgba(0,${120 + r() * 60 | 0},0,${0.15 + r() * 0.2})`;
		g.beginPath();
		g.ellipse(r() * 512, r() * 64, 4 + r() * 14, 1 + r() * 3, 0, 0, 7);
		g.fill();
	}
	const t = new THREE.CanvasTexture(c);
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.repeat.set(3, 1);
	t.anisotropy = 8;
	return t;
}
const chrome = new THREE.MeshPhysicalMaterial({color: 0xe4e4e8, metalness: 1, roughness: 1, roughnessMap: scratchTex(), anisotropy: 0.65, anisotropyRotation: 0, clearcoat: 0.35, clearcoatRoughness: 0.08, envMapIntensity: 1.6});
const hookGeo = (() => {
	const R = 0.021, cy = TUBE_R + 0.0035 - R; // el arco descansa sobre el tubo
	const pts = [];
	for (let a = 218; a >= -38; a -= 8) {
		const r = (a * Math.PI) / 180;
		pts.push(new THREE.Vector3(Math.cos(r) * R, cy + Math.sin(r) * R, 0));
	}
	pts.push(new THREE.Vector3(0.011, -0.045, 0), new THREE.Vector3(0.002, -0.068, 0), new THREE.Vector3(0, -0.084, 0));
	const hook = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 140, 0.0031, 14, false);
	// punta redondeada
	const tip = new THREE.SphereGeometry(0.0031, 12, 8);
	const p0 = pts[0];
	tip.translate(p0.x, p0.y, p0.z);
	return mergeGeos([hook, tip]);
})();
// el alambre torcido de abajo del gancho: dos hilos en espiral
const ferruleGeo = (() => {
	const parts = [];
	const top = -0.084, bot = -NECK - 0.012, turns = 3.2, rr = 0.0026;
	for (const off of [0, Math.PI]) {
		const pts = [];
		for (let k = 0; k <= 80; k++) {
			const u = k / 80, a = off + u * turns * Math.PI * 2;
			const rad = rr * Math.min(1, u * 6, (1 - u) * 6 + 0.35);
			pts.push(new THREE.Vector3(Math.cos(a) * rad, lerp(top, bot, u), Math.sin(a) * rad));
		}
		parts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.0023, 10, false));
	}
	return mergeGeos(parts);
})();
function mergeGeos(list) {
	// une geometrías no indexadas (posición, normal y uv)
	const gs = list.map((g) => (g.index ? g.toNonIndexed() : g));
	const out = new THREE.BufferGeometry();
	for (const k of ['position', 'normal', 'uv']) {
		const n = gs[0].attributes[k].itemSize;
		const arr = new Float32Array(gs.reduce((s, g) => s + g.attributes[k].array.length, 0));
		let o = 0;
		for (const g of gs) {
			arr.set(g.attributes[k].array, o);
			o += g.attributes[k].array.length;
		}
		out.setAttribute(k, new THREE.BufferAttribute(arr, n));
	}
	return out;
}

// ---------------------------------------------------------------- etiqueta de precio
function tagTexture(precio) {
	const c = document.createElement('canvas');
	c.width = 200;
	c.height = 320;
	const g = c.getContext('2d');
	g.fillStyle = '#ECEAE4';
	g.beginPath();
	g.roundRect(6, 6, 188, 308, 18);
	g.fill();
	// fibra del cartón
	g.save();
	g.clip();
	let s = precio;
	const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
	for (let i = 0; i < 1400; i++) {
		g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${0.03 + r() * 0.05})` : `rgba(255,255,255,${0.2 + r() * 0.3})`;
		g.fillRect(r() * 200, r() * 320, 1 + r() * 5, 0.7);
	}
	g.restore();
	g.globalCompositeOperation = 'destination-out';
	g.beginPath();
	g.arc(100, 40, 11, 0, Math.PI * 2);
	g.fill();
	g.globalCompositeOperation = 'source-over';
	g.fillStyle = '#0a0a0a';
	g.textAlign = 'center';
	g.font = 'italic 700 40px Piazzolla, Georgia, serif';
	g.fillText('hustler$', 100, 118);
	g.fillRect(40, 140, 120, 2);
	g.font = '700 58px "Instrument Sans", sans-serif';
	g.fillText('$' + precio, 100, 215);
	g.font = '700 22px "Instrument Sans", sans-serif';
	g.fillText('MXN', 100, 252);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	t.anisotropy = maxAniso;
	return t;
}

// ---------------------------------------------------------------- prenda con volumen
// La foto recortada se vuelve una "almohada": el centro de la prenda se infla y las
// orillas quedan delgadas. Frente y espalda se juntan en la orilla.
function alphaGrid(img, w, h) {
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	const g = c.getContext('2d', {willReadFrequently: true});
	g.drawImage(img, 0, 0, w, h);
	const d = g.getImageData(0, 0, w, h).data;
	const a = new Float32Array(w * h);
	for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] / 255;
	return a;
}
// pliegues de caída: los mismos para frente y espalda (la tela se dobla junta)
function drape(x, y, W, H, seed) {
	const yn = clamp(0.5 - y / H, 0, 1); // 0 arriba, 1 abajo
	let z = 0;
	for (let k = 0; k < 4; k++) {
		const lam = W * (0.16 + 0.07 * Math.sin(seed * 3.7 + k * 2.1));
		const ph = seed * 1.3 + k * 2.4;
		z += Math.sin((x + 0.012 * Math.sin(y * 9 + ph)) * (Math.PI * 2) / lam + ph) * (0.55 + 0.45 * Math.sin(seed + k));
	}
	return z * 0.0035 * Math.pow(yn, 1.4);
}
function inflated(img, W, H, depth, sign, seed = 0) {
	const sx = 110, sy = Math.max(8, Math.round((sx * H) / W));
	const geo = new THREE.PlaneGeometry(W, H, sx, sy);
	// distancia al borde en una rejilla 2× más fina, luego suavizada: así la orilla no sale dentada
	const F = 2, fw = sx * F + 1, fh = sy * F + 1;
	const a = alphaGrid(img, fw, fh);
	let d = new Float32Array(fw * fh);
	for (let k = 0; k < d.length; k++) d[k] = a[k] > 0.5 ? 1e6 : 0;
	const at = (x, y) => (x < 0 || y < 0 || x >= fw || y >= fh ? 0 : d[y * fw + x]);
	for (let y = 0; y < fh; y++)
		for (let x = 0; x < fw; x++) {
			const k = y * fw + x;
			if (d[k]) d[k] = Math.min(d[k], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414);
		}
	for (let y = fh - 1; y >= 0; y--)
		for (let x = fw - 1; x >= 0; x--) {
			const k = y * fw + x;
			if (d[k]) d[k] = Math.min(d[k], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414);
		}
	for (let pass = 0; pass < 2; pass++) {
		const o = new Float32Array(d.length);
		for (let y = 0; y < fh; y++)
			for (let x = 0; x < fw; x++) {
				let sum = 0;
				for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) sum += at(x + i, y + j);
				o[y * fw + x] = sum / 9;
			}
		d = o;
	}
	const cell = W / (sx * F), R = 0.11;
	const pos = geo.attributes.position;
	for (let j = 0; j <= sy; j++)
		for (let i = 0; i <= sx; i++) {
			const dm = Math.max(0, d[j * F * fw + i * F] - 0.5) * cell;
			const u = Math.min(dm / R, 1);
			const xn = (i / sx) * 2 - 1;
			// orilla delgada que sube suave hacia el centro
			const z = depth * u * u * (3 - 2 * u) + 0.008 * (1 - xn * xn) * Math.min(dm / 0.04, 1);
			const px = pos.getX(j * (sx + 1) + i), py = pos.getY(j * (sx + 1) + i);
			pos.setZ(j * (sx + 1) + i, z * sign + drape(px, py, W, H, seed) * Math.min(dm / 0.05, 1));
		}
	if (sign < 0) {
		const idx = geo.index.array;
		for (let i = 0; i < idx.length; i += 3) {
			const t = idx[i + 1];
			idx[i + 1] = idx[i + 2];
			idx[i + 2] = t;
		}
	}
	geo.computeVertexNormals();
	return geo;
}
function alphaSampler(img) {
	const w = 96, h = Math.round((96 * img.height) / img.width);
	const data = alphaGrid(img, w, h);
	return (u, v) => data[Math.round((1 - v) * (h - 1)) * w + Math.round(u * (w - 1))] || 0;
}

const G = []; // prendas
const pickables = [];
async function buildGarments() {
	const meta = await (await fetch(asset('prendas/prendas.json'))).json();
	await Promise.all([
		document.fonts.load('700 40px "Instrument Sans"'),
		document.fonts.load('italic 700 40px Piazzolla'),
		document.fonts.load('500 14px "Instrument Sans"'),
	]).catch(() => {});
	const tags = {550: tagTexture(550), 650: tagTexture(650)};
	// cartoncito un poco doblado
	const tagGeo = new THREE.PlaneGeometry(0.046, 0.0736, 6, 10);
	{
		const p = tagGeo.attributes.position;
		for (let k = 0; k < p.count; k++) p.setZ(k, 0.0022 * Math.cos((p.getX(k) / 0.023) * 1.4) + 0.003 * (p.getY(k) / 0.0368) ** 2);
		tagGeo.computeVertexNormals();
	}
	const loadTex = (url) =>
		new Promise((res, rej) =>
			texLoader.load(url, (t) => {
				t.colorSpace = THREE.SRGBColorSpace;
				t.anisotropy = maxAniso;
				res(t);
			}, undefined, rej),
		);
	const loadData = (url) =>
		loadTex(url).then((t) => {
			t.colorSpace = THREE.NoColorSpace;
			return t;
		});
	const texes = await Promise.all(meta.flatMap((m) => [loadTex(asset(`prendas/${m.slug}-frente.webp`)), loadTex(asset(`prendas/${m.slug}-espalda.webp`))]));
	// relieve (normal map) y R = sombra en orillas, G = roughness (la tinta brilla más que el algodón)
	const extra = await Promise.all(meta.flatMap((m) => ['frente-n', 'frente-m', 'espalda-n', 'espalda-m'].map((k) => loadData(asset(`prendas/${m.slug}-${k}.webp`)).catch(() => null))));
	const n = meta.length;
	meta.forEach((m, i) => {
		const info = CATALOGO[m.slug] || {nombre: m.slug, precio: 550};
		const H = ALTO[m.tipo], W = (H * m.w) / m.h, depth = GROSOR[m.tipo];
		const tf = texes[i * 2], tb = texes[i * 2 + 1];
		const [nf, mf, nb, mb] = extra.slice(i * 4, i * 4 + 4);
		const dark = parseInt(m.tela.slice(1, 3), 16) < 80;
		const fleece = m.tipo !== 'playera';
		const mat = (map, nrm, orm) =>
			new THREE.MeshPhysicalMaterial({
				map, alphaTest: 0.5, alphaToCoverage: true, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.55,
				roughness: orm ? 1 : 0.92, roughnessMap: orm, aoMap: orm, aoMapIntensity: 0.9,
				normalMap: nrm, normalScale: new THREE.Vector2(fleece ? 0.35 : 0.45, fleece ? 0.35 : 0.45),
				// brillito suave de la tela de algodón (más en la felpa de sudaderas)
				sheen: 1, sheenRoughness: 0.85, sheenColor: new THREE.Color(dark ? (fleece ? 0x26262a : 0x1c1c20) : 0x1e1e1e),
			});
		const front = new THREE.Mesh(inflated(tf.image, W, H, depth, 1, i + 1), mat(tf, nf, mf));
		const back = new THREE.Mesh(inflated(tb.image, W, H, depth, -1, i + 1), mat(tb, nb, mb));
		const body = new THREE.Group();
		body.add(front, back);
		body.position.y = -NECK + m.cuello[1] * H - H / 2;
		const pivot = new THREE.Group();
		const hook = new THREE.Mesh(hookGeo, chrome);
		const ferrule = new THREE.Mesh(ferruleGeo, chrome);
		const tag = new THREE.Mesh(tagGeo, new THREE.MeshStandardMaterial({map: tags[info.precio], alphaTest: 0.5, roughness: 0.85, side: THREE.DoubleSide}));
		const tagPos = new THREE.Vector3(0.042, -NECK - 0.062, depth + 0.03);
		tag.position.copy(tagPos);
		tag.rotation.z = -0.22;
		const hole = new THREE.Vector3(0.042 + Math.sin(0.22) * 0.0368 * 0.78, -NECK - 0.062 + 0.0368 * 0.78, depth + 0.03);
		const from = new THREE.Vector3(0, -NECK + 0.004, 0.004);
		const len = hole.distanceTo(from);
		const string = new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.0008, len, 6), new THREE.MeshPhysicalMaterial({color: 0x111111, roughness: 0.8, sheen: 1, sheenColor: 0x555555, sheenRoughness: 0.5}));
		string.position.copy(from).add(hole).multiplyScalar(0.5);
		string.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), hole.clone().sub(from).normalize());
		pivot.add(hook, ferrule, body, tag, string);
		pivot.traverse((o) => {
			if (o.isMesh) {
				o.castShadow = true;
				o.receiveShadow = true;
			}
		});
		scene.add(pivot);
		const jitter = Math.sin(i * 12.9898) * 0.06;
		const g = {
			i, slug: m.slug, tipo: m.tipo, cat: m.tipo === 'playera' ? 'playera' : 'abrigo',
			nombre: info.nombre, extra: info.extra, precio: info.precio, src: asset(`prendas/${m.slug}-frente.webp`), aspect: m.w / m.h,
			W, H, pivot, body, front, back,
			mats: [front.material, back.material, tag.material],
			top: 0.03, bottom: body.position.y - H / 2,
			baseX: (i - (n - 1) / 2) * SP, baseRot: -1.19 + jitter,
			rot: new Spring(-1.19 + jitter, 70, 11), pull: new Spring(0, 80, 14), off: new Spring(0, 70, 14),
			dim: 1, sway: Math.sin(i * 3.1) * 6,
			alphaF: alphaSampler(tf.image), alphaB: alphaSampler(tb.image),
		};
		front.userData.g = back.userData.g = g;
		front.userData.side = 'f';
		back.userData.side = 'b';
		pickables.push(front, back);
		G.push(g);
	});
}

// ---------------------------------------------------------------- polvo y haz de luz
const DUST_N = 320;
const dustGeo = new THREE.BufferGeometry();
const dustPos = new Float32Array(DUST_N * 3), dustCol = new Float32Array(DUST_N * 3), dustSeed = new Float32Array(DUST_N * 4);
for (let i = 0; i < DUST_N; i++) {
	const r = (k) => {
		const x = Math.sin(i * 91.7 + k * 47.3) * 43758.5453;
		return x - Math.floor(x);
	};
	dustSeed.set([r(1), r(2), r(3), r(4)], i * 4);
}
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
dustGeo.setAttribute('color', new THREE.BufferAttribute(dustCol, 3));
const dust = new THREE.Points(
	dustGeo,
	new THREE.PointsMaterial({size: 0.016, map: radialTexture([[0, 1], [0.35, 0.6], [1, 0]]), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false}),
);
dust.frustumCulled = false;
scene.add(dust);

const beamDir = key.target.position.clone().sub(key.position);
const beamLen = beamDir.length() * 1.08;
beamDir.normalize();
const beamGeo = new THREE.CylinderGeometry(0.05, Math.tan(key.angle * 0.86) * beamLen, beamLen, 64, 1, true);
beamGeo.translate(0, -beamLen / 2, 0);
const beam = new THREE.Mesh(
	beamGeo,
	new THREE.ShaderMaterial({
		uniforms: {uO: {value: 0}},
		vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV;
			void main(){ vY = -position.y / ${beamLen.toFixed(3)};
			vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz);
			gl_Position = projectionMatrix * mv; }`,
		fragmentShader: `uniform float uO; varying float vY; varying vec3 vN; varying vec3 vV;
			void main(){ float f = pow(abs(dot(vN, vV)), 2.2);
			float a = f * smoothstep(0.0, 0.18, vY) * (1.0 - smoothstep(0.55, 1.0, vY)) * uO;
			gl_FragColor = vec4(vec3(1.0, 0.96, 0.9) * a, 1.0); }`,
		transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
	}),
);
beam.position.copy(key.position);
beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), beamDir);
scene.add(beam);

// cortina oscura y halo detrás de la prenda abierta
const dimmer = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({color: 0x050505, transparent: true, opacity: 0, depthWrite: false, fog: false}));
dimmer.renderOrder = 2;
cam.add(dimmer);
const halo = new THREE.Sprite(new THREE.SpriteMaterial({map: radialTexture([[0, 0.55], [0.4, 0.18], [1, 0]]), transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending, fog: false}));
halo.renderOrder = 3;
scene.add(halo);

// ---------------------------------------------------------------- música
const music = (() => {
	const off = {play() {}, stop() {}, step() {}, prefetch() {}};
	if (VIDEO) return off;
	const audio = new Audio();
	audio.preload = 'auto';
	let on = true;
	try {
		on = localStorage.getItem('ha-musica') !== '0';
	} catch (e) {}
	const songs = {}; // slug -> promesa con {url, title, artist, link}
	let cur = null, want = 0, vol = 0, token = 0, unlocked = false;
	let n = 0;
	const jsonp = (url) =>
		new Promise((res, rej) => {
			const cb = '__ha_itunes' + ++n, s = document.createElement('script');
			const done = () => {
				clearTimeout(tm);
				delete window[cb];
				s.remove();
			};
			const tm = setTimeout(() => (done(), rej(new Error('tiempo'))), 9000);
			window[cb] = (d) => (done(), res(d));
			s.onerror = () => (done(), rej(new Error('red')));
			s.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb;
			document.head.appendChild(s);
		});
	const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
	const API = 'https://itunes.apple.com/';
	async function find(slug) {
		const m = MUSICA[slug];
		if (!m) return null;
		if (m.id) {
			const r = await jsonp(`${API}lookup?id=${m.id}&country=mx`);
			const s = r.results.find((x) => x.previewUrl);
			return s && {url: s.previewUrl, title: s.trackName, artist: s.artistName, link: s.trackViewUrl};
		}
		const search = (term) => jsonp(`${API}search?media=music&entity=song&limit=30&country=mx&term=${encodeURIComponent(term)}`).then((r) => r.results || []);
		const pick = (list) => {
			let c = list.filter((x) => x.previewUrl);
			if (m.a) c = c.filter((x) => norm(x.artistName).includes(norm(m.a)));
			if (m.genre) c = c.filter((x) => m.genre.test(x.primaryGenreName || ''));
			const k = norm(m.k);
			return (k && (c.find((x) => norm(x.trackName) === k) || c.find((x) => norm(x.trackName).includes(k)) || c.find((x) => norm(x.collectionName).includes(k)))) || c[0];
		};
		let s = pick(await search(m.q));
		if (!s && m.a) s = pick(await search(m.a));
		return s && {url: s.previewUrl, title: s.trackName, artist: s.artistName, link: s.trackViewUrl};
	}
	const get = (slug) => {
		if (!songs[slug]) {
			const p = find(slug).catch(() => null);
			p.then((s) => (p.done = s));
			songs[slug] = p;
		}
		return songs[slug];
	};
	// iPhone: el audio solo arranca si se toca la pantalla; el primer toque "desbloquea" este reproductor
	const silent = (() => {
		const k = 400, b = new ArrayBuffer(44 + k * 2), v = new DataView(b);
		const w = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
		w(0, 'RIFF');
		v.setUint32(4, 36 + k * 2, true);
		w(8, 'WAVEfmt ');
		v.setUint32(16, 16, true);
		v.setUint16(20, 1, true);
		v.setUint16(22, 1, true);
		v.setUint32(24, 8000, true);
		v.setUint32(28, 16000, true);
		v.setUint16(32, 2, true);
		v.setUint16(34, 16, true);
		w(36, 'data');
		v.setUint32(40, k * 2, true);
		return URL.createObjectURL(new Blob([b], {type: 'audio/wav'}));
	})();
	addEventListener('pointerdown', () => {
		if (unlocked) return;
		unlocked = true;
		if (!audio.src) {
			audio.src = silent;
			audio.play().then(() => audio.pause()).catch(() => {});
		}
	}, {capture: true});
	function showChip(s) {
		ui.song.hidden = !s;
		if (!s) return;
		ui.songTitle.textContent = s.title;
		ui.songArtist.textContent = s.artist;
		ui.songLink.href = s.link || 'https://music.apple.com/';
		refresh();
	}
	function refresh() {
		ui.song.classList.toggle('muted', !on);
		ui.song.classList.toggle('playing', on && !audio.paused);
		ui.songBtn.setAttribute('aria-label', on ? 'Silenciar música' : 'Activar música');
		ui.songBtn.setAttribute('aria-pressed', String(!on));
	}
	function start(s) {
		if (audio.src !== s.url) audio.src = s.url;
		audio.currentTime = 0;
		vol = 0;
		audio.volume = 0;
		want = 0.85;
		audio.play().catch(() => {}).finally(refresh);
	}
	audio.addEventListener('ended', refresh);
	audio.addEventListener('pause', refresh);
	audio.addEventListener('playing', refresh);
	ui.songBtn.addEventListener('click', () => {
		on = !on;
		try {
			localStorage.setItem('ha-musica', on ? '1' : '0');
		} catch (e) {}
		if (!on) {
			want = 0;
			audio.pause();
		} else if (cur && cur.s) start(cur.s);
		refresh();
	});
	return {
		prefetch() {
			Object.keys(MUSICA).forEach(get);
		},
		play(g) {
			const t = ++token;
			cur = {g, s: null};
			ui.song.hidden = true;
			const go = (s) => {
				if (t !== token) return;
				cur.s = s;
				showChip(s);
				if (s && on) start(s);
			};
			const p = get(g.slug);
			// si ya se tiene la canción se toca en este mismo toque (así lo permite el iPhone)
			if (p.done !== undefined) go(p.done);
			else p.then(go);
		},
		stop() {
			const t = ++token;
			cur = null;
			want = 0;
			setTimeout(() => t === token && (audio.pause(), refresh()), 700);
		},
		step(dt) {
			if (audio.paused) return;
			vol = damp(vol, want, want > vol ? 2.5 : 7, dt);
			try {
				audio.volume = clamp(vol, 0, 1);
			} catch (e) {}
		},
	};
})();

// ---------------------------------------------------------------- estado
const S = {
	t: 0,
	hover: -1,
	kbd: -1,
	hoverAmt: 0,
	labelFor: -1,
	sel: null,
	selP: 0,
	selTarget: 0,
	spin: new Spring(0, 36, 11),
	lastDrag: -1e9,
	filter: 'todo',
	drawerOpen: 0,
	drawerE: 0,
	panelE: 0,
	cart: [],
	size: null,
	badge: new Spring(0, 260, 16),
	fly: null,
	pointer: new THREE.Vector2(), // en NDC
	pointerPx: {x: -1, y: -1},
	pointerIn: false,
	down: null,
	lastInput: -1e9,
	attract: {i: -1, until: 0, next: 3, k: 0},
	light: VIDEO ? 0 : 1,
	uiE: VIDEO ? 0 : 1,
	cam: {lookX: 0, lookY: 0.9, dist: 6, elev: 0.08, yaw: 0},
	camOverride: null,
	parallax: {x: 0, y: 0},
	events: [],
};
const ray = new THREE.Raycaster();

// ---------------------------------------------------------------- cámara
const isPortrait = () => innerWidth / innerHeight < 1;
function overview() {
	const vf = THREE.MathUtils.degToRad(cam.fov) / 2;
	const portrait = isPortrait();
	const halfW = portrait ? 1.06 : 1.2;
	const distW = halfW / (Math.tan(vf) * cam.aspect);
	const distH = (1.68 / 1.5) / Math.tan(vf);
	const dist = Math.max(distW, distH);
	const halfVis = dist * Math.tan(vf);
	return {lookX: 0, lookY: 0.82 + halfVis * (portrait ? 0.02 : 0.08), dist, elev: 0.075, yaw: 0};
}
function placeCamera(c) {
	const lx = c.lookX + S.parallax.x * 0.25, ly = c.lookY;
	const yaw = c.yaw + S.parallax.x * 0.05;
	const elev = c.elev + S.parallax.y * 0.02;
	cam.position.set(lx + Math.sin(yaw) * c.dist, ly + elev * c.dist, Math.cos(yaw) * c.dist);
	cam.lookAt(lx, ly, 0);
}
function resize() {
	const w = innerWidth, h = innerHeight;
	renderer.setSize(w, h, false);
	cam.aspect = w / h;
	cam.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();
Object.assign(S.cam, overview());

// dónde va la prenda abierta (en coordenadas de la cámara)
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion();
function showcase(g, out) {
	const vf = THREE.MathUtils.degToRad(cam.fov) / 2;
	const portrait = isPortrait();
	const span = g.top - g.bottom;
	const frac = portrait ? 0.4 : 0.6;
	const d = span / (frac * 2 * Math.tan(vf));
	const halfH = d * Math.tan(vf), halfW = halfH * cam.aspect;
	const ndcX = portrait ? 0 : -0.3;
	const ndcY = portrait ? 0.26 : -0.02;
	const mid = (g.top + g.bottom) / 2;
	out.set(ndcX * halfW, ndcY * halfH - mid, -d).applyMatrix4(cam.matrixWorld);
	return d;
}

// ---------------------------------------------------------------- acciones
function pickAt(ndc) {
	ray.setFromCamera(ndc, cam);
	const hits = ray.intersectObjects(pickables, false);
	for (const h of hits) {
		const g = h.object.userData.g;
		if (g === S.sel) continue;
		if (S.filter !== 'todo' && g.cat !== S.filter) continue;
		const a = (h.object.userData.side === 'f' ? g.alphaF : g.alphaB)(h.uv.x, h.uv.y);
		if (a > 0.5) return g;
	}
	return null;
}
function select(g) {
	if (!g || S.sel) return;
	S.sel = g;
	S.selTarget = 1;
	S.spin.v = S.spin.t = g.rot.v;
	S.spin.vel = 0;
	S.spinAuto = 0;
	S.size = null;
	ui.sizes.forEach((b) => b.setAttribute('aria-pressed', 'false'));
	ui.pSizeTxt.textContent = 'Elige una';
	ui.pKicker.textContent = g.tipo === 'playera' ? 'Nuevo drop · Boxy fit' : 'Nuevo drop';
	ui.pName.textContent = g.nombre;
	ui.pLine.textContent = g.extra ? `${LINEA[g.tipo]} · ${g.extra}` : LINEA[g.tipo];
	ui.pPrice.textContent = '$' + g.precio;
	S.hover = -1;
	music.play(g);
	log('select');
}
function deselect() {
	if (!S.sel) return;
	S.selTarget = 0;
	music.stop();
	// dejar el giro entre -π y π para que regrese por el camino corto
	const tw = Math.PI * 2;
	const k = Math.round(S.spin.v / tw) * tw;
	S.spin.v -= k;
	S.spin.t -= k;
	log('back');
}
function chooseSize(i) {
	S.size = ui.sizes[i].textContent;
	ui.sizes.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)));
	ui.pSizeTxt.textContent = 'Talla ' + S.size;
	log('tick');
}
function addToCart() {
	const g = S.sel;
	if (!g || S.fly) return;
	if (!S.size) {
		ui.pSizeTxt.textContent = 'Elige tu talla ↓';
		S.sizeNudge = 1;
		return;
	}
	S.cart.push({slug: g.slug, nombre: g.nombre, tipo: g.tipo, precio: g.precio, talla: S.size, src: g.src});
	renderCart();
	const r = screenRect(g);
	ui.fly.src = g.src;
	S.fly = {p: 0, from: r, g};
	log('add');
}
function renderCart() {
	ui.items.innerHTML = '';
	if (!S.cart.length) ui.items.innerHTML = '<p class="empty">Todavía no agregas nada.</p>';
	S.cart.forEach((it, idx) => {
		const row = document.createElement('div');
		row.className = 'item';
		row.innerHTML = `<img alt="" src="${it.src}"><div><b></b><small></small><br><button class="x" type="button">Quitar</button></div><span class="p">$${it.precio}</span>`;
		row.querySelector('b').textContent = it.nombre;
		row.querySelector('small').textContent = `${LINEA[it.tipo]} · Talla ${it.talla}`;
		row.querySelector('.x').addEventListener('click', () => {
			S.cart.splice(idx, 1);
			renderCart();
		});
		ui.items.appendChild(row);
	});
	ui.total.textContent = '$' + S.cart.reduce((s, it) => s + it.precio, 0) + ' MXN';
	ui.badge.textContent = S.cart.length;
	S.badge.t = S.cart.length ? 1 : 0;
}
function setFilter(f) {
	S.filter = f;
	[...ui.tabs.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === f)));
}
function log(name) {
	S.events.push({t: +S.t.toFixed(3), name});
}

// rectángulo en pantalla de una prenda (para el vuelo al carrito)
function screenRect(g) {
	g.pivot.updateMatrixWorld();
	const top = _v.set(0, g.bottom + g.H, 0).applyMatrix4(g.pivot.matrixWorld).project(cam);
	const bot = _v2.set(0, g.bottom, 0).applyMatrix4(g.pivot.matrixWorld).project(cam);
	const W = innerWidth, H = innerHeight;
	const y0 = (1 - top.y) * 0.5 * H, y1 = (1 - bot.y) * 0.5 * H;
	return {x: (top.x + 1) * 0.5 * W, y: (y0 + y1) / 2, h: Math.abs(y1 - y0)};
}
function toScreen(v) {
	const p = v.clone().project(cam);
	return {x: (p.x + 1) * 0.5 * innerWidth, y: (1 - p.y) * 0.5 * innerHeight, z: p.z};
}

// ---------------------------------------------------------------- entrada (mouse / dedo)
function setPointer(x, y) {
	S.pointerPx = {x, y};
	S.pointer.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
}
if (!VIDEO) {
	canvas.addEventListener('pointermove', (e) => {
		setPointer(e.clientX, e.clientY);
		S.pointerIn = e.pointerType === 'mouse' || !!S.down;
		S.lastInput = S.t;
		if (S.down) {
			const dx = e.clientX - S.down.x;
			if (Math.abs(dx) + Math.abs(e.clientY - S.down.y) > 8) S.down.moved = true;
			if (S.sel && S.down.onSel) {
				S.spin.t += (e.clientX - S.down.lx) * 0.012;
				S.lastDrag = S.t;
				canvas.classList.add('dragging');
			}
			S.down.lx = e.clientX;
		}
	});
	canvas.addEventListener('pointerdown', (e) => {
		canvas.setPointerCapture(e.pointerId);
		setPointer(e.clientX, e.clientY);
		S.pointerIn = true;
		S.lastInput = S.t;
		S.down = {x: e.clientX, y: e.clientY, lx: e.clientX, t: S.t, moved: false, onSel: !!S.sel, type: e.pointerType};
	});
	const up = (e) => {
		if (!S.down) return;
		const d = S.down;
		S.down = null;
		canvas.classList.remove('dragging');
		if (e.type === 'pointercancel') return;
		if (!d.moved) {
			if (S.drawerOpen) S.drawerOpen = 0;
			else if (S.sel) {
				const hits = (ray.setFromCamera(S.pointer, cam), ray.intersectObjects([S.sel.front, S.sel.back], false));
				if (!hits.length) deselect();
			} else select(pickAt(S.pointer));
		}
		if (d.type !== 'mouse') S.pointerIn = false;
	};
	canvas.addEventListener('pointerup', up);
	canvas.addEventListener('pointercancel', up);
	canvas.addEventListener('pointerleave', (e) => {
		if (e.pointerType === 'mouse') S.pointerIn = false;
	});
	// teclado: flechas para recorrer el perchero, Enter para abrir
	addEventListener('keydown', (e) => {
		if (!S.sel && !S.drawerOpen && G.length && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
			const n = G.length;
			let k = S.kbd < 0 ? (e.key === 'ArrowRight' ? -1 : n) : S.kbd;
			do k = (k + (e.key === 'ArrowRight' ? 1 : -1) + n) % n;
			while (S.filter !== 'todo' && G[k].cat !== S.filter && k !== S.kbd);
			S.kbd = k;
			S.lastInput = S.t;
			e.preventDefault();
		}
		if (e.key === 'Enter' && !S.sel && S.kbd >= 0 && document.activeElement === canvas) select(G[S.kbd]);
		if (e.key === 'Escape') {
			if (S.drawerOpen) S.drawerOpen = 0;
			else deselect();
		}
		if (S.sel && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
			S.spin.t += e.key === 'ArrowLeft' ? -0.6 : 0.6;
			S.lastDrag = S.t;
		}
	});
	ui.back.addEventListener('click', deselect);
	ui.sizes.forEach((b, i) => b.addEventListener('click', () => chooseSize(i)));
	ui.add.addEventListener('click', addToCart);
	ui.cartBtn.addEventListener('click', () => (S.drawerOpen = S.drawerOpen ? 0 : 1));
	$('closeCart').addEventListener('click', () => (S.drawerOpen = 0));
	[...ui.tabs.children].forEach((b) => b.addEventListener('click', () => setFilter(b.dataset.f)));
}

// ---------------------------------------------------------------- cuadro a cuadro
const tmpRack = new THREE.Vector3(), tmpShow = new THREE.Vector3();
function updateGarments(dt) {
	const t = S.t;
	const active = S.hover >= 0 ? S.hover : S.attract.i;
	const activeAmt = S.hover >= 0 ? 1 : 0.8;
	for (const g of G) {
		const out = S.filter !== 'todo' && g.cat !== S.filter;
		const isSel = g === S.sel;
		const hv = !S.sel && !out && active === g.i ? activeAmt : 0;
		const k = active >= 0 && !S.sel ? g.i - active : 0;
		const near = k !== 0 && Math.abs(k) <= 3;
		g.rot.t = hv ? lerp(g.baseRot, -0.1, hv) : out ? -1.5 : near && Math.abs(k) === 1 ? g.baseRot - 0.14 : g.baseRot;
		g.pull.t = hv * 0.47 - (out ? 0.1 : 0);
		g.off.t = near ? Math.sign(k) * 0.082 * Math.exp(-(Math.abs(k) - 1) / 1.3) : 0;
		g.rot.step(dt);
		g.pull.step(dt);
		g.off.step(dt);
		g.dim = damp(g.dim, out ? 0.2 : 1, 6, dt);

		const swing = REDUCE ? 0 : Math.sin(t * 1.15 + g.sway) * 0.012 + clamp(g.rot.vel * 0.012, -0.08, 0.08);
		tmpRack.set(g.baseX + g.off.v, RAIL_Y + g.pull.v * 0.04, g.pull.v);
		if (isSel || (g === S.selPrev && S.selP > 0)) {
			const e = ease(S.selP);
			const d = showcase(g, tmpShow);
			g.pivot.position.lerpVectors(tmpRack, tmpShow, e);
			g.pivot.position.y += Math.sin(Math.PI * e) * 0.12;
			g.pivot.rotation.set(0, lerp(g.rot.v, S.spin.v, e), swing * (1 - e));
			// cortina, halo y luz de producto siguen a la prenda
			dimmer.position.set(0, 0, -(d + 0.8));
			const hh = (d + 0.8) * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * 2.2;
			dimmer.scale.set(hh * cam.aspect, hh, 1);
			dimmer.material.opacity = 0.8 * e;
			_v.set(0, (g.top + g.bottom) / 2, 0).add(g.pivot.position);
			halo.position.copy(_v).addScaledVector(cam.getWorldDirection(_v2), 0.5);
			halo.scale.setScalar(g.H * 2.6);
			halo.material.opacity = 0.32 * e;
			prodLight.intensity = 2.4 * e;
			prodLight.target.position.copy(_v);
			prodLight.position.copy(cam.position).add(_v2.set(-1.2, 1.4, 0.2).applyQuaternion(cam.quaternion));
		} else {
			g.pivot.position.copy(tmpRack);
			g.pivot.rotation.set(0, g.rot.v, swing);
		}
		for (const m of g.mats) {
			m.color.setScalar(g.dim);
			if (m.sheenColor) m.sheenColor.copy((m.userData.sheen ||= m.sheenColor.clone())).multiplyScalar(g.dim);
		}
	}
	if (!S.sel && S.selP <= 0) {
		dimmer.material.opacity = 0;
		halo.material.opacity = 0;
		prodLight.intensity = 0;
	}
}

function updateDust(dt) {
	const t = S.t;
	const axis = beamDir, apex = key.position;
	for (let i = 0; i < DUST_N; i++) {
		const s = dustSeed.subarray(i * 4, i * 4 + 4);
		const y = ((s[1] * 3.2 + t * (0.03 + s[3] * 0.05)) % 3.2) + 0.05;
		const x = (s[0] - 0.5) * 3.4 + Math.sin(t * 0.3 + s[2] * 20) * 0.08;
		const z = (s[2] - 0.5) * 2.6 + 0.3 + Math.cos(t * 0.25 + s[0] * 20) * 0.08;
		dustPos[i * 3] = x;
		dustPos[i * 3 + 1] = y;
		dustPos[i * 3 + 2] = z;
		// más brillante dentro del haz de luz
		_v.set(x, y, z).sub(apex);
		const along = _v.dot(axis);
		const radial = Math.sqrt(Math.max(0, _v.lengthSq() - along * along));
		const inBeam = 1 - smooth(0.6, 1.05, radial / (Math.tan(key.angle) * along));
		const tw = 0.6 + 0.4 * Math.sin(t * 2 + s[3] * 30);
		const c = (0.06 + inBeam * 0.55) * tw * S.light;
		dustCol[i * 3] = dustCol[i * 3 + 1] = dustCol[i * 3 + 2] = c;
	}
	dustGeo.attributes.position.needsUpdate = true;
	dustGeo.attributes.color.needsUpdate = true;
}

function updateUI(dt) {
	scene.updateMatrixWorld();
	const H = innerHeight;
	const portrait = isPortrait();
	// etiqueta flotante de la prenda señalada
	const lab = S.hover >= 0 ? S.hover : -1;
	if (lab >= 0 && lab !== S.labelFor) {
		S.labelFor = lab;
		ui.label.querySelector('b').textContent = G[lab].nombre;
		ui.label.querySelector('span').textContent = '$' + G[lab].precio;
	}
	S.hoverAmt = damp(S.hoverAmt, lab >= 0 && !S.sel ? 1 : 0, 10, dt);
	if (S.labelFor >= 0) {
		const g = G[S.labelFor];
		const p = toScreen(_v.set(0, 0.1, 0).applyMatrix4(g.pivot.matrixWorld));
		ui.label.style.opacity = (S.hoverAmt * S.uiE).toFixed(3);
		p.x = clamp(p.x, 90, innerWidth - 90);
		p.y = Math.max(p.y, isPortrait() ? 170 : 175);
		ui.label.style.transform = `translate(${p.x.toFixed(1)}px, ${(p.y - 8 - S.hoverAmt * 6).toFixed(1)}px) translate(-50%, -100%)`;
	}
	// ficha del producto
	S.panelE = damp(S.panelE, S.sel && S.selTarget ? 1 : 0, 9, dt);
	const pe = S.panelE;
	ui.panel.style.opacity = pe.toFixed(3);
	ui.panel.style.transform = portrait ? `translateY(${((1 - pe) * 60).toFixed(1)}px)` : `translate(${((1 - pe) * 40).toFixed(1)}px, -50%)`;
	ui.panel.classList.toggle('on', pe > 0.5);
	ui.back.style.opacity = pe.toFixed(3);
	ui.back.classList.toggle('on', pe > 0.5);
	if (S.sizeNudge) {
		S.sizeNudge = Math.max(0, S.sizeNudge - dt * 2.5);
		$('sizes').style.transform = `translateX(${(Math.sin(S.sizeNudge * 30) * 6 * S.sizeNudge).toFixed(1)}px)`;
	}
	// textos y barra de arriba
	const rest = (1 - pe) * S.uiE;
	ui.hint.style.opacity = (rest * (S.hover >= 0 ? 0.35 : 1)).toFixed(3);
	ui.tabs.style.opacity = rest.toFixed(3);
	ui.tabs.style.pointerEvents = rest > 0.5 ? 'auto' : 'none';
	ui.top.style.opacity = S.uiE.toFixed(3);
	// carrito
	S.drawerE = damp(S.drawerE, S.drawerOpen, 8, dt);
	ui.drawer.style.transform = `translateX(${((1 - S.drawerE) * 105).toFixed(2)}%)`;
	S.badge.step(dt);
	ui.badge.style.transform = `scale(${Math.max(0, S.badge.v).toFixed(3)})`;
	// vuelo al carrito
	if (S.fly) {
		const f = S.fly;
		f.p = Math.min(1, f.p + dt / 0.85);
		const e = ease(f.p);
		const cr = ui.cartBtn.getBoundingClientRect();
		const tx = cr.left + cr.width / 2, ty = cr.top + cr.height / 2;
		const cx = lerp(f.from.x, tx, 0.5), cy = Math.min(f.from.y, ty) - H * 0.12;
		const x = (1 - e) * (1 - e) * f.from.x + 2 * (1 - e) * e * cx + e * e * tx;
		const y = (1 - e) * (1 - e) * f.from.y + 2 * (1 - e) * e * cy + e * e * ty;
		const h = lerp(f.from.h * 0.9, 22, easeOut(f.p));
		const w = h * f.g.aspect;
		ui.fly.style.width = w.toFixed(1) + 'px';
		ui.fly.style.opacity = (f.p < 0.08 ? f.p / 0.08 : f.p > 0.9 ? (1 - f.p) / 0.1 : 1).toFixed(3);
		ui.fly.style.transform = `translate(${(x - w / 2).toFixed(1)}px, ${(y - h / 2).toFixed(1)}px) rotate(${(e * -16).toFixed(1)}deg)`;
		if (f.p >= 1) {
			S.fly = null;
			ui.fly.style.opacity = 0;
			S.badge.v = 1.9;
			S.badge.vel = 0;
			log('cart');
			S.afterFly = S.t + 0.35;
		}
	}
	if (S.afterFly && S.t >= S.afterFly) {
		S.afterFly = 0;
		deselect();
		S.drawerOpen = 1;
	}
	canvas.classList.toggle('can-pick', !S.sel && S.hover >= 0);
}

function updateHover() {
	if (S.sel || S.drawerOpen || !G.length) {
		S.hover = -1;
		return;
	}
	if (!S.pointerIn) {
		S.hover = S.kbd;
		return;
	}
	S.kbd = -1;
	const g = pickAt(S.pointer);
	const h = g ? g.i : -1;
	if (h !== S.hover && h >= 0) log('tick');
	S.hover = h;
}

function updateAttract(dt) {
	const a = S.attract;
	if (VIDEO || REDUCE || S.sel || S.hover >= 0 || S.t - S.lastInput < 3 || !G.length) {
		a.i = -1;
		a.next = Math.max(a.next, S.t + 1.2);
		return;
	}
	if (a.i >= 0 && S.t > a.until) {
		a.i = -1;
		a.next = S.t + 0.9;
	}
	if (a.i < 0 && S.t > a.next) {
		const order = [2, 8, 5, 0, 10, 3, 7, 1, 11, 6, 4, 9];
		let tries = 0;
		do {
			a.i = order[a.k++ % order.length] % G.length;
		} while (S.filter !== 'todo' && G[a.i].cat !== S.filter && ++tries < 12);
		a.until = S.t + 1.5;
	}
}

function updateScene(dt) {
	// cámara
	const target = S.camOverride || overview();
	for (const k of ['lookX', 'lookY', 'dist', 'elev', 'yaw']) S.cam[k] = VIDEO ? target[k] : damp(S.cam[k], target[k], 4, dt);
	if (FINE) {
		S.parallax.x = damp(S.parallax.x, S.pointerIn && !S.sel ? S.pointer.x : 0, 2.5, dt);
		S.parallax.y = damp(S.parallax.y, S.pointerIn && !S.sel ? S.pointer.y : 0, 2.5, dt);
	}
	placeCamera(S.cam);
	cam.updateMatrixWorld();
	// selección
	const prevP = S.selP;
	S.selP = clamp(S.selP + (S.selTarget ? dt : -dt) / 0.95, 0, 1);
	if (S.sel) S.selPrev = S.sel;
	if (!S.selTarget && S.sel && S.selP <= 0) S.sel = null;
	if (!S.selTarget && prevP > 0 && S.selP <= 0) S.selPrev = null;
	if (S.sel && S.selTarget) {
		const auto = !VIDEO && !REDUCE && S.t - S.lastDrag > 1.6 && S.selP >= 1;
		if (auto) S.spin.t -= dt * 0.75;
		if (!VIDEO && S.selP < 1 && S.t - S.lastDrag > 1) S.spin.t = damp(S.spin.t, 0, 3, dt);
	}
	S.spin.step(dt);
	// luces
	key.intensity = KEY_I * S.light;
	rim.intensity = RIM_I * S.light;
	hemi.intensity = HEMI_I * (0.25 + 0.75 * S.light);
	beam.material.uniforms.uO.value = 0.075 * S.light * (1 - 0.6 * ease(S.selP));
}

function step(dt, draw = true) {
	S.t += dt;
	if (VIDEO) direct(S.t);
	updateScene(dt);
	updateHover();
	updateAttract(dt);
	updateGarments(dt);
	updateDust(dt);
	updateUI(dt);
	music.step(dt);
	if (draw) renderer.render(scene, cam);
}

// ---------------------------------------------------------------- guion del video
// Todo depende solo del tiempo, así cada cuadro sale igual cada vez que se renderiza.
const V = {fired: new Set(), touch: {x: 0, y: 0, o: 0, down: 0}, ripple: null};
function once(name, t, now, fn) {
	if (now >= t && !V.fired.has(name)) {
		V.fired.add(name);
		fn();
	}
}
function garmentPx(i) {
	const g = G[i];
	_v.set(g.baseX, RAIL_Y - NECK - g.H * 0.42, 0.06);
	return toScreen(_v);
}
function elPx(el) {
	const r = el.getBoundingClientRect();
	return {x: r.left + r.width / 2, y: r.top + r.height / 2};
}
function tap(p) {
	V.ripple = {x: p.x, y: p.y, t: S.t};
	log('tap');
}
const HERO_I = () => Math.max(0, G.findIndex((g) => g.slug === HERO));
function direct(t) {
	const ov = overview();
	// 1) se prende la luz y la cámara se aleja del perchero
	// parpadeo de foco al prenderse
	const L = t < 0.35 ? 0 : t < 0.42 ? 0.9 : t < 0.55 ? 0.05 : t < 0.62 ? 1 : t < 0.74 ? 0.3 : t < 1.1 ? lerp(0.3, 1, (t - 0.74) / 0.36) : 1;
	S.light = L;
	S.uiE = smooth(2.5, 3.1, t);
	const ie = smooth(0.75, 1.15, t) * (1 - smooth(2.4, 2.8, t));
	ui.intro.style.display = 'block';
	ui.intro.style.opacity = ie.toFixed(3);
	ui.intro.style.transform = `translateY(${((1 - smooth(0.75, 1.4, t)) * 14).toFixed(1)}px)`;
	const close = {lookX: -0.12, lookY: 1.0, dist: 2.5, elev: 0.0, yaw: 0.32};
	const scrub = {lookX: 0, lookY: 0.98, dist: ov.dist * 0.82, elev: 0.06, yaw: 0};
	let c;
	if (t < 3.0) c = mixCam(close, ov, ease(smooth(0.2, 3.0, t)));
	else if (t < 13.4) c = mixCam(ov, scrub, ease(smooth(3.0, 4.2, t)));
	else c = mixCam(scrub, ov, ease(smooth(13.4, 14.8, t)));
	if (t > 3.0 && t < 6.6 && V.touch.o > 0) c.lookX = lerp(c.lookX, (V.touch.x / innerWidth - 0.5) * 0.22, smooth(3.0, 4.2, t) * (1 - smooth(5.6, 6.6, t)));
	S.camOverride = c;

	// 2) el dedo recorre el perchero y las prendas se voltean
	const hi = HERO_I();
	const T = V.touch;
	T.o = smooth(2.75, 3.0, t) * (1 - smooth(6.25, 6.55, t)) + smooth(10.0, 10.25, t) * (1 - smooth(12.3, 12.6, t));
	if (t < 6.6) {
		const a = garmentPx(0), b = garmentPx(G.length - 1), h = garmentPx(hi);
		if (t < 3.2) Object.assign(T, {x: a.x, y: a.y});
		else if (t < 5.0) {
			const e = ease(smooth(3.2, 5.0, t));
			T.x = lerp(a.x, b.x, e);
			T.y = lerp(a.y, b.y, e) + Math.sin(e * Math.PI) * 10;
		} else {
			const e = ease(smooth(5.15, 5.95, t));
			T.x = lerp(b.x, h.x, e);
			T.y = lerp(b.y, h.y, e);
		}
		T.down = t > 3.05 && t < 6.05 ? 1 : 0;
	}
	once('tapStart', 3.05, t, () => tap(T));
	once('swipe', 3.2, t, () => log('swipe'));
	S.pointerIn = T.down > 0 && !S.sel;
	if (T.down) setPointer(T.x, T.y);
	once('open', 6.05, t, () => {
		S.pointerIn = false;
		tap(T);
		select(G[hi]);
	});
	// 3) vista de producto: gira 360° para ver la espalda
	if (S.sel) {
		const e1 = ease(smooth(6.1, 7.1, t));
		const e2 = ease(smooth(7.2, 9.9, t));
		S.spin.t = lerp(G[hi].baseRot, 0, e1) - e2 * Math.PI * 2;
	}
	// 4) talla y carrito
	if (t >= 10.0 && t < 12.6) {
		const sz = elPx(ui.sizes[2]), add = elPx(ui.add);
		const start = {x: innerWidth * 0.72, y: innerHeight * 0.62};
		if (t < 10.7) {
			const e = ease(smooth(10.0, 10.6, t));
			T.x = lerp(start.x, sz.x, e);
			T.y = lerp(start.y, sz.y, e);
		} else {
			const e = ease(smooth(11.05, 11.65, t));
			T.x = lerp(sz.x, add.x, e);
			T.y = lerp(sz.y, add.y, e);
		}
		T.down = (t > 10.7 && t < 10.85) || (t > 11.8 && t < 11.95) ? 1 : 0;
	}
	once('size', 10.72, t, () => {
		tap(T);
		chooseSize(2);
	});
	once('add', 11.82, t, () => {
		tap(T);
		addToCart();
	});
	// 5) el carrito abierto y el cierre con el logo
	once('closeCart', 15.0, t, () => (S.drawerOpen = 0));
	const oe = smooth(15.1, 15.7, t);
	ui.outro.style.display = 'flex';
	ui.outro.style.opacity = oe.toFixed(3);
	ui.outro.querySelector('img').style.transform = `scale(${(0.94 + 0.06 * easeOut(oe)).toFixed(3)})`;

	// dedo y onda
	ui.touch.style.opacity = (T.o * 0.95).toFixed(3);
	ui.touch.style.transform = `translate(${T.x.toFixed(1)}px, ${T.y.toFixed(1)}px) scale(${(T.down ? 0.86 : 1).toFixed(3)})`;
	if (V.ripple) {
		const p = (t - V.ripple.t) / 0.5;
		ui.ripple.style.opacity = p < 1 ? (1 - p).toFixed(3) : 0;
		ui.ripple.style.transform = `translate(${V.ripple.x.toFixed(1)}px, ${V.ripple.y.toFixed(1)}px) scale(${(1 + p * 1.4).toFixed(3)})`;
	}
}
function mixCam(a, b, e) {
	const o = {};
	for (const k in a) o[k] = lerp(a[k], b[k], e);
	return o;
}
const VIDEO_SECONDS = 17;

// ---------------------------------------------------------------- arranque
const ready = (async () => {
	const [tex] = await Promise.all([cementP, buildGarments()]);
	applyCement(tex);
	renderCart();
	music.prefetch();
	ui.loader.classList.add('out');
	setTimeout(() => (ui.loader.style.display = 'none'), 700);
	if (VIDEO) {
		ui.loader.style.display = 'none';
		renderer.compile(scene, cam);
	}
})();
ready.catch((e) => {
	console.error(e);
	ui.loader.insertAdjacentHTML('beforeend', '<p class="err">No se pudieron cargar las prendas. Recarga la página.</p>');
});

if (VIDEO) {
	window.HA = {
		ready,
		fps: 30,
		seconds: VIDEO_SECONDS,
		// avanza n cuadros; solo dibuja el último
		step: (n = 1) => {
			for (let i = 0; i < n; i++) step(1 / 30, i === n - 1);
			return S.t;
		},
		events: () => S.events,
	};
} else {
	let last = performance.now();
	const loop = (now) => {
		const dt = Math.min(0.05, (now - last) / 1000);
		last = now;
		if (G.length) step(dt);
		requestAnimationFrame(loop);
	};
	ready.then(() => requestAnimationFrame(loop));
}
