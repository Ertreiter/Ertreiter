// Edit these to change the schedule shown in the overlap widget.
const MY_OFFSET = 8; // WITA, UTC+8
const MY_START = 9;
const MY_END = 18;
const YOU_START = 9;
const YOU_END = 18;

const ZONES = [
    ['Pacific (San Francisco)', -8],
    ['Mountain (Denver)', -7],
    ['Central (Chicago)', -6],
    ['Eastern (New York)', -5],
    ['Brazil (São Paulo)', -3],
    ['UK / Portugal', 0],
    ['Central Europe', 1],
    ['Eastern Europe', 2],
    ['Gulf (Dubai)', 4],
    ['India', 5.5],
    ['Singapore / Perth', 8],
    ['Japan / Korea', 9],
    ['Sydney (AEST)', 10]
];

const SLOTS = 48;
const pad = (n) => String(n).padStart(2, '0');
const fmt = (slot) => `${pad(Math.floor(slot / 2) % 24)}:${slot % 2 ? '30' : '00'}`;
const inRange = (h, a, b) => h >= a && h < b;

function ranges(on) {
    const out = [];
    let start = null;
    for (let s = 0; s <= SLOTS; s++) {
        const v = s < SLOTS && on[s];
        if (v && start === null) start = s;
        if (!v && start !== null) { out.push([start, s]); start = null; }
    }
    return out;
}

export function initRemote(animate) {
    const sel = document.getElementById('tz');
    const bars = document.getElementById('bars');
    const result = document.getElementById('overlap-result');
    if (!sel || !bars || !result) return;

    ZONES.forEach(([name, off]) => {
        const o = document.createElement('option');
        o.value = String(off);
        o.textContent = `${name} · UTC${off >= 0 ? '+' : '−'}${Math.abs(off)}`;
        sel.appendChild(o);
    });
    const local = -new Date().getTimezoneOffset() / 60;
    const nearest = ZONES.reduce((best, z) => (Math.abs(z[1] - local) < Math.abs(best[1] - local) ? z : best), ZONES[0]);
    sel.value = String(nearest[1]);

    const cells = Array.from({ length: SLOTS }, (_, s) => {
        const c = document.createElement('i');
        c.title = fmt(s);
        bars.appendChild(c);
        return c;
    });

    function render(flash) {
        const off = parseFloat(sel.value);
        const both = [];
        cells.forEach((c, s) => {
            const t = s / 2;
            const mine = (((t - off + MY_OFFSET) % 24) + 24) % 24;
            const me = inRange(mine, MY_START, MY_END);
            const you = inRange(t, YOU_START, YOU_END);
            both[s] = me && you;
            c.className = both[s] ? 'both' : me ? 'me' : you ? 'you' : '';
        });
        const n = both.filter(Boolean).length / 2;
        const rs = ranges(both).map(([a, b]) => `${fmt(a)}–${fmt(b)}`).join(', ');
        result.innerHTML = n
            ? `<b>${n}h overlap</b> per day, ${rs} your local time.`
            : 'No overlap in standard hours. Let\'s agree on a schedule that works for the team.';
        bars.setAttribute('aria-label', n ? `${n} hours of overlap: ${rs}` : 'No overlap in standard hours');
        if (flash && animate) {
            anime({ targets: cells, scaleY: [0.15, 1], duration: 600, delay: anime.stagger(12), easing: 'easeOutExpo' });
        }
    }

    sel.addEventListener('change', () => render(true));
    render(false);

    if (animate) {
        cells.forEach((c) => { c.style.transform = 'scaleY(0.15)'; });
        new IntersectionObserver((entries, io) => {
            if (!entries[0].isIntersecting) return;
            io.disconnect();
            render(true);
        }, { threshold: 0.5 }).observe(bars);
    }
}
