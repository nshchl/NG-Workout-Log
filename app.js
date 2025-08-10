// Training Log v3 — RPE, Rest Timer, Categories, Inline Edit/Delete
const KEY = 'nish_training_log_v1';
const EX_TEMPLATES_KEY = 'nish_training_ex_templates_v1';
const CAT_KEY = 'nish_training_categories_v1';

function est1RM(weight, reps){
  if(!weight || !reps) return 0;
  return weight * (1 + reps/30);
}

// Storage helpers
function loadData(){ const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : { workouts: [] }; }
function saveData(data){ localStorage.setItem(KEY, JSON.stringify(data)); }
function loadTemplates(){ const raw = localStorage.getItem(EX_TEMPLATES_KEY); return raw ? JSON.parse(raw) : defaultTemplates(); }
function saveTemplates(list){ localStorage.setItem(EX_TEMPLATES_KEY, JSON.stringify(list)); }
function loadCats(){ const raw = localStorage.getItem(CAT_KEY); return raw ? JSON.parse(raw) : defaultCats(); }
function saveCats(list){ localStorage.setItem(CAT_KEY, JSON.stringify(list)); }

function defaultTemplates(){
  return [
    "Back Extension","Iso Lateral Low Rows","Lat Pulldown","Close Grip Lat Pulldown",
    "Machine Shrugs","Machine Rows (Underhand Grip)","Iso Lateral Rows (Neutral Grip)",
    "Reverse Flys","Overhead Tricep Extension (Cable)","One Arm Cable Tricep Pushdown",
    "Tricep Pushdown","Leg Press","Hack Squats","V Squats","Hip Thrust (Machine)",
    "Seated Leg Curls","Dumbbell RDL","Hip Abduction","Hip Adduction","Standing Calf Raises",
    "Iso Lateral Shoulder Press","Dumbbell Shoulder Press","Plate Raises","Lateral Raises",
    "Cable Lateral Raises","Face Pulls","Iso Incline Chest Press","Dumbbell Chest Incline Fly",
    "Chest Fly","Chest Press","Tricep Reverse Pushdown","Rope Overhead Push",
    "One Arm Cable Tricep Extension"
  ];
}

function defaultCats(){
  return [
    { name: "Push", color: "#ff8a8a" },
    { name: "Pull", color: "#8ae6ff" },
    { name: "Legs", color: "#baff8a" }
  ];
}

