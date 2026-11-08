
/* =====================================================================
   PROCEDURAL GEOMETRY
   ===================================================================== */
class GB {
  constructor(r) { this.p = []; this.n = []; this.c = []; this.L = null; this.xf = null; this.r = r || Math.random; }
  lit() { if (!this.L) { this.L = new GB(this.r); this.L.xf = this.xf; } return this.L; }
  setXf(a, ox = 0, oy = 0, oz = 0) { this.xf = a === null ? null : { c: Math.cos(a), s: Math.sin(a), ox, oy, oz }; if (this.L) this.L.xf = this.xf; }
  _pt(x, y, z) { const f = this.xf; return f ? [x * f.c - z * f.s + f.ox, y + f.oy, x * f.s + z * f.c + f.oz] : [x, y, z]; }
  _rn(x, y, z) { const f = this.xf; return f ? [x * f.c - z * f.s, y, x * f.s + z * f.c] : [x, y, z]; }
  tri(a, b, c, k) {
    a = this._pt(a[0], a[1], a[2]); b = this._pt(b[0], b[1], b[2]); c = this._pt(c[0], c[1], c[2]);
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    this.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    this.n.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    this.c.push(k[0], k[1], k[2], k[0], k[1], k[2], k[0], k[1], k[2]);
  }
  quad(a, b, c, d, hex) { const k = typeof hex === 'string' ? C(hex) : hex; this.tri(a, b, c, k); this.tri(a, c, d, k); }
  box(w, h, d, x, y, z, hex, ry = 0) {
    const k = C(hex), hw = w / 2, hd = d / 2, cs = Math.cos(ry), sn = Math.sin(ry);
    const P = (px, py, pz) => [x + px * cs + pz * sn, y + py, z - px * sn + pz * cs];
    const a = P(-hw, 0, hd), b = P(hw, 0, hd), c = P(hw, 0, -hd), e = P(-hw, 0, -hd);
    const a2 = P(-hw, h, hd), b2 = P(hw, h, hd), c2 = P(hw, h, -hd), e2 = P(-hw, h, -hd);
    this.quad(a, b, b2, a2, k); this.quad(b, c, c2, b2, k); this.quad(c, e, e2, c2, k); this.quad(e, a, a2, e2, k); this.quad(a2, b2, c2, e2, k);
  }
  gable(w, h, d, x, y, z, hex, ry = 0, endHex) {
    const k = C(hex), ke = C(endHex || hex), hw = w / 2, hd = d / 2, cs = Math.cos(ry), sn = Math.sin(ry);
    const P = (px, py, pz) => [x + px * cs + pz * sn, y + py, z - px * sn + pz * cs];
    const a = P(-hw, 0, hd), b = P(hw, 0, hd), c = P(hw, 0, -hd), e = P(-hw, 0, -hd), r1 = P(-hw, h, 0), r2 = P(hw, h, 0);
    this.quad(a, b, r2, r1, k); this.quad(c, e, r1, r2, k); this.tri(b, c, r2, ke); this.tri(e, a, r1, ke);
  }
  pyr(w, h, d, x, y, z, hex) {
    const k = C(hex), hw = w / 2, hd = d / 2, ap = [x, y + h, z];
    const a = [x - hw, y, z + hd], b = [x + hw, y, z + hd], c = [x + hw, y, z - hd], e = [x - hw, y, z - hd];
    this.tri(a, b, ap, k); this.tri(b, c, ap, k); this.tri(c, e, ap, k); this.tri(e, a, ap, k);
  }
  geo(src, hex, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
    const g = src.index ? src.toNonIndexed() : src.clone(); g.applyMatrix4(m);
    const P = g.attributes.position.array, N = g.attributes.normal.array, k = C(hex);
    for (let i = 0; i < P.length; i += 3) {
      const q = this._pt(P[i], P[i + 1], P[i + 2]), nn = this._rn(N[i], N[i + 1], N[i + 2]);
      this.p.push(q[0], q[1], q[2]); this.n.push(nn[0], nn[1], nn[2]); this.c.push(k[0], k[1], k[2]);
    }
    g.dispose(); src.dispose();
  }
  cyl(rt, rb, h, seg, x, y, z, hex, o = {}) { this.geo(new THREE.CylinderGeometry(rt, rb, h, seg, 1, !!o.open, o.ts || 0, o.tl || Math.PI * 2), hex, x, y + h / 2, z, o.sx || 1, 1, o.sz || 1); }
  cone(r, h, seg, x, y, z, hex) { this.geo(new THREE.ConeGeometry(r, h, seg), hex, x, y + h / 2, z); }
  sph(r, x, y, z, hex, o = {}) { this.geo(new THREE.SphereGeometry(r, o.ws || 14, o.hs || 8, 0, Math.PI * 2, 0, o.half ? Math.PI / 2 : Math.PI), hex, x, y, z, o.sx || 1, o.sy || 1, o.sz || 1, o.rx || 0, o.ry || 0, o.rz || 0); }
  ico(r, x, y, z, hex, sy = 1) { this.geo(new THREE.IcosahedronGeometry(r, 0), hex, x, y, z, 1, sy, 1); }
  build() {
    if (!this.p.length) return null; const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.computeBoundingSphere(); g.computeBoundingBox(); return g;
  }
}
const PAL = {
  walls: ['#efe7da', '#e2ddd3', '#d9c9b3', '#cdd7df', '#ecd5c6', '#d6e2d8'],
  roofs: ['#b5523d', '#5a6d7e', '#7d4c3a', '#35677a', '#8d5b3d', '#4b5d6e'],
  acc: ['#e8604c', '#2fa58f', '#4a7fe0', '#e5a33d', '#9a6ad8', '#e0507e'],
};
function lawn(g, s, col = '#7fb65a') { g.box(s - 0.06, 0.03, s - 0.06, 0, 0, 0, col); }
function pave(g, s, col = '#b3b8bf') { g.box(s - 0.06, 0.03, s - 0.06, 0, 0, 0, col); }
function bush(g, x, z, r = 0.08, col = '#4f9a45') { g.ico(r, x, 0.03 + r * 0.75, z, col); }
function treeG(g, x, z, s = 1, pine = false, y = 0.03) {
  g.cyl(0.022 * s, 0.032 * s, 0.16 * s, 5, x, y, z, '#6b4a33');
  if (pine) { g.cone(0.15 * s, 0.36 * s, 7, x, y + 0.1 * s, z, '#2f6b3a'); } else { g.ico(0.15 * s, x, y + 0.26 * s, z, '#4f9a45'); g.ico(0.1 * s, x + 0.05 * s, y + 0.36 * s, z, '#62ad50'); }
}
function flag(g, x, z, h, c1, c2 = '#f3f5f7') { g.cyl(0.012, 0.016, h, 6, x, 0.03, z, '#dfe3e8'); g.box(0.012, 0.07, 0.22, x, 0.03 + h - 0.13, z + 0.11, c1); g.box(0.012, 0.07, 0.22, x, 0.03 + h - 0.2, z + 0.11, c2); }
function lamp(g, x, z, h = 0.32, y = 0.03) { g.cyl(0.008, 0.011, h, 5, x, y, z, '#48505c'); g.lit().box(0.045, 0.025, 0.045, x, y + h, z, '#fff1c9'); }
function winGrid(g, cx, cz, w, d, y0, y1, o = {}) {
  const fh = o.fh || 0.27, ww = o.ww || 0.1, wh = o.wh || 0.13, cw = o.cw || 0.2, lit = o.lit ?? 0.5, gk = C(o.glass || '#2b3f5c'), faces = o.faces || 15;
  const rows = Math.max(1, Math.floor((y1 - y0) / fh)), L = g.lit(), off = 0.006;
  const face = (len, put) => { const cols = Math.max(1, Math.floor(len / cw)), sp = len / cols; for (let r = 0; r < rows; r++) { const y = y0 + r * fh + (fh - wh) / 2; for (let c = 0; c < cols; c++) put(g.r() < lit ? L : g, -len / 2 + sp * (c + 0.5), y); } };
  if (faces & 1) face(w, (G, t, y) => { const z = cz + d / 2 + off; G.quad([cx + t - ww / 2, y, z], [cx + t + ww / 2, y, z], [cx + t + ww / 2, y + wh, z], [cx + t - ww / 2, y + wh, z], gk); });
  if (faces & 2) face(d, (G, t, y) => { const x = cx + w / 2 + off; G.quad([x, y, cz - t + ww / 2], [x, y, cz - t - ww / 2], [x, y + wh, cz - t - ww / 2], [x, y + wh, cz - t + ww / 2], gk); });
  if (faces & 4) face(w, (G, t, y) => { const z = cz - d / 2 - off; G.quad([cx + t + ww / 2, y, z], [cx + t - ww / 2, y, z], [cx + t - ww / 2, y + wh, z], [cx + t + ww / 2, y + wh, z], gk); });
  if (faces & 8) face(d, (G, t, y) => { const x = cx - w / 2 - off; G.quad([x, y, cz + t - ww / 2], [x, y, cz + t + ww / 2], [x, y + wh, cz + t + ww / 2], [x, y + wh, cz + t - ww / 2], gk); });
}
function ribbons(g, cx, cz, w, d, y0, y1, fh, lit, glass = '#3b5672', faces = 15) {
  const rows = Math.max(1, Math.floor((y1 - y0) / fh)), wh = fh * 0.56, L = g.lit(), gk = C(glass), off = 0.006, pw = w * 0.47, pd = d * 0.47;
  for (let r = 0; r < rows; r++) {
    const y = y0 + r * fh + (fh - wh) / 2;
    const G = () => g.r() < lit ? L : g;
    if (faces & 1) { const z = cz + d / 2 + off; G().quad([cx - pw, y, z], [cx + pw, y, z], [cx + pw, y + wh, z], [cx - pw, y + wh, z], gk); }
    if (faces & 2) { const x = cx + w / 2 + off; G().quad([x, y, cz + pd], [x, y, cz - pd], [x, y + wh, cz - pd], [x, y + wh, cz + pd], gk); }
    if (faces & 4) { const z = cz - d / 2 - off; G().quad([cx + pw, y, z], [cx - pw, y, z], [cx - pw, y + wh, z], [cx + pw, y + wh, z], gk); }
    if (faces & 8) { const x = cx - w / 2 - off; G().quad([x, y, cz - pd], [x, y, cz + pd], [x, y + wh, cz + pd], [x, y + wh, cz - pd], gk); }
  }
}
function coolingTower(g, x, z, r, h) {
  const pr = [[r, 0], [r * 0.84, h * 0.3], [r * 0.66, h * 0.68], [r * 0.7, h * 0.88], [r * 0.76, h]];
  g.geo(new THREE.LatheGeometry(pr.map(p => new THREE.Vector2(p[0], p[1])), 20), '#d8dbdf', x, 0.03, z);
  g.geo(new THREE.LatheGeometry(pr.slice().reverse().map(p => new THREE.Vector2(p[0] - 0.03, p[1])), 20), '#aeb3b9', x, 0.03, z);
  g.cyl(r * 0.77, r * 0.77, 0.03, 20, x, 0.03 + h - 0.03, z, '#c4c8cd', { open: true });
}
function plane(g, x, z, ry) {
  const cs = Math.cos(ry), sn = Math.sin(ry), P = (px, pz) => [x + px * cs + pz * sn, z - px * sn + pz * cs];
  g.geo(new THREE.CylinderGeometry(0.055, 0.045, 0.9, 10), '#f4f6f8', x, 0.18, z, 1, 1, 1, 0, ry, Math.PI / 2);
  g.box(0.22, 0.015, 0.95, x, 0.15, z, '#dfe4e9', ry);
  let [tx, tz] = P(-0.38, 0); g.box(0.14, 0.17, 0.015, tx, 0.2, tz, '#3a6ea5', ry); g.box(0.1, 0.012, 0.34, tx, 0.21, tz, '#dfe4e9', ry);
  [tx, tz] = P(0.47, 0); g.sph(0.05, tx, 0.18, tz, '#f4f6f8');
}

