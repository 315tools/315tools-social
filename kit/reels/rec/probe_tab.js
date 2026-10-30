// usage: node probe_tab.js <url> <tab css> [tab text] [shot.png] — click a tab in the main page, then list controls (main + tool frame)
const c=require('@sparticuz/chromium'),pp=require('puppeteer-core');const sl=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const [url,sel,txt,shot]=process.argv.slice(2);const b=await pp.launch({executablePath:await c.executablePath(),args:c.args,headless:true});
const pg=await b.newPage();await pg.setViewport({width:390,height:693,deviceScaleFactor:1,isMobile:true,hasTouch:true});
await pg.goto(url,{waitUntil:'networkidle0'});const u0=pg.url();
await pg.evaluate((sel,txt)=>{const l=[...document.querySelectorAll(sel)].filter(e=>!txt||e.textContent.includes(txt));l[0].click()},sel,txt||'');await sl(1200);
console.log('url before/after',u0,pg.url());
for(const f of pg.frames()){console.log('== FRAME',f===pg.mainFrame()?'main':'tool');
 console.log((await f.evaluate(()=>[...document.querySelectorAll('button,a.tab,input,select,textarea,label,canvas,[role=tab]')].filter(e=>(e.offsetParent||e.type==='file')&&!e.closest('footer,nav.foot')).map(e=>{
  const t=(e.textContent||e.placeholder||e.value||'').trim().replace(/\s+/g,' ').slice(0,30);
  return `${e.tagName.toLowerCase()}${e.id?'#'+e.id:''}${typeof e.className=='string'&&e.className?'.'+e.className.trim().split(/\s+/).slice(0,2).join('.'):''}${e.tagName=='INPUT'?'['+e.type+']':''}${e.getAttribute('for')?'(for='+e.getAttribute('for')+')':''} ${t}`}).slice(0,80))).join('\n'))}
if(shot)await pg.screenshot({path:shot,fullPage:true});await b.close()})().catch(e=>console.log('ERR',e.message))