// Tabs
const tabs = document.querySelectorAll('.tab-btn');
const panes = document.querySelectorAll('.tab-pane');
tabs.forEach(btn=>{
  btn.addEventListener('click', () => {
    tabs.forEach(b=>{ b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
    panes.forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    btn.setAttribute('aria-selected','true');
    document.getElementById(btn.dataset.tab).classList.add('active');
    if(btn.dataset.tab === 'history') renderHistory();
    if(btn.dataset.tab === 'progress') renderProgressOptions();
    if(btn.dataset.tab === 'settings') renderCats();
  });
});

// REST TIMER
let restTimer = null, restRemaining = 0;
const mm = document.getElementById('rest-mm'), ss = document.getElementById('rest-ss');
function renderRest(){
  const m = String(Math.floor(restRemaining/60)).padStart(2,'0');
  const s = String(restRemaining%60).padStart(2,'0');
  if(mm) mm.textContent = m;
  if(ss) ss.textContent = s;
}
function startRest(seconds){
  if(restTimer) clearInterval(restTimer);
  restRemaining = seconds;
  renderRest();
  restTimer = setInterval(()=>{
    restRemaining--;
    renderRest();
    if(restRemaining<=0){
      clearInterval(restTimer); restTimer=null;
      try { new AudioContext().resume().then(()=>{
        const ctx = new (window.AudioContext||window.webkitAudioContext)();
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type='sine'; o.frequency.value=880; o.connect(g); g.connect(ctx.destination);
        o.start(); setTimeout(()=>{o.stop();ctx.close();}, 300);
      }); } catch(e){ /* ignore */ }
    }
  }, 1000);
}
document.querySelectorAll('.rest-start')?.forEach(b=> b.addEventListener('click', ()=> startRest(parseInt(b.dataset.sec,10))));
document.getElementById('rest-start-custom')?.addEventListener('click', ()=>{
  const v = parseInt(document.getElementById('rest-custom').value,10);
  if(isFinite(v) && v>0) startRest(v);
});
document.getElementById('rest-stop')?.addEventListener('click', ()=>{
  if(restTimer) clearInterval(restTimer); restTimer=null; restRemaining=0; renderRest();
});
renderRest();

// Categories UI
const splitSelect = document.getElementById('wsplit');
const catDot = document.getElementById('cat-color-dot');
const manageCatsBtn = document.getElementById('manage-cats');
function refreshSplitSelect(){
  const cats = loadCats();
  splitSelect.innerHTML = cats.map(c=> `<option value="${c.name}">${c.name}</option>`).join('');
  updateCatDot();
}
function updateCatDot(){
  const cats = loadCats();
  const found = cats.find(c=> c.name === splitSelect.value);
  if(catDot) catDot.style.background = found ? found.color : '#666';
}
splitSelect?.addEventListener('change', updateCatDot);
manageCatsBtn?.addEventListener('click', ()=>{
  document.querySelector('.tab-btn[data-tab="settings"]').click();
});

// Settings — categories manager
const catList = document.getElementById('cat-list');
const catName = document.getElementById('cat-name');
const catColor = document.getElementById('cat-color');
document.getElementById('cat-add')?.addEventListener('click', ()=>{
  const name = (catName.value||'').trim();
  const color = catColor.value||'#6c8cff';
  if(!name) { alert('Category name required'); return; }
  const cats = loadCats();
  const ix = cats.findIndex(c=> c.name.toLowerCase()===name.toLowerCase());
  if(ix>=0) cats[ix].color = color; else cats.push({name, color});
  saveCats(cats);
  renderCats();
  refreshSplitSelect();
  alert('Category saved.');
});
document.getElementById('cat-clear')?.addEventListener('click', ()=>{
  catName.value=''; catColor.value='#6c8cff';
});
function renderCats(){
  const cats = loadCats();
  catList.innerHTML = cats.map((c,i)=> `
    <div class="cat-item">
      <span class="dot" style="background:${c.color}"></span>
      <span class="cat-name">${c.name}</span>
      <div class="cat-actions">
        <button class="btn-ghost" data-act="edit" data-i="${i}">Edit</button>
        <button class="btn-danger" data-act="del" data-i="${i}">Delete</button>
      </div>
    </div>
  `).join('');
  catList.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const act = btn.dataset.act; const i = parseInt(btn.dataset.i,10);
      const cats2 = loadCats();
      if(act==='edit'){
        catName.value = cats2[i].name; catColor.value = cats2[i].color;
      } else if(act==='del'){
        if(confirm(`Delete category "${cats2[i].name}"?`)){
          cats2.splice(i,1); saveCats(cats2); renderCats(); refreshSplitSelect();
        }
      }
    });
  });
}

// Form setup
const workoutForm = document.getElementById('workout-form');
const exList = document.getElementById('exercise-list');
const addExBtn = document.getElementById('add-exercise');
const templateSelect = document.getElementById('template-ex');
const saveBtn = document.getElementById('save-btn');

function populateTemplateSelect(){
  const templates = loadTemplates();
  templateSelect.innerHTML = '<option value="">— choose —</option>' + 
    templates.map(n => `<option value="${n}">${n}</option>`).join('');
}
populateTemplateSelect();
refreshSplitSelect();

addExBtn?.addEventListener('click', () => addExerciseRow());
templateSelect?.addEventListener('change', (e) => {
  if(!e.target.value) return;
  addExerciseRow(e.target.value);
  e.target.value = "";
});