const GEO = {
  house(g, lv, v) {
    const Wc = PAL.walls[v % 6], R = PAL.roofs[v % 6];
    lawn(g, 1); g.box(0.13, 0.036, 0.4, 0.2, 0, 0.27, '#d9d1c1');
    if (lv === 1) {
      g.box(0.54, 0.34, 0.44, -0.04, 0.03, -0.06, Wc); g.gable(0.66, 0.22, 0.56, -0.04, 0.37, -0.06, R, 0, Wc);
      g.box(0.11, 0.19, 0.02, 0.12, 0.03, 0.165, '#6d4b3b');
      winGrid(g, -0.04, -0.06, 0.54, 0.44, 0.12, 0.34, { fh: 0.22, cw: 0.17, ww: 0.08, wh: 0.09, lit: 0.55, faces: 14 });
      winGrid(g, -0.16, -0.06, 0.24, 0.44, 0.12, 0.34, { fh: 0.22, cw: 0.24, ww: 0.09, wh: 0.09, lit: 0.6, faces: 1 });
      g.box(0.07, 0.2, 0.07, -0.2, 0.45, -0.15, '#8c6f5e');
      bush(g, -0.33, 0.3, 0.09); bush(g, 0.37, -0.33, 0.1); bush(g, 0.36, 0.05, 0.07);
    } else if (lv === 2) {
      g.box(0.62, 0.6, 0.5, -0.06, 0.03, -0.08, Wc); g.gable(0.74, 0.26, 0.62, -0.06, 0.63, -0.08, R, 0, Wc);
      winGrid(g, -0.06, -0.08, 0.62, 0.5, 0.1, 0.6, { fh: 0.25, cw: 0.17, ww: 0.08, wh: 0.1, lit: 0.5 });
      g.box(0.11, 0.19, 0.02, 0.12, 0.03, 0.175, '#6d4b3b');
      g.box(0.2, 0.24, 0.32, 0.36, 0.03, -0.12, Wc); g.box(0.22, 0.025, 0.34, 0.36, 0.27, -0.12, R);
      bush(g, -0.36, 0.32, 0.09); treeG(g, -0.37, 0.3, 0.7);
    } else {
      g.box(0.62, 0.3, 0.46, -0.1, 0.03, -0.1, '#f2f0ea'); g.box(0.66, 0.03, 0.5, -0.1, 0.33, -0.1, '#d4d2cc');
      g.box(0.46, 0.28, 0.44, 0.04, 0.36, -0.12, '#3f4b58'); g.box(0.5, 0.03, 0.48, 0.04, 0.64, -0.12, '#e5e3dc');
      ribbons(g, -0.1, -0.1, 0.62, 0.46, 0.06, 0.33, 0.27, 0.7, '#35506e');
      ribbons(g, 0.04, -0.12, 0.46, 0.44, 0.39, 0.64, 0.25, 0.6, '#35506e');
      g.box(0.34, 0.012, 0.2, 0.18, 0.03, 0.3, '#e9e6df'); g.box(0.3, 0.016, 0.16, 0.18, 0.03, 0.3, '#3fb8e0');
      bush(g, -0.36, 0.32, 0.08); treeG(g, -0.37, 0.08, 0.75);
    }
  },
  apartment(g, lv, v) {
    const Wc = ['#e9e2d4', '#d6dde6', '#e6d3c3', '#cfd9cf'][v % 4], h = [1.25, 1.95, 2.75][lv - 1];
    pave(g, 1, '#aeb4bc');
    g.box(0.78, 0.24, 0.78, 0, 0.03, 0, '#59626d');
    winGrid(g, 0, 0, 0.78, 0.78, 0.05, 0.24, { fh: 0.19, cw: 0.26, ww: 0.2, wh: 0.13, lit: 1, glass: '#41597a' });
    g.box(0.76, h - 0.24, 0.76, 0, 0.27, 0, Wc);
    winGrid(g, 0, 0, 0.76, 0.76, 0.33, h + 0.03, { fh: 0.25, cw: 0.19, ww: 0.1, wh: 0.13, lit: 0.45 });
    if (v % 2 === 0) for (let y = 0.52; y < h; y += 0.5) g.box(0.8, 0.025, 0.8, 0, y, 0, '#f4f1ea');
    else g.box(0.12, h - 0.24, 0.79, 0, 0.27, 0, PAL.acc[v % 6]);
    g.box(0.82, 0.07, 0.82, 0, h + 0.03, 0, '#8c949e');
    g.box(0.18, 0.14, 0.18, 0.16, h + 0.1, -0.14, '#b9c0c8'); g.cyl(0.07, 0.07, 0.16, 8, -0.18, h + 0.1, 0.16, '#d9dde2');
  },
  villa(g) {
    lawn(g, 2, '#79b457');
    g.box(1.9, 0.09, 0.03, 0, 0.03, -0.93, '#ece8de'); g.box(1.9, 0.09, 0.03, 0, 0.03, 0.93, '#ece8de'); g.box(0.03, 0.09, 1.9, -0.93, 0.03, 0, '#ece8de'); g.box(0.03, 0.09, 1.9, 0.93, 0.03, 0, '#ece8de');
    for (const [hx, hz, ry] of [[-0.42, -0.42, 0], [0.42, 0.4, Math.PI]]) {
      g.setXf(ry, hx, 0, hz);
      g.box(0.72, 0.3, 0.5, 0, 0.03, 0, '#f4f2ec'); g.box(0.76, 0.03, 0.54, 0, 0.33, 0, '#d9d6cf');
      g.box(0.48, 0.28, 0.42, -0.1, 0.36, -0.02, '#465565'); g.box(0.52, 0.03, 0.46, -0.1, 0.64, -0.02, '#e8e6e0');
      ribbons(g, 0, 0, 0.72, 0.5, 0.06, 0.33, 0.27, 0.75, '#35506e'); ribbons(g, -0.1, -0.02, 0.48, 0.42, 0.39, 0.64, 0.25, 0.6, '#35506e');
      g.box(0.5, 0.012, 0.26, 0.05, 0.03, 0.44, '#e9e6df'); g.box(0.46, 0.016, 0.22, 0.05, 0.03, 0.44, '#3fb8e0');
      g.setXf(null);
    }
    treeG(g, 0.6, -0.6, 1.1); treeG(g, -0.6, 0.6, 1.0); treeG(g, 0.75, -0.2, 0.8, true); treeG(g, -0.75, 0.2, 0.85, true); bush(g, 0, 0, 0.12);
  },
  tower(g, lv, v) {
    const h = [3.4, 4.8, 6.4][lv - 1], Wc = ['#e4e7ec', '#e8dfd2', '#d5dfe2'][v % 3], gl = ['#2f4d6c', '#35526a', '#2c4a5f'][v % 3];
    pave(g, 2, '#a9b0b8');
    g.box(1.8, 0.42, 1.6, 0, 0.03, 0.05, '#5a6470');
    winGrid(g, 0, 0.05, 1.8, 1.6, 0.07, 0.42, { fh: 0.34, cw: 0.3, ww: 0.24, wh: 0.22, lit: 0.9, glass: '#41597a' });
    g.box(1.84, 0.04, 1.64, 0, 0.45, 0.05, '#d9dde2');
    g.box(0.55, 0.05, 0.45, -0.55, 0.49, 0.5, '#6aa84f'); g.ico(0.1, -0.65, 0.6, 0.5, '#4f9a45'); g.ico(0.09, -0.42, 0.6, 0.55, '#5aa84a');
    const tw = 1.1, y0 = 0.49;
    g.box(tw, h, tw, 0.1, y0, -0.15, Wc);
    winGrid(g, 0.1, -0.15, tw, tw, y0 + 0.06, y0 + h, { fh: 0.26, cw: 0.18, ww: 0.1, wh: 0.15, lit: 0.45, glass: gl });
    for (let k = 1, y; (y = y0 + k * 0.52) < y0 + h - 0.1; k++) g.box(tw + 0.08, 0.022, tw + 0.08, 0.1, y, -0.15, '#f3f1ec');
    g.box(tw + 0.06, 0.12, tw + 0.06, 0.1, y0 + h, -0.15, '#8d96a0'); g.box(0.4, 0.3, 0.4, 0.1, y0 + h + 0.12, -0.15, '#c7cdd4');
    g.cyl(0.015, 0.015, 0.5, 4, 0.1, y0 + h + 0.42, -0.15, '#ccd2d9');
  },
  shop(g, lv, v) {
    const Wc = ['#f4efe6', '#e7eef5', '#f1e3d3', '#dde7e0', '#efe0e6'][v % 5], A = PAL.acc[v % 6], h = [0.46, 0.72, 1.02][lv - 1];
    pave(g, 1, '#b9bec6');
    g.box(0.8, h, 0.66, 0, 0.03, -0.08, Wc);
    g.lit().quad([-0.36, 0.06, 0.256], [0.36, 0.06, 0.256], [0.36, 0.27, 0.256], [-0.36, 0.27, 0.256], '#41597a');
    g.box(0.84, 0.035, 0.18, 0, 0.29, 0.32, A); g.box(0.42, 0.1, 0.025, 0, 0.34, 0.258, A);
    if (lv > 1) winGrid(g, 0, -0.08, 0.8, 0.66, 0.48, h + 0.03, { fh: 0.25, cw: 0.2, ww: 0.1, wh: 0.12, lit: 0.5, faces: 11 });
    g.box(0.84, 0.04, 0.7, 0, h + 0.03, -0.08, '#9aa2ab'); g.box(0.16, 0.1, 0.14, -0.2, h + 0.07, -0.2, '#c4cad1');
    bush(g, 0.39, 0.39, 0.06); lamp(g, -0.4, 0.4, 0.3);
  },
  mall(g, lv, v) {
    const A = PAL.acc[(v * 2 + 1) % 6], h = lv === 1 ? 0.75 : 1.1;
    pave(g, 2, '#8e959e');
    for (let k = -3; k <= 3; k++) g.box(0.02, 0.004, 0.3, k * 0.24, 0.03, 0.72, '#e9ecef');
    g.box(1.8, h, 1.15, 0, 0.03, -0.33, '#e8e6e1');
    ribbons(g, 0, -0.33, 1.8, 1.15, 0.12, h - 0.12, 0.3, 0.6, '#3b5470', 14);
    g.box(1.84, 0.13, 1.19, 0, h - 0.1, -0.33, A);
    g.lit().box(0.8, h * 0.8, 0.18, 0, 0.03, 0.33, '#45648a');
    g.box(0.92, 0.05, 0.26, 0, h * 0.8 + 0.03, 0.33, '#d9dde2');
    g.box(0.3, 0.12, 0.25, -0.5, h + 0.03, -0.55, '#b3bac2'); g.box(0.25, 0.1, 0.2, 0.45, h + 0.03, -0.65, '#b3bac2');
    if (lv >= 2) g.sph(0.32, 0, h + 0.03, -0.3, '#86b7dc', { half: true, ws: 18, hs: 8 });
    if (lv === 3) { g.box(0.6, 1.7, 0.5, 0.55, h + 0.03, -0.6, '#cfd6de'); ribbons(g, 0.55, -0.6, 0.6, 0.5, h + 0.1, h + 1.7, 0.25, 0.5, '#2f4d6c'); }
    lamp(g, -0.85, 0.55); lamp(g, 0.85, 0.55);
  },
  office(g, lv, v) {
    const gl = ['#365a7f', '#2e5068', '#4a6f8f', '#2f5d68'][v % 4], fr = ['#cfd6de', '#9aa6b2', '#e1e5ea', '#b9c4cc'][v % 4], h = [2.2, 3.2, 4.4][lv - 1];
    pave(g, 1, '#a7aeb6');
    g.box(0.8, 0.3, 0.8, 0, 0.03, 0, '#545d68');
    winGrid(g, 0, 0, 0.8, 0.8, 0.05, 0.3, { fh: 0.25, cw: 0.26, ww: 0.21, wh: 0.18, lit: 1, glass: '#41597a' });
    g.box(0.7, h, 0.7, 0, 0.33, 0, gl);
    ribbons(g, 0, 0, 0.7, 0.7, 0.36, 0.33 + h, 0.22, 0.55, '#5f88b1');
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.box(0.045, h, 0.045, a * 0.35, 0.33, b * 0.35, fr);
    g.box(0.75, 0.08, 0.75, 0, 0.33 + h, 0, fr);
    if (v % 2) { g.box(0.45, 0.35, 0.45, 0, 0.41 + h, 0, gl); g.box(0.48, 0.04, 0.48, 0, 0.76 + h, 0, fr); }
    g.cyl(0.012, 0.012, 0.6, 4, 0.15, 0.41 + h, 0.15, '#d0d6dd');
  },
  hotel(g) {
    pave(g, 2, '#b5bac1');
    g.box(1.7, 0.45, 1.0, 0, 0.03, 0.35, '#d8d3c8');
    winGrid(g, 0, 0.35, 1.7, 1.0, 0.06, 0.45, { fh: 0.36, cw: 0.28, ww: 0.22, wh: 0.24, lit: 0.95, glass: '#41597a', faces: 11 });
    g.box(0.8, 0.02, 0.45, -0.38, 0.48, 0.5, '#e9e6df'); g.box(0.74, 0.02, 0.39, -0.38, 0.49, 0.5, '#3fb8e0');
    const h = 4.2;
    g.box(1.5, h, 0.6, 0, 0.03, -0.55, '#f0ece4');
    winGrid(g, 0, -0.55, 1.5, 0.6, 0.5, h + 0.03, { fh: 0.27, cw: 0.17, ww: 0.12, wh: 0.16, lit: 0.6, glass: '#2f4d6c' });
    for (let y = 0.77; y < h; y += 0.27) g.box(1.54, 0.02, 0.66, 0, y, -0.55, '#ffffff');
    g.box(1.56, 0.16, 0.66, 0, h + 0.03, -0.55, '#2f8f86');
    g.lit().box(0.62, 0.16, 0.03, 0, h - 0.26, -0.24, '#ffe1a8');
    treeG(g, 0.65, 0.75, 0.9); treeG(g, -0.65, 0.78, 0.8); lamp(g, 0.25, 0.9);
  },
  skyscraper(g, lv, v) {
    const h = [6.5, 8.5, 11][lv - 1], gl = ['#2d4f73', '#3a5f6e', '#41506e'][v % 3], rb = ['#6a95c0', '#7fb0bd', '#8b9cc7'][v % 3], fr = '#d5dbe2';
    pave(g, 2, '#a2a9b2');
    g.box(1.7, 0.55, 1.7, 0, 0.03, 0, '#4f5863');
    winGrid(g, 0, 0, 1.7, 1.7, 0.06, 0.55, { fh: 0.45, cw: 0.3, ww: 0.25, wh: 0.34, lit: 1, glass: '#41597a' });
    let y = 0.58;
    [[1.3, 0.5], [1.0, 0.3], [0.7, 0.2]].forEach(([w, f], k) => {
      const hh = h * f; if (v === 1 && k === 1) g.setXf(Math.PI / 4);
      g.box(w, hh, w, 0, y, 0, gl); ribbons(g, 0, 0, w, w, y + 0.05, y + hh, 0.2, 0.55, rb); g.box(w + 0.06, 0.06, w + 0.06, 0, y + hh, 0, fr);
      g.setXf(null); y += hh + 0.06;
    });
    g.cyl(0.03, 0.06, 1.4, 6, 0, y, 0, '#dfe4ea'); g.lit().box(0.06, 0.06, 0.06, 0, y + 1.4, 0, '#ff8a8a');
  },
  farm(g) {
    g.box(1.94, 0.03, 1.94, 0, 0, 0, '#8b6b4a');
    for (let k = 0; k < 9; k++) g.box(1.22, 0.05, 0.13, -0.33, 0.03, -0.85 + k * 0.212, k % 2 ? '#d1bb5c' : '#7fae4f');
    g.box(0.45, 0.4, 0.6, 0.62, 0.03, -0.45, '#b5452f'); g.gable(0.68, 0.22, 0.52, 0.62, 0.43, -0.45, '#5b4636', Math.PI / 2, '#b5452f');
    g.box(0.02, 0.25, 0.22, 0.385, 0.03, -0.45, '#f2efe8');
    g.cyl(0.13, 0.13, 0.75, 12, 0.62, 0.03, 0.25, '#cfd4da'); g.sph(0.13, 0.62, 0.78, 0.25, '#9aa3ad', { half: true });
    for (const [x, z] of [[0.45, 0.7], [0.62, 0.72], [0.8, 0.68]]) g.geo(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 10), '#d9b25a', x, 0.1, z, 1, 1, 1, Math.PI / 2, 0, 0);
    treeG(g, 0.85, 0.15, 0.8);
  },
  factory(g, lv, v) {
    const wc = ['#a6b0bb', '#b8ad9e'][v % 2];
    pave(g, 2, '#8f969e');
    g.box(1.3, 0.55, 1.05, -0.25, 0.03, -0.25, wc);
    for (let k = 0; k < 3; k++) g.gable(1.3, 0.2, 0.35, -0.25, 0.58, -0.6 + k * 0.35, '#6f7c8a', 0, wc);
    ribbons(g, -0.25, -0.25, 1.3, 1.05, 0.15, 0.5, 0.35, 0.45, '#3d5672', 10);
    g.box(0.25, 0.3, 0.02, -0.55, 0.03, 0.285, '#5f6872'); g.box(0.25, 0.3, 0.02, -0.1, 0.03, 0.285, '#5f6872');
    g.cyl(0.08, 0.1, 1.5, 10, 0.6, 0.03, -0.6, '#c5c9ce'); g.cyl(0.085, 0.09, 0.1, 10, 0.6, 1.15, -0.6, '#d24b3c'); g.cyl(0.085, 0.085, 0.1, 10, 0.6, 1.4, -0.6, '#d24b3c');
    if (lv >= 2) { g.cyl(0.07, 0.09, 1.25, 10, 0.8, 0.03, -0.25, '#c5c9ce'); g.cyl(0.075, 0.08, 0.08, 10, 0.8, 1.1, -0.25, '#d24b3c'); }
    g.cyl(0.18, 0.18, 0.45, 12, 0.6, 0.03, 0.3, '#d7dbe0'); g.sph(0.18, 0.6, 0.48, 0.3, '#c3c8ce', { half: true });
    g.box(0.12, 0.1, 0.28, -0.55, 0.03, 0.62, '#e5e7ea'); g.box(0.12, 0.13, 0.1, -0.55, 0.03, 0.81, '#d24b3c');
  },
  mine(g) {
    g.box(1.94, 0.03, 1.94, 0, 0, 0, '#8a7558');
    const hx = -0.45, hz = -0.4;
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.box(0.05, 1.1, 0.05, hx + a * 0.17, 0.03, hz + b * 0.17, '#b04a3a');
    g.box(0.42, 0.05, 0.42, hx, 0.6, hz, '#b04a3a'); g.box(0.42, 0.06, 0.42, hx, 1.13, hz, '#b04a3a');
    g.geo(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 14), '#3e434a', hx, 1.32, hz, 1, 1, 1, Math.PI / 2, 0, 0);
    g.box(0.6, 0.35, 0.45, 0.35, 0.03, -0.5, '#c7b9a1'); g.gable(0.66, 0.15, 0.5, 0.35, 0.38, -0.5, '#6e5a4a', 0, '#c7b9a1');
    g.cone(0.36, 0.36, 8, 0.42, 0.03, 0.45, '#4a3f36'); g.cone(0.25, 0.25, 8, -0.08, 0.03, 0.62, '#5a4c40');
    g.geo(new THREE.BoxGeometry(0.95, 0.04, 0.1), '#575d66', -0.02, 0.38, 0.1, 1, 1, 1, 0, Math.PI / 4, 0.42);
    g.box(0.18, 0.12, 0.3, -0.62, 0.03, 0.55, '#e0b53c'); g.box(0.16, 0.08, 0.1, -0.62, 0.15, 0.48, '#4a4f57');
  },
  industrial(g) {
    pave(g, 3, '#878e97');
    g.box(1.4, 0.7, 1.1, -0.7, 0.03, -0.75, '#a7b1bc');
    for (let k = 0; k < 3; k++) g.gable(1.4, 0.24, 0.367, -0.7, 0.73, -1.117 + k * 0.367, '#6f7c8a', 0, '#a7b1bc');
    ribbons(g, -0.7, -0.75, 1.4, 1.1, 0.15, 0.65, 0.3, 0.4, '#3d5672', 3);
    g.box(1.1, 0.55, 0.9, 0.75, 0.03, -0.85, '#b9b3a7'); g.gable(1.16, 0.22, 0.96, 0.75, 0.58, -0.85, '#7a6f62', 0, '#b9b3a7');
    for (const [x, z] of [[0.55, 0.35], [0.95, 0.35], [0.75, 0.8]]) { g.cyl(0.2, 0.2, 0.6, 14, x, 0.03, z, '#dde1e5'); g.sph(0.2, x, 0.63, z, '#c9ced4', { half: true }); }
    g.geo(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), '#9aa3ad', 0.75, 0.45, 0.35, 1, 1, 1, 0, 0, Math.PI / 2);
    for (const x of [-1.2, -0.9]) { g.cyl(0.09, 0.12, 2.0, 10, x, 0.03, 0.6, '#c5c9ce'); g.cyl(0.095, 0.1, 0.12, 10, x, 1.6, 0.6, '#d24b3c'); }
    g.box(0.05, 0.9, 0.05, -0.4, 0.03, 0.4, '#e0a03a'); g.box(0.05, 0.9, 0.05, -0.4, 0.03, 1.2, '#e0a03a'); g.box(0.05, 0.9, 0.05, 0.2, 0.03, 0.4, '#e0a03a'); g.box(0.05, 0.9, 0.05, 0.2, 0.03, 1.2, '#e0a03a');
    g.box(0.7, 0.06, 0.06, -0.1, 0.93, 0.4, '#e0a03a'); g.box(0.7, 0.06, 0.06, -0.1, 0.93, 1.2, '#e0a03a');
    for (let k = 0; k < 4; k++) g.box(0.3, 0.13, 0.14, -0.1, 0.03 + (k % 2) * 0.13, 0.6 + Math.floor(k / 2) * 0.3, ['#d9534f', '#3b7dd8', '#f0ad4e', '#5cb85c'][k]);
  },
  solar(g) {
    lawn(g, 2, '#8cbf63');
    for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) {
      const z = -0.66 + r * 0.44, x = -0.45 + c * 0.9;
      g.box(0.03, 0.15, 0.03, x - 0.3, 0.03, z, '#9aa3ad'); g.box(0.03, 0.15, 0.03, x + 0.3, 0.03, z, '#9aa3ad');
      g.geo(new THREE.BoxGeometry(0.82, 0.025, 0.34), '#1d3a63', x, 0.2, z, 1, 1, 1, -0.45, 0, 0);
      g.geo(new THREE.BoxGeometry(0.84, 0.012, 0.02), '#c9d2db', x, 0.2 + 0.075, z - 0.15, 1, 1, 1, -0.45, 0, 0);
    }
    g.box(0.16, 0.14, 0.12, 0.8, 0.03, 0.85, '#dfe3e8');
  },
  wind(g) {
    lawn(g, 1, '#86bb5e'); g.box(0.3, 0.06, 0.3, 0, 0.03, 0, '#c9cdd2');
    g.cyl(0.035, 0.065, 2.0, 10, 0, 0.09, 0, '#f1f3f5'); g.box(0.1, 0.1, 0.26, 0, 2.05, 0, '#e9ecef');
  },
  coal(g) {
    pave(g, 2, '#7f868f');
    coolingTower(g, -0.42, 0.4, 0.5, 1.4);
    g.box(0.95, 0.6, 0.6, 0.38, 0.03, -0.5, '#9aa4ae'); g.box(0.99, 0.05, 0.64, 0.38, 0.63, -0.5, '#6f7a85');
    ribbons(g, 0.38, -0.5, 0.95, 0.6, 0.15, 0.55, 0.3, 0.4, '#3d5672', 3);
    for (const [x, z] of [[0.6, 0.35], [0.82, 0.62]]) { g.cyl(0.07, 0.1, 2.0, 10, x, 0.03, z, '#d2d6db'); g.cyl(0.075, 0.08, 0.12, 10, x, 1.55, z, '#d24b3c'); g.cyl(0.075, 0.075, 0.12, 10, x, 1.85, z, '#d24b3c'); }
    g.cone(0.32, 0.26, 9, -0.55, 0.03, -0.55, '#26272b');
  },
  nuclear(g) {
    pave(g, 3, '#8d949c');
    coolingTower(g, -0.75, 0.55, 0.62, 1.9); coolingTower(g, 0.55, 0.75, 0.62, 1.9);
    g.cyl(0.42, 0.42, 0.6, 22, -0.55, 0.03, -0.75, '#dfe3e8'); g.sph(0.42, -0.55, 0.63, -0.75, '#eceff2', { half: true, ws: 22, hs: 10 });
    g.box(0.9, 0.5, 0.55, 0.6, 0.03, -0.75, '#aab3bd'); ribbons(g, 0.6, -0.75, 0.9, 0.55, 0.12, 0.45, 0.28, 0.5, '#3d5672');
    g.box(2.9, 0.12, 0.025, 0, 0.03, -1.45, '#9aa3ad'); g.box(2.9, 0.12, 0.025, 0, 0.03, 1.45, '#9aa3ad'); g.box(0.025, 0.12, 2.9, -1.45, 0.03, 0, '#9aa3ad'); g.box(0.025, 0.12, 2.9, 1.45, 0.03, 0, '#9aa3ad');
  },
  watertower(g) {
    pave(g, 1, '#b3b9c0');
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.box(0.035, 1.0, 0.035, a * 0.17, 0.03, b * 0.17, '#8f9aa6');
    g.box(0.36, 0.025, 0.025, 0, 0.45, 0.17, '#8f9aa6'); g.box(0.36, 0.025, 0.025, 0, 0.45, -0.17, '#8f9aa6'); g.box(0.025, 0.025, 0.36, 0.17, 0.45, 0, '#8f9aa6'); g.box(0.025, 0.025, 0.36, -0.17, 0.45, 0, '#8f9aa6');
    g.cyl(0.3, 0.3, 0.34, 18, 0, 1.0, 0, '#e7edf2'); g.cyl(0.305, 0.305, 0.07, 18, 0, 1.13, 0, '#3aa7d8'); g.cone(0.32, 0.16, 18, 0, 1.34, 0, '#cfd8e0');
  },
  waterplant(g) {
    pave(g, 2, '#a9b0b7');
    for (const [x, z] of [[-0.5, -0.5], [0.45, -0.5], [-0.5, 0.45]]) { g.cyl(0.36, 0.36, 0.14, 22, x, 0.03, z, '#cdd3d9'); g.cyl(0.32, 0.32, 0.01, 22, x, 0.165, z, '#3aa7d8'); g.box(0.66, 0.02, 0.04, x, 0.18, z, '#9aa3ad'); }
    g.box(0.62, 0.42, 0.52, 0.45, 0.03, 0.45, '#e3e7eb'); g.box(0.66, 0.04, 0.56, 0.45, 0.45, 0.45, '#8d97a1'); ribbons(g, 0.45, 0.45, 0.62, 0.52, 0.1, 0.42, 0.3, 0.5, '#3d5672');
  },
  clinic(g) {
    pave(g, 1, '#c3c8ce');
    g.box(0.8, 0.48, 0.62, 0, 0.03, -0.08, '#f3f6f8'); g.box(0.82, 0.07, 0.64, 0, 0.36, -0.08, '#2fa36b');
    winGrid(g, 0, -0.08, 0.8, 0.62, 0.08, 0.34, { fh: 0.26, cw: 0.2, ww: 0.11, wh: 0.13, lit: 0.6, faces: 14 });
    g.lit().quad([-0.15, 0.06, 0.236], [0.15, 0.06, 0.236], [0.15, 0.27, 0.236], [-0.15, 0.27, 0.236], '#41597a');
    g.box(0.42, 0.03, 0.22, 0, 0.29, 0.33, '#e7ebee');
    g.box(0.3, 0.04, 0.09, 0, 0.51, -0.08, '#2fa36b'); g.box(0.09, 0.04, 0.3, 0, 0.51, -0.08, '#2fa36b');
  },
  hospital(g) {
    pave(g, 2, '#b9bfc6');
    g.box(1.3, 1.6, 0.8, -0.15, 0.03, -0.45, '#f2f5f7'); ribbons(g, -0.15, -0.45, 1.3, 0.8, 0.15, 1.6, 0.25, 0.6, '#3f7f9a');
    g.box(0.62, 0.7, 0.9, 0.55, 0.03, 0.25, '#e6ebef'); ribbons(g, 0.55, 0.25, 0.62, 0.9, 0.12, 0.7, 0.25, 0.6, '#3f7f9a');
    g.cyl(0.3, 0.3, 0.02, 22, -0.15, 1.63, -0.45, '#4a5058');
    g.box(0.035, 0.006, 0.22, -0.22, 1.65, -0.45, '#ffffff'); g.box(0.035, 0.006, 0.22, -0.08, 1.65, -0.45, '#ffffff'); g.box(0.14, 0.006, 0.035, -0.15, 1.65, -0.45, '#ffffff');
    g.box(0.24, 0.07, 0.02, 0.55, 0.55, 0.71, '#e04848'); g.box(0.07, 0.24, 0.02, 0.55, 0.465, 0.71, '#e04848');
    g.box(0.5, 0.03, 0.25, -0.3, 0.3, 0.1, '#e7ebee'); g.box(0.13, 0.1, 0.25, -0.65, 0.03, 0.6, '#f7f7f7'); g.box(0.135, 0.03, 0.255, -0.65, 0.07, 0.6, '#e04848');
  },
  school(g, lv, v, nc) {
    lawn(g, 2, '#7db75a');
    const Wc = '#efe5d1', R = '#c4553e';
    g.box(1.5, 0.45, 0.42, 0, 0.03, -0.66, Wc); g.gable(1.6, 0.2, 0.52, 0, 0.48, -0.66, R, 0, Wc);
    winGrid(g, 0, -0.66, 1.5, 0.42, 0.09, 0.45, { fh: 0.18, cw: 0.15, ww: 0.09, wh: 0.1, lit: 0.4, faces: 5 });
    g.box(0.42, 0.45, 0.66, -0.54, 0.03, -0.1, Wc); g.gable(0.76, 0.2, 0.52, -0.54, 0.48, -0.1, R, Math.PI / 2, Wc);
    winGrid(g, -0.54, -0.1, 0.42, 0.66, 0.09, 0.45, { fh: 0.18, cw: 0.15, ww: 0.09, wh: 0.1, lit: 0.4, faces: 2 });
    g.box(0.9, 0.012, 0.7, 0.35, 0.03, 0.28, '#5f9e48');
    g.box(0.86, 0.005, 0.02, 0.35, 0.042, 0.28, '#f2f2f2'); g.box(0.02, 0.005, 0.66, 0.35, 0.042, 0.28, '#f2f2f2');
    g.box(0.02, 0.005, 0.66, -0.08, 0.042, 0.28, '#f2f2f2'); g.box(0.02, 0.005, 0.66, 0.78, 0.042, 0.28, '#f2f2f2');
    flag(g, -0.2, 0.62, 0.85, nc || '#e04848'); treeG(g, -0.8, 0.78, 0.9); treeG(g, -0.55, 0.82, 0.75);
  },
  university(g) {
    lawn(g, 3, '#78b357');
    g.box(0.22, 0.012, 2.9, 0, 0.03, 0, '#ddd3bd'); g.box(2.9, 0.012, 0.22, 0, 0.03, 0.25, '#ddd3bd');
    g.box(1.4, 0.8, 0.7, 0, 0.03, -0.95, '#ece4d4'); winGrid(g, 0, -0.95, 1.4, 0.7, 0.1, 0.8, { fh: 0.26, cw: 0.15, ww: 0.08, wh: 0.15, lit: 0.55, faces: 14 });
    for (let k = 0; k < 6; k++) g.cyl(0.04, 0.045, 0.6, 10, -0.5 + k * 0.2, 0.03, -0.52, '#f6f2ea');
    g.box(1.2, 0.05, 0.3, 0, 0.63, -0.53, '#efe9dc'); g.gable(1.24, 0.22, 0.34, 0, 0.68, -0.53, '#e2d8c4');
    g.cyl(0.32, 0.32, 0.25, 22, 0, 0.83, -0.95, '#e9e2d3'); g.sph(0.32, 0, 1.08, -0.95, '#4f8a9a', { half: true, ws: 22, hs: 10 }); g.cyl(0.02, 0.02, 0.25, 6, 0, 1.38, -0.95, '#d9d2c2');
    for (const s of [-1, 1]) { g.box(0.55, 0.6, 1.2, s * 1.05, 0.03, 0.35, '#e0d6c3'); g.gable(1.3, 0.2, 0.62, s * 1.05, 0.63, 0.35, '#9b5b45', Math.PI / 2, '#e0d6c3'); winGrid(g, s * 1.05, 0.35, 0.55, 1.2, 0.1, 0.6, { fh: 0.25, cw: 0.16, ww: 0.08, wh: 0.13, lit: 0.5, faces: s < 0 ? 2 : 8 }); }
    g.box(0.9, 0.45, 0.42, 0, 0.03, 1.1, '#d3c7b2'); ribbons(g, 0, 1.1, 0.9, 0.42, 0.08, 0.42, 0.3, 0.8, '#41597a');
    for (const [x, z] of [[-0.5, -0.2], [0.5, -0.2], [-0.5, 0.7], [0.5, 0.7], [-1.25, -1.2], [1.25, -1.2]]) treeG(g, x, z, 1.0);
  },
  police(g) {
    pave(g, 1, '#b8bec5');
    g.box(0.78, 0.5, 0.6, 0, 0.03, -0.12, '#eef2f7'); g.box(0.8, 0.1, 0.62, 0, 0.33, -0.12, '#2d5fb3');
    winGrid(g, 0, -0.12, 0.78, 0.6, 0.08, 0.32, { fh: 0.24, cw: 0.2, ww: 0.12, wh: 0.13, lit: 0.6 });
    g.box(0.82, 0.04, 0.64, 0, 0.53, -0.12, '#9aa4b0');
    g.lit().box(0.06, 0.05, 0.06, 0.12, 0.57, -0.12, '#ff6b6b'); g.lit().box(0.06, 0.05, 0.06, 0.22, 0.57, -0.12, '#6b9bff');
    g.box(0.13, 0.07, 0.25, -0.24, 0.03, 0.33, '#f4f6f8'); g.box(0.135, 0.025, 0.255, -0.24, 0.06, 0.33, '#2d5fb3'); g.box(0.11, 0.045, 0.13, -0.24, 0.1, 0.32, '#e8edf2');
    g.cyl(0.008, 0.008, 0.35, 4, -0.25, 0.57, -0.3, '#cfd5dc');
  },
  fire(g) {
    pave(g, 1, '#b7bcc2');
    g.box(0.8, 0.5, 0.62, 0, 0.03, -0.1, '#c8402f');
    g.box(0.24, 0.3, 0.02, -0.18, 0.03, 0.215, '#e7e3dc'); g.box(0.24, 0.3, 0.02, 0.14, 0.03, 0.215, '#e7e3dc');
    winGrid(g, 0, -0.1, 0.8, 0.62, 0.36, 0.5, { fh: 0.14, cw: 0.2, ww: 0.1, wh: 0.08, lit: 0.5, faces: 14 });
    g.box(0.2, 0.85, 0.2, 0.28, 0.03, -0.28, '#b13a2b'); g.box(0.24, 0.04, 0.24, 0.28, 0.88, -0.28, '#8f2d22');
    g.box(0.84, 0.04, 0.66, 0, 0.53, -0.1, '#7a2a20');
    g.box(0.13, 0.11, 0.3, -0.18, 0.03, 0.4, '#d6402f'); g.box(0.1, 0.02, 0.26, -0.18, 0.14, 0.4, '#d9dde2');
  },
  park(g) {
    lawn(g, 1, '#7cc05a'); g.box(0.95, 0.008, 0.14, 0, 0.03, 0, '#ddd2b8'); g.box(0.14, 0.008, 0.95, 0, 0.03, 0, '#ddd2b8');
    treeG(g, -0.28, -0.28, 1.0); treeG(g, 0.3, 0.28, 0.9); treeG(g, 0.3, -0.3, 0.8, true); bush(g, -0.3, 0.3, 0.1, '#5aa84a');
    g.cyl(0.11, 0.12, 0.04, 14, 0, 0.03, 0, '#cfd3d8'); g.cyl(0.09, 0.09, 0.006, 14, 0, 0.07, 0, '#4fc3e8');
    g.box(0.14, 0.03, 0.05, -0.12, 0.05, 0.2, '#8a6a4a'); lamp(g, 0.12, -0.12, 0.28);
  },
  forest(g) {
    lawn(g, 1, '#4f8f3e');
    treeG(g, -0.25, -0.22, 1.2, true); treeG(g, 0.22, -0.28, 1.0); treeG(g, 0.25, 0.22, 1.25, true); treeG(g, -0.22, 0.25, 1.05); treeG(g, 0.02, 0.0, 0.85);
  },
  plaza(g) {
    pave(g, 2, '#d8ccb4'); g.box(1.5, 0.006, 1.5, 0, 0.03, 0, '#c9bb9f'); g.box(1.0, 0.008, 1.0, 0, 0.03, 0, '#e3d8c2');
    g.cyl(0.32, 0.34, 0.08, 24, 0, 0.03, 0, '#cfd3d8'); g.cyl(0.29, 0.29, 0.01, 24, 0, 0.11, 0, '#4fc3e8');
    g.cyl(0.06, 0.08, 0.18, 10, 0, 0.11, 0, '#d9dde2'); g.cyl(0.13, 0.13, 0.02, 14, 0, 0.27, 0, '#cfd3d8'); g.cone(0.04, 0.2, 8, 0, 0.29, 0, '#bfe9f7');
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { treeG(g, a * 0.72, b * 0.72, 1.05); lamp(g, a * 0.45, b * 0.45, 0.34); g.box(0.28, 0.05, 0.1, a * 0.72, 0.03, b * 0.3, '#d9536f'); }
  },
  stadium(g) {
    pave(g, 3, '#9aa1aa');
    const wall = [[1.34, 0], [1.34, 0.64], [1.22, 0.72]].map(p => new THREE.Vector2(p[0], p[1]));
    const stand = [[1.22, 0.72], [1.0, 0.24], [0.93, 0.16]].map(p => new THREE.Vector2(p[0], p[1]));
    g.geo(new THREE.LatheGeometry(wall, 44), '#eef1f4', 0, 0.03, 0, 1, 1, 0.82);
    g.geo(new THREE.LatheGeometry(stand, 44), '#3a6ea5', 0, 0.03, 0, 1, 1, 0.82);
    g.geo(new THREE.CylinderGeometry(0.94, 0.94, 0.02, 44), '#4f9a45', 0, 0.17, 0, 1, 1, 0.82);
    g.geo(new THREE.CylinderGeometry(0.62, 0.62, 0.006, 4), '#5aa84f', 0, 0.183, 0, 1.2, 1, 0.75, 0, Math.PI / 4, 0);
    g.box(0.02, 0.005, 1.1, 0, 0.185, 0, '#f0f0f0'); g.geo(new THREE.TorusGeometry(0.14, 0.008, 4, 24), '#f0f0f0', 0, 0.186, 0, 1, 1, 1, Math.PI / 2, 0, 0);
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.cyl(0.025, 0.035, 1.4, 6, a * 1.25, 0.03, b * 1.05, '#cfd5dc'); g.lit().box(0.2, 0.11, 0.05, a * 1.25, 1.43, b * 1.05, '#fff6d8'); }
  },
  palace(g, lv, v, nc) {
    g.box(2.94, 0.03, 2.94, 0, 0, 0, '#7ab457');
    g.box(2.4, 0.035, 1.35, 0, 0, -0.62, '#e8e2d4'); g.box(0.32, 0.034, 1.5, 0, 0, 0.72, '#d9d0bd');
    g.box(2.0, 0.65, 0.85, 0, 0.065, -0.78, '#f7f4ec'); g.box(2.06, 0.06, 0.91, 0, 0.715, -0.78, '#e6e0d2');
    winGrid(g, 0, -0.78, 2.0, 0.85, 0.14, 0.68, { fh: 0.27, cw: 0.16, ww: 0.07, wh: 0.15, lit: 0.7, glass: '#2b3d55' });
    for (let k = 0; k < 6; k++) g.cyl(0.035, 0.042, 0.58, 10, -0.4 + k * 0.16, 0.065, -0.22, '#ffffff');
    g.box(1.0, 0.05, 0.32, 0, 0.645, -0.26, '#efe9dc'); g.gable(1.04, 0.2, 0.36, 0, 0.695, -0.26, '#f3eee3', 0, '#e8e1d1');
    g.box(0.95, 0.03, 0.14, 0, 0.035, -0.07, '#ddd5c4');
    g.box(1.9, 0.08, 0.78, 0, 0.775, -0.8, '#9aa3ac');
    g.cyl(0.2, 0.2, 0.12, 18, 0, 0.855, -0.85, '#f3efe6'); g.sph(0.2, 0, 0.975, -0.85, '#7fb0c4', { half: true, ws: 18, hs: 8 });
    g.cyl(0.32, 0.34, 0.05, 24, 0, 0.03, 0.55, '#d9d0bd'); g.cyl(0.27, 0.27, 0.06, 24, 0, 0.03, 0.55, '#6fae4f');
    flag(g, 0, 0.55, 1.5, nc || '#e04848');
    for (const s of [-1, 1]) { g.box(0.7, 0.07, 0.12, s * 0.75, 0.03, 0.3, '#3f7f3a'); g.box(0.7, 0.07, 0.12, s * 0.75, 0.03, 0.75, '#3f7f3a'); treeG(g, s * 1.2, 0.55, 1.15); treeG(g, s * 1.25, 1.15, 1.0); treeG(g, s * 1.25, -0.1, 0.9, true); lamp(g, s * 0.25, 1.05, 0.36); }
    g.box(1.15, 0.09, 0.03, -0.85, 0.03, 1.43, '#e9e4d8'); g.box(1.15, 0.09, 0.03, 0.85, 0.03, 1.43, '#e9e4d8');
    g.box(0.06, 0.22, 0.06, -0.24, 0.03, 1.43, '#e9e4d8'); g.box(0.06, 0.22, 0.06, 0.24, 0.03, 1.43, '#e9e4d8');
  },
  parliament(g, lv, v, nc) {
    pave(g, 3, '#c9c2b2'); g.box(2.6, 0.008, 0.95, 0, 0.03, 0.85, '#76b056');
    g.box(2.5, 0.55, 1.1, 0, 0.03, -0.55, '#efebe2'); winGrid(g, 0, -0.55, 2.5, 1.1, 0.1, 0.55, { fh: 0.22, cw: 0.15, ww: 0.08, wh: 0.12, lit: 0.6 });
    for (let k = 0; k < 10; k++) g.cyl(0.03, 0.035, 0.5, 8, -1.08 + k * 0.24, 0.03, 0.05, '#fbfaf6');
    g.box(2.4, 0.05, 0.22, 0, 0.53, 0.05, '#e5dfd2');
    for (const s of [-1, 1]) g.sph(0.72, s * 0.37, 0.58, -0.55, '#3f8f80', { half: true, sx: 0.66, sy: 0.6, sz: 0.95, ws: 20, hs: 10 });
    flag(g, 1.15, 0.95, 1.0, nc || '#e04848'); flag(g, -1.15, 0.95, 1.0, nc || '#e04848');
    g.cyl(0.25, 0.27, 0.05, 20, 0, 0.03, 0.8, '#d9d0bd'); g.cyl(0.22, 0.22, 0.01, 20, 0, 0.08, 0.8, '#4fc3e8');
  },
  military(g, lv, v, nc) {
    g.box(2.94, 0.03, 2.94, 0, 0, 0, '#6f7b55');
    for (const z of [-0.75, 0.1]) g.geo(new THREE.CylinderGeometry(0.38, 0.38, 1.1, 14, 1, false, 0, Math.PI), '#7d8a6a', -0.6, 0.03, z, 1, 1, 1, 0, 0, Math.PI / 2);
    g.cyl(0.36, 0.36, 0.015, 22, 0.75, 0.03, -0.75, '#4a5058'); g.box(0.035, 0.006, 0.24, 0.68, 0.047, -0.75, '#fff'); g.box(0.035, 0.006, 0.24, 0.82, 0.047, -0.75, '#fff'); g.box(0.14, 0.006, 0.035, 0.75, 0.047, -0.75, '#fff');
    g.box(0.85, 0.3, 0.3, 0.7, 0.03, 0.35, '#a8a28a'); g.box(0.85, 0.3, 0.3, 0.7, 0.03, 0.8, '#a8a28a'); g.box(0.87, 0.03, 0.32, 0.7, 0.33, 0.35, '#5f6650'); g.box(0.87, 0.03, 0.32, 0.7, 0.33, 0.8, '#5f6650');
    g.cyl(0.03, 0.03, 0.5, 6, 1.15, 0.03, -0.15, '#9aa3ad'); g.sph(0.2, 1.15, 0.6, -0.15, '#e3e7eb', { half: true, rx: -1.0 });
    for (const x of [-0.6, -0.15]) { g.box(0.2, 0.08, 0.3, x, 0.03, 1.0, '#55603f'); g.box(0.12, 0.06, 0.12, x, 0.11, 0.98, '#4a5437'); g.box(0.02, 0.02, 0.22, x, 0.14, 1.12, '#3c442c'); }
    g.box(2.9, 0.13, 0.02, 0, 0.03, -1.45, '#9aa3ad'); g.box(2.9, 0.13, 0.02, 0, 0.03, 1.45, '#9aa3ad'); g.box(0.02, 0.13, 2.9, -1.45, 0.03, 0, '#9aa3ad'); g.box(0.02, 0.13, 2.9, 1.45, 0.03, 0, '#9aa3ad');
    flag(g, -1.2, 1.15, 1.1, nc || '#e04848');
  },
  port(g) {
    g.box(1.94, 0.05, 1.94, 0, 0, 0, '#9ea6ae'); g.box(1.94, 0.02, 0.06, 0, 0.05, 0.94, '#f2c94c');
    const cc = ['#d9534f', '#3b7dd8', '#f0ad4e', '#5cb85c', '#7a5cc8', '#e8e8e8', '#2fa58f'];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) { const L = 1 + Math.floor(g.r() * 3); for (let l = 0; l < L; l++) g.box(0.3, 0.13, 0.15, -0.72 + c * 0.32, 0.05 + l * 0.13, -0.78 + r * 0.19, cc[Math.floor(g.r() * cc.length)]); }
    for (const x of [0.35, 0.85]) for (const z of [0.2, 0.7]) g.box(0.05, 1.0, 0.05, x, 0.05, z, '#e0a03a');
    g.box(0.6, 0.08, 0.08, 0.6, 1.0, 0.2, '#e0a03a'); g.box(0.6, 0.08, 0.08, 0.6, 1.0, 0.7, '#e0a03a');
    g.box(0.1, 0.08, 1.6, 0.6, 1.08, 0.75, '#e0a03a'); g.box(0.18, 0.12, 0.16, 0.6, 0.95, 1.2, '#4a4f57');
    g.box(0.7, 0.35, 0.42, -0.55, 0.05, 0.55, '#c9cfd6'); g.gable(0.74, 0.14, 0.46, -0.55, 0.4, 0.55, '#6f7c8a', 0, '#c9cfd6');
    g.box(1.7, 0.16, 0.42, 0, -0.15, 1.42, '#2f3e52'); g.box(1.72, 0.03, 0.44, 0, 0.0, 1.42, '#c9483b');
    for (let c = 0; c < 4; c++) g.box(0.28, 0.12, 0.3, -0.5 + c * 0.3, 0.03, 1.42, cc[(c * 3) % cc.length]);
    g.box(0.22, 0.28, 0.32, 0.68, 0.03, 1.42, '#f1f3f5');
  },
  airport(g) {
    g.box(3.94, 0.03, 3.94, 0, 0, 0, '#7fae5c');
    g.box(3.9, 0.02, 0.62, 0, 0.03, -1.25, '#3a3f47');
    for (let k = 0; k < 9; k++) g.box(0.2, 0.004, 0.03, -1.6 + k * 0.4, 0.05, -1.25, '#f2f2f2');
    for (const s of [-1, 1]) for (let k = 0; k < 5; k++) g.box(0.12, 0.004, 0.05, s * 1.8, 0.05, -1.45 + k * 0.1, '#f2f2f2');
    for (let k = 0; k < 10; k++) { g.lit().box(0.03, 0.02, 0.03, -1.8 + k * 0.4, 0.05, -0.93, '#ffffff'); g.lit().box(0.03, 0.02, 0.03, -1.8 + k * 0.4, 0.05, -1.57, '#ffffff'); }
    g.box(3.0, 0.016, 0.18, 0, 0.03, -0.62, '#4a4f57'); g.box(0.18, 0.016, 0.5, -1.2, 0.03, -0.85, '#4a4f57'); g.box(0.18, 0.016, 0.5, 1.2, 0.03, -0.85, '#4a4f57');
    g.box(3.4, 0.02, 0.95, 0, 0.03, 0.3, '#8d949c');
    g.box(2.6, 0.45, 0.5, 0, 0.05, 1.25, '#dfe5ea'); g.lit().box(2.5, 0.3, 0.02, 0, 0.08, 0.99, '#45648a');
    g.geo(new THREE.CylinderGeometry(0.32, 0.32, 2.7, 18, 1, false, 0, Math.PI), '#eef1f4', 0, 0.5, 1.25, 0.4, 1, 1, 0, 0, Math.PI / 2);
    g.cyl(0.08, 0.1, 1.3, 10, 1.55, 0.03, 0.55, '#e6eaee'); g.lit().cyl(0.17, 0.15, 0.15, 12, 1.55, 1.33, 0.55, '#4c6e92'); g.cyl(0.19, 0.19, 0.04, 12, 1.55, 1.48, 0.55, '#cfd5dc');
    plane(g, -0.9, 0.35, 0.3); plane(g, 0.35, 0.35, -0.2); plane(g, 1.1, -1.25, 0);
  },
  monument(g) {
    pave(g, 2, '#d8d0bf'); g.box(1.6, 0.008, 1.6, 0, 0.03, 0, '#cfc6b2');
    g.box(1.0, 0.12, 1.0, 0, 0.03, 0, '#e8e3d7'); g.box(0.75, 0.18, 0.75, 0, 0.15, 0, '#efebe2');
    g.geo(new THREE.CylinderGeometry(0.06, 0.14, 3.0, 4), '#f3f0e8', 0, 0.33 + 1.5, 0, 1, 1, 1, 0, Math.PI / 4, 0);
    g.cyl(0.08, 0.15, 0.12, 12, 0, 3.33, 0, '#b89b62'); g.lit().cone(0.09, 0.32, 10, 0, 3.45, 0, '#ffcf5a');
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { treeG(g, a * 0.78, b * 0.78, 0.9); lamp(g, a * 0.6, b * 0.25, 0.32); }
  },
  opera(g) {
    pave(g, 2, '#cfd5dc'); g.box(1.8, 0.2, 1.4, 0, 0.03, -0.15, '#d9c9ad'); g.box(1.0, 0.1, 0.2, 0, 0.03, 0.62, '#e2d4bb');
    g.lit().box(1.3, 0.28, 0.5, 0, 0.23, 0.05, '#4c6e92');
    for (const [x, z, s] of [[-0.45, -0.3, 1], [0.05, -0.1, 1.2], [0.5, 0.12, 0.9]]) g.sph(0.45 * s, x, 0.23, z, '#f7f8f9', { half: true, sx: 0.6, sy: 1.5, sz: 0.95, rx: -0.4, ws: 16, hs: 8 });
    g.box(1.8, 0.012, 0.22, 0, 0.03, 0.83, '#4fc3e8');
  },
  spire(g) {
    pave(g, 2, '#aab2bb'); g.box(1.8, 0.4, 1.8, 0, 0.03, 0, '#4a5562');
    winGrid(g, 0, 0, 1.8, 1.8, 0.05, 0.4, { fh: 0.33, cw: 0.3, ww: 0.25, wh: 0.25, lit: 1, glass: '#41597a' });
    let y = 0.43;
    for (let i = 0; i < 38; i++) {
      const s = 0.95 - i * 0.0105, hh = 0.31; g.setXf(i * 0.045);
      g.box(s, hh, s, 0, y, 0, '#3b6d98'); ribbons(g, 0, 0, s, s, y + 0.04, y + hh - 0.02, hh, 0.55, '#7aaad4'); g.box(s + 0.04, 0.025, s + 0.04, 0, y + hh - 0.025, 0, '#e3e9ef');
      g.setXf(null); y += hh;
    }
    g.cyl(0.02, 0.07, 2.2, 8, 0, y, 0, '#e8edf2'); g.lit().sph(0.05, 0, y + 2.2, 0, '#ff8a8a');
  },
};
const EMIT = {
  factory: [[0.6, 1.58, -0.6, 0]], industrial: [[-1.2, 2.08, 0.6, 0], [-0.9, 2.08, 0.6, 0]],
  coal: [[0.6, 2.08, 0.35, 0], [0.82, 2.08, 0.62, 0], [-0.42, 1.45, 0.4, 1]], nuclear: [[-0.75, 1.95, 0.55, 1], [0.55, 1.95, 0.75, 1]],
};
const ROTOR_OFF = [0, 2.1, 0.17];

