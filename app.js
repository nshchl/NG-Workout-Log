// v4 multi-page app
const KEY = 'nish_training_log_v1';
const EX_TEMPLATES_KEY = 'nish_training_ex_templates_v1';
const CAT_KEY = 'nish_training_categories_v1';
const BW_KEY = 'nish_training_bodyweight_v1';

function est1RM(weight, reps){ if(!weight||!reps) return 0; return weight*(1+reps/30); }
function loadData(){ const raw=localStorage.getItem(KEY); return raw?JSON.parse(raw):{workouts:[]}; }
function saveData(d){ localStorage.setItem(KEY, JSON.stringify(d)); }
function loadTemplates(){ const raw=localStorage.getItem(EX_TEMPLATES_KEY); return raw?JSON.parse(raw):defaultTemplates(); }
function saveTemplates(t){ localStorage.setItem(EX_TEMPLATES_KEY, JSON.stringify(t)); }
function loadCats(){ const raw=localStorage.getItem(CAT_KEY); return raw?JSON.parse(raw):defaultCats(); }
function saveCats(c){ localStorage.setItem(CAT_KEY, JSON.stringify(c)); }
function loadBW(){ const raw=localStorage.getItem(BW_KEY); return raw?JSON.parse(raw):{entries:[]}; }
function saveBW(obj){ localStorage.setItem(BW_KEY, JSON.stringify(obj)); }

function defaultTemplates(){ return [
  "Back Extension","Iso Lateral Low Rows","Lat Pulldown","Close Grip Lat Pulldown",
  "Machine Shrugs","Machine Rows (Underhand Grip)","Iso Lateral Rows (Neutral Grip)",
  "Reverse Flys","Overhead Tricep Extension (Cable)","One Arm Cable Tricep Pushdown",
  "Tricep Pushdown","Leg Press","Hack Squats","V Squats","Hip Thrust (Machine)",
  "Seated Leg Curls","Dumbbell RDL","Hip Abduction","Hip Adduction","Standing Calf Raises",
  "Iso Lateral Shoulder Press","Dumbbell Shoulder Press","Plate Raises","Lateral Raises",
  "Cable Lateral Raises","Face Pulls","Iso Incline Chest Press","Dumbbell Chest Incline Fly",
  "Chest Fly","Chest Press","Tricep Reverse Pushdown","Rope Overhead Push","One Arm Cable Tricep Extension"
];}
function defaultCats(){ return [
  {name:"Push", color:"#ff8ad1"},
  {name:"Pull", color:"#8ae6ff"},
  {name:"Legs", color:"#baff8a"}
];}

