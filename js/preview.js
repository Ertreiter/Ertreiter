import * as THREE from 'three';
import { createPainter, part, orthoCamera, fitOrtho, ISO_X } from './paint.js';

/* Our Indonesia Voice: record voice -> waveform -> reward tokens */
function buildVoice(P) {
    const g = new THREE.Group();

    const mic = new THREE.Group();
    mic.position.set(-1.35, -0.05, 0);
    const headFill = new THREE.Mesh(new THREE.SphereGeometry(0.33, 18, 12), P.fill());
    const grille = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(0.36, 12, 8)), P.line('ink', 0.85));
    headFill.position.y = grille.position.y = 0.58;
    const band = part(P, new THREE.CylinderGeometry(0.37, 0.37, 0.08, 28), 'mark', 20);
    band.position.y = 0.42;
    const body = part(P, new THREE.CylinderGeometry(0.17, 0.12, 0.6, 18), 'ink', 20);
    body.position.y = 0.06;
    const yoke = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.022, 6, 32, Math.PI), P.solid('muted'));
    yoke.rotation.z = Math.PI;
    yoke.position.y = 0.42;
    const stem = part(P, new THREE.CylinderGeometry(0.03, 0.03, 0.62, 8), 'ink', 20);
    stem.position.y = -0.36;
    const base = part(P, new THREE.CylinderGeometry(0.32, 0.38, 0.07, 28), 'ink', 20);
    base.position.y = -0.7;
    mic.add(headFill, grille, band, body, yoke, stem, base);
    g.add(mic);

    const bars = Array.from({ length: 14 }, (_, i) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.075, 1, 0.075), P.solid(i % 5 === 2 ? 'mark' : 'key'));
        b.position.set(-0.6 + i * 0.13, 0.05, 0);
        g.add(b);
        return b;
    });

    const coins = Array.from({ length: 3 }, () => {
        const c = part(P, new THREE.CylinderGeometry(0.17, 0.17, 0.05, 28), 'mark', 20);
        c.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.055, 6), P.solid('mark')));
        c.rotation.x = Math.PI / 2;
        g.add(c);
        return c;
    });

    return {
        group: g,
        update(t) {
            mic.rotation.y = Math.sin(t * 0.8) * 0.45;
            grille.rotation.y = t * 0.4;
            bars.forEach((b, i) => {
                const h = 0.12 + Math.abs(Math.sin(t * 6 + i * 0.7) * Math.sin(t * 2.3 + i * 0.35)) * 1.15;
                b.scale.y = h;
            });
            coins.forEach((c, i) => {
                const p = (t * 0.45 + i / 3) % 1;
                c.position.set(1.62 + Math.sin(p * 6 + i) * 0.08, -0.75 + p * 1.9, 0);
                c.scale.setScalar(Math.sin(p * Math.PI) * 1.1);
                c.rotation.z = t * 3 + i;
            });
            g.rotation.set(0.1, Math.sin(t * 0.4) * 0.15, 0);
        }
    };
}