function addExerciseRow(prefillName=""){
  const tmpl = document.getElementById('exercise-template').content.cloneNode(true);
  const ex = tmpl.querySelector('.exercise');
  const nameInput = ex.querySelector('.ex-name');
  nameInput.value = prefillName;
  const setContainer = ex.querySelector('.set-container');

  function addSetRow(weight="", reps="", rpe="", failure=false){
    const setTmpl = document.getElementById('set-template').content.cloneNode(true);
    const setRow = setTmpl.querySelector('.set-row');
    const wInput = setRow.querySelector('.set-weight');
    const rInput = setRow.querySelector('.set-reps');
    const rpeInput = setRow.querySelector('.set-rpe');
    const fInput = setRow.querySelector('.set-failure');
    wInput.value = weight; rInput.value = reps; rpeInput.value = rpe; fInput.checked = failure;

    function updateIndices(){
      [...setContainer.children].forEach((row, i) => {
        row.querySelector('.set-idx').textContent = i+1;
      });
    }

    setRow.querySelector('.remove-set').addEventListener('click', ()=>{ setRow.remove(); updateIndices(); });
    setContainer.appendChild(setRow);
    updateIndices();
  }

  ex.querySelector('.add-set').addEventListener('click', ()=> addSetRow());
  ex.querySelector('.remove-ex').addEventListener('click', ()=> ex.remove());
  addSetRow();
  exList.appendChild(ex);
}

document.getElementById('clear-form')?.addEventListener('click', ()=>{
  workoutForm.reset();
  exList.innerHTML = "";
  document.getElementById('edit-id').value = "";
  saveBtn.textContent = "Save Workout";
  updateCatDot();
});

workoutForm?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const data = loadData();
  const date = document.getElementById('wdate').value;
  const split = document.getElementById('wsplit').value;
  const notes = document.getElementById('wnotes').value.trim();
  const editId = document.getElementById('edit-id').value;

  if(!date || !split){ alert("Date and Category/Split are required."); return; }

  const exercises = [];
  for(const ex of exList.querySelectorAll('.exercise')){
    const name = ex.querySelector('.ex-name').value.trim();
    const exNotes = ex.querySelector('.ex-notes').value.trim();
    const sets = [];
    for(const row of ex.querySelectorAll('.set-row:not(.header)')){
      const w = parseFloat(row.querySelector('.set-weight').value);
      const r = parseInt(row.querySelector('.set-reps').value,10);
      const rpe = parseFloat(row.querySelector('.set-rpe').value);
      const f = row.querySelector('.set-failure').checked;
      if(!isFinite(w) || !isFinite(r)) continue;
      sets.push({ weight:w, reps:r, rpe: isFinite(rpe)? rpe : null, failure:f });
    }
    if(name && sets.length>0){
      exercises.push({ name, notes: exNotes, sets });
      const t = loadTemplates();
      if(!t.includes(name)){ t.push(name); saveTemplates(t); populateTemplateSelect(); }
    }
  }
  if(exercises.length===0){ alert("Add at least one exercise with sets."); return; }

  if(editId){
    // Update existing
    const idx = parseInt(editId,10);
    if(isFinite(idx) && loadData().workouts[idx]){
      data.workouts[idx] = { ...data.workouts[idx], date, split, notes, exercises };
    }
  }else{
    data.workouts.push({ date, split, notes, exercises, createdAt: new Date().toISOString() });
  }

  saveData(data);
  workoutForm.reset();
  exList.innerHTML = "";
  document.getElementById('edit-id').value = "";
  saveBtn.textContent = "Save Workout";
  document.querySelector('.tab-btn[data-tab=\"history\"]').click();
  alert(editId ? "Workout updated." : "Workout saved to History.");
});

// HISTORY + filters + inline edit/delete
const historyList = document.getElementById('history-list');
const subtabBtns = document.querySelectorAll('.subtab-btn');
let currentFilter = 'all';

subtabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    subtabBtns.forEach(b=>{ b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
    btn.classList.add('active');
    btn.setAttribute('aria-selected','true');
    currentFilter = btn.dataset.filter;
    renderHistory();
  });
});

