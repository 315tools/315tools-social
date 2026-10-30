// usage: node probe.js <url> <shot.png>  — lists visible controls in page + frames
const c=require('@sparticuz/chromium'),pp=require('puppeteer-core');
(async()=>{const b=await pp.launch({executablePath:await c.executablePath(),args:c.args,headless:true});
const pg=await b.newPage();await pg.setViewport({width:390,height:693,deviceScaleFactor:1,isMobile:true,hasTouch:true});
await pg.goto(process.argv[2],{waitUntil:'networkidle0'});
for(const f of pg.frames()){console.log('== FRAME',f===pg.mainFrame()?'main':f.url().slice(0,30), await f.evaluate(()=>{const fr=document.querySelector('iframe');return fr?('iframe#'+fr.id):''}));
 console.log((await f.evaluate(()=>[...document.querySelectorAll('button,a.tab,input,select,textarea,label.drop,canvas,[role=tab]')].filter(e=>e.offsetParent||e.type==='file').map(e=>{
  const t=(e.textContent||e.placeholder||e.value||'').trim().replace(/\s+/g,' ').slice(0,28);
  return `${e.tagName.toLowerCase()}${e.id?'#'+e.id:''}${e.className&&typeof e.className=='string'?'.'+e.className.trim().split(/\s+/).slice(0,2).join('.'):''}${e.type&&e.tagName=='INPUT'?'['+e.type+']':''}${e.dataset.tool?'{'+e.dataset.tool+'}':''}${e.getAttribute('aria-label')?'('+e.getAttribute('aria-label')+')':''} ${t}`}).slice(0,70))).join('\n'))}
if(process.argv[3])await pg.screenshot({path:process.argv[3],fullPage:true});await b.close()})().catch(e=>console.log('ERR',e.message))
