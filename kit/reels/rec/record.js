// 315tools reel recorder v2 — records a real site flow at 1080x1920 with animated brand overlays.
// usage: node record.js <scenario.json> <outdir> <dur.json>
// scenario: {url, frame?, prep:[actions], intro:{kicker,title,sub,url,say}, scenes:[{say,sub,actions:[...]}], outro:{title,chips:[],url,say}, brand?:false, brand_say?}
// ends with a brand stinger (big 315tools wordmark + 'three one five tools' voice) unless brand:false
// actions: wait{ms} scroll{sel,main?,offset?,ms?} point{sel,main?,label} press{noclick?} unpoint
//          upload{sel,files} type{sel,main?,text,cps?} frameEval{js} mainEval{js} clickLoop{sel}
const fs = require('fs');
const chromium = require('@sparticuz/chromium'), pp = require('puppeteer-core');
const sc = JSON.parse(fs.readFileSync(process.argv[2]));
const OUT = process.argv[3]; fs.mkdirSync(OUT + '/frames', { recursive: true });
const DUR = JSON.parse(fs.readFileSync(process.argv[4]));  // seconds per voice line: [intro, scene1.., outro]
const FD = __dirname + '/package/files/';
const f64 = n => fs.readFileSync(FD + n).toString('base64');
const FONT_CSS = [400, 800].map(w => `@font-face{font-family:'Noto Sans';font-weight:${w};src:url(data:font/woff2;base64,${f64(`noto-sans-latin-${w}-normal.woff2`)})}`).join('');
const N = '#1B2B4B', A = '#F5A524', P = '#F6F4EF';
const CSS = `
.ad{display:none!important}
html,body{scroll-behavior:auto!important}
#rv *{box-sizing:border-box;text-transform:none;letter-spacing:normal}
#rv{position:fixed;inset:0;z-index:2147483000;pointer-events:none;font-family:'Noto Sans',sans-serif}
/* step badge */
#rv-step{position:absolute;top:14px;left:50%;transform:translate(-50%,-80px);background:${N};color:${P};border:2px solid ${A};border-radius:30px;padding:6px 14px 6px 8px;display:flex;align-items:center;gap:8px;font:800 14px 'Noto Sans';letter-spacing:.06em;transition:transform .45s cubic-bezier(.2,1.4,.4,1);box-shadow:0 4px 14px rgba(0,0,0,.25)}
#rv-step.on{transform:translate(-50%,0)}
#rv-step b{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:${A};color:${N};font-size:14px}
#rv-step i{display:flex;gap:4px;font-style:normal}#rv-step i s{width:7px;height:7px;border-radius:50%;background:#4A5A7A;text-decoration:none;transition:background .3s,transform .3s}#rv-step i s.d{background:${A};transform:scale(1.25)}
/* spotlight */
#rv-spot{position:absolute;border-radius:14px;border:4px solid ${A};box-shadow:0 0 0 2000px rgba(23,28,38,.52);opacity:0;transition:all .5s cubic-bezier(.3,1.2,.4,1)}
#rv-spot.on{opacity:1}
#rv-spot:after{content:'';position:absolute;inset:-10px;border-radius:20px;border:3px solid ${A};animation:rvpulse 1.1s ease-out infinite}
@keyframes rvpulse{0%{opacity:.9;transform:scale(.96)}100%{opacity:0;transform:scale(1.12)}}
/* bubble */
#rv-bub{position:absolute;background:${A};color:${N};font:800 17px/1.2 'Noto Sans';padding:9px 14px;border-radius:12px;white-space:nowrap;opacity:0;transform:scale(.6);transition:opacity .25s,transform .35s cubic-bezier(.2,1.6,.4,1);box-shadow:0 4px 0 ${N}}
#rv-bub.on{opacity:1;transform:scale(1)}
#rv-bub:after{content:'';position:absolute;left:var(--ax,50%);margin-left:-9px;border:9px solid transparent}
#rv-bub.up:after{top:100%;border-top-color:${A}}#rv-bub.dn:after{bottom:100%;border-bottom-color:${A}}
/* finger */
#rv-fin{position:absolute;left:0;top:0;width:52px;height:64px;margin:-5px 0 0 -23px;opacity:0;transition:left .6s cubic-bezier(.45,0,.2,1),top .6s cubic-bezier(.45,0,.2,1),opacity .3s;filter:drop-shadow(0 6px 6px rgba(0,0,0,.35))}
#rv-fin.on{opacity:1}#rv-fin svg{transform-origin:23px 5px;transition:transform .14s}#rv-fin.pr svg{transform:scale(.8)}
.rv-rip{position:absolute;width:24px;height:24px;margin:-12px 0 0 -12px;border-radius:50%;border:4px solid ${A};background:rgba(245,165,36,.35);animation:rvrip .6s ease-out forwards}
@keyframes rvrip{to{transform:scale(3.4);opacity:0}}
/* subtitle */
#rv-sub{position:absolute;left:16px;right:16px;top:70%;text-align:center;transition:top .4s}
#rv-sub.top{top:76px}
#rv-sub span{display:inline-block;background:${N};color:${P};font:800 21px/1.35 'Noto Sans';padding:10px 16px;border-radius:14px;box-shadow:0 6px 0 ${A};opacity:0}
#rv-sub span.rv-go{animation:rvsub .5s cubic-bezier(.2,1.4,.4,1) forwards}
#rv-sub span.rv-out{animation:rvout .25s forwards}
@keyframes rvsub{0%{opacity:0;transform:translateY(24px) scale(.92)}100%{opacity:1;transform:none}}
@keyframes rvout{to{opacity:0;transform:translateY(-10px)}}
#rv-sub em{font-style:normal;color:${A}}
/* cards */
.rv-card{position:absolute;inset:0;background:${N};color:${P};overflow:hidden;padding:0 30px;display:flex;flex-direction:column;justify-content:center;transition:transform .6s cubic-bezier(.7,0,.3,1)}
.rv-card.gone{transform:translateY(-105%)}
.rv-card.enter{transform:translateY(105%)}
.rv-card .blob{position:absolute;border-radius:50%;background:${A};opacity:.13;filter:blur(2px)}
.rv-card .b1{width:260px;height:260px;right:-90px;top:120px;animation:rvfloat 6s ease-in-out infinite alternate}
.rv-card .b2{width:150px;height:150px;left:-60px;bottom:170px;animation:rvfloat 5s ease-in-out infinite alternate-reverse}
@keyframes rvfloat{to{transform:translate(-30px,40px) scale(1.12)}}
.rv-card .lg{position:absolute;top:34px;left:30px;font:800 26px 'Noto Sans';animation:rvin .5s .1s both}
.rv-card .lg i{font-style:normal;color:${A}}
.rv-card .k{align-self:flex-start;background:${A};color:${N};font:800 14px 'Noto Sans';letter-spacing:.08em;padding:6px 14px;border-radius:20px;margin-bottom:18px;text-transform:uppercase;animation:rvpop .5s .25s both cubic-bezier(.2,1.6,.4,1)}
.rv-card h1{font:800 42px/1.12 'Noto Sans';margin:0 0 20px}
.rv-card h1 span{display:inline-block;animation:rvin .5s both cubic-bezier(.2,1.3,.4,1)}
.rv-card .bar{height:7px;border-radius:4px;background:${A};margin-bottom:20px;width:0;animation:rvbar .6s both}
@keyframes rvbar{to{width:64px}}
.rv-card p{font:400 19px/1.5 'Noto Sans';color:#B9C2D3;margin:0;animation:rvin .5s both}
.rv-card .u{position:absolute;bottom:108px;left:30px;font:800 22px 'Noto Sans';color:${A};animation:rvin .5s both}
.rv-card .u2{margin-top:22px;font:800 22px 'Noto Sans';color:${A};animation:rvin .5s both}
.rv-card .chips{display:flex;flex-direction:column;gap:12px;margin-top:6px}
.rv-card .chip{display:flex;align-items:center;gap:12px;font:800 21px 'Noto Sans';animation:rvslide .45s both cubic-bezier(.2,1.3,.4,1)}
.rv-card .chip b{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:${A};color:${N};font-size:18px}
.rv-card .bio{align-self:flex-start;margin-top:26px;border:2px solid ${A};color:${A};font:800 17px 'Noto Sans';padding:8px 16px;border-radius:24px;animation:rvin .4s both,rvbeat 1s 2s ease-in-out infinite}
.rv-card .ico{width:74px;height:74px;margin-bottom:18px;animation:rvpop .6s .15s both cubic-bezier(.2,1.6,.4,1)}
.rv-card .ico .sh{animation:rvshackle .5s .8s both cubic-bezier(.5,0,.4,1.6)}
@keyframes rvshackle{from{transform:translateY(-12px)}to{transform:none}}
@keyframes rvin{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}
@keyframes rvpop{from{opacity:0;transform:scale(.3)}to{opacity:1;transform:none}}
@keyframes rvslide{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:none}}
@keyframes rvbeat{50%{transform:scale(1.07)}}
/* brand stinger */
.rv-brand{align-items:center;text-align:center;padding:0}
.rv-brand .ring{position:absolute;left:50%;top:35%;width:300px;height:300px;margin:-150px 0 0 -150px;border-radius:50%;border:3px solid ${A};opacity:0;animation:rvring 1.6s .55s ease-out both}
.rv-brand .ring.r2{animation-delay:.85s}
@keyframes rvring{0%{opacity:.8;transform:scale(.3)}100%{opacity:0;transform:scale(1.6)}}
.rv-brand .wm{font:800 74px/1 'Noto Sans';letter-spacing:-.03em;white-space:nowrap;display:flex;align-items:baseline;justify-content:center;margin-top:-40px}
.rv-brand .wm b{display:inline-block;color:${P};animation:rvdrop .55s both cubic-bezier(.2,1.6,.4,1)}
.rv-brand .wm i{display:inline-block;font-style:normal;color:${A};animation:rvslideR .55s both cubic-bezier(.2,1.3,.4,1)}
@keyframes rvdrop{0%{opacity:0;transform:translateY(-120px) scale(.6)}100%{opacity:1;transform:none}}
@keyframes rvslideR{0%{opacity:0;transform:translateX(90px)}100%{opacity:1;transform:none}}
.rv-brand .ul{height:9px;border-radius:5px;background:${A};width:0;margin:18px auto 0;animation:rvul .5s 1s both cubic-bezier(.3,1.3,.4,1)}
@keyframes rvul{to{width:250px}}
.rv-brand .say{margin-top:26px;display:flex;gap:10px;justify-content:center;font:800 15px 'Noto Sans';letter-spacing:.12em;text-transform:uppercase;color:#B9C2D3}
.rv-brand .say span{display:inline-block;border:2px solid #4A5A7A;border-radius:20px;padding:6px 12px;animation:rvpop .4s both cubic-bezier(.2,1.6,.4,1)}
.rv-brand .say span.t{border-color:${A};color:${A}}
.rv-brand .tag{margin-top:30px;font:400 19px/1.45 'Noto Sans';color:#B9C2D3;animation:rvin .5s 1.9s both}
.rv-brand .dom{position:absolute;left:0;right:0;bottom:110px;font:800 24px 'Noto Sans';color:${A};animation:rvin .5s 2.1s both}
`;
const FINGER = `<svg viewBox="0 0 52 64" width="52" height="64"><g fill="#fff" stroke="${N}" stroke-width="3" stroke-linejoin="round">
<path d="M17 30V8a6 6 0 0 1 12 0v18l3-.5a5 5 0 0 1 5.5 3.3l.5-.1a5 5 0 0 1 5.8 3.4l.3-.1a5 5 0 0 1 6 4.6V48c0 8-6 14-14 14H26c-5 0-8.6-2.4-11-6.5L5.6 40a5 5 0 0 1 8-5.8z"/></g>
<path d="M29 28v8M37 30v7M44 34v6" stroke="${N}" stroke-width="2.5" stroke-linecap="round"/></svg>`;

