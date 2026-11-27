// CVRCVMO Creative Studio · Familia escultórica en WebGL puro (sin librerías).
//
// Un universo de piezas de la misma familia: todo nace del monolito.
//   Monolito ........ identidad y presencia de marca (inicio y contacto). Lleva la C grabada.
//   Fragmentos ...... el monolito partido que se ordena en composición (manifiesto) y fotogramas en movimiento (motion).
//   Estructuras ..... trazas y arcos ojivales que se construyen (dirección creativa, diseño), el dintel que resguarda
//                     (garantía) y módulos que se ensamblan (proceso).
//   Portales/cristal  superficies de vidrio en un marco ojival (digital) y la visión que reúne a toda la familia (estudio).
//
// El primer lingote (monolito del inicio) conserva EXACTAMENTE su modelo: misma superelipsoide, misma malla,
// mismo cromo líquido y el mismo estudio de luz. La C se graba en el shader como relieve (chaflán que atrapa
// la luz + ranura negra de espacio negativo), sin tocar un solo vértice.

const TAU = Math.PI * 2;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const lerp = (a, b, t) => a + (b - a) * t;
export const ease = {
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
};
const ea = (t) => ease.inOut(clamp01(t));

/* ---------------------------------------------------------------- formas
   El monolito del inicio: NO MODIFICAR (proporciones, exponentes y superficie del modelo original). */
export const FORMAS = {
  monolito: {A: [0.5, 1.2, 0.16], e1: 0.42, e2: 0.26, c: 1, twist: 0, amp: 0.014, freq: 1.1},
};
// Pieza base de la familia: una losa de aristas suaves (se escala en cada eje para hacer barras, placas y bloques)
const LOSA = {A: [1, 1, 1], e1: 0.22, e2: 0.22, c: 1, twist: 0};

function buildShape(f, U, V) {
  const pos = new Float32Array((U * (V + 1)) * 3);
  const [ax, ay, az] = f.A, c = f.c;
  const A = [ax, ay, az];
  const ia = c === 0 ? 1 : 0, ib = c === 2 ? 1 : 2;
  for (let v = 0; v <= V; v++) {
    const ph = (v / V) * Math.PI;
    for (let u = 0; u < U; u++) {
      const th = (u / U) * TAU;
      const d = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)];
      const pa = Math.abs(d[ia]) / A[ia], pb = Math.abs(d[ib]) / A[ib], pc = Math.abs(d[c]) / A[c];
      const F = Math.pow(Math.pow(pa, 2 / f.e2) + Math.pow(pb, 2 / f.e2), f.e2 / f.e1) + Math.pow(pc, 2 / f.e1);
      const t = Math.pow(F, -f.e1 / 2);
      let x = d[0] * t, y = d[1] * t, z = d[2] * t;
      if (f.twist) { const a = y * f.twist, ca = Math.cos(a), sa = Math.sin(a); const nx = x * ca - z * sa; z = x * sa + z * ca; x = nx; }
      const i = (v * U + u) * 3;
      pos[i] = x; pos[i + 1] = y; pos[i + 2] = z;
    }
  }
  return pos;
}