function renderHistory(){
  const box = historyList;
  const data = loadData();
  if(!box) return;
  if(data.workouts.length===0){
    box.innerHTML = "<p>No workouts yet. Log one in the 'Log Workout' tab.</p>";
    return;
  }
  // Keep original indices for edit/delete reference; sort copy
  const items = loadData().workouts.map((w, i)=> ({...w, _i:i}));
  items.sort((a,b)=> (a.date<b.date?-1:a.date>b.date?1: (a.createdAt<b.createdAt?-1:1)));
  const filtered = items.filter(w => currentFilter==='all' ? true : (w.split.toLowerCase().startsWith(currentFilter.toLowerCase())));

  const cats = loadCats();
  box.innerHTML = filtered.map(w => {
    const c = cats.find(c=> c.name===w.split);
    const color = c? c.color : '#6c8cff';
    const exHtml = w.exercises.map(ex=>{
      const sets = ex.sets.map((s,i)=>{
        const rpeTxt = (s.rpe || s.rpe===0) ? `, RPE ${s.rpe}` : '';
        return `${i+1}) ${s.weight}kg × ${s.reps}${rpeTxt}${s.failure?' (F)':''}`;
      }).join(' | ');
      return `<div class="ex"><strong>${ex.name}</strong><br/><small>${ex.notes||''}</small><div>${sets}</div></div>`;
    }).join('');
    return `<div class="workout">
      <h3>${w.date} — <span class="badge" style="background:linear-gradient(135deg, ${color}, #ffffff80)">${w.split}</span> ${w.notes?`<span class="badge">${w.notes}</span>`:''}</h3>
      <div class="workout-actions">
        <button class="btn-ghost" data-act="edit" data-i="${w._i}">Edit</button>
        <button class="btn-danger" data-act="del" data-i="${w._i}">Delete</button>
      </div>
      ${exHtml}
    </div>`;
  }).join('') || "<p>No workouts in this category yet.</p>";

  box.querySelectorAll('.workout-actions button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const act = btn.dataset.act; const i = parseInt(btn.dataset.i,10);
      if(act==='del'){
        if(confirm('Delete this workout?')){
          const d = loadData();
          d.workouts.splice(i,1);
          saveData(d);
          renderHistory();
        }
      }else if(act==='edit'){
        loadWorkoutIntoForm(i);
      }
    });
  });
}

function loadWorkoutIntoForm(index){
  const d = loadData();
  const w = d.workouts[index];
  if(!w) return;
  document.querySelector('.tab-btn[data-tab="log"]').click();
  document.getElementById('edit-id').value = String(index);
  document.getElementById('wdate').value = w.date;
  splitSelect.value = w.split;
  updateCatDot();
  document.getElementById('wnotes').value = w.notes||'';
  exList.innerHTML = "";
  w.exercises.forEach(ex => {
    const tmpl = document.getElementById('exercise-template').content.cloneNode(true);
    const exEl = tmpl.querySelector('.exercise');
    exEl.querySelector('.ex-name').value = ex.name;
    exEl.querySelector('.ex-notes').value = ex.notes||'';
    const setContainer = exEl.querySelector('.set-container');
    ex.sets.forEach((s, idx)=>{
      const setTmpl = document.getElementById('set-template').content.cloneNode(true);
      const row = setTmpl.querySelector('.set-row');
      row.querySelector('.set-weight').value = s.weight;
      row.querySelector('.set-reps').value = s.reps;
      row.querySelector('.set-rpe').value = (s.rpe || s.rpe===0) ? s.rpe : '';
      row.querySelector('.set-failure').checked = !!s.failure;
      setContainer.appendChild(row);
    });
    // Update indices
    [...setContainer.children].forEach((row, i) => row.querySelector('.set-idx').textContent = i+1);
    // Wire remove/add
    exEl.querySelector('.add-set').addEventListener('click', ()=>{
      const setTmpl = document.getElementById('set-template').content.cloneNode(true);
      const row = setTmpl.querySelector('.set-row');
      row.querySelector('.remove-set').addEventListener('click', ()=>{
        row.remove();
        [...setContainer.children].forEach((r,i)=> r.querySelector('.set-idx').textContent = i+1);
      });
      setContainer.appendChild(row);
      [...setContainer.children].forEach((r,i)=> r.querySelector('.set-idx').textContent = i+1);
    });
    exEl.querySelector('.remove-ex').addEventListener('click', ()=> exEl.remove());
    setContainer.querySelectorAll('.remove-set').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const row = btn.closest('.set-row');
        row.remove();
        [...setContainer.children].forEach((r,i)=> r.querySelector('.set-idx').textContent = i+1);
      });
    });
    exList.appendChild(exEl);
  });
  saveBtn.textContent = "Update Workout";
}

