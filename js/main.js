import { initHeroIntro, initRoller, initReveals, initLedgers, initMagnetic, initSpotlight, initClock, initNav, initIdCard, fillHashes } from './ui.js';
import { initRemote } from './remote.js';
import { initCommandPalette } from './cmdk.js';

const html = document.documentElement;
html.setAttribute('data-boot', '1');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const animate = typeof window.anime !== 'undefined' && !reduced;
if (!animate) html.classList.add('no-anim');

const $ = (s) => document.querySelector(s);
const intro = $('#intro');
const seaCanvas = $('#sea');
const shell = [$('#topbar'), $('#main'), $('#footer')];
const stackMap = $('.stack-map');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function webglOk() {
    try {
        const c = document.createElement('canvas');
        return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) {
        return false;
    }
}

/* ---------------- page UI ---------------- */
fillHashes();
initClock();
initNav();
initCommandPalette();
initLedgers(animate);
initRemote(animate);
initSpotlight();
initMagnetic(animate);
initIdCard();
initRoller(animate);

/* ---------------- intro → site ---------------- */
let sea = null;
let entering = false;
let queued = false;
let unavailable = false;
const isPre = () => html.classList.contains('pre-enter');

if (isPre()) shell.forEach((el) => { el.inert = true; });

function verifyCard() {
    const ok = $('#id-ok');
    const scan = $('.id-scan');
    if (!animate || !ok || !scan) return;
    ok.textContent = '◌ verifying proof…';
    ok.classList.add('pending');
    anime.timeline({ easing: 'easeInOutSine', delay: 700 })
        .add({ targets: scan, top: ['0%', '100%'], opacity: [{ value: 1, duration: 80 }, { value: 1, duration: 1000 }, { value: 0, duration: 200 }], duration: 1300 })
        .add({
            targets: ok, scale: [0.8, 1], duration: 400, easing: 'easeOutBack',
            begin: () => { ok.textContent = '✓ zk-verified'; ok.classList.remove('pending'); }
        });
}

function revealSite() {
    html.classList.remove('pre-enter');
    html.classList.add('entered');
    shell.forEach((el) => { el.inert = false; });
    initHeroIntro(animate);
    initReveals(animate);
    verifyCard();
    $('.hero-name')?.focus({ preventScroll: true });
}

// Click and scroll both land here, so both play the exact same voyage.
async function enter(instant = false) {
    if (entering || !isPre()) return;
    if (!instant && !sea && !reduced && !unavailable) {
        if (!queued) {
            queued = true;
            setTimeout(() => { if (queued && isPre()) { queued = false; enter(true); } }, 8000);
        }
        return;
    }
    queued = false;
    entering = true;
    intro.classList.add('leaving');

    if (instant || !sea || reduced) {
        revealSite();
        closeIntro(450);
        return;
    }

    // The ship sails over the horizon, then the intro cross-fades into the site and is torn down.
    sea.setSail(3600);
    await wait(2500);
    revealSite();
    closeIntro(1100);
}

function closeIntro(ms) {
    intro.style.transitionDuration = `${ms}ms`;
    intro.classList.add('fading');
    setTimeout(() => {
        sea?.dispose();
        sea = null;
        intro.remove();
    }, ms + 60);
}

$('#enter-btn').addEventListener('click', () => enter(false));
$('#skip-btn').addEventListener('click', () => enter(true));

window.addEventListener('wheel', (e) => { if (isPre() && e.deltaY > 4) enter(false); }, { passive: true });
let touchY = null;
window.addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; }, { passive: true });
window.addEventListener('touchmove', (e) => {
    if (isPre() && touchY !== null && touchY - e.touches[0].clientY > 30) { touchY = null; enter(false); }
}, { passive: true });
window.addEventListener('keydown', (e) => {
    if (!isPre() || e.target.closest?.('button, a, input, select')) return;
    if (['Enter', ' ', 'ArrowDown', 'PageDown'].includes(e.key)) { e.preventDefault(); enter(false); }
});

if (isPre()) {
    $('#enter-btn').focus({ preventScroll: true });
} else {
    initHeroIntro(animate);
    initReveals(animate);
}

/* ---------------- 3D ---------------- */
// Run once when an element comes within `margin` of the viewport.
function whenNear(el, margin, fn) {
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        fn();
    }, { rootMargin: margin });
    io.observe(el);
}

async function initIntro() {
    const { createSea } = await import('./intro.js');
    const scene = await createSea({ canvas: seaCanvas, reduced });
    if (!isPre()) {
        scene.dispose();
        return;
    }
    sea = scene;
    intro.classList.add('ready');
    if (queued) enter(false);
}

// Secondary scenes get their own WebGL contexts, so build them only as their sections approach.
function initLazy3D() {
    const hideMap = (err) => {
        console.warn('skills graph unavailable:', err);
        stackMap?.style.setProperty('display', 'none');
    };
    whenNear($('#stack'), '900px 0px', () => {
        Promise.all([import('./paint.js'), import('./constellation.js')]).then(([{ readPalette }, { createConstellation }]) => {
            createConstellation({
                canvas: $('#constellation'),
                rows: [...document.querySelectorAll('.stack-row')],
                label: $('#map-label'),
                palette: readPalette(), reduced
            });
        }).catch(hideMap);
    });

    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
        whenNear($('#projects'), '700px 0px', async () => {
            const [{ readPalette }, { createPreview }] = await Promise.all([import('./paint.js'), import('./preview.js')]);
            const preview = createPreview({ el: $('#preview'), canvas: $('#preview-canvas'), caption: $('#preview-cap'), palette: readPalette(), reduced });
            document.querySelectorAll('[data-preview]').forEach((row) => {
                const btn = row.querySelector('.row-btn');
                const title = row.querySelector('.row-title').firstChild.textContent.trim();
                const tag = row.querySelector('.row-method').textContent.trim();
                const show = () => preview.show(row.dataset.preview, title, tag);
                btn.addEventListener('pointerenter', show);
                btn.addEventListener('focus', show);
                btn.addEventListener('pointerleave', () => preview.hide());
                btn.addEventListener('blur', () => preview.hide());
                if (btn.matches(':hover')) show();
            });
        });
    }
}

function without3D() {
    unavailable = true;
    queued = false;
    stackMap?.style.setProperty('display', 'none');
    if (isPre()) enter(true);
    else intro.remove();
}

if (webglOk()) {
    if (isPre()) {
        initIntro().catch((err) => {
            console.warn('3D intro unavailable:', err);
            unavailable = true;
            if (isPre()) enter(true);
        });
    } else {
        intro.remove();
    }
    initLazy3D();
} else {
    without3D();
}
