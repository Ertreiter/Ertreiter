import * as THREE from 'three';

export function readPalette() {
    const cs = getComputedStyle(document.documentElement);
    const v = (name) => cs.getPropertyValue(name).trim();
    return { ink: v('--text'), mark: v('--accent'), paper: v('--panel'), muted: v('--muted'), key: v('--t-key') };
}

// Tracks every material by palette role so a theme switch can recolour the scene in place.
export function createPainter(palette) {
    let pal = palette;
    const mats = [];
    const reg = (m, role) => {
        m.color = new THREE.Color(pal[role]);
        mats.push([m, role]);
        return m;
    };
    return {
        line: (role = 'ink', opacity = 1) =>
            reg(new THREE.LineBasicMaterial({ transparent: opacity < 1, opacity }), role),
        dashed: (role = 'ink', opacity = 1, dashSize = 0.08, gapSize = 0.06) =>
            reg(new THREE.LineDashedMaterial({ transparent: true, opacity, dashSize, gapSize }), role),
        fill: (role = 'paper') =>
            reg(new THREE.MeshBasicMaterial({ polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }), role),
        solid: (role = 'mark') => reg(new THREE.MeshBasicMaterial(), role),
        get palette() { return pal; },
        set(p) {
            pal = p;
            mats.forEach(([m, role]) => m.color.set(pal[role]));
        }
    };
}

// A solid drawn CAD-style: paper fill for hidden-line removal plus crisp edges.
export function part(P, geometry, role = 'ink', threshold = 1) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geometry, P.fill()));
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, threshold), P.line(role)));
    return g;
}

export function orthoCamera() {
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    cam.position.set(0, 0, 20);
    cam.lookAt(0, 0, 0);
    return cam;
}

export function fitOrtho(cam, w, h, halfHeight) {
    const a = w / Math.max(1, h);
    cam.left = -halfHeight * a;
    cam.right = halfHeight * a;
    cam.top = halfHeight;
    cam.bottom = -halfHeight;
    cam.updateProjectionMatrix();
    return halfHeight * a;
}

export const ISO_X = Math.atan(1 / Math.sqrt(2));