/* Financial-HQ: a 3D dashboard with bars, a trend line, a donut and a stack of coins */
function buildFinance(P) {
    const g = new THREE.Group();
    const board = part(P, new THREE.BoxGeometry(3.5, 0.06, 2.3), 'ink');
    board.position.y = -0.03;
    g.add(board);

    const bars = Array.from({ length: 5 }, (_, i) => {
        const b = part(P, new THREE.BoxGeometry(0.22, 1, 0.22), i === 3 ? 'mark' : 'key');
        b.position.set(-1.45 + i * 0.3, 0, 0.55);
        g.add(b);
        return b;
    });

    const N = 12;
    const linePts = Array.from({ length: N }, () => new THREE.Vector3());
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePts), P.line('mark'));
    g.add(line);
    const dots = Array.from({ length: N }, () => {
        const d = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), P.solid('mark'));
        g.add(d);
        return d;
    });

    const donut = new THREE.Group();
    donut.position.set(0.95, 0.06, 0.45);
    let start = 0;
    [[0.55, 'key'], [0.27, 'mark'], [0.14, 'ink']].forEach(([frac, role]) => {
        const arc = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.1, 10, 48, frac * Math.PI * 2 - 0.06), P.solid(role));
        arc.rotation.set(-Math.PI / 2, 0, start);
        donut.add(arc);
        start += frac * Math.PI * 2;
    });
    g.add(donut);

    const stack = Array.from({ length: 5 }, (_, i) => {
        const c = part(P, new THREE.CylinderGeometry(0.2, 0.2, 0.07, 28), 'mark', 20);
        c.position.set(1.15, 0.04 + i * 0.075, -0.6);
        g.add(c);
        return c;
    });

    return {
        group: g,
        update(t) {
            bars.forEach((b, i) => {
                const h = 0.3 + (Math.sin(t * 0.9 + i * 0.9) * 0.5 + 0.5) * 1.1 + i * 0.08;
                b.scale.y = h;
                b.position.y = h / 2;
            });
            linePts.forEach((p, i) => {
                p.set(-1.5 + i * 0.15, 0.35 + i * 0.05 + Math.sin(i * 0.8 + t * 1.4) * 0.16, -0.55);
                dots[i].position.copy(p);
            });
            line.geometry.setFromPoints(linePts);
            donut.rotation.y = t * 0.5;
            stack.forEach((c, i) => { c.rotation.y = t * (0.6 + i * 0.2); });
            g.position.y = -0.55;
            g.rotation.set(ISO_X * 0.95, -Math.PI / 4 + Math.sin(t * 0.35) * 0.22, 0);
        }
    };
}

function phone(P, s = 1) {
    const g = new THREE.Group();
    g.add(part(P, new THREE.BoxGeometry(1.05 * s, 2.0 * s, 0.1 * s)));
    const screen = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.9 * s, 1.74 * s)), P.line('ink', 0.45));
    screen.position.z = 0.055 * s;
    g.add(screen);
    return g;
}

function starShape(r1, r2, n = 5) {
    const s = new THREE.Shape();
    for (let i = 0; i < n * 2; i++) {
        const r = i % 2 ? r2 : r1;
        const a = (i / (n * 2)) * Math.PI * 2 + Math.PI / 2;
        i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    s.closePath();
    return s;
}

/* CodiLeap: a Duolingo-style lesson path on a phone, plus code and a reward star */
function buildCodileap(P) {
    const g = new THREE.Group();
    const ph = phone(P);
    ph.position.x = -0.35;
    g.add(ph);

    const spots = [[-0.05, -0.62], [0.2, -0.28], [-0.12, 0.06], [0.16, 0.38], [-0.02, 0.68]];
    const nodes = spots.map(([x, y], i) => {
        const role = i < 2 ? 'key' : i === 2 ? 'mark' : 'ink';
        const n = i < 3 ? new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 28), P.solid(role)) : part(P, new THREE.CylinderGeometry(0.12, 0.12, 0.05, 28), role, 20);
        n.rotation.x = Math.PI / 2;
        n.position.set(-0.35 + x, y, 0.09);
        g.add(n);
        return n;
    });
    const path = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(spots.map(([x, y]) => new THREE.Vector3(-0.35 + x, y, 0.07))),
        P.dashed('ink', 0.6, 0.05, 0.04)
    );
    path.computeLineDistances();
    g.add(path);
    const xpTrack = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.05), P.solid('muted'));
    xpTrack.position.set(-0.35, 0.86, 0.06);
    const xp = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.05), P.solid('key'));
    xp.position.set(-0.35, 0.86, 0.065);
    g.add(xpTrack, xp);

    const code = new THREE.Group();
    const seg = (pts) => code.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(([x, y]) => new THREE.Vector3(x, y, 0))), P.line('mark')));
    seg([[-0.18, 0.18], [-0.38, 0], [-0.18, -0.18]]);
    seg([[0.07, 0.22], [-0.07, -0.22]]);
    seg([[0.18, 0.18], [0.38, 0], [0.18, -0.18]]);
    code.position.set(1.25, 0.55, 0);
    g.add(code);

    const star = new THREE.Group();
    const starGeo = new THREE.ExtrudeGeometry(starShape(0.3, 0.13), { depth: 0.08, bevelEnabled: false });
    starGeo.center();
    star.add(new THREE.Mesh(starGeo, P.solid('mark')));
    star.add(new THREE.LineSegments(new THREE.EdgesGeometry(starGeo, 20), P.line('ink', 0.6)));
    star.position.set(1.25, -0.55, 0);
    g.add(star);

    return {
        group: g,
        update(t) {
            nodes[2].scale.setScalar(1 + Math.sin(t * 4) * 0.18);
            const fill = 0.35 + ((t * 0.15) % 0.65);
            xp.scale.x = fill;
            xp.position.x = -0.35 - 0.31 * (1 - fill);
            code.rotation.y = Math.sin(t * 1.2) * 0.6;
            star.rotation.y = t * 1.6;
            star.position.y = -0.55 + Math.sin(t * 2) * 0.06;
            g.rotation.set(0.15, -0.3 + Math.sin(t * 0.5) * 0.28, 0);
        }
    };
}

