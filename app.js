// Simple Training Log — LocalStorage powered
const KEY = 'nish_training_log_v1';
const EX_TEMPLATES_KEY = 'nish_training_ex_templates_v1';

// Epley Estimated 1RM: 1RM = w * (1 + reps/30)
function est1RM(weight, reps){
  if(!weight || !reps) return 0;
  return weight * (1 + reps/30);
}

// Load & Save helpers
function loadData(){
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : { workouts: [] };
}
function saveData(data){
  localStorage.setItem(KEY, JSON.stringify(data));
}

function loadTemplates(){
  const raw = localStorage.getItem(EX_TEMPLATES_KEY);
  return raw ? JSON.parse(raw) : defaultTemplates();
}
function saveTemplates(list){
  localStorage.setItem(EX_TEMPLATES_KEY, JSON.stringify(list));
}

// Default exercises based on Nish's current log
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

// UI State
const tabs = document.querySelectorAll('.tab-btn');
const panes = document.querySelectorAll('.tab-pane');
tabs.forEach(btn=>{
  btn.addEventListener('click', () => {
    tabs.forEach(b=>b.classList.remove('active'));
    panes.forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
    if(btn.dataset.tab === 'history') renderHistory();
    if(btn.dataset.tab === 'progress') renderProgressOptions();
  });
});

// Form setup
const workoutForm = document.getElementById('workout-form');
const exList = document.getElementById('exercise-list');
const addExBtn = document.getElementById('add-exercise');
const templateSelect = document.getElementById('template-ex');

function populateTemplateSelect(){
  const templates = loadTemplates();
  templateSelect.innerHTML = '<option value="">— choose —</option>' + 
    templates.map(n => `<option value="${n}">${n}</option>`).join('');
}
populateTemplateSelect();

addExBtn.addEventListener('click', () => addExerciseRow());
templateSelect.addEventListener('change', (e) => {
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

  function addSetRow(weight="", reps="", failure=false){
    const setTmpl = document.getElementById('set-template').content.cloneNode(true);
    const setRow = setTmpl.querySelector('.set-row');
    const idxSpan = setRow.querySelector('.set-idx');
    const wInput = setRow.querySelector('.set-weight');
    const rInput = setRow.querySelector('.set-reps');
    const fInput = setRow.querySelector('.set-failure');
    wInput.value = weight;
    rInput.value = reps;
    fInput.checked = failure;

    function updateIndices(){
      [...setContainer.children].forEach((row, i) => {
        row.querySelector('.set-idx').textContent = i+1;
      });
    }

    setRow.querySelector('.remove-set').addEventListener('click', ()=>{
      setRow.remove();
      updateIndices();
    });

    setContainer.appendChild(setRow);
    updateIndices();
  }

  ex.querySelector('.add-set').addEventListener('click', ()=> addSetRow());
  ex.querySelector('.remove-ex').addEventListener('click', ()=> ex.remove());

  // Add one set row by default
  addSetRow();
  exList.appendChild(ex);
}

document.getElementById('clear-form').addEventListener('click', ()=>{
  workoutForm.reset();
  exList.innerHTML = "";
});

workoutForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const data = loadData();
  const date = document.getElementById('wdate').value;
  const split = document.getElementById('wsplit').value.trim();
  const notes = document.getElementById('wnotes').value.trim();

  if(!date || !split){
    alert("Date and Day/Split are required.");
    return;
  }

  const exercises = [];
  for(const ex of exList.querySelectorAll('.exercise')){
    const name = ex.querySelector('.ex-name').value.trim();
    const exNotes = ex.querySelector('.ex-notes').value.trim();
    const sets = [];
    for(const row of ex.querySelectorAll('.set-row:not(.header)')){
      const w = parseFloat(row.querySelector('.set-weight').value);
      const r = parseInt(row.querySelector('.set-reps').value,10);
      const f = row.querySelector('.set-failure').checked;
      if(!isFinite(w) || !isFinite(r)) continue;
      sets.push({ weight:w, reps:r, failure:f });
    }
    if(name && sets.length>0){
      exercises.push({ name, notes: exNotes, sets });
      // Save template
      const t = loadTemplates();
      if(!t.includes(name)){
        t.push(name);
        saveTemplates(t);
        populateTemplateSelect();
      }
    }
  }

  if(exercises.length===0){
    alert("Add at least one exercise with sets.");
    return;
  }

  data.workouts.push({ date, split, notes, exercises, createdAt: new Date().toISOString() });
  saveData(data);
  workoutForm.reset();
  exList.innerHTML = "";
  alert("Workout saved.");
});

