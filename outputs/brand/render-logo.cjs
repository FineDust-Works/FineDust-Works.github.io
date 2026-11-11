const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const sharp = require('C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1110-778-0_26.1110.778.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname,'../..');
const logo = fs.readFileSync(path.join(root,'assets/logo.svg'),'utf8');
const favicon = fs.readFileSync(path.join(root,'assets/favicon.svg'),'utf8');
const [x,y,w,h] = logo.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
const shapes = logo.match(/<g fill="[^"]+">([\s\S]*?)<\/g>/)[1];
const metadata = logo.match(/<metadata>([\s\S]*?)<\/metadata>/)?.[1] || '{}';
const dark = favicon.match(/<rect[^>]*fill="([^"]+)"/)[1];
const light = favicon.match(/<g fill="([^"]+)"/)[1];
const scale=1024*.92/Math.max(w,h),tx=(1024-w*scale)/2-x*scale,ty=(1024-h*scale)/2-y*scale;
async function run(){
  fs.mkdirSync(__dirname,{recursive:true});
  for(const [mode,bg,fg] of [['light',light,dark],['dark',dark,light]]){
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><title>FineDust Works ${mode}</title><metadata>${metadata}</metadata><rect width="1024" height="1024" fill="${bg}"/><g fill="${fg}" transform="translate(${tx} ${ty}) scale(${scale})">${shapes}</g></svg>`;
    assert.equal((svg.match(/<circle /g)||[]).length,16);
    assert.equal((svg.match(/<path /g)||[]).length,(logo.match(/<path /g)||[]).length);
    fs.writeFileSync(path.join(__dirname,`finedust-works-${mode}.svg`),svg);
    const output=path.join(__dirname,`finedust-works-${mode}.png`);
    await sharp(Buffer.from(svg)).png().toFile(output);
    const m=await sharp(output).metadata();assert.equal(m.width,1024);assert.equal(m.height,1024);
  }
  const buffers=await Promise.all(['light','dark'].map(mode=>sharp(path.join(__dirname,`finedust-works-${mode}.png`)).resize(400).toBuffer()));
  await sharp({create:{width:800,height:400,channels:3,background:light}}).composite(buffers.map((input,i)=>({input,left:i*400,top:0}))).png().toFile(path.join(__dirname,'preview.png'));
  console.log(JSON.stringify({source:'assets/logo.svg',settings:JSON.parse(metadata),colors:{light,dark},size:1024,verticalMarginPercent:4,verified:true}));
}
run().catch(e=>{console.error(e);process.exitCode=1;});