function shieldShape() {
    const s = new THREE.Shape();
    s.moveTo(0, 0.55);
    s.quadraticCurveTo(0.24, 0.42, 0.45, 0.42);
    s.lineTo(0.45, 0.05);
    s.quadraticCurveTo(0.42, -0.35, 0, -0.6);
    s.quadraticCurveTo(-0.42, -0.35, -0.45, 0.05);
    s.lineTo(-0.45, 0.42);
    s.quadraticCurveTo(-0.24, 0.42, 0, 0.55);
    return s;
}

/* Digital Identity: fingerprint on the phone -> ZK proof -> shield -> hexagon chain mints a badge */
function buildIdentity(P) {
    const g = new THREE.Group();
    const ph = phone(P, 0.82);
    ph.position.x = -1.5;
    g.add(ph);
    const print = new THREE.Group();
    for (let i = 0; i < 5; i++) {
        const r = 0.08 + i * 0.055;
        const arc = new THREE.EllipseCurve(0, 0, r, r * 1.25, Math.PI * (0.05 + i * 0.03), Math.PI * (1.95 - i * 0.05));
        print.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(arc.getPoints(28).map((p) => new THREE.Vector3(p.x, p.y, 0))), P.line('key')));
    }
    print.position.set(-1.5, 0.05, 0.06);
    g.add(print);

    const shield = new THREE.Group();
    const shieldGeo = new THREE.ExtrudeGeometry(shieldShape(), { depth: 0.12, bevelEnabled: false });
    shieldGeo.center();
    shield.add(new THREE.Mesh(shieldGeo, P.fill()));
    shield.add(new THREE.LineSegments(new THREE.EdgesGeometry(shieldGeo, 25), P.line('mark')));
    const check = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.2, 0.0, 0.08), new THREE.Vector3(-0.05, -0.16, 0.08), new THREE.Vector3(0.22, 0.17, 0.08)]),
        P.line('key')
    );
    shield.add(check);
    shield.position.set(-0.05, 0.05, 0);
    g.add(shield);

    const hexPos = [[1.05, 0.62], [1.55, 0.05], [1.05, -0.52]];
    const hexes = hexPos.map(([x, y]) => {
        const h = part(P, new THREE.CylinderGeometry(0.26, 0.26, 0.14, 6), 'ink', 20);
        h.rotation.x = Math.PI / 2;
        h.position.set(x, y, 0);
        g.add(h);
        return h;
    });
    const links = new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(...hexPos[0], 0), new THREE.Vector3(...hexPos[1], 0),
            new THREE.Vector3(...hexPos[1], 0), new THREE.Vector3(...hexPos[2], 0),
            new THREE.Vector3(0.4, 0.05, 0), new THREE.Vector3(...hexPos[1], 0)
        ]),
        P.dashed('ink', 0.6, 0.05, 0.04)
    );
    links.computeLineDistances();
    g.add(links);

    const badge = part(P, new THREE.CylinderGeometry(0.16, 0.16, 0.05, 6), 'mark', 20);
    badge.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 6), P.solid('mark')));
    badge.rotation.x = Math.PI / 2;
    g.add(badge);

    const proofs = Array.from({ length: 4 }, () => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), P.solid('mark'));
        g.add(m);
        return m;
    });
    const route = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.2, 0.05, 0.1), new THREE.Vector3(-0.6, 0.35, 0.1), new THREE.Vector3(-0.05, 0.05, 0.15),
        new THREE.Vector3(0.6, -0.15, 0.1), new THREE.Vector3(1.55, 0.05, 0.1)
    ]);

    return {
        group: g,
        update(t) {
            proofs.forEach((m, i) => {
                const k = (t * 0.35 + i / proofs.length) % 1;
                m.position.copy(route.getPoint(k));
                m.rotation.set(t * 3, t * 2, 0);
            });
            const lit = Math.floor(t * 1.2) % 3;
            hexes.forEach((h, i) => { h.scale.setScalar(i === lit ? 1.12 : 1); });
            const p = (t * 0.4) % 1;
            badge.position.set(1.55, 0.3 + p * 1.0, 0.2);
            badge.scale.setScalar(Math.sin(p * Math.PI));
            badge.rotation.z = t * 2.5;
            shield.rotation.y = Math.sin(t * 1.1) * 0.5;
            g.rotation.set(0.12, Math.sin(t * 0.4) * 0.25, 0);
        }
    };
}