function makeMesh(U, V) {
  const n = U * (V + 1);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  const idx = new Uint16Array(U * V * 6);
  let k = 0;
  for (let v = 0; v < V; v++) for (let u = 0; u < U; u++) {
    const a = v * U + u, b = v * U + ((u + 1) % U), c = (v + 1) * U + u, d = (v + 1) * U + ((u + 1) % U);
    idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d;
  }
  function normals() {
    for (let v = 0; v <= V; v++) for (let u = 0; u < U; u++) {
      const i = (v * U + u) * 3;
      if (v === 0 || v === V) { nor[i] = 0; nor[i + 1] = v === 0 ? 1 : -1; nor[i + 2] = 0; continue; }
      const up = ((v - 1) * U + u) * 3, dn = ((v + 1) * U + u) * 3, l = (v * U + ((u - 1 + U) % U)) * 3, r = (v * U + ((u + 1) % U)) * 3;
      const ax = pos[dn] - pos[up], ay = pos[dn + 1] - pos[up + 1], az = pos[dn + 2] - pos[up + 2];
      const bx = pos[r] - pos[l], by = pos[r + 1] - pos[l + 1], bz = pos[r + 2] - pos[l + 2];
      let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      if (nx * pos[i] + ny * pos[i + 1] + nz * pos[i + 2] < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const q = Math.hypot(nx, ny, nz) || 1;
      nor[i] = nx / q; nor[i + 1] = ny / q; nor[i + 2] = nz / q;
    }
  }
  return {pos, nor, idx, count: idx.length, normals};
}
function meshFromShape(f, U, V) { const m = makeMesh(U, V); m.pos.set(buildShape(f, U, V)); m.normals(); return m; }

// Prisma de caras planas a partir de un contorno convexo (antihorario): paneles de cristal con forma de ojiva
function makePrism(poly, half) {
  const n = poly.length, pos = [], nor = [], idx = [];
  let cx = 0, cy = 0; poly.forEach(([x, y]) => { cx += x / n; cy += y / n; });
  for (const z of [half, -half]) {
    const base = pos.length / 3, s = z > 0 ? 1 : -1;
    pos.push(cx, cy, z); nor.push(0, 0, s);
    poly.forEach(([x, y]) => { pos.push(x, y, z); nor.push(0, 0, s); });
    for (let i = 0; i < n; i++) { const a = base + 1 + i, b = base + 1 + ((i + 1) % n); if (s > 0) idx.push(base, a, b); else idx.push(base, b, a); }
  }
  for (let i = 0; i < n; i++) {
    const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % n];
    let nx = y1 - y0, ny = -(x1 - x0); const q = Math.hypot(nx, ny) || 1; nx /= q; ny /= q;
    const base = pos.length / 3;
    pos.push(x0, y0, half, x1, y1, half, x1, y1, -half, x0, y0, -half);
    for (let k = 0; k < 4; k++) nor.push(nx, ny, 0);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return {pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint16Array(idx), count: idx.length};
}
// Arco de sección rectangular (aristas vivas). Los índices van en orden a lo largo del arco: dibujar solo los primeros
// 24·k índices traza el arco hasta el segmento k (así se "dibuja" con el scroll)
function makeTube(r, a0, a1, t, d, seg) {
  const pos = [], nor = [], idx = [];
  const quad = (p0, p1, p2, p3, n0, n1) => {
    const b = pos.length / 3;
    pos.push(...p0, ...p1, ...p2, ...p3); nor.push(...n0, ...n1, ...n1, ...n0);
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  };
  for (let k = 0; k < seg; k++) {
    const u0 = a0 + (a1 - a0) * (k / seg), u1 = a0 + (a1 - a0) * ((k + 1) / seg);
    const c0 = Math.cos(u0), s0 = Math.sin(u0), c1 = Math.cos(u1), s1 = Math.sin(u1);
    const P = (c, sn, rr, z) => [c * rr, sn * rr, z];
    const ro = r + t, ri = r - t;
    quad(P(c0, s0, ro, d), P(c1, s1, ro, d), P(c1, s1, ro, -d), P(c0, s0, ro, -d), [c0, s0, 0], [c1, s1, 0]);
    quad(P(c0, s0, ri, -d), P(c1, s1, ri, -d), P(c1, s1, ri, d), P(c0, s0, ri, d), [-c0, -s0, 0], [-c1, -s1, 0]);
    quad(P(c0, s0, ri, d), P(c1, s1, ri, d), P(c1, s1, ro, d), P(c0, s0, ro, d), [0, 0, 1], [0, 0, 1]);
    quad(P(c0, s0, ro, -d), P(c1, s1, ro, -d), P(c1, s1, ri, -d), P(c0, s0, ri, -d), [0, 0, -1], [0, 0, -1]);
  }
  return {pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint16Array(idx), count: idx.length, seg};
}
// Contorno de ojiva equilátera (arco gótico): ancho interior w, base y0, arranque ys, centros a ±c
function ojiva(w, y0, ys, c, r, seg = 18) {
  const pts = [[-w, y0], [w, y0], [w, ys]];
  const apex = Math.acos(-c / r);                          // ángulo del arco izquierdo en la clave
  for (let k = 1; k <= seg; k++) { const a = (Math.PI - apex) * (k / seg); pts.push([-c + r * Math.cos(a), ys + r * Math.sin(a)]); }
  for (let k = 1; k < seg; k++) { const a = apex + (Math.PI - apex) * (k / seg); pts.push([c + r * Math.cos(a), ys + r * Math.sin(a)]); }
  pts.push([-w, ys]);
  return pts;
}

/* ---------------------------------------------------------------- shaders */
const VS = `
attribute vec3 aPos; attribute vec3 aNor;
uniform mat4 uModel; uniform mat4 uVP; uniform mat3 uNM;
uniform float uTime; uniform float uAmp; uniform float uFreq;
varying vec3 vPos; varying vec3 vNor; varying vec3 vObj; varying vec3 vObjN;
void main(){
  vec3 p = aPos * uFreq;
  vec3 k1 = vec3(0.0, 1.0, 0.35) * 3.1; float a1 = dot(p, k1) + uTime * 1.25;
  vec3 k2 = vec3(0.8, -0.45, 0.6) * 4.2; float a2 = dot(p, k2) - uTime * 0.85;
  vec3 k3 = vec3(-0.5, 0.7, -0.9) * 6.6; float a3 = dot(p, k3) + uTime * 1.6;
  float D = (sin(a1) * 0.55 + sin(a2) * 0.3 + sin(a3) * 0.15) * uAmp;
  vec3 g = (cos(a1) * 0.55 * k1 + cos(a2) * 0.3 * k2 + cos(a3) * 0.15 * k3) * uAmp * uFreq;
  vec3 n = normalize(aNor);
  vec3 nn = normalize(n - (g - dot(g, n) * n));
  vec4 w = uModel * vec4(aPos + n * D, 1.0);
  vPos = w.xyz; vNor = uNM * nn; vObj = aPos; vObjN = n;
  gl_Position = uVP * w;
}`;

// Dos salas: galería a oscuras (la del lingote original, sin cambios) y galería de marfil (secciones claras).
const FS = `
precision highp float;
varying vec3 vPos; varying vec3 vNor; varying vec3 vObj; varying vec3 vObjN;
uniform vec3 uCam; uniform float uTime; uniform float uLight; uniform vec2 uTilt; uniform float uAlpha;
uniform float uMat; uniform float uRoom; uniform float uEngrave; uniform float uCSize; uniform mat3 uNM;
const vec3 IVORY = vec3(0.94, 0.93, 0.91);
const vec3 SILVER = vec3(0.65, 0.65, 0.67);
float box(float x, float c, float w, float f){ return 1.0 - smoothstep(w, w + f, abs(x - c)); }
vec3 env(vec3 r, float k){
  float az = atan(r.x, r.z) + uTime * 0.05 + uTilt.x * 0.55;
  float el = asin(clamp(r.y, -1.0, 1.0)) + uTilt.y * 0.22;
  az = mod(az + 3.14159265, 6.2831853) - 3.14159265;
  float L = uLight;
  // --- galería a oscuras (k = 0 es exactamente el estudio original del lingote) ---
  float rise = mix(-1.1, 0.22, smoothstep(0.0, 0.85, L));
  vec3 c = vec3(0.012) + vec3(0.05) * smoothstep(-0.2, 0.9, el) * L;
  c += IVORY * 2.4 * box(az, 0.95, 0.07, 0.05 + k) * box(el, rise, 0.55, 0.18 + k);
  c += SILVER * 1.4 * box(az, -1.2, 0.05, 0.05 + k) * box(el, rise * 0.8, 0.5, 0.2 + k) * smoothstep(0.35, 1.0, L);
  c += IVORY * 2.0 * box(el, 1.05, 0.22, 0.12 + k) * box(az, 0.0, 1.1, 0.4 + k) * smoothstep(0.45, 1.0, L);
  c += IVORY * 0.32 * smoothstep(1.3, 0.0, abs(az + 0.2)) * smoothstep(-0.35, 0.45, el) * smoothstep(1.0, 0.5, el) * smoothstep(0.55, 1.0, L);
  c += IVORY * 0.9 * box(az, -0.45, 0.16, 0.2 + k) * box(el, 0.35, 0.2, 0.2 + k) * smoothstep(0.55, 1.0, L);
  c += SILVER * 0.9 * box(az, 3.0, 0.5, 0.3 + k) * box(el, 0.05, 0.3, 0.25 + k) * smoothstep(0.6, 1.0, L);
  c += vec3(0.32) * box(el, -0.03, 0.01, 0.03 + k) * L;
  vec3 D = c * smoothstep(0.0, 0.25, L + 0.02);
  if (uRoom < 0.01) return D;
  // --- galería de marfil: paredes claras, piso tibio y banderas negras que dibujan el volumen ---
  vec3 W = mix(vec3(0.70, 0.69, 0.67), vec3(1.03, 1.02, 1.0), smoothstep(-0.1, 0.8, el));
  W = mix(W, vec3(0.13, 0.13, 0.14), smoothstep(-0.02 - k * 0.2, -0.45, el));
  W *= 1.0 - 0.85 * box(el, -0.035, 0.012, 0.05 + k);
  W *= 1.0 - 0.92 * box(az, 1.9, 0.32, 0.2 + k) * box(el, 0.2, 0.7, 0.2 + k);
  W *= 1.0 - 0.92 * box(az, -2.0, 0.3, 0.2 + k) * box(el, 0.1, 0.75, 0.2 + k);
  W += vec3(1.6) * box(el, 0.95, 0.3, 0.12 + k) * box(az, 0.0, 1.0, 0.3 + k);
  W += vec3(1.8) * box(az, 0.95, 0.06, 0.04 + k) * box(el, 0.22, 0.5, 0.12 + k);
  return mix(D, W * smoothstep(0.0, 0.25, L + 0.02), uRoom);
}
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
// C del logotipo (arco ojival grueso + retornos finos), en unidades de la letra: x 0..44, y 0..100 hacia abajo
float sdC(vec2 q){
  float d1 = abs(length(q - vec2(67.82, 50.0)) - 67.82) - 4.0;
  if (q.y < 0.0 || q.y > 100.0 || q.x > 24.0) d1 = 99.0;
  float d2 = abs(length(q - vec2(-23.82, 50.0)) - 67.82) - 1.8;
  if (q.x < 21.0 || (q.y > 24.0 && q.y < 76.0) || q.y < 0.0 || q.y > 100.0) d2 = 99.0;
  return min(d1, d2);
}
void main(){
  vec3 N = normalize(vNor);
  vec3 V = normalize(uCam - vPos);
  if (dot(N, V) < 0.0) N = -N;
  vec3 R = reflect(-V, N);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fr = pow(1.0 - ndv, 5.0);
  vec3 col;
  float alpha = uAlpha;
  if (uMat < 0.5) {
    // cromo líquido (el acabado original)
    vec3 F = mix(vec3(0.82, 0.82, 0.81), vec3(1.0), fr);
    col = env(R, 0.0) * F;
    if (uEngrave > 0.5) {
      // C grabada en la cara frontal: chaflán que atrapa la luz y una ranura negra (espacio negativo)
      float face = smoothstep(0.80, 0.96, normalize(vObjN).z);
      if (face > 0.0) {
        float s = 100.0 / uCSize;
        vec2 q = vec2(vObj.x * s + 22.0, 50.0 - vObj.y * s);
        float d = sdC(q);
        float inside = (1.0 - smoothstep(-0.6, 0.6, d)) * face;
        if (inside > 0.001) {
          vec2 gq = vec2(sdC(q + vec2(0.4, 0.0)) - sdC(q - vec2(0.4, 0.0)), sdC(q + vec2(0.0, 0.4)) - sdC(q - vec2(0.0, 0.4)));
          vec3 gW = normalize(uNM * normalize(vec3(gq.x, -gq.y, 0.0) + vec3(1e-5)));
          float edge = smoothstep(-1.5, -0.25, d);                // 1 en el borde del trazo, 0 en el fondo
          vec3 Nb = normalize(N - gW * 1.6 * edge);              // la pared del chaflán mira hacia el centro del trazo
          vec3 Rb = reflect(-V, Nb);
          vec3 wall = env(Rb, 0.0) * mix(vec3(0.82, 0.82, 0.81), vec3(1.0), pow(1.0 - clamp(dot(Nb, V), 0.0, 1.0), 5.0));
          // luz rasante desde arriba a la izquierda: enciende las paredes que la miran (la C se revela con la luz)
          vec2 gUp = normalize(vec2(gq.x, -gq.y) + vec2(1e-5));
          float rake = pow(max(dot(-gUp, normalize(vec2(-0.55, 0.83))), 0.0), 1.5);
          wall += IVORY * rake * 0.85 * uLight;
          vec3 floorC = vec3(0.003) + env(R, 0.8) * 0.02;       // la ranura: negra, espacio negativo
          vec3 eng = mix(floorC, wall, edge);
          col = mix(col, eng, inside);
        }
      }
    }
  } else if (uMat < 1.5) {
    // metal satinado: el mismo estudio, reflejos difusos
    vec3 F = mix(vec3(0.5, 0.5, 0.51), vec3(0.9), fr);
    col = env(R, 0.38) * F * 0.62 + env(N, 0.9) * 0.04;
  } else if (uMat < 2.5) {
    // marfil mate
    vec3 Ld = normalize(vec3(-0.45, 0.75, 0.55));
    float dif = max(dot(N, Ld), 0.0), wrap = dot(N, Ld) * 0.5 + 0.5;
    vec3 amb = env(N, 0.9) * 0.32 + mix(vec3(0.05), vec3(0.42), uRoom);
    col = IVORY * (amb + vec3(0.7) * dif * uLight + vec3(0.14) * wrap * uLight) + env(R, 0.6) * 0.05 * fr;
  } else if (uMat < 3.5) {
    // vidrio: solo reflejo de Fresnel; deja ver lo que hay detrás
    float fg = 0.08 + 0.92 * pow(1.0 - ndv, 3.0);
    vec3 cg = env(R, 0.02) * 1.05 + IVORY * 0.03;
    alpha = clamp(fg * 0.9 + 0.05, 0.0, 1.0) * uAlpha;
    vec3 outc = pow(aces(cg), vec3(1.0 / 2.2));
    gl_FragColor = vec4(outc * alpha, alpha);
    return;
  } else {
    // obsidiana: laca negra con reflejo nítido
    float f2 = 0.04 + 0.96 * fr;
    col = vec3(0.01) + env(R, 0.03) * (f2 * 0.95 + 0.03);
  }
  col = aces(col);
  gl_FragColor = vec4(pow(col, vec3(1.0 / 2.2)) * alpha, alpha);
}`;

function compile(gl, vs, fs) {
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}
function persp(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}
function rot3(rx, ry, rz) {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  return [
    [cy * cz, -cy * sz, sy],
    [cx * sz + sx * sy * cz, cx * cz - sx * sy * sz, -sx * cy],
    [sx * sz - cx * sy * cz, sx * cz + cx * sy * sz, cx * cy],
  ];
}
function mul3(a, b) {
  const r = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
  return r;
}
// Grupo (posición, giro, escala uniforme) × pieza (posición, giro, medidas por eje)
function compone(g, pt) {
  const Rg = rot3(g.r[0], g.r[1], g.r[2]), Rp = pt.r ? rot3(pt.r[0], pt.r[1], pt.r[2]) : [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const R = mul3(Rg, Rp), s = pt.s || [1, 1, 1], u = g.s, pp = pt.p || [0, 0, 0];
  const t = [0, 1, 2].map((i) => g.p[i] + u * (Rg[i][0] * pp[0] + Rg[i][1] * pp[1] + Rg[i][2] * pp[2]));
  const M = new Float32Array(16), N = new Float32Array(9);
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { M[j * 4 + i] = R[i][j] * s[j] * u; N[j * 3 + i] = R[i][j] / s[j]; }
  M[12] = t[0]; M[13] = t[1]; M[14] = t[2]; M[15] = 1;
  return {M, N, z: t[2]};
}

/* ---------------------------------------------------------------- motor */
export function crearEscultura(canvas, {quality = 'high', preserve = false} = {}) {
  const gl = canvas.getContext('webgl', {antialias: true, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: preserve, powerPreference: 'high-performance'});
  if (!gl) return null;
  const low = quality === 'low';
  const U = low ? 112 : 160, V = low ? 84 : 120;               // resolución original del lingote
  const prog = compile(gl, VS, FS);
  const loc = {};
  ['uModel', 'uVP', 'uNM', 'uCam', 'uTime', 'uLight', 'uTilt', 'uAmp', 'uFreq', 'uAlpha', 'uMat', 'uRoom', 'uEngrave', 'uCSize'].forEach((n) => (loc[n] = gl.getUniformLocation(prog, n)));
  const aPos = gl.getAttribLocation(prog, 'aPos'), aNor = gl.getAttribLocation(prog, 'aNor');

  const upload = (m) => {
    const b = {pos: gl.createBuffer(), nor: gl.createBuffer(), idx: gl.createBuffer(), count: m.count};
    gl.bindBuffer(gl.ARRAY_BUFFER, b.pos); gl.bufferData(gl.ARRAY_BUFFER, m.pos, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.nor); gl.bufferData(gl.ARRAY_BUFFER, m.nor, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.idx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.idx, gl.STATIC_DRAW);
    return b;
  };
  const meshes = {
    cuerpo: upload(meshFromShape(FORMAS.monolito, U, V)),
    losa: upload(meshFromShape(LOSA, low ? 40 : 56, low ? 30 : 40)),
    ojiva: upload(makePrism(ojiva(0.575, -1.135, 0.2, 0.62, 1.195), 0.01)),
  };

  const meshOf = (m) => {
    if (typeof m === 'string') return meshes[m];
    const key = 'tubo:' + m.tubo.map((x) => x.toFixed(4)).join(',');
    if (!meshes[key]) { const [r, a0, a1, t, d] = m.tubo; meshes[key] = upload(makeTube(r, a0, a1, t, d, Math.max(8, Math.round(Math.abs(a1 - a0) * r * 40)))); meshes[key].seg = Math.max(8, Math.round(Math.abs(a1 - a0) * r * 40)); }
    return meshes[key];
  };

  let W = 1, H = 1;
  const fov = (28 * Math.PI) / 180, camZ = 9;
  const halfH = Math.tan(fov / 2) * camZ;
  let VP = persp(fov, 1, 0.1, 60);
  function resize(w, h, ratio) {
    W = w; H = h;
    canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio);
    const P = persp(fov, w / h, 0.1, 60);
    VP = new Float32Array(P); VP[12] = P[12]; VP[14] = P[10] * -camZ + P[14]; VP[15] = P[11] * -camZ + P[15];
  }
  const toWorld = (x, y) => [((x / W) * 2 - 1) * halfH * (W / H), (1 - (y / H) * 2) * halfH];
  const pxToWorld = (px) => (px / H) * 2 * halfH;

  // items: [{mesh, M, N, z, mat, room, light, alpha, amp, freq, engrave, cSize}]
  function draw(items, {time = 0, tilt = [0, 0]} = {}) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!items.length) return;
    gl.useProgram(prog);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.uniformMatrix4fv(loc.uVP, false, VP);
    gl.uniform3f(loc.uCam, 0, 0, camZ);
    gl.uniform1f(loc.uTime, time);
    gl.uniform2f(loc.uTilt, tilt[0], tilt[1]);
    const opaque = items.filter((it) => it.mat !== 3 && it.alpha > 0.003);
    const glass = items.filter((it) => it.mat === 3 && it.alpha > 0.003).sort((a, b) => a.z - b.z);
    let bound = null;
    const one = (it) => {
      const m = meshOf(it.mesh);
      if (bound !== m) {
        gl.bindBuffer(gl.ARRAY_BUFFER, m.pos); gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, m.nor); gl.enableVertexAttribArray(aNor); gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.idx); bound = m;
      }
      gl.uniformMatrix4fv(loc.uModel, false, it.M);
      gl.uniformMatrix3fv(loc.uNM, false, it.N);
      gl.uniform1f(loc.uMat, it.mat);
      gl.uniform1f(loc.uRoom, it.room || 0);
      gl.uniform1f(loc.uLight, it.light ?? 1);
      gl.uniform1f(loc.uAlpha, it.alpha ?? 1);
      gl.uniform1f(loc.uAmp, it.amp || 0);
      gl.uniform1f(loc.uFreq, it.freq || 1.1);
      gl.uniform1f(loc.uEngrave, it.engrave ? 1 : 0);
      gl.uniform1f(loc.uCSize, it.cSize || 1.2);
      const n = it.prog != null && m.seg ? Math.round(clamp01(it.prog) * m.seg) * 24 : m.count;
      if (n > 0) gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_SHORT, 0);
    };
    gl.disable(gl.BLEND); gl.depthMask(true);
    opaque.forEach((it) => { if (it.alpha < 0.999) { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); } else gl.disable(gl.BLEND); one(it); });
    if (glass.length) { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); glass.forEach(one); gl.depthMask(true); }
  }
  return {gl, resize, draw, toWorld, pxToWorld, camZ};
}

