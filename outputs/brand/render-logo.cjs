const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const sharp = require('C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1104-2876-0_26.1104.2876.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/sharp');
const html = fs.readFileSync('C:/Users/eremb/.codex/visualizations/2026/11/10/01a1c5a7-4980-7173-a4dc-6447d97e7eb7/finedust-dot-tuner.html','utf8');
const settings = {brand:'FineDust Works',columnGaps:[13.5,11,4,11],verticalSpacing:11,diameters:[7,9.5,10.5,11.5,14],connectionStrength:35};
const els = new Map();let exported;
function element(id){
  if(!els.has(id))els.set(id,{handlers:{},classList:{toggle(){}},append(){},addEventListener(k,f){this.handlers[k]=f},set innerHTML(s){this.html=s;for(const m of s.matchAll(/id="([^"]+)"/g))element(m[1]);},get innerHTML(){return this.html;}});
  return els.get(id);
}
for(const m of html.matchAll(/id="([^"]+)"/g))element(m[1]);
element('fd-dot-tuner').querySelector=s=>{if(!els.has(s.slice(1)))throw Error(s);return element(s.slice(1));};
vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],{document:{getElementById:element,createElement:()=>element(Symbol())},window:{addEventListener(){},openai:{widgetState:{modelContent:settings}}},Blob,URL:{createObjectURL(b){exported=b;return 'blob:logo';},revokeObjectURL(){}},getComputedStyle:()=>({color:'#151515'})});
async function run(){
  element('fd-download').handlers.click();
  const logo=await exported.text();
  const view=logo.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
  const [x,y,w,h]=view;
  const scale=942.08/Math.max(w,h),tx=(1024-w*scale)/2-x*scale,ty=(1024-h*scale)/2-y*scale;
  const shapes=logo.match(/<g fill="[^"]+">([\s\S]*?)<\/g>/)[1];
  for(const [mode,bg,fg] of [['light','#ffffff','#151515'],['dark','#151515','#ffffff']]){
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><title>FineDust Works — ${mode}</title><metadata>${JSON.stringify(settings)}</metadata><rect width="1024" height="1024" fill="${bg}"/><g fill="${fg}" transform="translate(${tx} ${ty}) scale(${scale})">${shapes}</g></svg>`;
    fs.writeFileSync(path.join(__dirname,`finedust-works-${mode}.svg`),svg);
    await sharp(Buffer.from(svg)).png().toFile(path.join(__dirname,`finedust-works-${mode}.png`));
  }
  const light=await sharp(path.join(__dirname,'finedust-works-light.png')).resize(400).toBuffer();
  const dark=await sharp(path.join(__dirname,'finedust-works-dark.png')).resize(400).toBuffer();
  await sharp({create:{width:800,height:400,channels:3,background:'#ffffff'}}).composite([{input:light,left:0,top:0},{input:dark,left:400,top:0}]).png().toFile(path.join(__dirname,'preview.png'));
  for(const mode of ['light','dark']){const m=await sharp(path.join(__dirname,`finedust-works-${mode}.png`)).metadata();if(m.width!==1024||m.height!==1024)throw Error('Invalid dimensions');}
  console.log('Created and verified 1024 × 1024 light/dark PNG and SVG; current 35% connection geometry preserved.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});