export function createPreview({ el, canvas, caption, palette, reduced }) {
    const P = createPainter(palette);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(320, 220, false);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = orthoCamera();
    fitOrtho(camera, 320, 220, 1.55);

    const scenes = { voice: buildVoice(P), finance: buildFinance(P), codileap: buildCodileap(P), identity: buildIdentity(P) };
    Object.values(scenes).forEach((s) => { s.group.visible = false; scene.add(s.group); });

    let current = null;
    let running = false;
    const target = { x: 0, y: 0 };
    const pos = { x: 0, y: 0 };

    function place(snap) {
        const w = 324, h = 250;
        const tx = Math.min(window.innerWidth - w - 18, target.x + 30);
        const ty = Math.max(76, Math.min(window.innerHeight - h - 22, target.y - h / 2));
        if (snap) { pos.x = tx; pos.y = ty; }
        pos.x += (tx - pos.x) * 0.3;
        pos.y += (ty - pos.y) * 0.3;
        el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    }

    function tick() {
        if (!running) return;
        if (current) scenes[current].update(performance.now() / 1000);
        renderer.render(scene, camera);
        place(false);
        requestAnimationFrame(tick);
    }

    window.addEventListener('pointermove', (e) => { target.x = e.clientX; target.y = e.clientY; }, { passive: true });

    return {
        show(key, title, tag) {
            if (!scenes[key]) return;
            if (current) scenes[current].group.visible = false;
            current = key;
            scenes[key].group.visible = true;
            caption.innerHTML = `<span><b>inspect</b> ${title}</span><span>${tag}</span>`;
            if (!el.classList.contains('show')) place(true);
            el.classList.add('show');
            if (reduced) {
                scenes[key].update(1.5);
                renderer.render(scene, camera);
            } else if (!running) {
                running = true;
                requestAnimationFrame(tick);
            }
        },
        hide() {
            el.classList.remove('show');
            running = false;
        },
        setPalette(p) {
            P.set(p);
            if (current) renderer.render(scene, camera);
        }
    };
}