/* ---------------------------------------------------------------- la familia
   Cada escultura es una función del tiempo (T), del ensamble (a: 0 disperso → 1 compuesto) y del avance de la
   sección (p). Devuelve piezas en su espacio local (alto total ≈ 2.4). */
const rnd = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const pieza = (mesh, p, r, s, mat, extra) => Object.assign({mesh, p, r, s, mat}, extra);
// un arco continuo (tubo de sección rectangular) que se traza según prog
function arco(out, cx, cy, r, a0, a1, t, d, mat, prog = 1, z = 0) {
  if (prog < 0.01) return;
  out.push(pieza({tubo: [r, a0, a1, t, d]}, [cx, cy, z], [0, 0, 0], [1, 1, 1], mat, {prog}));
}
// barra de (x0,y0) a (x1,y1) que crece desde su origen
function barra(out, x0, y0, x1, y1, v, t, d, mat, z = 0) {
  if (v < 0.03) return;
  const L = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0);
  out.push(pieza('losa', [x0 + (x1 - x0) * v / 2, y0 + (y1 - y0) * v / 2, z], [0, 0, ang], [(L / 2) * v, t, d], mat));
}
const CROMO = 0, SATIN = 1, MARFIL = 2, VIDRIO = 3, OBSIDIANA = 4;
// marco ojival de cromo (jambas + dos arcos de centro opuesto), a escala k con origen (ox, oy, oz)
function marco(out, ox, oy, oz, k, t, d, prog = 1) {
  const w = 0.62 * k, ys = 0.2 * k + oy, r = 1.24 * k, y0 = -1.15 * k + oy;
  for (const sd of [-1, 1]) out.push(pieza('losa', [ox + sd * w, (y0 + ys) / 2, oz], [0, 0, 0], [t, (ys - y0) / 2, d], CROMO));
  arco(out, ox + w, ys, r, (2 * Math.PI) / 3 - 0.025, Math.PI, t, d, CROMO, prog, oz);
  arco(out, ox - w, ys, r, 0, Math.PI / 3 + 0.025, t, d, CROMO, prog, oz);
}

