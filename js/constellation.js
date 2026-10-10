import * as THREE from 'three';
import { SKILL_ICONS } from './skill-icons.js';

// A tilted dependency wheel: root in the middle, categories on an inner ring,
// each category's skills fanned out on two staggered outer arcs so no logo hides another.
const R_HUB = 0.92;
const R_IN = 1.5;
const R_OUT = 1.93;

function iconSvg(ic) {
    if (!ic) return '';
    const body = ic.f
        ? `<path d="${ic.f}" fill="${ic.c}"/>`
        : `<g fill="none" stroke="${ic.c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ic.s}</g>`;
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
}

export function createConstellation({ canvas, rows, label, palette, reduced }) {
    const box = canvas.parentElement;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 0, 8.4);
    const group = new THREE.Group();
    scene.add(group);

    /* ---------------- layout */
    const cats = rows.map((row) => ({
        name: row.dataset.cat,
        skills: [...row.querySelectorAll('li')].map((li) => li.textContent.trim())
    }));

    const total = cats.reduce((n, c) => n + c.skills.length, 0);
    const hubs = [];
    const hubAngles = [];
    const leaves = [];
    let start = Math.PI / 2;
    cats.forEach((c, ci) => {
        const n = c.skills.length;
        const sector = (Math.PI * 2 * n) / total;
        const mid = start + sector / 2;
        hubAngles.push(mid);
        hubs.push(new THREE.Vector3(Math.cos(mid) * R_HUB, Math.sin(mid) * R_HUB, 0.18));
        const span = sector * 0.84;
        c.skills.forEach((name, j) => {
            const a = mid - span / 2 + (n === 1 ? span / 2 : (j / (n - 1)) * span);
            const r = j % 2 ? R_OUT : R_IN;
            const z = Math.sin(j * 1.7 + ci) * 0.28;
            const base = new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, z);
            leaves.push({ base, pos: base.clone(), fan: 0, ci, name, outer: j % 2 === 1, icon: SKILL_ICONS[name.toLowerCase()] });
        });
        start += sector;
    });

    /* ---------------- WebGL: root, hubs and the edges between them */
    const ink = new THREE.Color(palette.ink);
    const gold = new THREE.Color(palette.mark);
    const paper = new THREE.Color(palette.paper);
    const faint = ink.clone().lerp(paper, 0.86);
    const soft = ink.clone().lerp(paper, 0.62);

    const root = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.16, 0)), new THREE.LineBasicMaterial({ color: gold }));
    group.add(root);

    const rootEdges = [];
    hubs.forEach((h) => rootEdges.push(new THREE.Vector3(), h));
    const rootLines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(rootEdges), new THREE.LineBasicMaterial({ color: gold, transparent: true, opacity: 0.32 }));
    group.add(rootLines);

    const hubMeshes = hubs.map((h) => {
        const m = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.085, 0)), new THREE.LineBasicMaterial({ color: gold }));
        m.position.copy(h);
        group.add(m);
        return m;
    });

    const spokes = [];
    leaves.forEach((l) => spokes.push(hubs[l.ci], l.base));
    const spokeCol = new Float32Array(spokes.length * 3);
    const spokeGeo = new THREE.BufferGeometry().setFromPoints(spokes);
    spokeGeo.setAttribute('color', new THREE.BufferAttribute(spokeCol, 3));
    group.add(new THREE.LineSegments(spokeGeo, new THREE.LineBasicMaterial({ vertexColors: true })));

    const mesh = [];
    hubs.forEach((h, i) => mesh.push(h, hubs[(i + 1) % hubs.length]));
    const meshLines = new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(mesh),
        new THREE.LineDashedMaterial({ color: ink, transparent: true, opacity: 0.16, dashSize: 0.05, gapSize: 0.05 })
    );
    meshLines.computeLineDistances();
    group.add(meshLines);

    /* ---------------- DOM: logo badges for skills, labels for categories */
    const layer = document.createElement('div');
    layer.className = 'g-layer';
    layer.setAttribute('aria-hidden', 'true');
    box.appendChild(layer);

    const nodeEls = leaves.map((l) => {
        const el = document.createElement('span');
        el.className = 'g-node';
        el.dataset.name = l.name;
        el.style.setProperty('--c', l.icon ? l.icon.c : '#B5C0D6');
        el.innerHTML = iconSvg(l.icon);
        el.addEventListener('pointerenter', () => { hold = true; setActive(l.ci, false); el.classList.add('hover'); });
        el.addEventListener('pointerleave', () => { hold = false; setActive(-1, false); el.classList.remove('hover'); });
        layer.appendChild(el);
        return el;
    });

    const hubEls = cats.map((c) => {
        const el = document.createElement('span');
        el.className = 'g-hub';
        el.textContent = c.name;
        layer.appendChild(el);
        return el;
    });

    const rootEl = document.createElement('span');
    rootEl.className = 'g-root';
    rootEl.textContent = 'muh-rafianto';
    layer.appendChild(rootEl);

    /* ---------------- state */
    let active = -1;
    let hold = false;
    const targetQ = new THREE.Quaternion();
    const targetPos = new THREE.Vector3();
    let hasTarget = false;

    function paint() {
        leaves.forEach((l, i) => {
            const c = active === -1 ? soft : l.ci === active ? gold : faint;
            c.toArray(spokeCol, i * 6);
            c.toArray(spokeCol, i * 6 + 3);
        });
        spokeGeo.attributes.color.needsUpdate = true;
        hubMeshes.forEach((m, i) => m.material.color.copy(active === -1 || i === active ? gold : faint));
        rootLines.material.opacity = active === -1 ? 0.32 : 0.14;
        nodeEls.forEach((el, i) => {
            el.classList.toggle('on', leaves[i].ci === active);
            el.classList.toggle('off', active !== -1 && leaves[i].ci !== active);
        });
        hubEls.forEach((el, i) => {
            el.classList.toggle('on', i === active);
            el.classList.toggle('off', active !== -1 && i !== active);
        });
    }

    // rotate: bring the category to face the viewer (from the list); hovering a logo only highlights it
    function setActive(i, rotate = true) {
        active = i;
        if (rotate) {
            hasTarget = i >= 0;
            if (hasTarget) {
                // lean the category toward the viewer and slide it toward the centre so its labels have room
                const a = hubAngles[i];
                targetQ.setFromAxisAngle(new THREE.Vector3(-Math.sin(a), Math.cos(a), 0), -0.24);
                targetPos.set(-Math.cos(a) * 0.9, -Math.sin(a) * 0.9, 0);
            } else {
                targetPos.set(0, 0, 0);
            }
        }
        label.textContent = i >= 0 ? cats[i].name : 'all';
        paint();
        if (reduced || !running) {
            if (reduced) {
                if (hasTarget) group.quaternion.copy(targetQ);
                group.position.copy(targetPos);
            }
            frame();
        }
    }

    rows.forEach((row, i) => {
        row.addEventListener('pointerenter', () => setActive(i));
        row.addEventListener('pointerleave', () => { hasTarget = false; targetPos.set(0, 0, 0); setActive(-1, false); });
        row.addEventListener('focus', () => setActive(i));
        row.addEventListener('blur', () => { hasTarget = false; targetPos.set(0, 0, 0); setActive(-1, false); });
    });

    /* ---------------- frame */
    let size = 1;
    const v3 = new THREE.Vector3();
    const project = (p) => {
        v3.copy(p).applyMatrix4(group.matrixWorld);
        const depth = v3.z;
        v3.project(camera);
        return [(v3.x * 0.5 + 0.5) * size, (-v3.y * 0.5 + 0.5) * size, depth];
    };
    const near = (d) => Math.min(1, Math.max(0, (d + 0.9) / 1.8));

    function place() {
        group.updateMatrixWorld(true);
        const [cx, cy] = project(new THREE.Vector3());
        leaves.forEach((l, i) => {
            const [x, y, d] = project(l.pos);
            // name tags: outer-arc logos label outward, inner-arc logos label inward, so tags never collide
            const flip = l.outer ? 1 : -1;
            const dx = (x - cx) * flip, dy = (y - cy) * flip;
            const side = Math.abs(dx) > Math.abs(dy) * 0.8 ? (dx < 0 ? 'l' : 'r') : (dy < 0 ? 't' : 'b');
            if (nodeEls[i].dataset.side !== side) nodeEls[i].dataset.side = side;
            const k = near(d);
            const el = nodeEls[i];
            const s = (0.86 + k * 0.24) * (l.ci === active ? 1.1 : 1);
            el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${s.toFixed(3)})`;
            el.style.zIndex = String(Math.round(k * 1000) + (l.ci === active ? 1000 : 0));
            el.style.opacity = ((0.62 + k * 0.38) * (active !== -1 && l.ci !== active ? 0.28 : 1)).toFixed(2);
        });
        hubs.forEach((h, i) => {
            const [x, y, d] = project(h);
            const k = near(d);
            const el = hubEls[i];
            el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
            el.style.zIndex = String(Math.round(k * 1000) + 500 + (i === active ? 1500 : 0));
            el.style.opacity = i === active ? '1' : ((0.35 + k * 0.5) * (active !== -1 ? 0.5 : 1)).toFixed(2);
        });
        rootEl.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;
    }

    // the highlighted category fans its logos out a little so their name tags have room
    function fan(dt) {
        const arr = spokeGeo.attributes.position.array;
        let moved = false;
        leaves.forEach((l, i) => {
            const want = l.ci === active ? 1 : 0;
            if (l.fan === want) return;
            l.fan = dt ? l.fan + (want - l.fan) * Math.min(1, dt * 6) : want;
            if (Math.abs(l.fan - want) < 0.002) l.fan = want;
            const h = hubs[l.ci];
            l.pos.copy(l.base).sub(h).multiplyScalar(1 + 0.32 * l.fan).add(h);
            l.pos.toArray(arr, (i * 2 + 1) * 3);
            moved = true;
        });
        if (moved) spokeGeo.attributes.position.needsUpdate = true;
    }

    function frame(dt = 0) {
        fan(dt);
        renderer.render(scene, camera);
        place();
    }

    function resize() {
        size = Math.max(1, Math.floor(box.getBoundingClientRect().width));
        renderer.setSize(size, size, false);
        layer.style.setProperty('--n', `${Math.round(Math.min(30, Math.max(22, size * 0.05)))}px`);
        frame();
    }
    new ResizeObserver(resize).observe(box);

    /* ---------------- loop */
    let visible = false;
    let running = false;
    let last = performance.now();
    const idleQ = new THREE.Quaternion();
    const idleE = new THREE.Euler();

    function tick(now) {
        if (!running) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        group.position.lerp(targetPos, Math.min(1, dt * 4));
        if (hasTarget) {
            group.quaternion.slerp(targetQ, Math.min(1, dt * 4));
        } else if (!hold) {
            const t = now / 1000;
            idleQ.setFromEuler(idleE.set(Math.sin(t * 0.31) * 0.32, Math.sin(t * 0.23) * 0.42, Math.sin(t * 0.17) * 0.06));
            group.quaternion.slerp(idleQ, Math.min(1, dt * 1.5));
        }
        root.rotation.y += dt * 0.6;
        frame(dt);
        requestAnimationFrame(tick);
    }
    function sync() {
        const should = visible && !document.hidden && !reduced;
        if (should && !running) { running = true; last = performance.now(); requestAnimationFrame(tick); }
        else if (!should) running = false;
    }
    new IntersectionObserver((e) => { visible = e[0].isIntersecting; sync(); }).observe(box);
    document.addEventListener('visibilitychange', sync);

    group.quaternion.setFromEuler(new THREE.Euler(0.2, -0.3, 0));
    paint();
    resize();
}