function roadGeo(mask, bridge) {
  const g = new GB(mulberry32(mask * 31 + (bridge ? 7 : 1)));
  const sw = 0.14, h = 0.05, conn = d => (mask >> d) & 1, swc = bridge ? '#b9bfc6' : '#c9cdd3';
  if (bridge) { g.box(1.0, 0.12, 1.0, 0, -0.12, 0, '#8a919b'); g.cyl(0.07, 0.09, 3.6, 8, 0, -3.7, 0, '#9aa1aa'); }
  g.box(1.0, 0.03, 1.0, 0, 0, 0, '#394049');
  if (!conn(0)) g.box(1, h, sw, 0, 0, -0.5 + sw / 2, swc);
  if (!conn(2)) g.box(1, h, sw, 0, 0, 0.5 - sw / 2, swc);
  if (!conn(1)) g.box(sw, h, 1, 0.5 - sw / 2, 0, 0, swc);
  if (!conn(3)) g.box(sw, h, 1, -0.5 + sw / 2, 0, 0, swc);
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.box(sw, h, sw, a * (0.5 - sw / 2), 0, b * (0.5 - sw / 2), swc);
  const cnt = [0, 1, 2, 3].filter(conn).length;
  if (cnt > 0 && cnt < 3) for (let d = 0; d < 4; d++) if (conn(d)) { const [dx, dz] = DIRS[d]; for (const t of [0.08, 0.32]) { const L = 0.14; g.box(dx ? L : 0.032, 0.004, dz ? L : 0.032, dx * (t + L / 2), 0.03, dz * (t + L / 2), '#efe6c4'); } }
  if (cnt >= 3) for (let d = 0; d < 4; d++) if (conn(d)) { const [dx, dz] = DIRS[d]; for (let k = -2; k <= 2; k++) { const o = k * 0.13; g.box(dx ? 0.13 : 0.06, 0.004, dz ? 0.13 : 0.06, dx ? dx * 0.4 : o, 0.03, dz ? dz * 0.4 : o, '#f2f2f0'); } }
  if (cnt === 2 && conn(0) && conn(2)) lamp(g, 0.43, 0, 0.36, 0.05);
  if (cnt === 2 && conn(1) && conn(3)) lamp(g, 0, 0.43, 0.36, 0.05);
  if (bridge) {
    if (!conn(0)) g.box(1, 0.1, 0.03, 0, 0.05, -0.485, '#e3e7eb'); if (!conn(2)) g.box(1, 0.1, 0.03, 0, 0.05, 0.485, '#e3e7eb');
    if (!conn(1)) g.box(0.03, 0.1, 1, 0.485, 0.05, 0, '#e3e7eb'); if (!conn(3)) g.box(0.03, 0.1, 1, -0.485, 0.05, 0, '#e3e7eb');
  }
  return { body: g.build(), lit: g.L ? g.L.build() : null };
}
function rotorGeo() {
  const g = new GB(); g.sph(0.05, 0, 0, 0, '#e9ecef');
  for (let k = 0; k < 3; k++) { const b = new THREE.BoxGeometry(0.055, 0.82, 0.016); b.translate(0, 0.43, 0); g.geo(b, '#f6f8fa', 0, 0, 0, 1, 1, 1, 0, 0, k * Math.PI * 2 / 3); }
  return { body: g.build(), lit: null };
}
function carGeo() {
  const g = new GB(); g.box(0.13, 0.055, 0.27, 0, 0.022, 0, '#ffffff'); g.box(0.115, 0.05, 0.14, 0, 0.077, -0.02, '#c9d3de');
  g.lit().box(0.1, 0.02, 0.012, 0, 0.045, 0.138, '#fff6d8'); return { body: g.build(), lit: g.L.build() };
}