(async () => {
  const b = await pp.launch({ executablePath: await chromium.executablePath(), args: chromium.args, headless: true });
  const pg = await b.newPage();
  await pg.setViewport({ width: 390, height: 693, deviceScaleFactor: 1080 / 390, isMobile: true, hasTouch: true });
  await pg.goto(sc.url, { waitUntil: 'networkidle0' });
  await pg.addStyleTag({ content: FONT_CSS + CSS });
  await pg.evaluate((fin) => {
    const r = document.createElement('div'); r.id = 'rv';
    r.innerHTML = `<div id="rv-spot"></div><div id="rv-bub"></div><div id="rv-step"><b></b><span>STEP</span><i></i></div><div id="rv-sub"><span></span></div><div id="rv-fin">${fin}</div>`;
    document.body.append(r);
  }, FINGER);
  const fr = () => sc.frame === false ? pg.mainFrame() : pg.frames().find(x => x !== pg.mainFrame());
  for (const a of sc.prep || []) await act(a);
  await pg.evaluate(() => window.scrollTo(0, 0));

  // ---- capture
  const cdp = await pg.createCDPSession(); const frames = [];
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const fn = `${OUT}/frames/${String(frames.length).padStart(5, '0')}.jpg`;
    fs.writeFileSync(fn, Buffer.from(data, 'base64')); frames.push({ fn, t: metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
  await sleep(250);
  const start = Date.now() / 1000, now = () => Date.now() / 1000 - start;
  const marks = [], sfx = [];
  let li = 0, last = null;
  const nScenes = sc.scenes.length;

  // intro
  await card(introHTML(sc.intro), true); sfx.push({ k: 'whoosh', t: now() });
  await sleep(350); marks.push({ i: li, t: now() }); await hold(li++, 350, async () => {});
  // scenes
  for (let s = 0; s < nScenes; s++) {
    const sceneStart = now();
    if (s === 0) { await uncard(); sfx.push({ k: 'whoosh', t: now() }); await sleep(450); }
    await step(s + 1, nScenes);
    marks.push({ i: li, t: now() }); await sub(sc.scenes[s].sub);
    await hold(li++, 450, async () => { for (const a of sc.scenes[s].actions) await act(a); });
    await subOut(); await unpoint();
  }
  // outro
  await stepOff(); await card(outroHTML(sc.outro), false); sfx.push({ k: 'whoosh', t: now() });
  await sleep(400); marks.push({ i: li, t: now() }); await hold(li++, 500, async () => {});
  // brand stinger: big 315tools wordmark so the name sticks
  if (sc.brand !== false) {
    await card(brandHTML(), false, 'rv-brand'); sfx.push({ k: 'whoosh', t: now() });
    await sleep(450); sfx.push({ k: 'ding', t: now() + 0.35 });
    marks.push({ i: li, t: now() + 0.3 }); await hold(li++, 1300, async () => { await sleep(300); });
  }
  await cdp.send('Page.stopScreencast');
  fs.writeFileSync(OUT + '/timeline.json', JSON.stringify({ start, end: Date.now() / 1000, frames, marks, sfx }));
  await b.close();

  // run fn, then wait until voice line (plus pad) has finished
  async function hold(i, padMs, fn) { const t0 = Date.now(); await fn(); const need = DUR[i] * 1000 + padMs - (Date.now() - t0); if (need > 0) await sleep(need); }

  async function act(a) {
    switch (a.do) {
      case 'wait': return sleep(a.ms);
      case 'scroll': { await unpoint(); const y = await targetY(a); return smooth(y - (a.offset ?? 100), a.ms || 800); }
      case 'point': return point(a);
      case 'unpoint': return unpoint();
      case 'press': return press(a);
      case 'upload': { const h = await fr().$(a.sel); await h.uploadFile(...a.files.map(f => f.replace('$SAMPLES', process.env.SAMPLES || __dirname + '/samples'))); await h.evaluate(e => e.dispatchEvent(new Event('change', { bubbles: true }))); return; }
      case 'type': { const h = await handle({ ...a, text: undefined }); await h.evaluate(e => { e.focus(); e.value = ''; e.dispatchEvent(new Event('input', { bubbles: true })); });
        for (const ch of a.text) { await h.evaluate((e, ch) => { e.value += ch; e.dispatchEvent(new Event('input', { bubbles: true })); }, ch); sfx.push({ k: 'key', t: now() }); await sleep(1000 / (a.cps || 9)); }
        if (!a.nochange) await h.evaluate(e => e.dispatchEvent(new Event('change', { bubbles: true }))); return; }
      case 'select': { const h = await handle(a); return h.evaluate((e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, a.value); }
      case 'frameEval': return fr().evaluate(a.js);
      case 'mainEval': return pg.evaluate(a.js);
      case 'click': { const h = await handle(a); await h.evaluate(e => e.click()); return sleep(a.ms ?? 200); }
      case 'draw': return draw(a);
      case 'drag': return drag(a);
      case 'waitFor': { const f = a.main ? pg.mainFrame() : fr(); const t0 = Date.now();
        if (a.gone) await sleep(700);
        while (Date.now() - t0 < (a.timeout || 30000)) { if (await f.evaluate((t, re, g) => { const b = document.body.innerText; return g ? !b.includes(g) : re ? new RegExp(re).test(b) : b.includes(t); }, a.text, a.re, a.gone)) break; await sleep(150); } return sleep(a.ms ?? 300); }
      case 'clickLoop': for (let k = 0; k < 12; k++) { const h = await fr().$(a.sel); if (!h) break; await h.evaluate(e => e.click()); await sleep(100); } return;
    }
  }

  async function point(a) {
    const r = await rect(a); last = { a, r };
    await pg.evaluate(({ r, label, corner }) => {
      const pad = 6, sp = document.getElementById('rv-spot'), bu = document.getElementById('rv-bub'), fi = document.getElementById('rv-fin'), su = document.getElementById('rv-sub');
      Object.assign(sp.style, { left: r.x - pad + 'px', top: r.y - pad + 'px', width: r.w + pad * 2 + 'px', height: r.h + pad * 2 + 'px' }); sp.classList.add('on');
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2, H = innerHeight, W = innerWidth, fx = corner ? r.x + r.w * .88 : cx, fy = corner ? r.y + r.h * .9 : cy;
      if (!fi.classList.contains('on')) { fi.style.transition = 'none'; fi.style.left = W - 40 + 'px'; fi.style.top = H + 40 + 'px'; fi.offsetWidth; fi.style.transition = ''; }
      fi.classList.add('on'); fi.style.left = fx + 'px'; fi.style.top = fy + 'px';
      su.classList.toggle('top', cy > H * 0.52);
      if (label) {
        bu.textContent = label; bu.className = ''; const bw = bu.offsetWidth, bh = bu.offsetHeight;
        const up = r.y - pad - bh - 16 > (cy > H * .52 ? 150 : 70); const bx = Math.max(12, Math.min(W - bw - 12, cx - bw / 2));
        bu.style.left = bx + 'px'; bu.style.top = (up ? r.y - pad - bh - 14 : r.y + r.h + pad + 14) + 'px';
        bu.style.setProperty('--ax', Math.max(18, Math.min(bw - 18, cx - bx)) + 'px');
        bu.classList.add(up ? 'up' : 'dn'); requestAnimationFrame(() => bu.classList.add('on'));
      }
    }, { r, label: a.label, corner: a.fin === 'corner' });
    await sleep(a.ms ?? 900);
  }
  async function press(a = {}) {
    if (!last) throw new Error('press without point');
    const r = await rect(last.a);
    await pg.evaluate(({ x, y }) => { const fi = document.getElementById('rv-fin'); fi.classList.add('pr');
      const d = document.createElement('div'); d.className = 'rv-rip'; d.style.left = x + 'px'; d.style.top = y + 'px'; document.getElementById('rv').append(d); setTimeout(() => d.remove(), 700);
      setTimeout(() => fi.classList.remove('pr'), 180); }, { x: r.x + r.w / 2, y: r.y + r.h / 2 });
    sfx.push({ k: 'tap', t: now() });
    await sleep(120);
    if (!a.noclick) { if (!a.keep) await unpoint(); const h = await handle(last.a); await h.evaluate(e => e.click()); }  // highlight goes as the tap lands (sites may scroll on click)
    await sleep(a.ms ?? 500);
  }
  async function draw(a) {
    const r = await rect(a); await unpoint();
    await pg.evaluate(() => { const fi = document.getElementById('rv-fin'); fi.classList.add('on'); });
    for (const g of a.glyphs) {
      for (const st of GLYPH[g]) {
        const pts = dense(st, a.step ?? 0.07);
        const P = ([x, y]) => [r.x + x * r.w, r.y + y * r.h];
        let [x0, y0] = P(pts[0]);
        await pg.evaluate(({ x, y }) => { const fi = document.getElementById('rv-fin'); fi.style.left = x + 'px'; fi.style.top = y + 'px'; }, { x: x0, y: y0 }); await sleep(a.lift ?? 200);
        await pg.evaluate(() => { const fi = document.getElementById('rv-fin'); fi.style.transition = 'opacity .3s'; fi.classList.add('pr'); });
        await pg.mouse.move(x0, y0); await pg.mouse.down();
        for (const p of pts.slice(1)) { const [x, y] = P(p); await Promise.all([pg.mouse.move(x, y, { steps: 3 }), pg.evaluate(({ x, y }) => { const fi = document.getElementById('rv-fin'); fi.style.left = x + 'px'; fi.style.top = y + 'px'; }, { x, y })]); if (a.speed) await sleep(a.speed); }
        await pg.mouse.up(); await pg.evaluate(() => { const fi = document.getElementById('rv-fin'); fi.classList.remove('pr'); fi.style.transition = ''; });
      }
      await sleep(250);
      if (a.next) { const h = await handle({ sel: a.next }); await h.evaluate(e => e.click()); sfx.push({ k: 'tap', t: now() }); await sleep(a.nextMs ?? 450); }
    }
  }
  async function drag(a) {
    const r = await rect(a), t = await rect({ ...a.to, main: a.to.main ?? a.main });
    const x0 = r.x + r.w / 2, y0 = r.y + r.h / 2, x1 = t.x + t.w * a.to.fx, y1 = t.y + t.h * a.to.fy;
    await point({ ...a, ms: a.ms ?? 700 });
    await pg.evaluate(() => { ['rv-spot'].forEach(i => document.getElementById(i).classList.remove('on')); const fi = document.getElementById('rv-fin'); fi.classList.add('pr'); });
    sfx.push({ k: 'tap', t: now() });
    await pg.evaluate(() => document.getElementById('rv-bub').classList.remove('on'));
    await pg.mouse.move(x0, y0); await pg.mouse.down();
    const n = a.steps || 26;
    for (let k = 1; k <= n; k++) { const e = k / n, q = e < .5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2, x = x0 + (x1 - x0) * q, y = y0 + (y1 - y0) * q;
      await Promise.all([pg.mouse.move(x, y, { steps: 2 }), pg.evaluate(({ x, y }) => { const fi = document.getElementById('rv-fin'); fi.style.transition = 'opacity .3s'; fi.style.left = x + 'px'; fi.style.top = y + 'px'; }, { x, y })]); await sleep(18); }
    await pg.mouse.up(); await pg.evaluate(() => { const fi = document.getElementById('rv-fin'); fi.classList.remove('pr'); fi.style.transition = ''; });
    await sleep(a.after ?? 500); await unpoint();
  }
  function unpoint() { return pg.evaluate(() => { ['rv-spot', 'rv-bub'].forEach(i => document.getElementById(i).classList.remove('on')); document.getElementById('rv-fin').classList.remove('on'); }); }
  function step(n, tot) { return pg.evaluate((n, tot) => { const s = document.getElementById('rv-step'); s.querySelector('b').textContent = n; s.querySelector('span').textContent = 'STEP ' + n + ' / ' + tot;
    s.querySelector('i').innerHTML = Array.from({ length: tot }, (_, k) => `<s class="${k < n ? 'd' : ''}"></s>`).join(''); s.classList.add('on'); }, n, tot); }
  function stepOff() { return pg.evaluate(() => document.getElementById('rv-step').classList.remove('on')); }
  function sub(t) { return pg.evaluate(t => { const s = document.querySelector('#rv-sub span'); s.innerHTML = t; s.className = ''; s.offsetWidth; s.className = 'rv-go'; }, t); }
  function subOut() { return pg.evaluate(() => { document.querySelector('#rv-sub span').className = 'rv-out'; }); }
  async function card(html, first, cls = '') {
    await pg.evaluate((html, first, cls) => { const c = document.createElement('div'); c.className = 'rv-card ' + cls + (first ? '' : ' enter'); c.innerHTML = html;
      document.getElementById('rv').append(c); c.offsetWidth; c.classList.remove('enter'); }, html, first, cls);
  }
  function uncard() { return pg.evaluate(() => document.querySelectorAll('.rv-card').forEach(c => c.classList.add('gone'))); }
  async function handle(a) { const f = a.main ? pg.mainFrame() : fr(); let h;
    if (a.text) h = (await f.evaluateHandle((sel, t) => [...document.querySelectorAll(sel)].filter(e => e.getClientRects().length).filter(e => e.textContent.trim().replace(/\s+/g, ' ').includes(t)).sort((x, y) => x.textContent.length - y.textContent.length)[0] || null, a.sel, a.text)).asElement();
    else h = (await f.evaluateHandle(sel => { const l = [...document.querySelectorAll(sel)]; return l.find(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden') || l[0] || null; }, a.sel)).asElement();
    if (!h) throw new Error('missing ' + a.sel + ' ' + (a.text || ''));
    for (let k = 0; k < (a.up || 0); k++) h = await h.evaluateHandle(e => e.parentElement);
    return h; }
  async function rect(a) {
    const h = await handle(a); const r = await h.evaluate(e => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
    if (a.main || sc.frame === false) return r;
    const o = await pg.$eval(sc.frame || '#tool-frame', e => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y }; });
    return { x: r.x + o.x, y: r.y + o.y, w: r.w, h: r.h };
  }
  async function targetY(a) { const r = await rect(a); const sy = await pg.evaluate(() => scrollY); return r.y + sy; }
  function smooth(y, ms) { return pg.evaluate((y, ms) => new Promise(res => { y = Math.max(0, Math.min(y, document.documentElement.scrollHeight - innerHeight)); const s = scrollY, d = y - s, t0 = performance.now();
    const f = t => { const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; scrollTo(0, s + d * e); k < 1 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); }), y, ms); }
})().catch(e => { console.error('ERR', e); process.exit(1); });

function words(t, d0) { return t.split(' ').map((w, k) => `<span style="animation-delay:${(d0 + k * 0.07).toFixed(2)}s">${w}</span>`).join(' '); }
function introHTML(c) {
  const n = c.title.split(' ').length, d = 0.4 + n * 0.07;
  return `<div class="blob b1"></div><div class="blob b2"></div><div class="lg">315<i>tools</i></div><span class="k">${c.kicker}</span><h1>${words(c.title, 0.4)}</h1>
<div class="bar" style="animation-delay:${d}s"></div><p style="animation-delay:${d + 0.2}s">${c.sub || ''}</p><div class="u" style="animation-delay:${d + 0.4}s">${c.url}</div>`;
}
function outroHTML(c) {
  const lock = `<svg class="ico" viewBox="0 0 74 74"><rect width="74" height="74" rx="20" fill="${A}"/><path class="sh" d="M27 33v-7a10 10 0 0 1 20 0v7" fill="none" stroke="${N}" stroke-width="5"/><rect x="20" y="33" width="34" height="26" rx="6" fill="${N}"/><circle cx="37" cy="45" r="4" fill="${A}"/></svg>`;
  return `<div class="blob b1"></div><div class="blob b2"></div><div class="lg">315<i>tools</i></div>${lock}<h1>${words(c.title, 0.35)}</h1>
<div class="chips">${c.chips.map((t, k) => `<div class="chip" style="animation-delay:${1 + k * 0.3}s"><b>✓</b>${t}</div>`).join('')}</div>
<span class="bio" style="animation-delay:${1.2 + c.chips.length * 0.3}s">Link in bio</span><div class="u2" style="animation-delay:${1.5 + c.chips.length * 0.3}s">${c.url}</div>`;
}
function brandHTML() {
  const d = ['3', '1', '5'].map((c, k) => `<b style="animation-delay:${(0.15 + k * 0.12).toFixed(2)}s">${c}</b>`).join('');
  const say = ['three', 'one', 'five', 'tools'].map((w, k) => `<span class="${k === 3 ? 't' : ''}" style="animation-delay:${(1.25 + k * 0.14).toFixed(2)}s">${w}</span>`).join('');
  return `<div class="blob b1"></div><div class="blob b2"></div><div class="ring"></div><div class="ring r2"></div>
<div class="wm">${d}<i style="animation-delay:.55s">tools</i></div><div class="ul"></div><div class="say">${say}</div>
<div class="tag">Free tools that work<br>right on your device</div><div class="dom">315tools.com</div>`;
}
const arc = (cx, cy, rx, ry, a0, a1, n = 24) => Array.from({ length: n + 1 }, (_, k) => { const t = (a0 + (a1 - a0) * k / n) * Math.PI / 180; return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)]; });
const GLYPH = {
  A: [[[.26, .86], [.5, .14], [.74, .86]], [[.35, .6], [.65, .6]]],
  B: [[[.3, .14], [.3, .86]], [[.3, .14], ...arc(.52, .32, .2, .18, -90, 90), [.3, .5]], [[.3, .5], ...arc(.54, .68, .23, .18, -90, 90), [.3, .86]]],
  C: [arc(.52, .5, .3, .36, -40, -320)],
  H: [[[.3, .14], [.3, .86]], [[.7, .14], [.7, .86]], [[.3, .5], [.7, .5]]],
  i: [[[.5, .42], [.5, .86]], [[.5, .26], [.5, .28]]],
  sig: [
    [[.14, .26], [.30, .22], ...arc(.25, .58, .07, .2, -90, 160, 14).slice(0, 0), [.25, .24], [.25, .62], ...arc(.19, .62, .06, .1, 0, 170, 10)],
    Array.from({ length: 60 }, (_, k) => { const t = k / 59; return [.36 + .46 * t + .035 * Math.cos(2 * Math.PI * 4 * t + Math.PI), .56 - .2 * Math.abs(Math.sin(Math.PI * 4 * t)) * (1 - .3 * t)]; }),
    [[.12, .84], [.35, .80], [.6, .78], [.88, .72]],
  ],
};
function dense(pts, d) { const o = [pts[0]]; for (let k = 1; k < pts.length; k++) { const [a, b] = [pts[k - 1], pts[k]], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / d)); for (let j = 1; j <= n; j++) o.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); } return o; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