function weekKey(dateStr){
  const d=new Date(dateStr+'T00:00:00');
  const tmp=new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum=(tmp.getUTCDay()+6)%7; tmp.setUTCDate(tmp.getUTCDate()-dayNum+3);
  const firstThursday=new Date(Date.UTC(tmp.getUTCFullYear(),0,4));
  const week=1+Math.round(((tmp-firstThursday)/86400000-3+((firstThursday.getUTCDay()+6)%7))/7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2,'0')}`;
}

// ---------- Shared Widgets ----------
function startRest(seconds){
  const mm=document.getElementById('rest-mm'), ss=document.getElementById('rest-ss');
  let remaining=seconds;
  function render(){ if(mm&&ss){ mm.textContent=String(Math.floor(remaining/60)).padStart(2,'0'); ss.textContent=String(remaining%60).padStart(2,'0'); } }
  if(window.__restTimer) clearInterval(window.__restTimer);
  render();
  window.__restTimer=setInterval(()=>{
    remaining--; render();
    if(remaining<=0){ clearInterval(window.__restTimer); window.__restTimer=null; render();
      try{ const ctx=new (window.AudioContext||window.webkitAudioContext)(); const o=ctx.createOscillator(); const g=ctx.createGain();
        o.type='sine'; o.frequency.value=880; o.connect(g); g.connect(ctx.destination);
        o.start(); setTimeout(()=>{o.stop();ctx.close();}, 250);
      }catch(e){}
    }
  },1000);
}
function bindRestControls(){
  document.querySelectorAll('.rest-start')?.forEach(b=> b.addEventListener('click', ()=> startRest(parseInt(b.dataset.sec,10))));
  document.getElementById('rest-start-custom')?.addEventListener('click', ()=>{
    const v=parseInt(document.getElementById('rest-custom').value,10);
    if(isFinite(v)&&v>0) startRest(v);
  });
  document.getElementById('rest-stop')?.addEventListener('click', ()=>{
    if(window.__restTimer) clearInterval(window.__restTimer);
    const mm=document.getElementById('rest-mm'), ss=document.getElementById('rest-ss'); if(mm) mm.textContent='00'; if(ss) ss.textContent='00';
  });
}

// ---------- Auto Progressive Targets ----------
// Rule: 6–10 rep range. If best reps < 10 => same weight, +1 rep. If reached 10 => +2.5% weight (round .5), back to 6 reps.
function roundToHalf(x){ return Math.round(x*2)/2; }
function bestSetForExercise(exName){
  const data=loadData(); let best=null;
  data.workouts.forEach(w=> w.exercises.forEach(ex=>{
    if(ex.name!==exName) return;
    ex.sets.forEach(s=>{
      const score=s.weight*s.reps;
      if(!best || score>best.score){ best={weight:s.weight, reps:s.reps, score, date:w.date}; }
    });
  }));
  return best;
}
function suggestNextTarget(exName){
  const last=bestSetForExercise(exName);
  if(!last) return null;
  let weight=last.weight, reps=last.reps;
  if(reps<10){ return {weight: weight, reps: reps+1, reason:`+1 rep at ${weight}kg (stay in 6–10)`}; }
  else { const newW=roundToHalf(weight*1.025); return {weight: newW, reps: 6, reason:`Hit 10 reps — add ~2.5% → ${newW}kg × 6`}; }
}

// ---------- Guardrail ----------
function weeklyVolumeForExercise(exName){
  const d=loadData(); const volByWeek={};
  d.workouts.forEach(w=>{
    let vol=0; w.exercises.forEach(ex=>{ if(ex.name===exName){ ex.sets.forEach(s=> vol+= s.weight*s.reps ); } });
    if(vol>0){ const wk=weekKey(w.date); volByWeek[wk]=(volByWeek[wk]||0)+vol; }
  });
  return volByWeek;
}
function guardrailMessageIfNeeded(addedExercises){
  // Compute per-exercise weekly volume if we add this workout today
  const today = document.getElementById('wdate')?.value || new Date().toISOString().slice(0,10);
  let warnings=[];
  const perExAdded={};
  addedExercises.forEach(ex=> ex.sets.forEach(s=> perExAdded[ex.name]=(perExAdded[ex.name]||0) + s.weight*s.reps ));
  Object.keys(perExAdded).forEach(name=>{
    const vols=weeklyVolumeForExercise(name);
    const wk=weekKey(today);
    const lastWkKey = (()=>{
      const [y, w]=wk.split('-W').map(x=>parseInt(x,10));
      let lw=w-1, ly=y; if(lw<=0){ ly=y-1; lw=52; }
      return `${ly}-W${String(lw).padStart(2,'0')}`;
    })();
    const prev = vols[lastWkKey]||0;
    const next = (vols[wk]||0) + perExAdded[name];
    if(prev>0){
      const inc = (next - prev) / prev;
      if(inc>0.07){
        warnings.push(`${name}: weekly volume jump ${(inc*100).toFixed(1)}% (>7%). Consider smaller increase.`);
      }
    }
  });
  return warnings.length? warnings.join(' ') : null;
}

// ---------- Page: Log ----------
function pageLog(){
  bindRestControls();
  const splitSelect=document.getElementById('wsplit');
  const catDot=document.getElementById('cat-color-dot');
  function refreshSplit(){
    const cats=loadCats();
    splitSelect.innerHTML = cats.map(c=> `<option value="${c.name}">${c.name}</option>`).join('');
    updateDot();
  }
  function updateDot(){
    const cats=loadCats(); const f=cats.find(c=> c.name===splitSelect.value);
    if(catDot) catDot.style.background = f? f.color : '#666';
  }
  refreshSplit();
  splitSelect.addEventListener('change', updateDot);
  const templates=loadTemplates();
  const tsel=document.getElementById('template-ex');
  tsel.innerHTML = '<option value="">— choose —</option>'+templates.map(n=> `<option value="${n}">${n}</option>`).join('');
  const exList=document.getElementById('exercise-list');
  const addExBtn=document.getElementById('add-exercise');
  function addExerciseRow(prefillName=""){
    const tmpl=document.getElementById('exercise-template').content.cloneNode(true);
    const ex=tmpl.querySelector('.exercise');
    const nameInput=ex.querySelector('.ex-name');
    nameInput.value=prefillName;
    const targetBox=ex.querySelector('.auto-target');
    function refreshSuggestion(){
      const n=nameInput.value.trim();
      if(!n){ targetBox.textContent=""; return; }
      const s=suggestNextTarget(n);
      targetBox.textContent = s? `Suggested next target: ${s.weight} kg × ${s.reps} — ${s.reason}` : "No history yet for auto suggestion.";
    }
    nameInput.addEventListener('blur', refreshSuggestion);
    const setContainer=ex.querySelector('.set-container');
    function addSetRow(weight="", reps="", rpe="", failure=false){
      const st=document.getElementById('set-template').content.cloneNode(true);
      const row=st.querySelector('.set-row');
      row.querySelector('.set-weight').value=weight;
      row.querySelector('.set-reps').value=reps;
      row.querySelector('.set-rpe').value=rpe;
      row.querySelector('.set-failure').checked=failure;
      row.querySelector('.remove-set').addEventListener('click', ()=>{
        row.remove(); [...setContainer.children].forEach((r,i)=> r.querySelector('.set-idx').textContent=i+1);
      });
      setContainer.appendChild(row);
      [...setContainer.children].forEach((r,i)=> r.querySelector('.set-idx').textContent=i+1);
    }
    ex.querySelector('.add-set').addEventListener('click', ()=> addSetRow());
    ex.querySelector('.remove-ex').addEventListener('click', ()=> ex.remove());
    addSetRow();
    exList.appendChild(ex);
    refreshSuggestion();
  }
  document.getElementById('add-exercise').addEventListener('click', ()=> addExerciseRow());
  tsel.addEventListener('change', e=>{ if(!e.target.value) return; addExerciseRow(e.target.value); e.target.value=""; });

  document.getElementById('clear-form').addEventListener('click', ()=>{
    document.getElementById('workout-form').reset();
    exList.innerHTML="";
    document.getElementById('edit-id').value="";
    document.getElementById('save-btn').textContent="Save Workout";
    updateDot();
  });
  // Prefill date
  const di=document.getElementById('wdate'); if(di) di.valueAsDate=new Date();

  document.getElementById('workout-form').addEventListener('submit', (e)=>{
    e.preventDefault();
    const date=document.getElementById('wdate').value;
    const split=splitSelect.value;
    const notes=document.getElementById('wnotes').value.trim();
    const editId=document.getElementById('edit-id').value;
    const data=loadData();

    const exercises=[];
    for(const ex of exList.querySelectorAll('.exercise')){
      const name=ex.querySelector('.ex-name').value.trim();
      const exNotes=ex.querySelector('.ex-notes').value.trim();
      const sets=[];
      for(const row of ex.querySelectorAll('.set-row:not(.header)')){
        const w=parseFloat(row.querySelector('.set-weight').value);
        const r=parseInt(row.querySelector('.set-reps').value,10);
        const rpe=parseFloat(row.querySelector('.set-rpe').value);
        const f=row.querySelector('.set-failure').checked;
        if(!isFinite(w)||!isFinite(r)) continue;
        sets.push({weight:w,reps:r,rpe:isFinite(rpe)?rpe:null,failure:f});
      }
      if(name && sets.length>0){ exercises.push({name,notes:exNotes,sets}); }
      // grow templates
      const t=loadTemplates(); if(name && !t.includes(name)){ t.push(name); saveTemplates(t); }
    }

    if(exercises.length===0){ alert("Add at least one exercise with sets."); return; }

    // Guardrail warning
    const warn = guardrailMessageIfNeeded(exercises);
    const guard = document.getElementById('guardrail');
    if(warn){ guard.style.display='block'; guard.textContent = "Volume guardrail: " + warn; }
    else { guard.style.display='none'; }

    if(editId){
      const idx=parseInt(editId,10);
      if(isFinite(idx) && loadData().workouts[idx]){
        data.workouts[idx] = {...data.workouts[idx], date, split, notes, exercises};
      }
    }else{
      data.workouts.push({ date, split, notes, exercises, createdAt:new Date().toISOString() });
    }
    saveData(data);
    window.location.href = "history.html";
  });
}

// ---------- Page: History ----------
function pageHistory(){
  const list=document.getElementById('history-list');
  const subBtns=document.querySelectorAll('.subtab-btn');
  let filter='all';
  subBtns.forEach(b=> b.addEventListener('click', ()=>{
    subBtns.forEach(x=>x.classList.remove('active')); b.classList.add('active');
    filter=b.dataset.filter; render();
  }));
  function render(){
    const d=loadData();
    if(d.workouts.length===0){ list.innerHTML="<p>No workouts yet.</p>"; return; }
    const items=d.workouts.map((w,i)=>({...w,_i:i}))
      .sort((a,b)=> (a.date<b.date?-1:a.date>b.date?1: (a.createdAt<b.createdAt?-1:1)));
    const cats=loadCats();
    const rows=items.filter(w=> filter==='all'?true:(w.split.toLowerCase().startsWith(filter.toLowerCase()))).map(w=>{
      const c=cats.find(c=>c.name===w.split); const color=c?c.color:'#7a7cff';
      const exHtml=w.exercises.map(ex=>{
        const sets=ex.sets.map((s,i)=>{
          const rpeTxt = (s.rpe||s.rpe===0)?`, RPE ${s.rpe}`:"";
          return `${i+1}) ${s.weight}kg × ${s.reps}${rpeTxt}${s.failure?' (F)':''}`;
        }).join(' | ');
        return `<div class="ex"><strong>${ex.name}</strong><div>${sets}</div></div>`;
      }).join('');
      return `<div class="workout">
        <h3>${w.date} — <span class="badge" style="background:linear-gradient(135deg, ${color}, #ffffff80)">${w.split}</span> ${w.notes?`<span class="badge">${w.notes}</span>`:''}</h3>
        <div class="workout-actions">
          <button class="btn-ghost" data-act="edit" data-i="${w._i}">Edit</button>
          <button class="btn-danger" data-act="del" data-i="${w._i}">Delete</button>
        </div>
        ${exHtml}
      </div>`;
    }).join('') || "<p>No workouts in this category.</p>";
    list.innerHTML=rows;

    list.querySelectorAll('.workout-actions button').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const i=parseInt(btn.dataset.i,10);
        if(btn.dataset.act==='del'){
          if(confirm("Delete this workout?")){
            const d2=loadData(); d2.workouts.splice(i,1); saveData(d2); render();
          }
        }else{
          // Edit -> load into form
          sessionStorage.setItem('editIndex', String(i));
          window.location.href="index.html";
        }
      });
    });
  }
  render();
}

// ---------- Page: Progress ----------
let progChart;
function pageProgress(){
  const exSel=document.getElementById('progress-ex');
  const metSel=document.getElementById('progress-metric');
  const btn=document.getElementById('refresh-progress');
  const canv=document.getElementById('progress-chart');
  const summary=document.getElementById('progress-summary');
  function renderOptions(){
    const names=new Set(); loadData().workouts.forEach(w=> w.exercises.forEach(ex=> names.add(ex.name)));
    exSel.innerHTML=[...names].sort().map(n=>`<option value="${n}">${n}</option>`).join('');
  }
  function draw(){
    const ex=exSel.value; if(!ex){ summary.textContent="No exercises yet."; return; }
    const metric=metSel.value;
    const byDate={};
    loadData().workouts.forEach(w=>{
      w.exercises.filter(e=>e.name===ex).forEach(e=> e.sets.forEach(s=>{
        if(!byDate[w.date]) byDate[w.date]=[]; byDate[w.date].push(s);
      }));
    });
    const keys=Object.keys(byDate).sort();
    if(keys.length===0){ summary.textContent="No sets logged for this exercise."; if(progChart) progChart.destroy(); return; }
    let labels=[], values=[];
    if(metric==='est1rm'){
      keys.forEach(d=>{ const best=Math.max(...byDate[d].map(s=> est1RM(s.weight,s.reps))); labels.push(d); values.push(Number(best.toFixed(1))); });
      summary.innerHTML = `<strong>${ex}</strong>: Best estimated 1RM = <span class="badge">${Math.max(...values).toFixed(1)} kg</span>`;
    }else if(metric==='best_reps_weight'){
      keys.forEach(d=>{ const best=Math.max(...byDate[d].map(s=> s.weight*s.reps)); labels.push(d); values.push(best); });
      summary.innerHTML = `<strong>${ex}</strong>: Best weight×reps peak = <span class="badge">${Math.max(...values)}</span>`;
    }else{
      const byWeek={}; keys.forEach(d=>{ const wk=weekKey(d); const v=byDate[d].reduce((a,s)=>a+s.weight*s.reps,0); byWeek[wk]=(byWeek[wk]||0)+v; });
      labels=Object.keys(byWeek).sort(); values=labels.map(k=>Math.round(byWeek[k]));
      summary.innerHTML = `<strong>${ex}</strong>: Weekly volume — keep increases modest (2–5%).`;
    }
    if(progChart) progChart.destroy();
    progChart = new Chart(canv, { type:'line', data:{ labels, datasets:[{label:`${ex} — ${metSel.selectedOptions[0].text}`, data:values, tension:.25, pointRadius:3}]}, options:{ responsive:true, maintainAspectRatio:false, scales:{ y:{beginAtZero:true} } } });
  }
  renderOptions(); draw();
  btn.addEventListener('click', draw);
  metSel.addEventListener('change', draw);
  exSel.addEventListener('change', draw);
}

// ---------- Page: Settings ----------
function pageSettings(){
  const list=document.getElementById('cat-list');
  const nameI=document.getElementById('cat-name');
  const colorI=document.getElementById('cat-color');
  function renderCats(){
    const cats=loadCats();
    list.innerHTML = cats.map((c,i)=>`
      <div class="cat-item">
        <span class="dot" style="background:${c.color}"></span>
        <span class="cat-name">${c.name}</span>
        <div class="cat-actions">
          <button class="btn-ghost" data-act="edit" data-i="${i}">Edit</button>
          <button class="btn-danger" data-act="del" data-i="${i}">Delete</button>
        </div>
      </div>
    `).join('');
    list.querySelectorAll('button').forEach(b=> b.addEventListener('click', ()=>{
      const i=parseInt(b.dataset.i,10); const cats2=loadCats();
      if(b.dataset.act==='edit'){ nameI.value=cats2[i].name; colorI.value=cats2[i].color; }
      else if(b.dataset.act==='del'){ if(confirm(`Delete "${cats2[i].name}"?`)){ cats2.splice(i,1); saveCats(cats2); renderCats(); } }
    }));
  }
  renderCats();
  document.getElementById('cat-add').addEventListener('click', ()=>{
    const nm=(nameI.value||'').trim(); const col=colorI.value||'#7a7cff'; if(!nm){ alert('Name required'); return; }
    const cats=loadCats(); const ix=cats.findIndex(c=>c.name.toLowerCase()===nm.toLowerCase());
    if(ix>=0) cats[ix].color=col; else cats.push({name:nm,color:col});
    saveCats(cats); renderCats(); alert('Category saved.');
  });
  document.getElementById('cat-clear').addEventListener('click', ()=>{ nameI.value=''; colorI.value='#7a7cff'; });

  // Export/Import/Reset
  document.getElementById('export-json').addEventListener('click', ()=>{
    const blob=new Blob([JSON.stringify(loadData(),null,2)], {type:'application/json'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='training_data.json'; a.click(); URL.revokeObjectURL(url);
  });
  document.getElementById('import-json').addEventListener('click', ()=>{
    const file=document.getElementById('import-file').files[0]; if(!file){ alert('Choose a JSON file first.'); return; }
    const reader=new FileReader(); reader.onload=e=>{
      try{ const obj=JSON.parse(e.target.result); if(!obj || !Array.isArray(obj.workouts)) throw new Error('Bad format');
        saveData(obj); alert('Imported.'); }catch(err){ alert('Failed: '+err.message); }
    }; reader.readAsText(file);
  });
  document.getElementById('reset-data').addEventListener('click', ()=>{
    if(confirm("Erase ALL workouts?")){ saveData({workouts:[]}); alert('Cleared.'); }
  });
}

// ---------- Page: Bodyweight ----------
let bwChart;
function pageWeight(){
  const dateI=document.getElementById('bw-date');
  const kgI=document.getElementById('bw-kg');
  const notesI=document.getElementById('bw-notes');
  const addBtn=document.getElementById('bw-add');
  const list=document.getElementById('bw-list');
  const canv=document.getElementById('bw-chart');
  if(dateI) dateI.valueAsDate=new Date();

  function render(){
    const obj=loadBW();
    const rows = obj.entries.sort((a,b)=> a.date<b.date?-1:a.date>b.date?1:0).map(e=> `<div class="ex">${e.date}: <strong>${e.kg} kg</strong> ${e.notes?`<em>(${e.notes})</em>`:''}</div>`).join('') || "<p>No entries yet.</p>";
    list.innerHTML=rows;

    const labels=obj.entries.map(e=>e.date).sort();
    const weights=labels.map(d=> obj.entries.find(e=>e.date===d).kg);
    if(bwChart) bwChart.destroy();
    bwChart = new Chart(canv, { type:'line', data:{ labels, datasets:[{label:'Bodyweight (kg)', data:weights, tension:.25, pointRadius:3}]},
      options:{ responsive:true, maintainAspectRatio:false, scales:{ y:{beginAtZero:false} } }});
  }
  addBtn.addEventListener('click', ()=>{
    const date=dateI.value || new Date().toISOString().slice(0,10);
    const kg=parseFloat(kgI.value); const notes=(notesI.value||'').trim();
    if(!isFinite(kg)){ alert('Enter a valid weight.'); return; }
    const obj=loadBW(); obj.entries.push({date, kg, notes}); saveBW(obj);
    kgI.value=''; notesI.value=''; render();
  });
  render();
}

// ---------- Edit handoff from History ----------
function tryLoadEditIntoForm(){
  const idx=sessionStorage.getItem('editIndex');
  if(!idx) return;
  const data=loadData(); const w=data.workouts[parseInt(idx,10)]; if(!w) return;
  sessionStorage.removeItem('editIndex');
  document.getElementById('edit-id').value=String(idx);
  document.getElementById('wdate').value=w.date;
  document.getElementById('wsplit').value=w.split;
  document.getElementById('wnotes').value=w.notes||'';
  const exList=document.getElementById('exercise-list');
  exList.innerHTML='';
  w.exercises.forEach(ex=>{
    const tmpl=document.getElementById('exercise-template').content.cloneNode(true);
    const exEl=tmpl.querySelector('.exercise');
    exEl.querySelector('.ex-name').value=ex.name;
    exEl.querySelector('.ex-notes').value=ex.notes||'';
    const cont=exEl.querySelector('.set-container');
    ex.sets.forEach((s, i)=>{
      const st=document.getElementById('set-template').content.cloneNode(true);
      const row=st.querySelector('.set-row');
      row.querySelector('.set-weight').value=s.weight;
      row.querySelector('.set-reps').value=s.reps;
      row.querySelector('.set-rpe').value=(s.rpe||s.rpe===0)?s.rpe:'';
      row.querySelector('.set-failure').checked=!!s.failure;
      cont.appendChild(row);
    });
    [...cont.children].forEach((r,i)=> r.querySelector('.set-idx').textContent=i+1);
    exEl.querySelector('.add-set').addEventListener('click', ()=>{
      const st=document.getElementById('set-template').content.cloneNode(true);
      const row=st.querySelector('.set-row');
      row.querySelector('.remove-set').addEventListener('click', ()=>{
        row.remove(); [...cont.children].forEach((r,i)=> r.querySelector('.set-idx').textContent=i+1);
      });
      cont.appendChild(row);
      [...cont.children].forEach((r,i)=> r.querySelector('.set-idx').textContent=i+1);
    });
    exEl.querySelector('.remove-ex').addEventListener('click', ()=> exEl.remove());
    exList.appendChild(exEl);
  });
  document.getElementById('save-btn').textContent="Update Workout";
}

// ---------- Bootstrap per-page ----------
(function(){
  const page = document.body.getAttribute('data-page');
  if(page==='log'){ pageLog(); tryLoadEditIntoForm(); }
  if(page==='history'){ pageHistory(); }
  if(page==='progress'){ pageProgress(); }
  if(page==='settings'){ pageSettings(); }
  if(page==='weight'){ pageWeight(); }
})();

// ---------- Seed initial data (only if empty) ----------
(function seed(){
  const d=loadData();
  if(d.workouts.length>0) return;
  const day="2025-08-09";
  const pull={date:day, split:"Pull", notes:"", exercises:[
    {name:"Back Extension",notes:"",sets:[{weight:0,reps:15,rpe:5,failure:false},{weight:0,reps:15,rpe:5,failure:false},{weight:0,reps:15,rpe:5,failure:false}]},
    {name:"Iso Lateral Low Rows",notes:"to failure",sets:[{weight:50,reps:6,rpe:9.5,failure:true},{weight:50,reps:6,rpe:9.5,failure:true},{weight:50,reps:6,rpe:9.5,failure:true}]},
    {name:"Lat Pulldown",notes:"to failure",sets:[{weight:80,reps:4,rpe:10,failure:true},{weight:80,reps:4,rpe:10,failure:true}]},
    {name:"Close Grip Lat Pulldown",notes:"",sets:[{weight:70,reps:6,rpe:8.5,failure:false},{weight:70,reps:6,rpe:8.5,failure:false}]},
    {name:"Machine Shrugs",notes:"Plated",sets:[{weight:80,reps:10,rpe:8,failure:false},{weight:80,reps:10,rpe:8,failure:false},{weight:80,reps:10,rpe:8,failure:false}]},
    {name:"Machine Rows (Underhand Grip)",notes:"",sets:[{weight:54,reps:8,rpe:8,failure:false},{weight:54,reps:8,rpe:8,failure:false}]},
    {name:"Iso Lateral Rows (Neutral Grip)",notes:"to failure",sets:[{weight:60,reps:6,rpe:9.5,failure:true},{weight:60,reps:6,rpe:9.5,failure:true}]},
    {name:"Reverse Flys",notes:"",sets:[{weight:61,reps:4,rpe:9,failure:false}]},
    {name:"Overhead Tricep Extension (Cable)",notes:"to failure",sets:[{weight:23.76,reps:8,rpe:9.5,failure:true},{weight:23.76,reps:8,rpe:9.5,failure:true},{weight:23.76,reps:8,rpe:9.5,failure:true}]},
    {name:"One Arm Cable Tricep Pushdown",notes:"to failure",sets:[{weight:11.25,reps:3,rpe:10,failure:true},{weight:11.25,reps:3,rpe:10,failure:true},{weight:11.25,reps:3,rpe:10,failure:true}]},
    {name:"Tricep Pushdown",notes:"",sets:[{weight:28.75,reps:6,rpe:8.5,failure:false},{weight:28.75,reps:6,rpe:8.5,failure:false}]}
  ], createdAt:new Date().toISOString()};
  const legs={date:day, split:"Legs", notes:"", exercises:[
    {name:"Warm-up (Cardio)",notes:"",sets:[{weight:0,reps:10,rpe:3,failure:false}]},
    {name:"Leg Press",notes:"paired with Hack Squats",sets:[{weight:150,reps:4,rpe:9,failure:false},{weight:120,reps:6,rpe:8.5,failure:false}]},
    {name:"Hack Squats",notes:"",sets:[{weight:50,reps:4,rpe:9,failure:false}]},
    {name:"V Squats",notes:"alternative",sets:[{weight:80,reps:4,rpe:8.5,failure:false}]},
    {name:"Hip Thrust (Machine)",notes:"",sets:[{weight:100,reps:8,rpe:8,failure:false},{weight:100,reps:8,rpe:8,failure:false},{weight:100,reps:8,rpe:8,failure:false}]},
    {name:"Seated Leg Curls",notes:"",sets:[{weight:68,reps:4,rpe:9,failure:false},{weight:68,reps:3,rpe:9,failure:false}]},
    {name:"Back Extension",notes:"",sets:[{weight:0,reps:15,rpe:5,failure:false},{weight:0,reps:15,rpe:5,failure:false}]},
    {name:"Dumbbell RDL",notes:"superset",sets:[{weight:15,reps:10,rpe:7,failure:false},{weight:15,reps:10,rpe:7,failure:false}]},
    {name:"Hip Abduction",notes:"",sets:[{weight:60,reps:6,rpe:8,failure:false}]},
    {name:"Hip Adduction",notes:"",sets:[{weight:37.5,reps:6,rpe:7.5,failure:false},{weight:37.5,reps:6,rpe:7.5,failure:false}]},
    {name:"Standing Calf Raises",notes:"failure",sets:[{weight:65,reps:0,rpe:null,failure:true},{weight:65,reps:0,rpe:null,failure:true},{weight:65,reps:0,rpe:null,failure:true},{weight:65,reps:0,rpe:null,failure:true},{weight:65,reps:0,rpe:null,failure:true},{weight:65,reps:0,rpe:null,failure:true},{weight:65,reps:0,rpe:null,failure:true},{weight:85,reps:12,rpe:8,failure:false}]}
  ], createdAt:new Date().toISOString()};
  const push={date:day, split:"Push", notes:"", exercises:[
    {name:"Iso Lateral Shoulder Press",notes:"",sets:[{weight:25,reps:6,rpe:8.5,failure:false}]},
    {name:"Dumbbell Shoulder Press",notes:"",sets:[{weight:17.5,reps:6,rpe:8.5,failure:false}]},
    {name:"Plate Raises",notes:"",sets:[{weight:15,reps:8,rpe:8,failure:false},{weight:15,reps:8,rpe:8,failure:false}]},
    {name:"Lateral Raises",notes:"",sets:[{weight:10,reps:8,rpe:7.5,failure:false},{weight:10,reps:8,rpe:7.5,failure:false}]},
    {name:"Cable Lateral Raises",notes:"",sets:[{weight:7.5,reps:6,rpe:8,failure:false}]},
    {name:"Face Pulls",notes:"",sets:[{weight:40,reps:6,rpe:8,failure:false}]},
    {name:"Iso Incline Chest Press",notes:"",sets:[{weight:30,reps:4,rpe:9,failure:false}]},
    {name:"Dumbbell Chest Incline Fly",notes:"superset",sets:[{weight:8,reps:8,rpe:7.5,failure:false}]},
    {name:"Chest Fly",notes:"",sets:[{weight:47,reps:6,rpe:8.5,failure:false}]},
    {name:"Chest Press",notes:"",sets:[{weight:55,reps:8,rpe:8.5,failure:false}]},
    {name:"Tricep Pushdown",notes:"",sets:[{weight:28.75,reps:6,rpe:8.5,failure:false}]},
    {name:"Tricep Reverse Pushdown",notes:"",sets:[{weight:15,reps:8,rpe:8,failure:false}]},
    {name:"Rope Overhead Push",notes:"",sets:[{weight:15,reps:8,rpe:8,failure:false}]},
    {name:"One Arm Cable Tricep Extension",notes:"",sets:[{weight:7.5,reps:8,rpe:7.5,failure:false}]}
  ], createdAt:new Date().toISOString()};
  d.workouts.push(pull, legs, push);
  saveData(d);

  const bw=loadBW();
  if(bw.entries.length===0){
    bw.entries.push({date:day, kg:78.2, notes:"baseline"});
    saveBW(bw);
  }
})();