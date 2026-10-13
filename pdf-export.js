/* Offline-capable PDF export. Dependencies and font are served by this site, no CDN or data upload. */
(function(root){
  'use strict';
  const clean=s=>String(s??'').replace(/[\u2010-\u2015]/g,'-');
  function create(plan,logs,date,{jsPDF,fontBase64}){
    const doc=new jsPDF({unit:'mm',format:'a4',compress:true,putOnlyUsedFonts:true});
    doc.addFileToVFS('DejaVuSans.ttf',fontBase64);doc.addFont('DejaVuSans.ttf','MGym','normal');doc.setFont('MGym');
    doc.setProperties({title:clean('MGym - '+plan.name),subject:'План тренировок и прогноз по фактическим подходам',author:'MGym'});
    const G=typeof module!=='undefined'?require('./engine-v3.js'):root.BenchGenerator;
    const f=G.forecast(plan,logs,date),left=14,width=182,bottom=279;let y=18,context='';
    const kg=n=>n==null?'подбор':String(n).replace('.',',')+' кг';
    const full=d=>new Intl.DateTimeFormat('ru-RU',{weekday:'short',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'));
    function page(){doc.addPage();doc.setFontSize(9);doc.setTextColor(90);doc.text('MGym | '+clean(plan.name),left,11,{maxWidth:width});y=20;}
    function room(h){if(y+h>bottom)page();}
    function text(value,size=10,color=30){doc.setFontSize(size);doc.setTextColor(color);const lines=doc.splitTextToSize(clean(value),width);const h=size*.44;for(const line of lines){room(h);doc.text(line,left,y);y+=h;}y+=2;}
    text('MGym / ПЛАН ТРЕНИРОВОК',18);
    text(plan.name,14);
    text('Выгружено: '+full(date)+' | Цель: '+kg(plan.profile.goal)+' к '+full(plan.profile.target),10);
    text('Оценка силы сейчас: '+(f.current===null?'нет данных':'около '+kg(f.current))+(f.verified?'':' (техника не подтверждена)'),11);
    text('Прогноз: '+(f.range?kg(f.range.low)+' - '+kg(f.range.high):'недостаточно данных')+'. '+f.label,11);
    text(f.reason+' '+f.trend,9);
    text(f.note,9);
    text('Будущие нагрузки условны и меняются после записи фактических подходов и RPE. Этот PDF - снимок плана на дату выгрузки. Пустой факт означает отсутствие записи.',9);
    text('Вес - общий вес штанги. Подсобка с «подбором» выполняется с указанным запасом. RPE 8 - примерно 2 повтора в запасе; RPE 9 - 1.',9);
    const cols=[9,37,24,17,22,18,55],heads=['№','Подход','Вес','Повт.','Отдых','RPE','Факт: вес × повт. / RPE'];
    function row(values,header=false){
      doc.setFontSize(header?8:8.5);
      const lines=values.map((v,i)=>doc.splitTextToSize(clean(v),cols[i]-3));
      const height=Math.max(...lines.map(a=>a.length))*3.7+4;
      if(y+height>bottom){page();if(context)text(context+' (продолжение)',9);if(!header)row(heads,true);}
      if(header){doc.setFillColor(226,237,231);doc.rect(left,y,width,height,'F');}
      doc.setTextColor(25);let x=left;
      lines.forEach((ls,i)=>{doc.text(ls,x+1.5,y+4);x+=cols[i];});
      doc.setDrawColor(215);doc.line(left,y+height,left+width,y+height);y+=height;
    }
    for(const session of plan.sessions){
      room(43);y+=5;text(full(session.date)+' | Неделя '+session.week,12);
      const log=logs[plan.id+'|'+session.id];
      text(session.title+(log?.status==='done'?' | Выполнена':log?.status==='skipped'?' | Пропущена':''),10);
      text(session.note,9);let actualIndex=0;
      for(const ex of session.exercises){
        context=full(session.date)+' / '+ex.name;room(28);text(ex.name,10);text(ex.load,8.5);row(heads,true);
        ex.sets.forEach((v,i)=>{
          const actual=log?.sets[actualIndex++];
          row([i+1,v.kind+(v.optional?' (условно)':''),kg(v.weight),v.reps,Math.floor(v.rest/60)+':'+String(v.rest%60).padStart(2,'0'),v.rpeTarget??v.rpeCap??(v.rpe?'записать':'-'),actual?.kg!=null&&actual?.reps!=null?kg(actual.kg)+' × '+actual.reps+(actual.rpe!=null?' / '+actual.rpe:''):'-']);
        });y+=4;
      }
    }
    const pages=doc.getNumberOfPages();for(let i=1;i<=pages;i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(95);doc.text('MGym | '+date+' | '+i+' / '+pages,left,289);}
    return doc;
  }
  let dependencies;
  function load(){
    if(!dependencies)dependencies=Promise.all([
      new Promise((resolve,reject)=>{if(root.jspdf)return resolve(root.jspdf.jsPDF);const script=document.createElement('script');script.src='vendor/jspdf-4.2.1.umd.min.js';script.onload=()=>resolve(root.jspdf.jsPDF);script.onerror=()=>reject(Error('Не загрузился модуль PDF'));document.head.append(script);}),
      fetch('vendor/DejaVuSans.ttf').then(r=>{if(!r.ok)throw Error('Не загрузился шрифт PDF');return r.arrayBuffer();}).then(buffer=>{const bytes=new Uint8Array(buffer);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);})
    ]).then(([jsPDF,fontBase64])=>({jsPDF,fontBase64})).catch(e=>{dependencies=null;throw e;});
    return dependencies;
  }
  async function download(plan,logs,date){const doc=create(plan,logs,date,await load());doc.save('MGym-plan-'+date+'.pdf');}
  const api={create,download};if(typeof module!=='undefined')module.exports=api;else root.MGymPdf=api;
})(typeof globalThis!=='undefined'?globalThis:this);