export const FAMILIA = {
  // Identidad: el monolito original (se dibuja aparte en la portada; aquí, en el contacto)
  monolito: () => [pieza('cuerpo', [0, 0, 0], [0, 0, 0], [1, 1, 1], CROMO, {amp: FORMAS.monolito.amp, freq: FORMAS.monolito.freq, engrave: true})],

  // Manifiesto: el monolito partido en seis fragmentos que se ordenan hasta formar una composición
  fragmentos: ({T, a}) => {
    const out = [], N = 6, h = 0.36, gap = 0.05;
    const ax = [0.05, -0.09, 0.0, 0.11, -0.05, 0.07], ay = [0, 0.1, -0.07, 0.18, -0.12, 0.04];
    for (let i = 0; i < N; i++) {
      const ai = ea(a * 1.45 - i * 0.09);
      const y = -1.2 + h / 2 + i * (h + gap);
      const sx = (rnd(i, 1) - 0.5) * 1.8, sy = y + (rnd(i, 2) - 0.5) * 0.8, sz = -1.4 + rnd(i, 3) * 1.6;
      const fl = Math.sin(T * 0.5 + i * 1.3) * 0.025 * (1 - ai * 0.6);
      out.push(pieza('losa',
        [lerp(sx, ax[i], ai), lerp(sy, y, ai) + fl, lerp(sz, 0, ai)],
        [lerp((rnd(i, 4) - 0.5) * 2.2, 0, ai), lerp((rnd(i, 5) - 0.5) * 2.6, ay[i], ai) + Math.sin(T * 0.3 + i) * 0.035, lerp((rnd(i, 6) - 0.5) * 1.6, 0, ai)],
        [0.5, h / 2, 0.16], i === 3 ? MARFIL : (i === 1 || i === 4 ? SATIN : CROMO)));
    }
    return out;
  },

  // Obras: un diafragma de siete hojas, la apertura por donde entra la luz de cada pieza
  diafragma: ({T, a}) => {
    const out = [], N = 7, o = ea(a), rr = lerp(0.3, 0.6, o), pitch = lerp(0.95, 0.32, o), spin = T * 0.04;
    for (let i = 0; i < N; i++) {
      const th = (i * TAU) / N + spin;
      out.push(pieza('losa', [Math.cos(th) * rr, Math.sin(th) * rr, i * 0.012 - 0.04], [0, 0, th + Math.PI / 2 + pitch], [0.5, 0.13, 0.016], i % 2 ? SATIN : CROMO));
    }
    arco(out, 0, 0, 1.0, 0, TAU, 0.026, 0.05, CROMO);
    return out;
  },

  // I · Creative: la traza. Rectángulo áureo y sus arcos, dibujados antes de construir
  traza: ({T, a}) => {
    const out = [], W = 0.62, t = 0.02, d = 0.03, k = a * 8;
    const pv = ea(a * 3);
    if (pv > 0.03) out.push(pieza('losa', [0, 0, -0.09], [0, 0, 0], [W * pv, 1.0 * pv, 0.012], OBSIDIANA));
    barra(out, -W, -1.0, -W, 1.0, ea(k - 0.2), t, d, CROMO);
    barra(out, -W, -1.0, W, -1.0, ea(k - 0.6), t, d, CROMO);
    barra(out, W, -1.0, W, 1.0, ea(k - 1.0), t, d, CROMO);
    barra(out, W, 1.0, -W, 1.0, ea(k - 1.4), t, d, CROMO);
    barra(out, -W, 0.24, W, 0.24, ea(k - 2.2), t, d, CROMO);
    barra(out, 0.14, 0.24, 0.14, 1.0, ea(k - 2.8), t, d, CROMO);
    barra(out, 0.14, 0.52, W, 0.52, ea(k - 3.3), t, d, CROMO);
    arco(out, W, 0.24, 1.24, Math.PI, 1.5 * Math.PI, t * 0.8, d, CROMO, clamp01(k - 4.0));
    arco(out, 0.14, 0.24, 0.76, Math.PI / 2, Math.PI, t * 0.8, d, CROMO, clamp01(k - 5.0));
    arco(out, 0.14, 0.52, 0.48, 0, Math.PI / 2, t * 0.8, d, CROMO, clamp01(k - 5.7));
    const cv = ea(k - 6.6);
    if (cv > 0.03) out.push(pieza('losa', [0.36, 0.4, 0.06], [0.6, T * 0.25 + 0.785, 0.4], [0.065 * cv, 0.065 * cv, 0.065 * cv], MARFIL));
    return out;
  },

  // II · Design: un arco ojival que se construye dovela por dovela; la clave (marfil) lo cierra al final
  arco: ({a}) => {
    const out = [], span = 0.7, ys = 0.1, r = 1.4, sh = -0.12, n = 5, da = Math.PI / 18;
    const pv = ea(a * 3);
    for (const sd of [-1, 1]) if (pv > 0.03) out.push(pieza('losa', [sd * span, -1.15 + 0.625 * pv + sh, 0], [0, 0, 0], [0.12, 0.625 * pv, 0.15], CROMO));
    for (let k = 0; k < n; k++) {
      const av = ea(a * 7 - 1 - k); if (av < 0.03) continue;
      const m = Math.PI - (k + 0.5) * da;
      for (const sd of [-1, 1]) {
        const x = sd * -(span + r * Math.cos(m)), y = ys + r * Math.sin(m) + sh;
        out.push(pieza('losa', [x, y + (1 - av) * 1.3, 0], [0, 0, sd * -(m + Math.PI / 2) + (1 - av) * 0.6 * sd], [r * da * 0.56, 0.12, 0.15], k % 2 ? SATIN : CROMO));
      }
    }
    const kv = ea(a * 7 - 6);
    if (kv > 0.03) out.push(pieza('losa', [0, ys + r * Math.sin(Math.PI / 3) + sh - 0.1 + (1 - kv) * 1.2, 0.005], [0, 0, 0], [0.12, 0.16, 0.16], MARFIL));
    return out;
  },

  // III · Motion: fotogramas metálicos; una onda lenta los recorre como el tiempo recorre una secuencia
  fotogramas: ({T, p}) => {
    const out = [], N = 11;
    for (let i = 0; i < N; i++) {
      const ry = Math.sin(T * 0.42 - i * 0.32) * 0.72 + i * 0.1 + (p - 0.5) * 1.1 * (i / (N - 1));
      out.push(pieza('losa', [0, -1.1 + i * 0.22, 0], [0, ry, 0], [0.56, 0.032, 0.34], i % 3 === 1 ? SATIN : CROMO));
    }
    return out;
  },

  // IV · Digital: un portal ojival con superficies de cristal; una línea de luz marfil lo recorre
  portal: ({T, a}) => {
    const out = [], v = ea(a);
    marco(out, 0, 0, 0, 1, 0.045, 0.07);
    out.push(pieza('losa', [0, -1.17, 0], [0, 0, 0], [0.72, 0.035, 0.1], SATIN));
    out.push(pieza('ojiva', [0, 0, lerp(0.7, 0, v)], [0, 0, 0], [1, 1, 1], VIDRIO, {alpha: v}));
    out.push(pieza('ojiva', [0.06, -0.07, lerp(-0.9, -0.36, v)], [0, 0, 0], [0.8, 0.8, 1], VIDRIO, {alpha: 0.75 * v}));
    const sy = -1.0 + ((T * 0.09) % 1) * 1.18;
    if (v > 0.2) out.push(pieza('losa', [0, sy, 0.03], [0, 0, 0], [0.54 * v, 0.006, 0.012], MARFIL));
    return out;
  },

  // Garantía: un dintel. Dos pilares de obsidiana sostienen una viga de cromo y, debajo, a resguardo, el bloque de
  // marfil: lo que usted entrega queda protegido por una estructura que no se mueve. Nada flota
  dintel: ({a}) => {
    const out = [], y0 = 0.25;
    const b = ea(a * 4), pl = ea(a * 4 - 0.6), li = ea(a * 4 - 1.5), bl = ea(a * 4 - 2.5);
    out.push(pieza('losa', [0, -1.0 + y0, 0], [0, 0, 0], [0.8 * (0.6 + 0.4 * b), 0.07, 0.38], SATIN, {alpha: Math.min(1, b * 2)}));
    if (pl > 0.02) for (const sd of [-1, 1]) out.push(pieza('losa', [sd * 0.46, -0.93 + 0.62 * pl + y0, 0], [0, 0, 0], [0.14, 0.62 * pl, 0.22], OBSIDIANA));
    if (li > 0.02) out.push(pieza('losa', [0, 0.44 + (1 - li) * 0.5 + y0, 0], [0, 0, 0], [0.68, 0.13, 0.24], CROMO, {alpha: Math.min(1, li * 2)}));
    if (bl > 0.02) out.push(pieza('losa', [0, -0.77 + y0, 0.4 * (1 - bl)], [0, 0.6 * (1 - bl), 0], [0.16, 0.16, 0.16], MARFIL, {alpha: Math.min(1, bl * 2)}));
    return out;
  },

  // Proceso: seis módulos, uno por paso; se ensamblan mientras se avanza por el proceso
  modulos: ({a}) => {
    const out = [], M = [
      [-1.08, 0.8, 0.12, 0.5, OBSIDIANA, 0], [-0.8, 0.62, 0.16, 0.4, CROMO, 0.3], [-0.44, 0.46, 0.2, 0.32, OBSIDIANA, 0],
      [0.02, 0.3, 0.26, 0.22, CROMO, 0.3], [0.44, 0.22, 0.16, 0.18, SATIN, 0], [0.73, 0.13, 0.13, 0.13, CROMO, Math.PI / 4],
    ];
    M.forEach(([y, sx, sy, sz, mat, ry], i) => {
      const v = ea(a * 6 - i); if (v < 0.03) return;
      const k = 0.7 + 0.3 * v;
      out.push(pieza('losa', [0, y + (1 - v) * 0.9, 0], [0, ry + (1 - v) * 0.8, 0], [sx * k, sy * k, sz * k], mat, {alpha: Math.min(1, v * 1.6)}));
    });
    return out;
  },

  // Estudio: la visión que reúne a la familia. La identidad (monolito) al centro, el cristal detrás, la traza que lo
  // rodea, un fragmento suspendido y el módulo de marfil al pie: todo lo que hace el estudio, en una sola composición
  vision: ({T, a}) => {
    const out = [], v = ea(a);
    out.push(pieza('losa', [0, -1.12, 0], [0, 0, 0], [0.8, 0.035, 0.34], SATIN));
    marco(out, 0.3, -0.19, -0.5, 0.78, 0.03, 0.05, v);
    out.push(pieza('ojiva', [0.3, -0.19, -0.5], [0, 0, 0], [0.78, 0.78, 1], VIDRIO, {alpha: 0.9 * v}));
    out.push(pieza('cuerpo', [-0.12, 0.12 + Math.sin(T * 0.4) * 0.025, 0.1], [0, 0.22 + Math.sin(T * 0.2) * 0.1, 0], [0.56, 0.56, 0.56], CROMO, {amp: 0.01, freq: 1.1}));
    out.push(pieza('losa', [0.56, -0.97 - (1 - v) * 0.3, 0.2], [0, 0.5, 0], [0.12, 0.12, 0.12], MARFIL));
    arco(out, -0.12, 0.05, 0.92, Math.PI * 1.62, Math.PI * 0.88, 0.009, 0.014, CROMO, v, 0.2);
    return out;
  },
};

