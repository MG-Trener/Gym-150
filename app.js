const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
const fullDate = s => new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${s}T12:00:00Z`));
const weight = n => n == null ? 'по самочувствию' : String(n).replace('.', ',')+' кг';
const rest = n => n >= 60 ? `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}` : `${n} с`;
let plan, selected;
function renderList(){
  const list=document.querySelector('#sessions'); list.replaceChildren(); let week=0;
  for(const s of plan.sessions){
    if(s.week!==week){week=s.week;const label=document.createElement('div');label.className='week-label';label.textContent=`НЕДЕЛЯ ${week}`;list.append(label)}
    const b=document.createElement('button');b.type='button';b.className='session-button'+(s.id===selected?' active':'');b.setAttribute('aria-current',s.id===selected?'date':'false');
    const d=new Date(`${s.date}T12:00:00Z`);b.innerHTML=`<span class="session-date">${d.getUTCDate()}<small>${months[d.getUTCMonth()].toUpperCase()}</small></span><span class="session-name"></span><span class="arrow">↗</span>`;
    b.querySelector('.session-name').textContent=s.title;b.addEventListener('click',()=>{selected=s.id;history.replaceState(null,'',`#${s.id}`);renderList();renderDetail()});list.append(b)
  }
}
function renderDetail(){
  const s=plan.sessions.find(v=>v.id===selected),box=document.querySelector('#detail');box.replaceChildren();
  const top=document.createElement('div');top.className='detail-top';top.innerHTML='<div><span class="section-index"></span><h3></h3></div><span class="date-chip"></span>';top.querySelector('.section-index').textContent=`НЕДЕЛЯ ${s.week} / ДЕНЬ ${plan.sessions.indexOf(s)+1} ИЗ ${plan.sessions.length}`;top.querySelector('h3').textContent=s.title;top.querySelector('.date-chip').textContent=fullDate(s.date);box.append(top);
  const note=document.createElement('p');note.className='note';note.textContent=s.note;box.append(note);
  for(const ex of s.exercises){
    const section=document.createElement('section');section.className='exercise';section.innerHTML='<div class="exercise-head"><h4></h4><small></small></div><p class="exercise-load"></p><div class="table-wrap"><table class="set-table"><thead><tr><th>№</th><th>Вес</th><th>Повт.</th><th>Отдых</th><th>Тип</th></tr></thead><tbody></tbody></table></div>';
    section.querySelector('h4').textContent=ex.name;section.querySelector('.exercise-head small').textContent=`${ex.sets.length} подходов`;section.querySelector('.exercise-load').textContent=ex.load;
    const tbody=section.querySelector('tbody');ex.sets.forEach((set,i)=>{const tr=document.createElement('tr');if(set.rpe)tr.className='heavy';for(const value of [i+1,weight(set.weight),set.reps,rest(set.rest),set.kind+(set.rpe?' · RPE ≤8':'')]){const td=document.createElement('td');td.textContent=value;if(value===set.kind+(set.rpe?' · RPE ≤8':''))td.className='kind';tr.append(td)}tbody.append(tr)});box.append(section)
  }
}
fetch('plan.json').then(r=>{if(!r.ok)throw Error('План недоступен');return r.json()}).then(data=>{plan=data;selected=plan.sessions.find(s=>`#${s.id}`===location.hash)?.id||plan.sessions[0].id;renderList();renderDetail();const rules=document.querySelector('#rules');data.rules.forEach(value=>{const li=document.createElement('li');li.textContent=value;rules.append(li)})}).catch(e=>{document.querySelector('#detail').textContent=`Не удалось загрузить план: ${e.message}`});

