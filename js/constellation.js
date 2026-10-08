import * as THREE from 'three';
import { createPainter } from './paint.js';

export function createConstellation({ canvas, rows, label, palette, reduced }) {
    const P = createPainter(palette);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
    camera.position.set(0, 0, 5.6);
    const group = new THREE.Group();
    scene.add(group);

    const cats = rows.map((row) => ({ name: row.dataset.cat, count: row.querySelectorAll('li').length }));

    const golden = Math.PI * (3 - Math.sqrt(5));
    const centers = cats.map((_, i) => {
        const y = 1 - ((i + 0.5) / cats.length) * 2;
        const r = Math.sqrt(1 - y * y);
        return new THREE.Vector3(Math.cos(golden * i) * r, y, Math.sin(golden * i) * r).multiplyScalar(1.45);
    });

    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;

    const pts = [];
    const owner = [];
    const spokes = [];
    const spokeOwner = [];
    cats.forEach((c, ci) => {
        for (let j = 0; j < c.count; j++) {
            const p = centers[ci].clone().add(new THREE.Vector3(rnd(), rnd(), rnd()).multiplyScalar(0.9));
            pts.push(p);
            owner.push(ci);
            spokes.push(centers[ci], p);
            spokeOwner.push(ci);
        }
    });

    const ptsCol = new Float32Array(pts.length * 3);
    const ptsGeo = new THREE.BufferGeometry().setFromPoints(pts);
    ptsGeo.setAttribute('color', new THREE.BufferAttribute(ptsCol, 3));
    group.add(new THREE.Points(ptsGeo, new THREE.PointsMaterial({ size: 0.07, vertexColors: true, sizeAttenuation: true })));

    // hubs drawn as small wire cubes
    const hubs = centers.map((c) => {
        const m = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.16, 0.16, 0.16)), new THREE.LineBasicMaterial());
        m.position.copy(c);
        group.add(m);
        return m;
    });

    const spokeCol = new Float32Array(spokes.length * 3);
    const spokeGeo = new THREE.BufferGeometry().setFromPoints(spokes);
    spokeGeo.setAttribute('color', new THREE.BufferAttribute(spokeCol, 3));
    group.add(new THREE.LineSegments(spokeGeo, new THREE.LineBasicMaterial({ vertexColors: true })));

    const ring = [];
    centers.forEach((c, i) => ring.push(c, centers[(i + 1) % centers.length], c, centers[(i + 3) % centers.length]));
    const ringLines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ring), P.dashed('ink', 0.35, 0.05, 0.05));
    ringLines.computeLineDistances();
    group.add(ringLines);

    let active = -1;
    function paint() {
        const pal = P.palette;
        const ink = new THREE.Color(pal.ink);
        const mark = new THREE.Color(pal.mark);
        const faint = ink.clone().lerp(new THREE.Color(pal.paper), 0.78);
        const soft = ink.clone().lerp(new THREE.Color(pal.paper), 0.5);
        owner.forEach((ci, i) => (active === -1 ? ink : ci === active ? mark : faint).toArray(ptsCol, i * 3));
        spokeOwner.forEach((ci, i) => {
            const c = active === -1 ? soft : ci === active ? mark : faint;
            c.toArray(spokeCol, i * 6);
            c.toArray(spokeCol, i * 6 + 3);
        });
        hubs.forEach((h, i) => h.material.color.copy(active === -1 || i === active ? mark : faint));
        ptsGeo.attributes.color.needsUpdate = true;
        spokeGeo.attributes.color.needsUpdate = true;
    }
    paint();

    const targetQ = new THREE.Quaternion();
    let hasTarget = false;
    function setActive(i) {
        active = i;
        hasTarget = i >= 0;
        if (hasTarget) targetQ.setFromUnitVectors(centers[i].clone().normalize(), new THREE.Vector3(0, 0, 1));
        label.textContent = hasTarget ? cats[i].name : 'all';
        paint();
        if (reduced) {
            if (hasTarget) group.quaternion.copy(targetQ);
            renderer.render(scene, camera);
        }
    }

    rows.forEach((row, i) => {
        row.addEventListener('pointerenter', () => setActive(i));
        row.addEventListener('pointerleave', () => setActive(-1));
        row.addEventListener('focus', () => setActive(i));
        row.addEventListener('blur', () => setActive(-1));
    });

    function resize() {
        const r = canvas.parentElement.getBoundingClientRect();
        const s = Math.max(1, Math.floor(r.width));
        renderer.setSize(s, s, false);
        renderer.render(scene, camera);
    }
    new ResizeObserver(resize).observe(canvas.parentElement);
    resize();

    let visible = false;
    let running = false;
    let last = performance.now();
    const spinQ = new THREE.Quaternion();
    const axis = new THREE.Vector3(0.2, 1, 0.1).normalize();

    function tick(now) {
        if (!running) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (hasTarget) group.quaternion.slerp(targetQ, Math.min(1, dt * 4));
        else group.quaternion.premultiply(spinQ.setFromAxisAngle(axis, dt * 0.22));
        renderer.render(scene, camera);
        requestAnimationFrame(tick);
    }
    function sync() {
        const should = visible && !document.hidden && !reduced;
        if (should && !running) { running = true; last = performance.now(); requestAnimationFrame(tick); }
        else if (!should) running = false;
    }
    new IntersectionObserver((e) => { visible = e[0].isIntersecting; sync(); }).observe(canvas);
    document.addEventListener('visibilitychange', sync);

    return {
        setPalette(p) { P.set(p); paint(); renderer.render(scene, camera); }
    };
}