// Cómo se ve cada una dentro de su sección: giro base, vaivén, reacción al scroll y sala
const POSE = {
  monolito: {rx: 0.03, ry: 0.2, swing: 0.16, yaw: 0.2},
  fragmentos: {rx: 0.05, ry: -0.35, swing: 0.12, yaw: 0.5},
  diafragma: {rx: 0.12, ry: 0, swing: 0.2, yaw: 0.3},
  traza: {rx: 0.04, ry: -0.3, swing: 0.18, yaw: 0.3},
  arco: {rx: 0.06, ry: 0.4, swing: 0.25, yaw: 0.4},
  fotogramas: {rx: 0.3, ry: 0.3, swing: 0.08, yaw: 0},
  portal: {rx: 0.04, ry: -0.25, swing: 0.3, yaw: 0.4},
  dintel: {rx: 0.1, ry: 0.4, swing: 0.22, yaw: 0.25},
  modulos: {rx: 0.12, ry: 0.6, swing: 0.15, yaw: 0.3, room: 1},
  vision: {rx: 0.04, ry: 0, swing: 0.15, yaw: 0.2},
};
// Cuándo se compone cada una según el avance de su sección
const ENSAMBLE = {
  monolito: () => 1, fotogramas: () => 1,
  fragmentos: (p) => (p - 0.1) / 0.35, diafragma: (p) => (p - 0.1) / 0.3, traza: (p) => (p - 0.06) / 0.34,
  arco: (p) => (p - 0.06) / 0.32, portal: (p) => (p - 0.1) / 0.3, dintel: (p) => (p - 0.1) / 0.3,
  modulos: (p) => p, vision: (p) => (p - 0.12) / 0.33,
};

