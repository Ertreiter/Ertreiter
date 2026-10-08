const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const GLYPHS = '0123456789abcdef#$%&*+<>/=';

export function fnvHash(str, len = 64) {
    let out = '';
    let h = 0x811c9dc5;
    for (let round = 0; out.length < len; round++) {
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i) + round;
            h = Math.imul(h, 0x01000193) >>> 0;
        }
        out += h.toString(16).padStart(8, '0');
    }
    return out.slice(0, len);
}

export function fillHashes() {
    $$('[data-hash]').forEach((el) => {
        const hx = fnvHash(el.dataset.hash);
        el.textContent = `0x${hx.slice(0, 6)}…${hx.slice(-4)}`;
        el.title = `0x${hx}`;
    });
}

export function decode(el, duration = 900) {
    const text = el.dataset.text || el.textContent;
    const heading = el.closest('h1, h2, h3');
    if (heading && !heading.hasAttribute('aria-label')) heading.setAttribute('aria-label', text);
    const o = { p: 0 };
    anime({
        targets: o, p: 1, duration, easing: 'easeOutQuad',
        update: () => {
            const n = Math.floor(o.p * text.length);
            let s = text.slice(0, n);
            for (let i = n; i < text.length; i++) s += text[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
            el.textContent = s;
        },
        complete: () => { el.textContent = text; }
    });
}

export function initHeroIntro(animate) {
    if (!animate) return;
    anime({ targets: '[data-hero]', opacity: [0, 1], translateY: [18, 0], duration: 900, delay: anime.stagger(110, { start: 150 }), easing: 'easeOutExpo' });
    const name = $('.hero-name .decode');
    if (name) setTimeout(() => decode(name, 1300), 250);
    $$('[data-count]').forEach((el) => {
        const end = parseFloat(el.dataset.count);
        const dec = parseInt(el.dataset.decimals || '0', 10);
        const o = { v: 0 };
        el.textContent = (0).toFixed(dec);
        anime({ targets: o, v: end, duration: 1600, delay: 900, easing: 'easeOutExpo', update: () => { el.textContent = o.v.toFixed(dec); } });
    });
}

export function initRoller(animate) {
    const el = $('#roller');
    if (!el || !animate) return;
    const roles = ['full-stack developer', 'react / node engineer', 'android developer', 'web3 builder', 'system analyst'];
    let i = 0;
    setInterval(() => {
        if (document.hidden) return;
        anime({
            targets: el, translateY: ['0%', '-110%'], opacity: [1, 0], duration: 320, easing: 'easeInCubic',
            complete: () => {
                i = (i + 1) % roles.length;
                el.textContent = roles[i];
                anime({ targets: el, translateY: ['110%', '0%'], opacity: [0, 1], duration: 480, easing: 'easeOutExpo' });
            }
        });
    }, 2600);
}

export function initReveals(animate) {
    if (!animate) return;
    const order = (el) => Math.min([...el.parentElement.children].filter((n) => n.hasAttribute('data-reveal')).indexOf(el), 6);
    const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (!e.isIntersecting) return;
            const el = e.target;
            io.unobserve(el);
            anime({ targets: el, opacity: [0, 1], translateY: [22, 0], duration: 850, delay: order(el) * 80, easing: 'easeOutExpo' });
            const d = $('.decode', el);
            if (d) setTimeout(() => decode(d, 800), order(el) * 80);
            if (el.matches('[data-ledger]')) {
                anime({ targets: $$('.row', el), opacity: [0, 1], translateX: [-12, 0], duration: 700, delay: anime.stagger(70, { start: 150 }), easing: 'easeOutExpo' });
            }
        });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    $$('[data-reveal]').forEach((el) => io.observe(el));
}