// PROGRESS
const progressExSel = document.getElementById('progress-ex');
const progressMetricSel = document.getElementById('progress-metric');
const refreshBtn = document.getElementById('refresh-progress');
const chartCanvas = document.getElementById('progress-chart');
const progressSummary = document.getElementById('progress-summary');
let chart;

function renderProgressOptions(){
  const data = loadData();
  const names = new Set();
  data.workouts.forEach(w=> w.exercises.forEach(ex=> names.add(ex.name)));
  const options = [...names].sort();
  progressExSel.innerHTML = options.map(n=>`<option value="${n}">${n}</option>`).join('');
  if(options.length>0 && !progressExSel.value) progressExSel.value = options[0];
  drawProgress();
}

refreshBtn?.addEventListener('click', drawProgress);
progressMetricSel?.addEventListener('change', drawProgress);
progressExSel?.addEventListener('change', drawProgress);

function weekKey(dateStr){
  const d = new Date(dateStr+'T00:00:00');
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (tmp.getUTCDay() + 6) % 7; // Monday=0
  tmp.setUTCDate(tmp.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(tmp.getUTCFullYear(),0,4));
  const week = 1 + Math.round(((tmp - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay()+6)%7)) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2,'0')}`;
}

function drawProgress(){
  const data = loadData();
  const exName = progressExSel.value;
  if(!exName){
    progressSummary.textContent = "No exercises yet.";
    return;
  }
  const metric = progressMetricSel.value;

  const byDate = {};
  data.workouts.forEach(w=>{
    w.exercises.filter(ex=> ex.name===exName).forEach(ex=>{
      ex.sets.forEach(s=>{
        if(!byDate[w.date]) byDate[w.date] = [];
        byDate[w.date].push(s);
      });
    });
  });

  let labels = [];
  let values = [];

  const dKeys = Object.keys(byDate).sort();
  if(dKeys.length===0){
    progressSummary.textContent = "No sets for this exercise yet.";
    if(chart) chart.destroy();
    return;
  }

  if(metric==='est1rm'){
    dKeys.forEach(d=>{
      const best = Math.max(...byDate[d].map(s=> est1RM(s.weight, s.reps)));
      labels.push(d);
      values.push(Number(best.toFixed(1)));
    });
    progressSummary.innerHTML = `<strong>${exName}</strong>: Best estimated 1RM so far is <span class="badge">${Math.max(...values).toFixed(1)} kg</span>.`;
  } else if(metric==='best_reps_weight'){
    dKeys.forEach(d=>{
      const best = Math.max(...byDate[d].map(s=> s.weight * s.reps));
      labels.push(d);
      values.push(best);
    });
    progressSummary.innerHTML = `<strong>${exName}</strong>: Best set (weight×reps) peak is <span class="badge">${Math.max(...values)} </span>.`;
  } else {
    const byWeek = {};
    dKeys.forEach(d=>{
      const wk = weekKey(d);
      const vol = byDate[d].reduce((acc,s)=> acc + (s.weight*s.reps), 0);
      byWeek[wk] = (byWeek[wk]||0) + vol;
    });
    labels = Object.keys(byWeek).sort();
    values = labels.map(k=> Math.round(byWeek[k]));
    progressSummary.innerHTML = `<strong>${exName}</strong>: Weekly volume (kg) — aim to increase slowly (2–5%) while keeping form clean.`;
  }

  if(chart) chart.destroy();
  chart = new Chart(chartCanvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: `${exName} — ${progressMetricSel.selectedOptions[0].text}`,
        data: values,
        tension: 0.25,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { autoSkip: true, maxRotation: 0 } },
        y: { beginAtZero: true }
      },
      plugins: { legend: { display: true } }
    }
  });
}

// Export/Import/Reset
document.getElementById('export-json')?.addEventListener('click', ()=>{
  const data = loadData();
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'training_data.json';
  a.click();
  URL.revokeObjectURL(url);
});
document.getElementById('import-json')?.addEventListener('click', ()=>{
  const file = document.getElementById('import-file').files[0];
  if(!file){ alert('Choose a JSON file first.'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    try{
      const obj = JSON.parse(e.target.result);
      if(!obj || !Array.isArray(obj.workouts)) throw new Error("Bad format");
      saveData(obj);
      alert('Imported. Go to History/Progress to view.');
      renderHistory(); renderProgressOptions();
    }catch(err){
      alert('Failed to import: ' + err.message);
    }
  };
  reader.readAsText(file);
});
document.getElementById('reset-data')?.addEventListener('click', ()=>{
  if(confirm("This will erase ALL workouts. Continue?")){
    saveData({workouts:[]});
    alert("All data cleared.");
    renderHistory(); renderProgressOptions();
  }
});

// Preload initial data if empty
function preloadInitialData(){
  const data = loadData();
  if(data.workouts && data.workouts.length>0) return;

  const day = "2025-08-09";
  const pull = { date: day, split: "Pull", notes: "", exercises: [
      { name: "Back Extension", notes:"", sets: [{weight:0,reps:15,rpe:null,failure:false},{weight:0,reps:15,rpe:null,failure:false},{weight:0,reps:15,rpe:null,failure:false}]},
      { name: "Iso Lateral Low Rows", notes:"to failure", sets:[{weight:50,reps:6,rpe:9.5,failure:true},{weight:50,reps:6,rpe:9.5,failure:true},{weight:50,reps:6,rpe:9.5,failure:true}]},
      { name: "Lat Pulldown", notes:"to failure", sets:[{weight:80,reps:4,rpe:10,failure:true},{weight:80,reps:4,rpe:10,failure:true}]},
      { name: "Close Grip Lat Pulldown", notes:"", sets:[{weight:70,reps:6,rpe:8.5,failure:false},{weight:70,reps:6,rpe:8.5,failure:false}]},
      { name: "Machine Shrugs", notes:"Plated", sets:[{weight:80,reps:10,rpe:8,failure:false},{weight:80,reps:10,rpe:8,failure:false},{weight:80,reps:10,rpe:8,failure:false}]},
      { name: "Machine Rows (Underhand Grip)", notes:"", sets:[{weight:54,reps:8,rpe:8,failure:false},{weight:54,reps:8,rpe:8,failure:false}]},
      { name: "Iso Lateral Rows (Neutral Grip)", notes:"to failure", sets:[{weight:60,reps:6,rpe:9.5,failure:true},{weight:60,reps:6,rpe:9.5,failure:true}]},
      { name: "Reverse Flys", notes:"", sets:[{weight:61,reps:4,rpe:9,failure:false}]},
      { name: "Overhead Tricep Extension (Cable)", notes:"to failure", sets:[{weight:23.76,reps:8,rpe:9.5,failure:true},{weight:23.76,reps:8,rpe:9.5,failure:true},{weight:23.76,reps:8,rpe:9.5,failure:true}]},
      { name: "One Arm Cable Tricep Pushdown", notes:"to failure", sets:[{weight:11.25,reps:3,rpe:10,failure:true},{weight:11.25,reps:3,rpe:10,failure:true},{weight:11.25,reps:3,rpe:10,failure:true}]},
      { name: "Tricep Pushdown", notes:"", sets:[{weight:28.75,reps:6,rpe:8.5,failure:false},{weight:28.75,reps:6,rpe:8.5,failure:false}]}
    ], createdAt: new Date().toISOString() };

  const legs = { date: day, split: "Legs", notes: "", exercises: [
      { name: "Warm-up (Cardio)", notes:"", sets:[{weight:0,reps:10,rpe:3,failure:false}]},
      { name: "Leg Press", notes:"paired with Hack Squats", sets:[{weight:150,reps:4,rpe:9,failure:false},{weight:120,reps:6,rpe:8.5,failure:false}]},
      { name: "Hack Squats", notes:"", sets:[{weight:50,reps:4,rpe:9,failure:false}]},
      { name: "V Squats", notes:"alternative", sets:[{weight:80,reps:4,rpe:8.5,failure:false}]},
      { name: "Hip Thrust (Machine)", notes:"", sets:[{weight:100,reps:8,rpe:8,failure:false},{weight:100,reps:8,rpe:8,failure:false},{weight:100,reps:8,rpe:8,failure:false}]},
      { name: "Seated Leg Curls", notes:"", sets:[{weight:68,reps:4,rpe:9,failure:false},{weight:68,reps:3,rpe:9,failure:false}]},
      { name: "Back Extension", notes:"", sets:[{weight:0,reps:15,rpe:5,failure:false},{weight:0,reps:15,rpe:5,failure:false}]},
      { name: "Dumbbell RDL", notes:"superset", sets:[{weight:15,reps:10,rpe:7,failure:false},{weight:15,reps:10,rpe:7,failure:false}]},
      { name: "Hip Abduction", notes:"", sets:[{weight:60,reps:6,rpe:8,failure:false}]},
      { name: "Hip Adduction", notes:"", sets:[{weight:37.5,reps:6,rpe:7.5,failure:false},{weight:37.5,reps:6,rpe:7.5,failure:false}]},
      { name: "Standing Calf Raises", notes:"failure", sets:[{weight:65,reps:0,rpe:null,failure:true},{weight:65,reps:0,rpe:null,failure:true},{weight:65,reps:0,rpe:null,failure:true},{weight:65,reps:0,rpe:null,failure:true},{weight:65,reps:0,rpe:null,failure:true},{weight:65,reps:0,rpe:null,failure:true},{weight:65,reps:0,rpe:null,failure:true},{weight:85,reps:12,rpe:8,failure:false}]}
    ], createdAt: new Date().toISOString() };

  const push = { date: day, split: "Push", notes: "", exercises: [
      { name: "Iso Lateral Shoulder Press", notes:"", sets:[{weight:25,reps:6,rpe:8.5,failure:false}]},
      { name: "Dumbbell Shoulder Press", notes:"", sets:[{weight:17.5,reps:6,rpe:8.5,failure:false}]},
      { name: "Plate Raises", notes:"", sets:[{weight:15,reps:8,rpe:8,failure:false},{weight:15,reps:8,rpe:8,failure:false}]},
      { name: "Lateral Raises", notes:"", sets:[{weight:10,reps:8,rpe:7.5,failure:false},{weight:10,reps:8,rpe:7.5,failure:false}]},
      { name: "Cable Lateral Raises", notes:"", sets:[{weight:7.5,reps:6,rpe:8,failure:false}]},
      { name: "Face Pulls", notes:"", sets:[{weight:40,reps:6,rpe:8,failure:false}]},
      { name: "Iso Incline Chest Press", notes:"", sets:[{weight:30,reps:4,rpe:9,failure:false}]},
      { name: "Dumbbell Chest Incline Fly", notes:"superset", sets:[{weight:8,reps:8,rpe:7.5,failure:false}]},
      { name: "Chest Fly", notes:"", sets:[{weight:47,reps:6,rpe:8.5,failure:false}]},
      { name: "Chest Press", notes:"", sets:[{weight:55,reps:8,rpe:8.5,failure:false}]},
      { name: "Tricep Pushdown", notes:"", sets:[{weight:28.75,reps:6,rpe:8.5,failure:false}]},
      { name: "Tricep Reverse Pushdown", notes:"", sets:[{weight:15,reps:8,rpe:8,failure:false}]},
      { name: "Rope Overhead Push", notes:"", sets:[{weight:15,reps:8,rpe:8,failure:false}]},
      { name: "One Arm Cable Tricep Extension", notes:"", sets:[{weight:7.5,reps:8,rpe:7.5,failure:false}]}
    ], createdAt: new Date().toISOString() };

  const obj = loadData();
  obj.workouts.push(pull, legs, push);
  saveData(obj);
}
preloadInitialData();

// Prefill today's date for quick logging
const dateInput = document.getElementById('wdate');
if(dateInput) dateInput.valueAsDate = new Date();

// Initial renders
renderCats();
renderHistory();
renderProgressOptions();
