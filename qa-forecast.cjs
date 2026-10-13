// Optional DOM integration check: JSDOM_MODULE=/path/to/jsdom node qa-forecast.cjs
const {JSDOM,VirtualConsole}=require(process.env.JSDOM_MODULE||'jsdom');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict'),G=require('./engine-v3.js');
const root=__dirname,p=G.generate({name:'QA forecast',age:42,bodyweight:82,goal:150,start:'2026-10-13',target:'2026-12-05',experience:'advanced',trainingContinuity:'regular',recovery:'normal',resultType:'set',resultWeight:132.5,reps:3,resultRpe:null,technique:'touch',resultDate:'2026-10-10',weekdays:[2,4,6],bar:20,step:2.5,equipment:'gym',pain:false});
p.meta.templateVersion=4;
const seed={version:1,active:p.id,plans:[p],logs:{}};
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://test').pathname;const file=path.join(root,pathname==='/'?'index.html':pathname);try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 let dom;
 try{
 dom=await JSDOM.fromURL('http://127.0.0.1:'+server.address().port,{resources:'usable',runScripts:'dangerously',virtualConsole:vc,beforeParse(w){
  const OriginalDate=w.Date;w.Date=class extends OriginalDate{constructor(...a){super(...(a.length?a:['2026-10-13T12:00:00Z']));}static now(){return new OriginalDate('2026-10-13T12:00:00Z').getTime();}};
  w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  w.localStorage.setItem('mg150-planner-v1',JSON.stringify(seed));
 }});
 await new Promise(r=>dom.window.addEventListener('load',r));
 const w=dom.window,d=w.document,read=()=>JSON.parse(w.localStorage.getItem('mg150-planner-v1'));
 assert.equal(d.querySelector('#forecast-panel').hidden,false);assert.match(d.querySelector('#forecast-current').textContent,/145/);assert.equal(d.querySelector('#export-pdf').disabled,false);
 assert.ok(w.localStorage.getItem('mg150-planner-v1-before-forecast'));assert.equal(read().plans[0].meta.templateVersion,5);
 w.Planner.openLog();const form=d.querySelector('#log-form');
 for(const input of form.querySelectorAll('input[name^="kg-"]')){const index=input.name.slice(3),rpe=form.querySelector('[name="rpe-'+index+'"]');if(rpe){input.value='115';form.querySelector('[name="reps-'+index+'"]').value='3';rpe.value='9';}}
 form.elements.verified.checked=true;form.elements.status.value='done';form.elements.feedback.value='hard';
 form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 assert.equal(d.querySelector('#log-dialog').open,false,d.querySelector('#log-error').textContent);
 const saved=read();assert.equal(saved.logs[p.id+'|2026-10-13'].status,'done');assert.equal(saved.plans[0].profile.progressionPaused,true);assert.equal(saved.plans[0].meta.adjustments.length,1);
 assert.match(d.querySelector('#review-message').textContent,/Было:.*Стало:/);assert.match(d.querySelector('#forecast-basis').textContent,/1 тренировок/);
 w.Planner.openLog();form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(read().plans[0].meta.adjustments.length,1);
 assert.deepEqual(errors,[]);console.log('PASS: migration backup, forecast rendering, atomic log + adjustment, before/after explanation, idempotent save');
 }finally{dom?.window.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