/* ---------------- instancing pools ---------------- */
const matBody = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.04 });
const matLit = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.25, emissive: new THREE.Color('#ffc874'), emissiveIntensity: 0 });
const geoCache = new Map(), pools = new Map();
function geoSet(key) {
  let s = geoCache.get(key); if (s) return s;
  if (key.startsWith('road|')) { const m = parseInt(key.slice(5)); s = roadGeo(m, key.endsWith('b')); }
  else if (key === 'rotor') s = rotorGeo();
  else { const [type, lv, v, nc] = key.split('|'); const g = new GB(mulberry32(hashStr(key))); GEO[type](g, +lv, +v, nc || null); s = { body: g.build(), lit: g.L ? g.L.build() : null }; }
  geoCache.set(key, s); return s;
}
const _col = new THREE.Color(), _white = new THREE.Color(1, 1, 1);
const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
class Pool {
  constructor(key, opt = {}) { this.key = key; this.geo = geoSet(key); this.cap = 0; this.n = 0; this.items = []; this.opt = opt; this.meshes = []; this._alloc(8); }
  _alloc(cap) {
    const old = this.meshes; this.meshes = [];
    const mk = (g, mat, cast, recv) => { const m = new THREE.InstancedMesh(g, mat, cap); m.count = this.n; m.castShadow = cast; m.receiveShadow = recv; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.userData.pool = this; bldG.add(m); return m; };
    this.meshes.push(mk(this.geo.body, matBody, this.opt.cast !== false, true));
    if (this.geo.lit) this.meshes.push(mk(this.geo.lit, matLit, false, false));
    old.forEach((o, k) => { const me = this.meshes[k]; me.instanceMatrix.array.set(o.instanceMatrix.array.subarray(0, this.n * 16)); me.instanceMatrix.needsUpdate = true; if (o.instanceColor) { for (let i = 0; i < this.n; i++) { o.getColorAt(i, _col); me.setColorAt(i, _col); } me.instanceColor.needsUpdate = true; } bldG.remove(o); o.dispose(); });
    this.cap = cap;
  }
  _touch() { for (const me of this.meshes) { me.count = this.n; me.instanceMatrix.needsUpdate = true; me.boundingSphere = null; } }
  add(ent, m) { if (this.n >= this.cap) this._alloc(this.cap * 2); const i = this.n++; ent._pool = this; ent._pi = i; this.items[i] = ent; for (const me of this.meshes) { me.setMatrixAt(i, m); if (me.instanceColor) { me.setColorAt(i, _white); me.instanceColor.needsUpdate = true; } } this._touch(); }
  set(ent, m) { const i = ent._pi; for (const me of this.meshes) { me.setMatrixAt(i, m); me.instanceMatrix.needsUpdate = true; me.boundingSphere = null; } }
  remove(ent) {
    const i = ent._pi, last = this.n - 1; if (i == null || ent._pool !== this) return;
    if (i !== last) { const e2 = this.items[last]; for (const me of this.meshes) { me.getMatrixAt(last, _m2); me.setMatrixAt(i, _m2); if (me.instanceColor) { me.getColorAt(last, _col); me.setColorAt(i, _col); me.instanceColor.needsUpdate = true; } } this.items[i] = e2; e2._pi = i; }
    this.items.length = last; this.n = last; this._touch(); ent._pool = null; ent._pi = null;
  }
}
Pool.prototype.paint = function (fn, white) { const me = this.meshes[0]; if (white && !me.instanceColor) return; for (let i = 0; i < this.n; i++) me.setColorAt(i, fn(this.items[i])); if (me.instanceColor) me.instanceColor.needsUpdate = true; };
function poolFor(key, opt) { let p = pools.get(key); if (!p) { p = new Pool(key, opt); pools.set(key, p); } return p; }
