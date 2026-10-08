const EMAIL = 'mr.rafianto@gmail.com';

function go(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

const open = (url) => window.open(url, '_blank', 'noopener');

const COMMANDS = [
    { label: 'Go to remote readiness', hint: '#remote', run: () => go('remote') },
    { label: 'Go to about', hint: '#about', run: () => go('about') },
    { label: 'Go to experience', hint: '#work', run: () => go('work') },
    { label: 'Go to projects', hint: '#projects', run: () => go('projects') },
    { label: 'Go to stack', hint: '#stack', run: () => go('stack') },
    { label: 'Go to credentials', hint: '#credentials', run: () => go('credentials') },
    { label: 'Go to contact', hint: '#contact', run: () => go('contact') },
    { label: 'Copy email address', hint: EMAIL, run: (li) => navigator.clipboard?.writeText(EMAIL).then(() => { li.querySelector('span').textContent = 'copied ✓'; }), keepOpen: 700 },
    { label: 'Send an email', hint: 'mailto', run: () => { window.location.href = `mailto:${EMAIL}`; } },
    { label: 'Download CV (PDF)', hint: 'cv.pdf', run: () => { const a = document.createElement('a'); a.href = 'Muh_Rafianto_CV.pdf'; a.download = ''; a.click(); } },
    { label: 'Open GitHub', hint: 'github.com/Ertreiter', run: () => open('https://github.com/Ertreiter') },
    { label: 'Open LinkedIn', hint: 'linkedin', run: () => open('https://www.linkedin.com/in/muh-rafianto-688267279/') },
    { label: 'Open Our Indonesia Voice demo', hint: 'vercel.app', run: () => open('https://ourindonesiavoice.vercel.app/') },
    { label: 'Open Financial-HQ demo', hint: 'vercel.app', run: () => open('https://financial-hq.vercel.app/') }
];

export function initCommandPalette() {
    const dlg = document.getElementById('cmdk');
    const input = document.getElementById('cmdk-input');
    const list = document.getElementById('cmdk-list');
    const trigger = document.getElementById('cmdk-open');
    if (!dlg || typeof dlg.showModal !== 'function') {
        trigger?.remove();
        return;
    }

    let items = [];
    let sel = 0;

    function render() {
        const q = input.value.trim().toLowerCase();
        items = COMMANDS.filter((c) => !q || c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q));
        sel = Math.min(sel, Math.max(0, items.length - 1));
        list.innerHTML = '';
        items.forEach((c, i) => {
            const li = document.createElement('li');
            li.setAttribute('role', 'option');
            li.setAttribute('aria-selected', String(i === sel));
            li.innerHTML = `${c.label}<span></span>`;
            li.querySelector('span').textContent = c.hint;
            li.addEventListener('mousemove', () => { if (sel !== i) { sel = i; mark(); } });
            li.addEventListener('click', () => run(i));
            list.appendChild(li);
        });
        if (!items.length) list.innerHTML = '<li aria-disabled="true">No matching command<span></span></li>';
    }

    function mark() {
        [...list.children].forEach((li, i) => li.setAttribute('aria-selected', String(i === sel)));
        list.children[sel]?.scrollIntoView({ block: 'nearest' });
    }

    function run(i) {
        const c = items[i];
        if (!c) return;
        const li = list.children[i];
        c.run(li);
        if (c.keepOpen) setTimeout(close, c.keepOpen);
        else close();
    }

    function show() {
        if (dlg.open) return;
        input.value = '';
        sel = 0;
        render();
        dlg.showModal();
        input.focus();
    }

    function close() {
        if (dlg.open) dlg.close();
    }

    trigger?.addEventListener('click', show);
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            dlg.open ? close() : show();
        }
    });
    input.addEventListener('input', () => { sel = 0; render(); });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(1, items.length); mark(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + items.length) % Math.max(1, items.length); mark(); }
        else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
    });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
}