// Una escultura completa en coordenadas de pantalla (también la usan las herramientas para las imágenes de respaldo)
export function componerEscultura(eng, kind, {cx, cy, h, T = 1.3, a = 1, p = 0.5, tilt = [0, 0], light = 1, z = 0, rot = null, cSize = 1.35}) {
  const pose = POSE[kind] || POSE.monolito;
  const [wx, wy] = eng.toWorld(cx, cy);
  const g = {p: [wx, wy, z], r: rot || [pose.rx + tilt[1] * 0.1, pose.ry + tilt[0] * 0.15, 0], s: eng.pxToWorld(h) / 2.5};
  return FAMILIA[kind]({T, a, p}).map((pt) => {
    const c = compone(g, pt);
    return {mesh: pt.mesh, M: c.M, N: c.N, z: c.z, mat: pt.mat, room: pose.room || 0, light, alpha: pt.alpha ?? 1, amp: pt.amp || 0, freq: pt.freq, engrave: pt.engrave, cSize, prog: pt.prog};
  });
}

/* ---------------------------------------------------------------- director
   Lee los anclajes del DOM ([data-escultura="tipo"]). Cada escultura vive en su sección: se enciende al entrar,
   se compone con el scroll y reacciona con calma al cursor. El lingote de la portada conserva su revelación
   (oscuridad → luz) y su avance hacia la cámara. */
