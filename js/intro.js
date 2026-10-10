import * as THREE from 'three';

const GOLD = '#E9B85C';
const SEA = '#5BE3CF';

export const wave = (x, z, t) =>
    Math.sin(x * 0.35 + t * 0.9) * 0.18 + Math.sin(z * 0.5 + t * 0.7) * 0.14 + Math.sin((x + z) * 0.9 + t * 1.3) * 0.06;

/* ------------------------------------------------------------------ sea of code */

const GLYPHS = '{}[]()<>=;:+-*/&|!?#$%@~^_.,0123456789abcdefxyzλΣπ→←fnletconstasync0x';

const SEA_VS = /* glsl */ `
uniform float uTime;
uniform float uPix;
uniform float uSize;
uniform vec2 uShip;
uniform float uWake;
attribute float aRand;
attribute float aGlyph;
varying float vA;
varying float vGlyph;
varying float vBright;
varying float vGold;
float wave(vec2 p, float t) {
    return sin(p.x * 0.35 + t * 0.9) * 0.18 + sin(p.y * 0.5 + t * 0.7) * 0.14 + sin((p.x + p.y) * 0.9 + t * 1.3) * 0.06;
}
void main() {
    vec3 p = position;
    float h = wave(p.xz, uTime);
    p.y += h;
    float flick = floor(uTime * (0.5 + aRand * 1.8) + aRand * 40.0);
    vGlyph = mod(aGlyph + flick * step(0.72, aRand), 64.0);
    vGold = step(0.988, fract(aRand * 31.7 + floor(uTime * 0.4) * 0.137));
    vec2 rel = p.xz - uShip;
    float d2 = dot(rel, rel);
    float foam = exp(-d2 / 2.2) * 0.9 + uWake * exp(-d2 / 14.0) * 0.9;
    vBright = clamp(0.32 + h * 2.4 + foam, 0.08, 1.7);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float d = -mv.z;
    gl_PointSize = clamp(uSize * uPix * (6.5 / d), 0.0, 30.0 * uPix);
    vA = smoothstep(50.0, 4.0, d) * smoothstep(0.5, 2.2, d);
    gl_Position = projectionMatrix * mv;
}`;