// HISTORY
function renderHistory(){
  const box = document.getElementById('history-list');
  const data = loadData();
  if(data.workouts.length===0){
    box.innerHTML = "<p>No workouts yet. Log one in the 'Log Workout' tab.</p>";
    return;
  }
  // Sort by date then createdAt
  const sorted = [...data.workouts].sort((a,b)=> (a.date<b.date?-1:a.date>b.date?1: (a.createdAt<b.createdAt?-1:1)));
  box.innerHTML = sorted.map(w => {
    const exHtml = w.exercises.map(ex=>{
      const sets = ex.sets.map((s,i)=>`${i+1}) ${s.weight}kg × ${s.reps}${s.failure?' (F)':''}`).join(' | ');
      return `<div class="ex"><strong>${ex.name}</strong><br/><small>${ex.notes||''}</small><div>${sets}</div></div>`;
    }).join('');
    return `<div class="workout">
      <h3>${w.date} — ${w.split} ${w.notes?`<span class="badge">${w.notes}</span>`:''}</h3>
      ${exHtml}
    </div>`;
  }).join('');
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

refreshBtn.addEventListener('click', drawProgress);
progressMetricSel.addEventListener('change', drawProgress);
progressExSel.addEventListener('change', drawProgress);

function weekKey(dateStr){
  const d = new Date(dateStr+'T00:00:00');
  // ISO week key: YYYY-Www (simple approach: year + week by Monday)
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

  // Gather sets by date
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

  if(metric==='est1rm'){
    // Best estimated 1RM per day
    Object.keys(byDate).sort().forEach(d=>{
      const best = Math.max(...byDate[d].map(s=> est1RM(s.weight, s.reps)));
      labels.push(d);
      values.push(Number(best.toFixed(1)));
    });
    progressSummary.innerHTML = `<strong>${exName}</strong>: Best estimated 1RM so far is <span class="badge pr">${Math.max(...values).toFixed(1)} kg</span>.`;
  } else if(metric==='best_reps_weight'){
    // Best weight*reps per day
    Object.keys(byDate).sort().forEach(d=>{
      const best = Math.max(...byDate[d].map(s=> s.weight * s.reps));
      labels.push(d);
      values.push(best);
    });
    progressSummary.innerHTML = `<strong>${exName}</strong>: Best set (weight×reps) peak is <span class="badge pr">${Math.max(...values)} </span>.`;
  } else {
    // Weekly volume
    const byWeek = {};
    Object.keys(byDate).forEach(d=>{
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
      plugins: {
        legend: { display: true }
      }
    }
  });
}

// SETTINGS
document.getElementById('export-json').addEventListener('click', ()=>{
  const data = loadData();
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'training_data.json';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('import-json').addEventListener('click', ()=>{
  const file = document.getElementById('import-file').files[0];
  if(!file){ alert('Choose a JSON file first.'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    try{
      const obj = JSON.parse(e.target.result);
      if(!obj || !Array.isArray(obj.workouts)) throw new Error("Bad format");
      saveData(obj);
      alert('Imported. Go to History/Progress to view.');
      renderProgressOptions();
    }catch(err){
      alert('Failed to import: ' + err.message);
    }
  };
  reader.readAsText(file);
});

document.getElementById('reset-data').addEventListener('click', ()=>{
  if(confirm("This will erase ALL workouts. Continue?")){
    saveData({workouts:[]});
    alert("All data cleared.");
    renderHistory();
    renderProgressOptions();
  }
});

// ---- PRELOAD Nish's current sessions if not already present ----
function preloadInitialData(){
  const data = loadData();
  if(data.workouts && data.workouts.length>0) return; // don't overwrite

  const d = (s)=> s; // dates in YYYY-MM-DD
  const day = "2025-08-09";

  const pull = {
    date: day, split: "Pull (Back & Triceps)", notes: "",
    exercises: [
      { name: "Back Extension", notes:"", sets: [{weight:0,reps:15,failure:false},{weight:0,reps:15,failure:false},{weight:0,reps:15,failure:false}]},
      { name: "Iso Lateral Low Rows", notes:"to failure", sets:[{weight:50,reps:6,failure:true},{weight:50,reps:6,failure:true},{weight:50,reps:6,failure:true}]},
      { name: "Lat Pulldown", notes:"to failure", sets:[{weight:80,reps:4,failure:true},{weight:80,reps:4,failure:true}]},
      { name: "Close Grip Lat Pulldown", notes:"", sets:[{weight:70,reps:6,failure:false},{weight:70,reps:6,failure:false}]},
      { name: "Machine Shrugs", notes:"Plated", sets:[{weight:80,reps:10,failure:false},{weight:80,reps:10,failure:false},{weight:80,reps:10,failure:false}]},
      { name: "Machine Rows (Underhand Grip)", notes:"", sets:[{weight:54,reps:8,failure:false},{weight:54,reps:8,failure:false}]},
      { name: "Iso Lateral Rows (Neutral Grip)", notes:"to failure", sets:[{weight:60,reps:6,failure:true},{weight:60,reps:6,failure:true}]},
      { name: "Reverse Flys", notes:"", sets:[{weight:61,reps:4,failure:false}]},
      { name: "Overhead Tricep Extension (Cable)", notes:"to failure", sets:[{weight:23.76,reps:8,failure:true},{weight:23.76,reps:8,failure:true},{weight:23.76,reps:8,failure:true}]},
      { name: "One Arm Cable Tricep Pushdown", notes:"to failure", sets:[{weight:11.25,reps:3,failure:true},{weight:11.25,reps:3,failure:true},{weight:11.25,reps:3,failure:true}]},
      { name: "Tricep Pushdown", notes:"", sets:[{weight:28.75,reps:6,failure:false},{weight:28.75,reps:6,failure:false}]}
    ],
    createdAt: new Date().toISOString()
  };

  const legs = {
    date: day, split: "Legs", notes: "",
    exercises: [
      { name: "Warm-up (Cardio)", notes:"", sets:[{weight:0,reps:10,failure:false}]}, // 10 minutes as reps proxy
      { name: "Leg Press", notes:"paired with Hack Squats", sets:[{weight:150,reps:4,failure:false},{weight:120,reps:6,failure:false}]},
      { name: "Hack Squats", notes:"", sets:[{weight:50,reps:4,failure:false}]},
      { name: "V Squats", notes:"alternative", sets:[{weight:80,reps:4,failure:false}]},
      { name: "Hip Thrust (Machine)", notes:"", sets:[{weight:100,reps:8,failure:false},{weight:100,reps:8,failure:false},{weight:100,reps:8,failure:false}]},
      { name: "Seated Leg Curls", notes:"", sets:[{weight:68,reps:4,failure:false},{weight:68,reps:3,failure:false}]},
      { name: "Back Extension", notes:"", sets:[{weight:0,reps:15,failure:false},{weight:0,reps:15,failure:false}]},
      { name: "Dumbbell RDL", notes:"superset", sets:[{weight:15,reps:10,failure:false},{weight:15,reps:10,failure:false}]},
      { name: "Hip Abduction", notes:"", sets:[{weight:60,reps:6,failure:false}]},
      { name: "Hip Adduction", notes:"", sets:[{weight:37.5,reps:6,failure:false},{weight:37.5,reps:6,failure:false}]},
      { name: "Standing Calf Raises", notes:"failure", sets:[{weight:65,reps:0,failure:true},{weight:65,reps:0,failure:true},{weight:65,reps:0,failure:true},{weight:65,reps:0,failure:true},{weight:65,reps:0,failure:true},{weight:65,reps:0,failure:true},{weight:65,reps:0,failure:true},{weight:85,reps:12,failure:false}]}
    ],
    createdAt: new Date().toISOString()
  };

  const push = {
    date: day, split: "Push", notes: "",
    exercises: [
      { name: "Iso Lateral Shoulder Press", notes:"", sets:[{weight:25,reps:6,failure:false}]},
      { name: "Dumbbell Shoulder Press", notes:"", sets:[{weight:17.5,reps:6,failure:false}]},
      { name: "Plate Raises", notes:"", sets:[{weight:15,reps:8,failure:false},{weight:15,reps:8,failure:false}]},
      { name: "Lateral Raises", notes:"", sets:[{weight:10,reps:8,failure:false},{weight:10,reps:8,failure:false}]},
      { name: "Cable Lateral Raises", notes:"", sets:[{weight:7.5,reps:6,failure:false}]},
      { name: "Face Pulls", notes:"", sets:[{weight:40,reps:6,failure:false}]},
      { name: "Iso Incline Chest Press", notes:"", sets:[{weight:30,reps:4,failure:false}]},
      { name: "Dumbbell Chest Incline Fly", notes:"superset", sets:[{weight:8,reps:8,failure:false}]},
      { name: "Chest Fly", notes:"", sets:[{weight:47,reps:6,failure:false}]},
      { name: "Chest Press", notes:"", sets:[{weight:55,reps:8,failure:false}]},
      { name: "Tricep Pushdown", notes:"", sets:[{weight:28.75,reps:6,failure:false}]},
      { name: "Tricep Reverse Pushdown", notes:"", sets:[{weight:15,reps:8,failure:false}]},
      { name: "Rope Overhead Push", notes:"", sets:[{weight:15,reps:8,failure:false}]},
      { name: "One Arm Cable Tricep Extension", notes:"", sets:[{weight:7.5,reps:8,failure:false}]}
    ],
    createdAt: new Date().toISOString()
  };

  data.workouts.push(pull, legs, push);
  saveData(data);
}
preloadInitialData();

// Prefill today's date
document.getElementById('wdate').valueAsDate = new Date();