export function dirigirEscultura(canvas, {reduce = false, onMorph} = {}) {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const wide = matchMedia('(min-width: 1000px)');
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  const lowEnd = coarse && (cores <= 4 || mem <= 3);
  let eng;
  try { eng = crearEscultura(canvas, {quality: coarse ? 'low' : 'high'}); } catch (e) { console.warn('escultura:', e); eng = null; }
  if (!eng) { document.documentElement.classList.add('no-webgl'); return null; }
  document.documentElement.classList.add('webgl');

  let ratio = Math.min(devicePixelRatio || 1, lowEnd ? 1.25 : 1.75);
  let vw = 0, vh = 0;
  function onResize(force) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!force && w === vw && Math.abs(h - vh) < 120) return;
    vw = w; vh = h; eng.resize(w, h, ratio);
  }

  const anchors = [...document.querySelectorAll('[data-escultura]')].map((el) => ({
    el, kind: el.dataset.escultura, hero: el.hasAttribute('data-escultura-hero'),
    ref: el.dataset.progreso ? document.querySelector(el.dataset.progreso) : null, pasos: el.dataset.modo === 'pasos',
    rect: null, vis: false, a: reduce ? 1 : 0, light: reduce ? 1 : 0.3, done: false,
  })).filter((x) => x.hero || FAMILIA[x.kind]);
  if (!anchors.length) return null;
  const heroA = anchors.find((x) => x.hero);
  const heroLogo = document.getElementById('heroLogo');
  const st = {light: reduce ? 1 : 0, revealT: 0, pointer: [0, 0], tilt: [0, 0], scrollV: 0, lastScroll: scrollY, time: 0, pulse: 0, flash: 0, hero: 0, drawn: false};
  let running = false, last = performance.now();
  let fSum = 0, fN = 0, degraded = false;

  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const nx = (e.clientX / innerWidth) * 2 - 1, ny = (e.clientY / innerHeight) * 2 - 1;
    st.pulse = Math.min(1, st.pulse + Math.hypot(nx - st.pointer[0], ny - st.pointer[1]) * 0.5);
    st.pointer = [nx, ny];
  }, {passive: true});
  let gyro = false;
  const onOrient = (e) => { if (e.gamma == null) return; gyro = true; st.pointer = [Math.max(-1, Math.min(1, e.gamma / 30)), Math.max(-1, Math.min(1, (e.beta - 45) / 30))]; };
  const needPerm = typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function';
  if (!reduce && typeof DeviceOrientationEvent !== 'undefined' && !needPerm) addEventListener('deviceorientation', onOrient, {passive: true});
  const askGyro = () => { if (reduce || gyro || !needPerm) return; DeviceOrientationEvent.requestPermission().then((s) => { if (s === 'granted') addEventListener('deviceorientation', onOrient, {passive: true}); }).catch(() => {}); };
  // tocar el lingote: una onda recorre el metal y la luz barre el grabado de la C
  if (heroA) heroA.el.addEventListener('click', () => { askGyro(); if (reduce) return; st.pulse = 1; st.flash = 1; onMorph && onMorph('monolito'); kick(); });
  addEventListener('resize', () => { onResize(); kick(); });
  addEventListener('scroll', () => kick(), {passive: true});
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });

  function step(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!degraded && !reduce) { fSum += dt; fN++; if (fN === 90) { if (fSum / fN > 0.03 && ratio > 1) { ratio = 1; degraded = true; onResize(true); } fSum = 0; fN = 0; } }
    st.time += dt;
    if (st.light < 1) { st.revealT += dt; st.light = reduce ? 1 : ease.inOut(clamp01((st.revealT - 0.25) / 2.6)); }
    const sv = scrollY - st.lastScroll; st.lastScroll = scrollY;
    st.scrollV += (Math.max(-80, Math.min(80, sv)) - st.scrollV) * 0.12;
    const kp = 1 - Math.exp(-dt * 3.0);
    st.tilt[0] += (st.pointer[0] - st.tilt[0]) * kp; st.tilt[1] += (st.pointer[1] - st.tilt[1]) * kp;
    st.pulse *= Math.exp(-dt * 1.6); st.flash *= Math.exp(-dt * 1.2);
    const T = reduce ? 1.3 : st.time, calm = reduce ? 0 : 1;
    const items = [];
    let anyVis = false, moving = st.light < 1 || Math.abs(st.scrollV) > 0.05 || st.flash > 0.01;

    for (const A of anchors) {
      const r = A.el.getBoundingClientRect();
      A.rect = r;
      A.vis = r.bottom > -80 && r.top < vh + 80 && r.width > 0;
      if (A.hero) {
        // ---- el lingote original: misma geometría, material y revelación; menos vaivén para que la C se lea
        const heroP = st.hero;
        if (!A.vis && heroP <= 0) continue;
        const hpx = r.height, cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const [wx, wy] = eng.toWorld(cx, cy + Math.sin(T * 0.8) * hpx * 0.01 * calm);
        const z = heroP * heroP * 5.2 * calm;
        if (cy + hpx < -60 && z < 0.5) continue;
        anyVis = true;
        const scale = eng.pxToWorld(hpx) / 2.5;
        const amp = (FORMAS.monolito.amp + st.pulse * 0.05 + Math.min(0.04, Math.abs(st.scrollV) * 0.0012)) * calm + (reduce ? FORMAS.monolito.amp * 0.4 : 0);
        const rotY = calm * (Math.sin(T * 0.35) * 0.14 + st.tilt[0] * 0.18 + heroP * 1.4 + st.scrollV * 0.002);
        const rotX = calm * (Math.sin(T * 0.3) * 0.05 + st.tilt[1] * 0.12 - heroP * 0.25);
        const rotZ = calm * Math.sin(T * 0.4 + 1) * 0.02;
        const alpha = 1 - smoothClamp(z, 4.6, 5.6);
        // la C mide lo mismo que las letras del logotipo: alto de letra = ancho del logotipo × 100 / 488
        const letter = heroLogo ? heroLogo.offsetWidth * 100 / 488 : hpx * 0.48;
        const c = compone({p: [wx, wy, z], r: [rotX, rotY, rotZ], s: scale}, {});
        items.push({mesh: 'cuerpo', M: c.M, N: c.N, z: c.z, mat: CROMO, light: Math.min(1.35, st.light * (1 + st.flash * 0.35)), alpha, amp, freq: FORMAS.monolito.freq, engrave: true, cSize: 2.5 * letter / hpx});
        continue;
      }
      if (!A.vis) continue;
      anyVis = true;
      // avance de la sección (o del elemento de referencia) y ensamble suavizado
      let p;
      if (A.ref) {
        const rr = A.ref.getBoundingClientRect();
        p = A.pasos ? (wide.matches ? clamp01((vh * 0.62 - rr.top) / rr.height) : clamp01((clamp01((vh - r.top) / (vh + r.height)) - 0.1) / 0.4)) : clamp01((vh - rr.top) / (vh + rr.height));
      } else p = clamp01((vh - r.top) / (vh + r.height));
      const target = reduce ? 1 : clamp01(ENSAMBLE[A.kind](p));
      A.a += (target - A.a) * (reduce ? 1 : 1 - Math.exp(-dt * 2.4));
      if (Math.abs(target - A.a) > 0.002) moving = true;
      const lt = 0.32 + 0.68 * (A.kind === 'fotogramas' || A.kind === 'monolito' ? 1 : ea(A.a));
      A.light += (lt - A.light) * (reduce ? 1 : 1 - Math.exp(-dt * 1.8));
      if (!A.done && A.a > 0.97) { A.done = true; if (A.kind !== 'monolito') onMorph && onMorph(A.kind); }
      const pose = POSE[A.kind];
      const cy = r.top + r.height / 2 + (0.5 - p) * r.height * 0.06 * calm;
      const rot = [pose.rx + calm * st.tilt[1] * 0.1, pose.ry + calm * (Math.sin(T * 0.17) * pose.swing + st.tilt[0] * 0.15 + (p - 0.5) * pose.yaw + T * (pose.spin || 0)), 0];
      items.push(...componerEscultura(eng, A.kind, {cx: r.left + r.width / 2, cy, h: r.height, T, a: A.a, p, light: A.light, rot, cSize: 1.35}));
    }

    if (items.length) { eng.draw(items, {time: T * calm + (reduce ? 1.3 : 0), tilt: st.tilt}); st.drawn = true; }
    else if (st.drawn) { eng.draw([]); st.drawn = false; }

    if (!document.hidden && (moving || (anyVis && !reduce))) requestAnimationFrame(step);
    else running = false;
  }
  function kick() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(step); } }

  onResize(true);
  kick();
  return {
    kick,
    setHero(p) { st.hero = clamp01(p); kick(); },
    get light() { return st.light; },
    remove(el) { const i = anchors.findIndex((x) => x.el === el); if (i >= 0) anchors.splice(i, 1); kick(); },
  };
}
function smoothClamp(x, a, b) { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); }