function setOpen(btn, open, animate) {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    btn.setAttribute('aria-expanded', String(open));
    panel.style.overflow = 'hidden';
    if (!animate) {
        panel.style.height = open ? 'auto' : '0px';
        panel.style.visibility = open ? 'visible' : 'hidden';
        return;
    }
    anime.remove(panel);
    const from = panel.getBoundingClientRect().height;
    if (open) {
        panel.style.visibility = 'visible';
        panel.style.height = 'auto';
        const to = panel.scrollHeight;
        panel.style.height = from + 'px';
        anime({ targets: panel, height: [from, to], duration: 520, easing: 'easeOutExpo', complete: () => { panel.style.height = 'auto'; } });
        anime({ targets: panel.children, opacity: [0, 1], translateY: [8, 0], duration: 520, delay: anime.stagger(60, { start: 80 }), easing: 'easeOutExpo' });
    } else {
        panel.style.height = from + 'px';
        anime({ targets: panel, height: [from, 0], duration: 360, easing: 'easeInOutQuart', complete: () => { panel.style.visibility = 'hidden'; } });
    }
}

export function initLedgers(animate) {
    $$('[data-ledger]').forEach((ledger) => {
        const btns = $$('.row-btn', ledger);
        btns.forEach((btn) => {
            setOpen(btn, btn.getAttribute('aria-expanded') === 'true', false);
            btn.addEventListener('click', () => {
                const open = btn.getAttribute('aria-expanded') !== 'true';
                if (open) btns.forEach((b) => b !== btn && b.getAttribute('aria-expanded') === 'true' && setOpen(b, false, animate));
                setOpen(btn, open, animate);
            });
        });
    });
}

export function initMagnetic(animate) {
    if (!animate || !matchMedia('(pointer: fine)').matches) return;
    $$('.magnetic').forEach((el) => {
        el.addEventListener('pointermove', (e) => {
            const r = el.getBoundingClientRect();
            anime.remove(el);
            anime({ targets: el, translateX: (e.clientX - (r.left + r.width / 2)) * 0.22, translateY: (e.clientY - (r.top + r.height / 2)) * 0.3, duration: 250, easing: 'easeOutQuad' });
        });
        el.addEventListener('pointerleave', () => {
            anime.remove(el);
            anime({ targets: el, translateX: 0, translateY: 0, duration: 900, easing: 'easeOutElastic(1, .45)' });
        });
    });
}

export function initSpotlight() {
    if (!matchMedia('(hover: hover)').matches) return;
    document.addEventListener('pointermove', (e) => {
        const el = e.target.closest?.('.glow');
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { passive: true });
}

export function initClock() {
    const els = $$('#clock, #intro-clock');
    if (els.length) {
        const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Makassar' });
        const tick = () => { const v = fmt.format(new Date()); els.forEach((el) => { el.textContent = v; }); };
        tick();
        setInterval(tick, 15000);
    }
    const y = $('#year');
    if (y) y.textContent = new Date().getFullYear();
}

export function initIdCard() {
    const wrap = $('.id-wrap');
    const card = $('#id-card');
    if (!wrap || !card || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    wrap.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--ry', `${(x - 0.5) * 18}deg`);
        card.style.setProperty('--rx', `${(0.5 - y) * 14}deg`);
        card.style.setProperty('--px', `${x * 100}%`);
        card.style.setProperty('--py', `${y * 100}%`);
    });
    wrap.addEventListener('pointerleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
        card.style.setProperty('--px', '50%');
        card.style.setProperty('--py', '50%');
    });
}

export function initNav() {
    const btn = $('#menu-btn');
    const nav = $('#nav');
    const close = () => {
        nav.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        btn.textContent = 'menu';
    };
    btn.addEventListener('click', () => {
        const open = nav.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(open));
        btn.textContent = open ? 'close' : 'menu';
    });
    $$('a', nav).forEach((a) => a.addEventListener('click', close));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

    const links = $$('a[href^="#"]', nav);
    const sections = $$('main > section[id]');
    const railLinks = $$('#rail a');
    const railFill = $('#rail-fill');
    const bar = $('#progress');
    let ticking = false;
    function update() {
        ticking = false;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
        let idx = 0;
        sections.forEach((s, i) => { if (s.getBoundingClientRect().top <= window.innerHeight * 0.4) idx = i; });
        const current = sections[idx].id;
        links.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + current)));
        railLinks.forEach((a, i) => {
            a.classList.toggle('on', i === idx);
            a.classList.toggle('done', i < idx);
        });
        if (railFill) railFill.style.height = `${(idx / Math.max(1, railLinks.length - 1)) * 100}%`;
    }
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
}