const SEA_FS = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec3 uSea;
uniform vec3 uGold;
varying float vA;
varying float vGlyph;
varying float vBright;
varying float vGold;
void main() {
    vec2 pc = gl_PointCoord;
    float col = mod(vGlyph, 8.0);
    float row = floor(vGlyph / 8.0);
    vec2 uv = vec2((col + pc.x) / 8.0, 1.0 - (row + pc.y) / 8.0);
    float a = texture2D(uAtlas, uv).a;
    if (a < 0.04) discard;
    vec3 c = mix(uSea, uGold, vGold);
    gl_FragColor = vec4(c * vBright, a * vA * (0.6 + vGold * 0.4));
}`;

function drawGlyphs(c) {
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = '#fff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '500 42px "Geist Mono", ui-monospace, monospace';
    for (let i = 0; i < 64; i++) {
        g.fillText(GLYPHS[i % GLYPHS.length], (i % 8) * 64 + 32, Math.floor(i / 8) * 64 + 34);
    }
}

// Draw immediately with whatever monospace is available, then redraw once Geist Mono arrives,
// so the scene never waits on the font.
function glyphAtlas() {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    drawGlyphs(c);
    const tex = new THREE.CanvasTexture(c);
    const ready = document.fonts?.check?.('500 42px "Geist Mono"');
    if (!ready && document.fonts?.load) {
        document.fonts.load('500 42px "Geist Mono"').then(() => {
            drawGlyphs(c);
            tex.needsUpdate = true;
        }).catch(() => {});
    }
    return tex;
}

/* ------------------------------------------------------------------ helpers */

function tween(duration, ease, onUpdate) {
    return new Promise((resolve) => {
        const start = performance.now();
        function step() {
            const k = Math.min(1, (performance.now() - start) / duration);
            onUpdate(ease(k));
            if (k < 1) requestAnimationFrame(step);
            else resolve();
        }
        requestAnimationFrame(step);
    });
}
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const smooth = (k) => k * k * (3 - 2 * k);

function glowTexture(inner, outer) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const rg = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    rg.addColorStop(0, inner);
    rg.addColorStop(0.2, inner);
    rg.addColorStop(0.24, outer);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

/* ------------------------------------------------------------------ phinisi */

const HULL_L = 4.6;
const deckAt = (t) => 0.55 + 0.42 * Math.pow(Math.abs(2 * t - 1), 2.2) + (t > 0.85 ? (t - 0.85) * 1.2 : 0);
const beamAt = (t) => 0.64 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.07 + t * 0.93)), 0.62);

function buildPhinisi() {
    const ship = new THREE.Group();
    const goldLine = new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.6 });
    const rigLine = new THREE.LineBasicMaterial({ color: '#CDB48A', transparent: true, opacity: 0.35 });
    const wood = new THREE.MeshStandardMaterial({ color: '#2e1d12', roughness: 0.9 });

    // ---- hull: lofted cross-sections, bow towards +x, painted by height
    const N = 22, K = 12;
    const verts = [];
    const cols = [];
    const strakes = [[], [], [], []];
    const cTop = new THREE.Color('#A87443'), cTeak = new THREE.Color('#4E301C'), cBottom = new THREE.Color('#6E2A20');
    for (let i = 0; i <= N; i++) {
        const t = i / N;
        const x = -HULL_L / 2 + t * HULL_L;
        const w = beamAt(t);
        const deck = deckAt(t);
        const keel = -0.38 * Math.pow(Math.sin(Math.PI * t), 0.5) + 0.06;
        for (let k = 0; k <= K; k++) {
            const a = (Math.PI * k) / K;
            const ca = Math.cos(a);
            const z = -w * Math.sign(ca) * Math.pow(Math.abs(ca), 0.55);
            const y = deck - (deck - keel) * Math.pow(Math.sin(a), 1.4);
            verts.push(x, y, z);
            const edge = Math.min(k, K - k);
            (edge <= 1 ? cTop : y < 0.08 ? cBottom : cTeak).toArray(cols, cols.length);
            if (k === 0) strakes[0].push(new THREE.Vector3(x, y, z));
            if (k === 2) strakes[1].push(new THREE.Vector3(x, y, z));
            if (k === K - 2) strakes[2].push(new THREE.Vector3(x, y, z));
            if (k === K) strakes[3].push(new THREE.Vector3(x, y, z));
        }
    }
    const idx = [];
    for (let i = 0; i < N; i++) {
        for (let k = 0; k < K; k++) {
            const a = i * (K + 1) + k, b = a + 1, c = a + K + 1, d = c + 1;
            idx.push(a, c, b, b, c, d);
        }
    }
    for (let k = 1; k < K; k++) idx.push(0, k + 1, k);
    const hullGeo = new THREE.BufferGeometry();
    hullGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    hullGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    hullGeo.setIndex(idx);
    hullGeo.computeVertexNormals();
    ship.add(new THREE.Mesh(hullGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true, side: THREE.DoubleSide, emissive: '#120a05' })));
    strakes.forEach((s) => ship.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(s), goldLine)));

    // deck + railing
    const deckPts = [];
    const rail = [];
    for (let i = 0; i <= N; i++) {
        const t = i / N;
        const x = -HULL_L / 2 + t * HULL_L;
        const w = beamAt(t) * 0.94;
        const y = deckAt(t);
        deckPts.push(new THREE.Vector3(x, y - 0.05, -w), new THREE.Vector3(x, y - 0.05, w));
        if (i > 0 && i < N) {
            rail.push(new THREE.Vector3(x, y, -w), new THREE.Vector3(x, y + 0.16, -w));
            rail.push(new THREE.Vector3(x, y, w), new THREE.Vector3(x, y + 0.16, w));
        }
    }
    const deckIdx = [];
    for (let i = 0; i < N; i++) { const a = i * 2; deckIdx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const deckGeo = new THREE.BufferGeometry().setFromPoints(deckPts);
    deckGeo.setIndex(deckIdx);
    deckGeo.computeVertexNormals();
    ship.add(new THREE.Mesh(deckGeo, new THREE.MeshStandardMaterial({ color: '#8A6038', roughness: 0.9, side: THREE.DoubleSide, flatShading: true })));
    const railTop = (side) => Array.from({ length: N - 1 }, (_, j) => {
        const t = (j + 1) / N;
        return new THREE.Vector3(-HULL_L / 2 + t * HULL_L, deckAt(t) + 0.16, side * beamAt(t) * 0.94);
    });
    ship.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(rail), rigLine));
    ship.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(railTop(1)), goldLine));
    ship.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(railTop(-1)), goldLine));

    // raised stern castle with lit windows
    const castleMat = new THREE.MeshStandardMaterial({ color: '#7A4E2C', roughness: 0.8, flatShading: true, emissive: '#1c1008' });
    const cy = deckAt(0.14);
    const castle = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.62, 0.9), castleMat);
    castle.position.set(-1.62, cy + 0.26, 0);
    ship.add(castle);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 1.02), new THREE.MeshStandardMaterial({ color: '#3A2416', roughness: 0.9 }));
    roof.position.set(-1.62, cy + 0.6, 0);
    ship.add(roof);
    ship.add(new THREE.LineSegments(new THREE.EdgesGeometry(castle.geometry), goldLine).translateX(-1.62).translateY(cy + 0.26));
    const windowMat = new THREE.MeshBasicMaterial({ color: '#FFC877' });
    [-1.92, -1.62, -1.32].forEach((x) => {
        [0.452, -0.452].forEach((z) => {
            const w = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.14), windowMat);
            w.position.set(x, cy + 0.3, z);
            w.rotation.y = z > 0 ? 0 : Math.PI;
            ship.add(w);
        });
    });

    // stern lantern
    const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,214,150,1)', 'rgba(255,170,80,0.35)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    lampGlow.position.set(-2.32, cy + 0.72, 0);
    lampGlow.scale.setScalar(0.9);
    ship.add(lampGlow);
    const lampLight = new THREE.PointLight('#FFB85C', 4, 8, 1.6);
    lampLight.position.copy(lampGlow.position);
    ship.add(lampLight);

    // masts, bowsprit, spars
    const cyl = (a, b, r) => {
        const dir = b.clone().sub(a);
        const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.75, r, dir.length(), 8), wood);
        m.position.copy(a).add(b).multiplyScalar(0.5);
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        ship.add(m);
    };
    const V3 = (x, y, z = 0) => new THREE.Vector3(x, y, z);
    cyl(V3(0.78, 0.55), V3(0.78, 3.86), 0.05);
    cyl(V3(-0.75, 0.55), V3(-0.75, 3.45), 0.045);
    cyl(V3(1.95, 1.08), V3(3.4, 1.47), 0.04);
    cyl(V3(0.74, 3.05, -0.06), V3(-0.45, 3.35, -0.06), 0.022);
    cyl(V3(0.74, 0.9, -0.06), V3(-0.55, 0.98, -0.06), 0.022);
    cyl(V3(-0.79, 2.72, -0.06), V3(-1.95, 2.97, -0.06), 0.02);
    cyl(V3(-0.79, 0.9, -0.06), V3(-2.05, 0.98, -0.06), 0.02);

    // ---- the seven sails, billowed bilinear patches (triangles repeat a corner)
    const V = (x, y) => new THREE.Vector3(x, y, 0);
    const sailDefs = [
        [V(0.8, 3.7), V(3.35, 1.45), V(3.35, 1.45), V(1.22, 1.15), 0.0],
        [V(0.8, 3.24), V(2.98, 1.36), V(2.98, 1.36), V(1.32, 1.1), 0.05],
        [V(0.8, 2.78), V(2.62, 1.27), V(2.62, 1.27), V(1.42, 1.05), 0.1],
        [V(0.74, 3.05), V(0.74, 0.9), V(-0.55, 0.98), V(-0.45, 3.35), -0.06],
        [V(0.74, 3.8), V(0.74, 3.12), V(-0.38, 3.4), V(-0.38, 3.4), -0.06],
        [V(-0.79, 2.72), V(-0.79, 0.9), V(-2.05, 0.98), V(-1.95, 2.97), -0.06],
        [V(-0.79, 3.4), V(-0.79, 2.79), V(-1.9, 3.02), V(-1.9, 3.02), -0.06]
    ];
    const sailMat = new THREE.MeshStandardMaterial({ color: '#F1E6CE', roughness: 0.95, side: THREE.DoubleSide, emissive: '#2c2010', emissiveIntensity: 0.7 });
    const seamMat = new THREE.LineBasicMaterial({ color: '#B89F78', transparent: true, opacity: 0.35 });
    const sails = [];
    const S = 10;
    sailDefs.forEach(([A, B, C, D, z]) => {
        const pos = [];
        const bulge = [];
        for (let j = 0; j <= S; j++) {
            for (let i = 0; i <= S; i++) {
                const u = i / S, v = j / S;
                const p = A.clone().lerp(B, u).lerp(D.clone().lerp(C, u), v);
                pos.push(p.x, p.y, z);
                bulge.push(Math.sin(Math.PI * u) * Math.sin(Math.PI * v));
            }
        }
        const ix = [];
        for (let j = 0; j < S; j++) {
            for (let i = 0; i < S; i++) {
                const a = j * (S + 1) + i, b = a + 1, c = a + S + 1, d = c + 1;
                ix.push(a, c, b, b, c, d);
            }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setIndex(ix);
        geo.computeVertexNormals();
        ship.add(new THREE.Mesh(geo, sailMat));
        ship.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([A, B, C, D].map((p) => p.clone().setZ(z))), goldLine));
        // seams follow the cloth (rows of the patch)
        const seamIdx = [];
        for (let j = 2; j < S; j += 2) for (let i = 0; i < S; i++) seamIdx.push(j * (S + 1) + i, j * (S + 1) + i + 1);
        const seamGeo = new THREE.BufferGeometry();
        seamGeo.setAttribute('position', geo.attributes.position);
        seamGeo.setIndex(seamIdx);
        ship.add(new THREE.LineSegments(seamGeo, seamMat));
        sails.push({ geo, bulge, z });
    });

    // rigging
    const rig = [
        [0.78, 3.86, 0, 3.4, 1.47, 0], [0.78, 3.86, 0, -0.75, 3.45, 0], [-0.75, 3.45, 0, -2.3, 1.2, 0],
        [0.78, 3.86, 0, 0.55, 0.62, 0.58], [0.78, 3.86, 0, 0.55, 0.62, -0.58],
        [0.78, 3.86, 0, 1.05, 0.62, 0.56], [0.78, 3.86, 0, 1.05, 0.62, -0.56],
        [-0.75, 3.45, 0, -0.95, 0.62, 0.6], [-0.75, 3.45, 0, -0.95, 0.62, -0.6],
        [3.4, 1.47, 0, 2.25, 0.2, 0]
    ];
    const rigPts = [];
    rig.forEach(([a, b, c, d, e, f]) => rigPts.push(new THREE.Vector3(a, b, c), new THREE.Vector3(d, e, f)));
    ship.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(rigPts), rigLine));

    // merah putih at the mizzen top
    const flag = new THREE.Group();
    const red = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.12), new THREE.MeshBasicMaterial({ color: '#D7263D', side: THREE.DoubleSide }));
    const white = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.12), new THREE.MeshBasicMaterial({ color: '#F4F1EA', side: THREE.DoubleSide }));
    red.position.set(-0.18, 0.06, 0);
    white.position.set(-0.18, -0.06, 0);
    flag.add(red, white);
    flag.position.set(-0.75, 3.38, 0);
    ship.add(flag);

    return {
        ship,
        lampLight,
        update(t, boost) {
            const amp = 0.24 + boost * 0.16 + Math.sin(t * 0.9) * 0.03;
            sails.forEach((s) => {
                const p = s.geo.attributes.position.array;
                for (let i = 0; i < s.bulge.length; i++) p[i * 3 + 2] = s.z + s.bulge[i] * amp;
                s.geo.attributes.position.needsUpdate = true;
                s.geo.computeVertexNormals();
            });
            flag.rotation.y = Math.sin(t * (3.1 + boost * 3)) * (0.35 + boost * 0.25);
        }
    };
}

/* ------------------------------------------------------------------ scene */

export async function createSea({ canvas, reduced }) {
    const mobile = () => window.innerWidth < 760;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    let pix = Math.min(window.devicePixelRatio || 1, mobile() ? 1.5 : 2);
    renderer.setPixelRatio(pix);
    renderer.setClearColor('#060A13', 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#0A1428', 0.035);

    const skyC = document.createElement('canvas');
    skyC.width = 4;
    skyC.height = 512;
    const sg = skyC.getContext('2d');
    const grad = sg.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#02040A');
    grad.addColorStop(0.45, '#071022');
    grad.addColorStop(0.6, '#152a50');
    grad.addColorStop(0.7, '#0B1830');
    grad.addColorStop(1, '#050912');
    sg.fillStyle = grad;
    sg.fillRect(0, 0, 4, 512);
    const skyTex = new THREE.CanvasTexture(skyC);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    scene.background = skyTex;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);

    scene.add(new THREE.HemisphereLight('#8FA8FF', '#0B1020', 0.75));
    const moonLight = new THREE.DirectionalLight('#FFE2B0', 1.2);
    moonLight.position.set(-18, 14, -30);
    scene.add(moonLight);
    const fill = new THREE.DirectionalLight('#9FB4FF', 0.45);
    fill.position.set(2, 3, 12);
    scene.add(fill);
    const rim = new THREE.DirectionalLight('#5BE3CF', 0.35);
    rim.position.set(10, 4, 8);
    scene.add(rim);

    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,240,210,1)', 'rgba(233,184,92,0.25)'), transparent: true, depthWrite: false, fog: false }));
    moon.position.set(-22, 15, -45);
    moon.scale.setScalar(16);
    scene.add(moon);

    const starPos = [];
    for (let i = 0; i < 1100; i++) {
        const th = Math.random() * Math.PI * 2;
        const ph = Math.random() * 0.45 * Math.PI;
        starPos.push(Math.cos(th) * Math.cos(ph) * 90, Math.sin(ph) * 81 + 3, Math.sin(th) * Math.cos(ph) * 90);
    }
    const stars = new THREE.Points(
        new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3)),
        new THREE.PointsMaterial({ color: '#CFD8FF', size: 0.22, sizeAttenuation: true, transparent: true, opacity: 0.8, fog: false })
    );
    scene.add(stars);

    // sea of code
    const atlas = glyphAtlas();
    const seg = mobile() ? 150 : 230;
    const seaGeo = new THREE.PlaneGeometry(84, 84, seg, seg);
    seaGeo.rotateX(-Math.PI / 2);
    const count = seaGeo.attributes.position.count;
    const aRand = new Float32Array(count);
    const aGlyph = new Float32Array(count);
    for (let i = 0; i < count; i++) {
        aRand[i] = Math.random();
        aGlyph[i] = Math.floor(Math.random() * 64);
    }
    seaGeo.setAttribute('aRand', new THREE.BufferAttribute(aRand, 1));
    seaGeo.setAttribute('aGlyph', new THREE.BufferAttribute(aGlyph, 1));
    const seaMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 }, uPix: { value: pix }, uSize: { value: mobile() ? 20 : 19 },
            uShip: { value: new THREE.Vector2() }, uWake: { value: 0 },
            uAtlas: { value: atlas }, uSea: { value: new THREE.Color(SEA) }, uGold: { value: new THREE.Color(GOLD) }
        },
        vertexShader: SEA_VS,
        fragmentShader: SEA_FS,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const ocean = new THREE.Points(seaGeo, seaMat);
    ocean.position.z = -16;
    ocean.frustumCulled = false;
    scene.add(ocean);

    const { ship, lampLight, update: updateShip } = buildPhinisi();
    scene.add(ship);

    /* ---------------- poses */
    // Where the ship ends up: far past the horizon, swallowed by the fog.
    const AWAY = { pos: () => new THREE.Vector3(mobile() ? 3 : 6.5, 0, -46), rot: 1.4, scale: 0.7 };
    const pose = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 45 };
    let mode = 'intro';
    let flying = false;
    let boost = 0;
    const mouse = { x: 0, y: 0 };

    function placeShip() {
        if (mode === 'intro') {
            ship.position.set(0, 0, 0);
            ship.rotation.y = -0.32;
            ship.scale.setScalar(1);
        }
    }

    function introPose() {
        if (mobile()) {
            pose.pos.set(0.2, 1.7, 15.5);
            pose.look.set(0.55, 2.4, 0);
            pose.fov = 50;
        } else {
            pose.pos.set(-0.5, 1.25, 8.6);
            pose.look.set(0.5, 1.6, 0);
            pose.fov = 45;
        }
    }

    function awayPose() {
        pose.pos.set(0, mobile() ? 3.4 : 3.1, mobile() ? 14 : 11);
        pose.look.set(mobile() ? 1.2 : 2.4, 0.6, -30);
        pose.fov = mobile() ? 55 : 45;
    }

    function resize() {
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        camera.aspect = window.innerWidth / window.innerHeight;
        placeShip();
        if (mode === 'intro') introPose();
        render(performance.now(), 0);
    }

    /* ---------------- frame */
    const tmp = new THREE.Vector3();
    function render(now, dt) {
        const t = now / 1000;
        seaMat.uniforms.uTime.value = t;

        const wx = ship.position.x - ocean.position.x, wz = ship.position.z - ocean.position.z;
        seaMat.uniforms.uShip.value.set(wx, wz);
        ship.position.y = wave(wx, wz, t) * 0.85 - 0.05;
        const fwd = Math.cos(ship.rotation.y) * 1.6, side = Math.sin(ship.rotation.y) * 1.6;
        ship.rotation.z = (wave(wx + fwd, wz - side, t) - wave(wx - fwd, wz + side, t)) * 0.22 - boost * 0.05;
        ship.rotation.x = Math.sin(t * 0.8) * 0.035 + boost * 0.06;
        updateShip(t, boost);
        lampLight.intensity = 4 + Math.sin(t * 7) * 0.3;

        if (!flying) {
            const px = 0.45;
            tmp.copy(pose.pos).add(new THREE.Vector3(mouse.x * px, -mouse.y * px * 0.4, 0));
            const k = dt ? Math.min(1, dt * 2.5) : 1;
            camera.position.lerp(tmp, k);
            camera.fov += (pose.fov - camera.fov) * k;
            camera.updateProjectionMatrix();
            camera.lookAt(pose.look);
        }
        stars.rotation.y = t * 0.004;
        renderer.render(scene, camera);
    }

    /* ---------------- loop */
    let running = false;
    let last = performance.now();
    const should = () => !document.hidden && mode !== 'gone';
    // Adaptive resolution: steps the pixel ratio down only on devices that can't hold ~40 fps.
    // Capable devices pass the first probe and keep full resolution; probing then stops.
    const probe = { frames: 0, time: 0, done: false, steps: 0 };
    function adapt(raw) {
        if (probe.done || raw > 0.25) return;
        probe.frames++;
        probe.time += raw;
        if (probe.frames < 90) return;
        const avg = probe.time / probe.frames;
        probe.frames = 0;
        probe.time = 0;
        if (avg > 1 / 38 && pix > 1.25 && probe.steps < 2) {
            pix = Math.max(1.25, pix - 0.5);
            probe.steps++;
            renderer.setPixelRatio(pix);
            renderer.setSize(window.innerWidth, window.innerHeight, false);
            seaMat.uniforms.uPix.value = pix;
        } else {
            probe.done = true;
        }
    }

    function tick() {
        if (!running) return;
        if (!should()) { running = false; return; }
        const now = performance.now();
        const raw = Math.max(0, now - last) / 1000;
        const dt = Math.min(0.05, raw);
        last = now;
        render(now, dt);
        adapt(raw);
        requestAnimationFrame(tick);
    }
    function wake() {
        if (reduced || running || !should()) return;
        running = true;
        last = performance.now();
        requestAnimationFrame(tick);
    }

    const listeners = new AbortController();
    const { signal } = listeners;
    window.addEventListener('resize', resize, { signal });
    document.addEventListener('visibilitychange', wake, { signal });
    window.addEventListener('pointermove', (e) => {
        mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
        mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
        if (reduced) render(performance.now(), 0);
    }, { passive: true, signal });

    placeShip();
    introPose();
    camera.position.copy(pose.pos);
    camera.fov = pose.fov;
    camera.lookAt(pose.look);
    resize();
    wake();

    return {
        /** The ship fills its sails, turns and sails over the horizon while the camera rises to watch it go. */
        async setSail(duration = 3600) {
            mode = 'sailing';
            const s0 = ship.position.clone(), s1 = AWAY.pos();
            const r0 = ship.rotation.y, r1 = AWAY.rot;
            const sc0 = ship.scale.x, sc1 = AWAY.scale;
            const c0 = camera.position.clone(), l0 = pose.look.clone(), f0 = camera.fov;
            awayPose();
            const c1 = pose.pos.clone(), l1 = pose.look.clone(), f1 = pose.fov;
            const mid = new THREE.Vector3((c0.x + c1.x) / 2 - 1, Math.max(c0.y, c1.y) + 1.6, (c0.z + c1.z) / 2 + 1);
            const path = new THREE.QuadraticBezierCurve3(c0, mid, c1);
            flying = true;
            await tween(duration, (k) => k, (k) => {
                const ks = Math.pow(Math.max(0, (k - 0.1) / 0.9), 1.6);
                const turn = smooth(Math.min(1, k * 1.8));
                ship.position.x = s0.x + (s1.x - s0.x) * ks;
                ship.position.z = s0.z + (s1.z - s0.z) * ks;
                ship.rotation.y = r0 + (r1 - r0) * turn;
                ship.scale.setScalar(sc0 + (sc1 - sc0) * ks);
                boost = Math.sin(Math.min(1, k * 2.2) * Math.PI * 0.5) * (1 - smooth(Math.max(0, (k - 0.75) / 0.25)));
                seaMat.uniforms.uWake.value = Math.sin(k * Math.PI);
                const kc = easeInOut(k);
                camera.position.copy(path.getPoint(kc));
                camera.lookAt(l0.clone().lerp(l1, kc));
                camera.fov = f0 + (f1 - f0) * kc;
                camera.updateProjectionMatrix();
            });
            flying = false;
        },

        /** Stop rendering and free every GPU resource; the intro never comes back once the visitor is in. */
        dispose() {
            mode = 'gone';
            running = false;
            listeners.abort();
            scene.traverse((o) => {
                o.geometry?.dispose();
                const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
                mats.forEach((m) => {
                    Object.values(m.uniforms || {}).forEach((u) => u.value?.isTexture && u.value.dispose());
                    m.map?.dispose();
                    m.dispose();
                });
            });
            scene.background?.dispose?.();
            renderer.dispose();
            renderer.forceContextLoss();
        }
    };
}
