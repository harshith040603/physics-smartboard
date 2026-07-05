/* ───────── SORT GAME (pointer-based drag) ───────── */
const SORT_DATA={
  FD:{score:'fdScore',bank:'fdBank',win:'fdWin',zones:{F:'fdZoneF',D:'fdZoneD'},
      items:[
        {t:'Length',c:'F'},{t:'Mass',c:'F'},{t:'Time',c:'F'},{t:'Temperature',c:'F'},
        {t:'Electric Current',c:'F'},
        {t:'Force',c:'D'},{t:'Speed',c:'D'},{t:'Energy',c:'D'},{t:'Pressure',c:'D'},
        {t:'Density',c:'D'},{t:'Power',c:'D'}
      ]},
  SV:{score:'svScore',bank:'svBank',win:'svWin',zones:{S:'svZoneS',V:'svZoneV'},
      items:[
        {t:'Speed',c:'S'},{t:'Mass',c:'S'},{t:'Energy',c:'S'},{t:'Temperature',c:'S'},
        {t:'Distance',c:'S'},{t:'Pressure',c:'S'},
        {t:'Velocity',c:'V'},{t:'Force',c:'V'},{t:'Displacement',c:'V'},
        {t:'Acceleration',c:'V'},{t:'Momentum',c:'V'}
      ]}
};
let dragEl=null,offsetX=0,offsetY=0,placedCount=0,totalCount=0,activeSort='FD';
let startX=0,startY=0,didMove=false,selectedCard=null;
const DRAG_THRESHOLD=8; // px before it counts as a drag (else it's a tap)

function initSort(which){
  activeSort=which;
  selectedCard=null;
  const cfg=SORT_DATA[which];
  Object.values(cfg.zones).forEach(z=>document.getElementById(z).innerHTML='');
  const bank=document.getElementById(cfg.bank); bank.innerHTML='';
  document.getElementById(cfg.win).style.display='none';
  placedCount=0; totalCount=cfg.items.length;
  document.getElementById(cfg.score).textContent='0';
  const shuffled=[...cfg.items].sort(()=>Math.random()-0.5);
  shuffled.forEach((it,idx)=>{
    const c=document.createElement('div');
    c.className='card'; c.textContent=it.t; c.dataset.cat=it.c; c.dataset.placed='0';
    c.draggable=true;
    c.dataset.cardId=`${which}-${idx}-${Date.now()}`;
    c.addEventListener('pointerdown',startDrag);
    c.addEventListener('dragstart',startNativeDrag);
    c.addEventListener('dragend',endNativeDrag);
    bank.appendChild(c);
  });
  // make zones tappable for the tap-to-place method
  attachZoneTaps();
  attachDropZones();
}

function attachZoneTaps(){
  document.querySelectorAll('#sortFD .zone, #sortSV .zone').forEach(z=>{
    z.onclick=function(){ if(selectedCard) placeCard(selectedCard,this); };
  });
}

function attachDropZones(){
  document.querySelectorAll('#sortFD .zone, #sortSV .zone').forEach(z=>{
    z.ondragover=function(e){ e.preventDefault(); this.classList.add('over'); };
    z.ondragleave=function(){ this.classList.remove('over'); };
    z.ondrop=function(e){
      e.preventDefault();
      this.classList.remove('over');
      if(nativeDragCard) placeCard(nativeDragCard,this);
    };
  });
}

function selectCard(card){
  if(selectedCard) selectedCard.classList.remove('selected');
  selectedCard=card;
  card.classList.add('selected');
}

function placeCard(card,zone){
  const correct = zone.dataset.cat===card.dataset.cat;
  if(correct){
    card.classList.remove('selected');
    card.classList.add('placed','correct'); card.dataset.placed='1';
    zone.querySelector('.zone-items').appendChild(card);
    selectedCard=null;
    placedCount++;
    const cfg=SORT_DATA[activeSort];
    document.getElementById(cfg.score).textContent=placedCount;
    if(placedCount===totalCount) document.getElementById(cfg.win).style.display='block';
  } else {
    card.classList.add('wrong');
    setTimeout(()=>card.classList.remove('wrong'),450);
  }
}

let nativeDragCard=null;

function startNativeDrag(e){
  if(this.dataset.placed==='1') return;
  nativeDragCard=this;
  try{
    e.dataTransfer.effectAllowed='move';
    e.dataTransfer.setData('text/plain', this.dataset.cardId || this.textContent);
  }catch(_){}
}

function endNativeDrag(){
  document.querySelectorAll('.zone').forEach(z=>z.classList.remove('over'));
  nativeDragCard=null;
}

function startDrag(e){
  if(this.dataset.placed==='1') return;
  e.preventDefault();
  // keep taps working: only start a custom drag after the finger/mouse actually moves
  dragEl=this;
  didMove=false;
  startX=e.clientX; startY=e.clientY;
  const r=this.getBoundingClientRect();
  offsetX=e.clientX-r.left; offsetY=e.clientY-r.top;
  this._w=r.width; this._h=r.height;

  const onMove=moveDrag;
  const onUp=endDrag;
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp, {once:true});
  document.addEventListener('pointercancel', onUp, {once:true});
  dragEl._cleanup=()=>{
    document.removeEventListener('pointermove', onMove);
  };
}

function beginVisualDrag(){
  if(!dragEl) return;
  dragEl.classList.add('dragging');
  dragEl.style.position='fixed';
  dragEl.style.width=dragEl._w+'px';
  dragEl.style.pointerEvents='none';
  dragEl.style.zIndex='9999';
  document.body.appendChild(dragEl); // move out of the bank so it isn't clipped
}

function getZoneAtPoint(x,y){
  const els=document.elementsFromPoint(x,y);
  return els.find(el=>el && el.closest && el.closest('.zone') && !el.classList.contains('card'))?.closest('.zone') || null;
}

function moveDrag(e){
  if(!dragEl) return;
  const dx=e.clientX-startX, dy=e.clientY-startY;
  if(!didMove && (Math.abs(dx)>DRAG_THRESHOLD || Math.abs(dy)>DRAG_THRESHOLD)){
    didMove=true;
    beginVisualDrag();
  }
  if(!didMove) return;
  dragEl.style.left=(e.clientX-offsetX)+'px';
  dragEl.style.top=(e.clientY-offsetY)+'px';
  document.querySelectorAll('.zone').forEach(z=>z.classList.remove('over'));
  const zone=getZoneAtPoint(e.clientX,e.clientY);
  if(zone) zone.classList.add('over');
}

function endDrag(e){
  if(!dragEl) return;
  const card=dragEl;
  if(card._cleanup) card._cleanup();
  document.querySelectorAll('.zone').forEach(z=>z.classList.remove('over'));

  if(!didMove){
    // treat as a tap → select the card (then tap a zone to place)
    dragEl=null;
    selectCard(card);
    return;
  }

  const zone=getZoneAtPoint(e.clientX,e.clientY);

  // reset the lifted styles & return to bank flow
  card.classList.remove('dragging');
  card.style.position=''; card.style.left=''; card.style.top='';
  card.style.width=''; card.style.pointerEvents=''; card.style.zIndex='';

  const cfg=SORT_DATA[activeSort];
  document.getElementById(cfg.bank).appendChild(card);
  if(zone) placeCard(card,zone);

  dragEl=null;
}

/* ───────── DIMENSION BUILDER ───────── */
const BUILD_Q=[
  {name:'Speed',def:'distance ÷ time',M:0,L:1,T:-1},
  {name:'Acceleration',def:'velocity ÷ time',M:0,L:1,T:-2},
  {name:'Force',def:'mass × acceleration',M:1,L:1,T:-2},
  {name:'Work / Energy',def:'force × distance',M:1,L:2,T:-2},
  {name:'Power',def:'work ÷ time',M:1,L:2,T:-3},
  {name:'Pressure',def:'force ÷ area',M:1,L:-1,T:-2},
  {name:'Momentum',def:'mass × velocity',M:1,L:1,T:-1},
  {name:'Density',def:'mass ÷ volume',M:1,L:-3,T:0},
  {name:'Impulse',def:'force × time',M:1,L:1,T:-1},
  {name:'Torque',def:'force × distance',M:1,L:2,T:-2},
  {name:'Surface Tension',def:'force ÷ length',M:1,L:0,T:-2},
  {name:'Gravitational Constant G',def:'F·r² ÷ (m₁·m₂)',M:-1,L:3,T:-2},
  {name:"Planck's Constant h",def:'energy ÷ frequency',M:1,L:2,T:-1},
  {name:'Coefficient of Viscosity η',def:'force ÷ (area × velocity gradient)',M:1,L:-1,T:-1},
];
let qi=0, cur={M:0,L:0,T:0}, bSolved=0;
const SUP={'-3':'⁻³','-2':'⁻²','-1':'⁻¹','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','-4':'⁻⁴'};
function sup(n){return SUP[String(n)]!==undefined?SUP[String(n)]:('^'+n);}
function loadQ(){
  const q=BUILD_Q[qi];
  document.getElementById('bName').textContent=q.name;
  document.getElementById('bDef').innerHTML='Defining relation: <code>'+q.def+'</code>';
  cur={M:0,L:0,T:0};
  document.getElementById('bVerdict').className='verdict';
  renderFormula();
}
function bump(d,by){ cur[d]=Math.max(-4,Math.min(4,cur[d]+by)); renderFormula(); }
function renderFormula(){
  document.getElementById('bM').textContent=cur.M;
  document.getElementById('bL').textContent=cur.L;
  document.getElementById('bT').textContent=cur.T;
  document.getElementById('bFormula').innerHTML=
    '[ M<span class="dim">'+sup(cur.M)+'</span> L<span class="dim">'+sup(cur.L)+'</span> T<span class="dim">'+sup(cur.T)+'</span> ]';
}
function checkBuild(){
  const q=BUILD_Q[qi]; const v=document.getElementById('bVerdict');
  if(cur.M===q.M&&cur.L===q.L&&cur.T===q.T){
    v.className='verdict ok'; v.textContent='✓ Correct! That\'s '+q.name+'.';
    if(!q._done){q._done=true;bSolved++;document.getElementById('bScore').textContent=bSolved;}
  } else {
    v.className='verdict no'; v.textContent='Not quite — adjust the powers and try again.';
  }
}
function nextQ(){ qi=(qi+1)%BUILD_Q.length; loadQ(); }
function prevQ(){ qi=(qi-1+BUILD_Q.length)%BUILD_Q.length; loadQ(); }

/* ───────── cm² REVEAL ───────── */
let revealDone=false;
function resetReveal(){
  revealDone=false;
  const sq=document.getElementById('bigSquare');
  sq.querySelectorAll('.cm-cell').forEach(c=>c.remove());
  document.querySelectorAll('.guess-btn').forEach(b=>{b.className='guess-btn';});
  document.getElementById('counterBox').classList.remove('show');
  document.getElementById('cNum').textContent='0';
}
function guess(btn,val){
  if(revealDone) return;
  document.querySelectorAll('.guess-btn').forEach(b=>b.classList.remove('picked'));
  btn.classList.add('picked');
  document.querySelectorAll('.guess-btn').forEach(b=>{
    const v=+b.dataset.val;
    if(v===10000) b.classList.add('right');
    else if(v===val) b.classList.add('wrongpick');
  });
  revealDone=true;
  runReveal();
}
function runReveal(){
  const sq=document.getElementById('bigSquare');
  const size=sq.clientWidth; const n=10; // show a 10x10 demonstrative grid that represents 100x100
  // We animate a 10x10 visible grid but count up to 10,000 to make the point tangible.
  const cell=size/n;
  let idx=0;
  const cells=[];
  for(let r=0;r<n;r++){for(let c=0;c<n;c++){
    const d=document.createElement('div');
    d.className='cm-cell';
    d.style.width=cell+'px'; d.style.height=cell+'px';
    d.style.left=(c*cell)+'px'; d.style.top=(r*cell)+'px';
    d.style.border='1px solid rgba(255,255,255,.5)';
    sq.appendChild(d); cells.push(d);
  }}
  const box=document.getElementById('counterBox'); box.classList.add('show');
  const cNum=document.getElementById('cNum');
  const fill=setInterval(()=>{
    if(idx>=cells.length){clearInterval(fill); animateCounter();return;}
    cells[idx].style.opacity=String(0.35+0.4*Math.random());
    idx++;
  },18);
  function animateCounter(){
    let val=0; const target=10000; const stepN=Math.ceil(target/60);
    const ci=setInterval(()=>{
      val+=stepN; if(val>=target){val=target;clearInterval(ci);}
      cNum.textContent=val.toLocaleString();
    },16);
  }
}

/* ───────── ERROR EXPLORER ───────── */
function updateError(){
  const val=+document.getElementById('valSlider').value;
  const err=(+document.getElementById('errSlider').value)/10;
  document.getElementById('valOut').textContent=val;
  document.getElementById('errOut').textContent=err.toFixed(1);
  const rel=err/val; const pct=rel*100;
  document.getElementById('roVal').textContent=val+' ± '+err.toFixed(1);
  document.getElementById('roRel').textContent=rel.toFixed(3);
  document.getElementById('roPct').textContent=pct.toFixed(1)+'%';
  // visualize on axis: map value range 2..200 to 8%..92% of width as center, bar width scales with err relative to value
  const stage=document.querySelector('.err-viz'); const w=stage.clientWidth;
  const centerPct=8+ (val/200)*72;
  const halfW=Math.min(centerPct, (100-centerPct), (pct/100)*60+ (err/val)*120); // visual half-width
  const bar=document.getElementById('errBar'); const ctr=document.getElementById('errCenter');
  bar.style.left=(centerPct-halfW)+'%'; bar.style.width=(2*halfW)+'%';
  ctr.style.left=centerPct+'%';
  const msg=document.getElementById('errMsg');
  let verdict;
  if(pct>=15) verdict='That\'s a <b>large</b> relative error — the uncertainty is a big slice of the measurement.';
  else if(pct>=5) verdict='A <b>moderate</b> relative error — noticeable but workable.';
  else verdict='A <b>small</b> relative error — the measurement is quite precise.';
  msg.innerHTML='An absolute error of <b>±'+err.toFixed(1)+' cm</b> on a <b>'+val+' cm</b> measurement is <b>'+pct.toFixed(1)+'%</b>. '+verdict+' Try keeping the error fixed and growing the measurement — watch the percentage shrink.';
}
document.getElementById('valSlider').addEventListener('input',updateError);
document.getElementById('errSlider').addEventListener('input',updateError);

/* ───────── MASTER DIMENSION SHEET ───────── */
const DIM_SHEET=[
  {cat:'Fundamental Quantities',color:'#295990',items:[
    ['Mass','[M]'],['Length','[L]'],['Time','[T]'],
    ['Electric Current','[A]'],['Temperature','[K]'],
    ['Amount of Substance','[mol]'],['Luminous Intensity','[cd]'],
  ]},
  {cat:'Kinematics',color:'#00A0E3',items:[
    ['Area','[L²]'],['Volume','[L³]'],['Density','[M L⁻³]'],
    ['Velocity / Speed','[L T⁻¹]'],['Acceleration','[L T⁻²]'],
    ['Momentum','[M L T⁻¹]'],
  ]},
  {cat:'Dynamics',color:'#1b3e66',items:[
    ['Force','[M L T⁻²]'],['Impulse','[M L T⁻¹]'],
    ['Work / Energy','[M L² T⁻²]'],['Power','[M L² T⁻³]'],
    ['Pressure / Stress','[M L⁻¹ T⁻²]'],['Torque','[M L² T⁻²]'],
  ]},
  {cat:'Rotational & Periodic',color:'#0e7490',items:[
    ['Frequency','[T⁻¹]'],['Angular Velocity','[T⁻¹]'],
    ['Angular Momentum','[M L² T⁻¹]'],['Moment of Inertia','[M L²]'],
  ]},
  {cat:'Properties of Matter',color:'#7c3aed',items:[
    ['Surface Tension','[M T⁻²]'],['Viscosity (η)','[M L⁻¹ T⁻¹]'],
    ['Elastic Modulus','[M L⁻¹ T⁻²]'],['Strain','dimensionless'],
  ]},
  {cat:'Physical Constants',color:'#b45309',items:[
    ['Gravitational Const. G','[M⁻¹ L³ T⁻²]'],
    ["Planck's Constant h",'[M L² T⁻¹]'],
    ['Boltzmann Const. k','[M L² T⁻² K⁻¹]'],
  ]},
];
function initSheet(){
  const grid=document.getElementById('dsGrid'); grid.innerHTML='';
  DIM_SHEET.forEach(c=>{
    const block=document.createElement('div');
    block.className='ds-block';
    const rows=c.items.map(([name,f])=>{
      const dimless=f==='dimensionless';
      return `<div class="ds-row"><span class="ds-name">${name}</span><span class="ds-formula${dimless?' dimensionless':''}">${f}</span></div>`;
    }).join('');
    block.innerHTML=`<div class="ds-head" style="background:${c.color}">${c.cat}</div><div class="ds-rows">${rows}</div>`;
    grid.appendChild(block);
  });
}

/* ───────── FORMULA FORGE ───────── */
const FORGE_DATA=[
  {name:'Pendulum Period',sym:'T',target:{M:0,L:0,T:1},targetStr:'[ M⁰ L⁰ T¹ ]',
   vars:[
     {sym:'m',name:'mass',dim:{M:1,L:0,T:0},dimStr:'[M]'},
     {sym:'l',name:'length',dim:{M:0,L:1,T:0},dimStr:'[L]'},
     {sym:'g',name:'gravity',dim:{M:0,L:1,T:-2},dimStr:'[LT⁻²]'},
   ],
   solution:{m:0,l:0.5,g:-0.5},
   formula:'T = k · √( l / g )',
   note:'Mass dropped out (power 0) — which is exactly why a heavy and a light pendulum swing at the same rate! The constant k = 2π cannot be found by dimensions.'},
  {name:'Speed of Sound',sym:'v',target:{M:0,L:1,T:-1},targetStr:'[ M⁰ L¹ T⁻¹ ]',
   vars:[
     {sym:'P',name:'pressure',dim:{M:1,L:-1,T:-2},dimStr:'[ML⁻¹T⁻²]'},
     {sym:'ρ',name:'density',dim:{M:1,L:-3,T:0},dimStr:'[ML⁻³]'},
   ],
   solution:{P:0.5,'ρ':-0.5},
   formula:'v = k · √( P / ρ )',
   note:'Matches the real formula v = √(γP/ρ), where γ is a dimensionless constant — completely invisible to dimensional analysis.'},
  {name:'Centripetal Force',sym:'F',target:{M:1,L:1,T:-2},targetStr:'[ M¹ L¹ T⁻² ]',
   vars:[
     {sym:'m',name:'mass',dim:{M:1,L:0,T:0},dimStr:'[M]'},
     {sym:'v',name:'velocity',dim:{M:0,L:1,T:-1},dimStr:'[LT⁻¹]'},
     {sym:'r',name:'radius',dim:{M:0,L:1,T:0},dimStr:'[L]'},
   ],
   solution:{m:1,v:2,r:-1},
   formula:'F = k · m v² / r',
   note:'Here the real constant k = 1, so dimensional analysis nailed the exact law: F = mv²/r.'},
  {name:'Escape Velocity',sym:'vₑ',target:{M:0,L:1,T:-1},targetStr:'[ M⁰ L¹ T⁻¹ ]',
   vars:[
     {sym:'G',name:'grav. constant',dim:{M:-1,L:3,T:-2},dimStr:'[M⁻¹L³T⁻²]'},
     {sym:'M',name:'planet mass',dim:{M:1,L:0,T:0},dimStr:'[M]'},
     {sym:'R',name:'planet radius',dim:{M:0,L:1,T:0},dimStr:'[L]'},
   ],
   solution:{G:0.5,M:0.5,R:-0.5},
   formula:'vₑ = k · √( GM / R )',
   note:'The real formula is vₑ = √(2GM/R). The factor √2 is dimensionless — dimensional analysis cannot reveal it.'},
];
let forgeIdx=0, forgePowers={};
function fracStr(v){
  if(v===0) return '0';
  const sign=v<0?'−':'';
  const a=Math.abs(v), whole=Math.floor(a), half=(a-whole)>=0.5;
  let s='';
  if(whole>0) s+=whole;
  if(half) s+='½';
  return sign+s;
}
function initForge(){
  renderForgeTabs();
  loadForge(forgeIdx);
}
function renderForgeTabs(){
  const el=document.getElementById('forgeTabs'); el.innerHTML='';
  FORGE_DATA.forEach((d,i)=>{
    const b=document.createElement('button');
    b.className='forge-tab'+(i===forgeIdx?' active':'');
    b.textContent=d.name;
    b.onclick=()=>{forgeIdx=i;renderForgeTabs();loadForge(i);};
    el.appendChild(b);
  });
}
function loadForge(i){
  const d=FORGE_DATA[i];
  forgePowers={};
  d.vars.forEach(v=>forgePowers[v.sym]=0);
  document.getElementById('forgeName').innerHTML=d.name+' &nbsp;<span class="sym">'+d.sym+'</span>';
  document.getElementById('forgeTargetDim').textContent=d.targetStr;
  // build var dials
  const vbox=document.getElementById('forgeVars'); vbox.innerHTML='';
  d.vars.forEach(v=>{
    const row=document.createElement('div');
    row.className='forge-var';
    row.innerHTML=`
      <div class="fv-id">
        <div class="fv-sym">${v.sym}</div>
        <div class="fv-name">${v.name} &nbsp;<span class="vdim">${v.dimStr}</span></div>
      </div>
      <div class="fv-dial">
        <span class="fv-power">power</span>
        <button class="fv-btn minus">−</button>
        <span class="fv-exp" id="fexp-${v.sym}">0</span>
        <button class="fv-btn plus">+</button>
      </div>`;
    row.querySelector('.minus').onclick=()=>forgeBump(v.sym,-0.5);
    row.querySelector('.plus').onclick=()=>forgeBump(v.sym,0.5);
    vbox.appendChild(row);
  });
  // build balance gauges
  const bbox=document.getElementById('forgeBalance'); bbox.innerHTML='';
  ['M','L','T'].forEach(dim=>{
    const g=document.createElement('div');
    g.className='fbal'; g.id='fbal-'+dim;
    g.innerHTML=`<div class="fbal-letter">${dim}</div><div class="fbal-cur" id="fcur-${dim}">0</div><div class="fbal-target">target: ${fracStr(d.target[dim])}</div><div class="fbal-check">✓ matched</div>`;
    bbox.appendChild(g);
  });
  updateForge();
}
function forgeBump(sym,by){
  forgePowers[sym]=Math.max(-3,Math.min(3,forgePowers[sym]+by));
  document.getElementById('fexp-'+sym).textContent=fracStr(forgePowers[sym]);
  updateForge();
}
function updateForge(){
  const d=FORGE_DATA[forgeIdx];
  const cur={M:0,L:0,T:0};
  d.vars.forEach(v=>{
    const p=forgePowers[v.sym];
    cur.M+=p*v.dim.M; cur.L+=p*v.dim.L; cur.T+=p*v.dim.T;
  });
  let allMatch=true, anySet=false;
  d.vars.forEach(v=>{if(forgePowers[v.sym]!==0) anySet=true;});
  ['M','L','T'].forEach(dim=>{
    document.getElementById('fcur-'+dim).textContent=fracStr(cur[dim]);
    const matched=Math.abs(cur[dim]-d.target[dim])<0.001;
    document.getElementById('fbal-'+dim).classList.toggle('matched',matched);
    if(!matched) allMatch=false;
  });
  const result=document.getElementById('forgeResult');
  const status=document.getElementById('forgeStatus');
  const formula=document.getElementById('forgeFormula');
  const note=document.getElementById('forgeNote');
  formula.textContent=d.formula;
  note.textContent=d.note;
  if(allMatch && anySet){
    result.classList.add('locked');
    status.textContent='⚡ FORGED! Dimensions balanced.';
  } else {
    result.classList.remove('locked');
    status.textContent='⚒ Balance M, L and T to forge the formula';
  }
}
function forgeReset(){
  const d=FORGE_DATA[forgeIdx];
  d.vars.forEach(v=>{forgePowers[v.sym]=0;document.getElementById('fexp-'+v.sym).textContent='0';});
  updateForge();
}
function forgeSolve(){
  const d=FORGE_DATA[forgeIdx];
  d.vars.forEach(v=>{
    forgePowers[v.sym]=d.solution[v.sym];
    document.getElementById('fexp-'+v.sym).textContent=fracStr(d.solution[v.sym]);
  });
  updateForge();
}

/* ───────── EQUATION CHECKER ───────── */
const EQ_DATA=[
  // Lecture examples
  {eq:'v = u + at',label:'Equations of Motion',
    terms:['[v] = [LT⁻¹]','[u] = [LT⁻¹]','[at] = [LT⁻²][T] = [LT⁻¹]'],
    match:true,trap:false,group:'lecture',note:null},
  {eq:'s = ut + ½at²',label:'Equations of Motion',
    terms:['[s] = [L]','[ut] = [LT⁻¹][T] = [L]','[at²] = [LT⁻²][T²] = [L]','(½ is dimensionless)'],
    match:true,trap:false,group:'lecture',note:null},
  {eq:'v² = u² + 2as',label:'Equations of Motion',
    terms:['[v²] = [L²T⁻²]','[u²] = [L²T⁻²]','[as] = [LT⁻²][L] = [L²T⁻²]','(2 is dimensionless)'],
    match:true,trap:false,group:'lecture',note:null},
  {eq:'v = u + at²',label:'Spot the Error ✗',
    terms:['[v] = [LT⁻¹]','[u] = [LT⁻¹]','[at²] = [LT⁻²][T²] = [L]  ← ✗'],
    match:false,trap:false,group:'lecture',
    note:'The correct equation is v = u + at. Here at² gives [L] but v and u are [LT⁻¹]. Terms don\'t match — definitely wrong.'},
  {eq:'v = u + 2at',label:'The Trap ⚠',
    terms:['[v] = [LT⁻¹]','[u] = [LT⁻¹]','[2at] = [LT⁻²][T] = [LT⁻¹]','(2 is dimensionless)'],
    match:true,trap:true,group:'lecture',
    note:'⚠ Dimensionally correct — but physically WRONG. The correct equation is v = u + at with no 2. Dimensional analysis cannot detect errors hidden in dimensionless numbers.'},
  // Practice problems
  {eq:'F = mv²/r',label:'Centripetal Force',
    terms:['[mv²/r] = [M][L²T⁻²] / [L]','= [MLT⁻²]','[F] = [MLT⁻²]'],
    match:true,trap:false,group:'practice',note:null},
  {eq:'T = 2π√(L/g)',label:'Pendulum Period',
    terms:['[L/g] = [L] / [LT⁻²] = [T²]','[√(L/g)] = [T]','[T] = [T]','(2π is dimensionless)'],
    match:true,trap:false,group:'practice',note:null},
  // HW equations
  {eq:'s = vt',label:'HW Check',
    terms:['[s] = [L]','[vt] = [LT⁻¹][T] = [L]'],
    match:true,trap:false,group:'hw',note:null},
  {eq:'v² = 2as²',label:'HW Check',
    terms:['[v²] = [L²T⁻²]','[as²] = [LT⁻²][L²] = [L³T⁻²]','[L²T⁻²] ≠ [L³T⁻²]  ← ✗'],
    match:false,trap:false,group:'hw',
    note:'The correct equation is v² = 2as. The extra s makes L³T⁻² instead of L²T⁻².'},
  {eq:'P = ρgh',label:'HW Check',
    terms:['[ρ] = [ML⁻³]','[g] = [LT⁻²]','[h] = [L]','[ρgh] = [ML⁻³][LT⁻²][L] = [ML⁻¹T⁻²]','[P] = [ML⁻¹T⁻²]'],
    match:true,trap:false,group:'hw',note:null},
  {eq:'E = mc²',label:'HW Check',
    terms:['[mc²] = [M][LT⁻¹]² = [ML²T⁻²]','[E] = [ML²T⁻²]'],
    match:true,trap:false,group:'hw',note:null},
];
let eqCards=[], eqActiveCard=null;
function initEqCheck(){
  eqCards=[];
  ['eqLecture','eqPractice','eqHw'].forEach(id=>{document.getElementById(id).innerHTML='';});
  EQ_DATA.forEach((d,i)=>{
    const card=document.createElement('div');
    card.className='eq-card';
    card.innerHTML=`<div class="eq-card-label">${d.label}</div><div class="eq-equation">${d.eq}</div><div class="eq-tap-hint">Tap to check →</div>`;
    const target=d.group==='lecture'?'eqLecture':d.group==='practice'?'eqPractice':'eqHw';
    document.getElementById(target).appendChild(card);
    eqCards.push(card);
    card.addEventListener('click',()=>openEqModal(i));
  });
}
function openEqModal(i){
  eqActiveCard=eqCards[i];
  const d=EQ_DATA[i];
  document.getElementById('emLabel').textContent=d.label;
  document.getElementById('emEq').textContent=d.eq;
  const termsEl=document.getElementById('emTerms'); termsEl.innerHTML='';
  d.terms.forEach(t=>{
    const el=document.createElement('div');
    el.className='em-term'+(t.includes('✗')?' em-mismatch':t.startsWith('(')?' em-dim':'');
    el.textContent=t; termsEl.appendChild(el);
  });
  const v=document.getElementById('emVerdict');
  if(d.trap){v.className='em-verdict trap';v.textContent='⚠ Dimensionally Correct — but Physically Wrong!';}
  else if(d.match){v.className='em-verdict ok';v.textContent='✓ Possibly Correct';}
  else{v.className='em-verdict no';v.textContent='✗ Definitely Wrong';}
  const noteEl=document.getElementById('emNote');
  if(d.note){noteEl.textContent=d.note;noteEl.style.display='block';}
  else noteEl.style.display='none';
  document.getElementById('eqOverlay').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeEqModal(e){
  if(e&&e.target!==document.getElementById('eqOverlay')&&!e.target.classList.contains('dim-modal-close')) return;
  document.getElementById('eqOverlay').classList.remove('open');
  document.body.style.overflow='';
  if(eqActiveCard){
    const d=EQ_DATA[eqCards.indexOf(eqActiveCard)];
    eqActiveCard.classList.add(d.trap?'eq-trap':d.match?'eq-correct':'eq-wrong');
    const badge=document.createElement('div');
    badge.className='eq-badge '+(d.trap?'trap':d.match?'ok':'no');
    badge.textContent=d.trap?'⚠ Trap':d.match?'✓ Correct':'✗ Wrong';
    const hint=eqActiveCard.querySelector('.eq-tap-hint');
    if(hint) hint.replaceWith(badge);
  }
  eqActiveCard=null;
}

/* ───────── REVISION (Lecture 7 — mixed problem set) ───────── */
const REV_DATA=[
  {num:1,label:'Problem 1 · Scalar vs Vector (Lecture 1)',
    eq:'Classify each as scalar or vector: electrostatic potential, momentum, work, magnetic moment.',
    terms:['Electrostatic potential → Scalar','Momentum → Vector','Work → Scalar','Magnetic moment → Vector'],
    vclass:'ok',tag:'✓ Answer',verdict:'Potential & Work are scalars · Momentum & Magnetic moment are vectors',note:null},

  {num:2,label:'Problem 2 · Dimensional Formula (Lecture 3)',
    eq:'Find the dimensional formula of Angular Momentum, L = m·v·r.',
    terms:['[m] = [M]','[v] = [LT⁻¹]','[r] = [L]','[L] = [M]·[LT⁻¹]·[L] = [ML²T⁻¹]'],
    vclass:'ok',tag:'✓ Answer',verdict:'[ M¹ L² T⁻¹ ]',note:null},

  {num:3,label:'Problem 3 · Checking an Equation (Lecture 4)',
    eq:'Is F = mv²/r + mav dimensionally valid?',
    terms:['[mv²/r] = [M][L²T⁻²]/[L] = [MLT⁻²]','[mav] = [M][LT⁻²][LT⁻¹] = [ML²T⁻³]','[MLT⁻²] ≠ [ML²T⁻³]  ← ✗'],
    vclass:'no',tag:'✗ Wrong',verdict:'Dimensionally INCORRECT',
    note:'The two terms being added have different dimensions, so the equation fails the Principle of Homogeneity straight away.'},

  {num:4,label:'Problem 4 · Unit Conversion (Lecture 5)',
    eq:'Convert G = 6.67 × 10⁻¹¹ N·m²·kg⁻² (SI) into CGS units.',
    terms:['[G] = [M⁻¹L³T⁻²]','1 m³ = 10⁶ cm³  and  1 kg⁻¹ = 10⁻³ g⁻¹','G(CGS) = 6.67×10⁻¹¹ × 10⁶ × 10⁻³'],
    vclass:'ok',tag:'✓ Answer',verdict:'G = 6.67 × 10⁻⁸ (CGS units)',
    note:'Common slip: forgetting the power on a conversion factor — an L³ quantity needs (10²)³, not just 10².'},

  {num:5,label:'Problem 5 · Deriving a Formula (Lecture 5/6)',
    eq:'The frequency f of a vibrating string depends on its length L, tension T, and linear mass density μ. Find the form of f.',
    terms:['Assume f = k · Lᵃ · Tᵇ · μᶜ (3 unknowns)','[T] = [MLT⁻²], [μ] = [ML⁻¹], [f] = [T⁻¹]','Matching powers of M, L, T → a = −1, b = ½, c = −½'],
    vclass:'ok',tag:'✓ Answer',verdict:'f = (k/L) · √(T/μ)',
    note:'Matches the real formula f = (1/2L)√(T/μ) — dimensional analysis finds the form but never the constant 1/2.'},

  {num:6,label:'Problem 6 · A Limitation (Lecture 6)',
    eq:'Two students write Q = Av²ρ and Q = 2Av²ρ. Both check out dimensionally. What does this demonstrate?',
    terms:['Both expressions have identical dimensions','The factor of 2 is dimensionless','Dimensional analysis cannot tell the two apart'],
    vclass:'trap',tag:'⚠ Limitation',verdict:'Dimensional analysis can’t detect dimensionless constants',
    note:'This is Limitation 1 from Lecture 6 — a dimensionally correct equation can still be physically wrong (or incomplete) by a pure number.'},

  {num:7,label:'Problem 7 · Dimensions of a Constant (Lecture 4)',
    eq:'In the Van der Waals equation (P + a/V²)(V − b) = RT, find the dimensions of a.',
    terms:['Homogeneity demands [a/V²] = [P]','[a] = [P] · [V²]','[P] = [ML⁻¹T⁻²], [V²] = [L⁶]','[a] = [ML⁻¹T⁻²] · [L⁶] = [ML⁵T⁻²]'],
    vclass:'ok',tag:'✓ Answer',verdict:'[ M¹ L⁵ T⁻² ]',note:null},
];
let revIndex=0;
function initRevision(){
  revIndex=0;
  renderRev();
}
function renderRev(){
  const d=REV_DATA[revIndex];
  document.getElementById('revLabel').textContent=d.label;
  document.getElementById('revEq').textContent=d.eq;
  document.getElementById('revCounter').textContent=(revIndex+1)+' / '+REV_DATA.length;
  document.getElementById('revSolution').style.display='none';
  document.getElementById('revSolveBtn').textContent='Show solution';
}
function toggleRevSolution(){
  const box=document.getElementById('revSolution');
  const btn=document.getElementById('revSolveBtn');
  const showing=box.style.display!=='none';
  if(showing){box.style.display='none';btn.textContent='Show solution';return;}
  const d=REV_DATA[revIndex];
  const termsEl=document.getElementById('revTerms'); termsEl.innerHTML='';
  d.terms.forEach(t=>{
    const el=document.createElement('div');
    el.className='em-term'+(t.includes('✗')?' em-mismatch':'');
    el.textContent=t; termsEl.appendChild(el);
  });
  const v=document.getElementById('revVerdict');
  v.className='em-verdict '+d.vclass;
  v.textContent=d.verdict;
  const noteEl=document.getElementById('revNote');
  if(d.note){noteEl.textContent=d.note;noteEl.style.display='block';}
  else noteEl.style.display='none';
  box.style.display='block';
  btn.textContent='Hide solution';
}
function nextRev(){ revIndex=(revIndex+1)%REV_DATA.length; renderRev(); }
function prevRev(){ revIndex=(revIndex-1+REV_DATA.length)%REV_DATA.length; renderRev(); }

/* ───────── SIGNIFICANT FIGURES — counting rules ───────── */
const SF_RULES=[
  {symbol:'234',name:'Non-zero digits',power:'3 sf',symbol2:'5923',power2:'4 sf',
    example:'Every non-zero digit always counts as significant.'},
  {symbol:'205',name:'Captive zeros',power:'3 sf',symbol2:'7.024',power2:'4 sf',
    example:'Zeros sitting between two non-zero digits always count.'},
  {symbol:'0.005',name:'Leading zeros',power:'1 sf',symbol2:'0.00042',power2:'2 sf',
    example:'Zeros before the first non-zero digit never count — they only fix the decimal point.'},
  {symbol:'2.50',name:'Trailing zeros (decimal)',power:'3 sf',symbol2:'100.0',power2:'4 sf',
    example:'Trailing zeros count when there is a decimal point — they show real precision.'},
  {symbol:'2500',name:'Trailing zeros (no decimal)',power:'unclear',symbol2:'3.0 × 10³',power2:'2 sf',
    example:'Ambiguous without a decimal point. Scientific notation resolves it: 3×10³ → 1 sf, 3.0×10³ → 2 sf, 3.00×10³ → 3 sf.'},
  {symbol:'12 eggs',name:'Exact / counted numbers',power:'∞ sf',symbol2:'60 min/hr',power2:'∞ sf',
    example:'Counted or defined quantities are exact — infinite significant figures.'},
];
let sfRevealIndex=0, sfCards=[];
function initSF(){
  sfRevealIndex=0; sfCards=[];
  const grid=document.getElementById('sfGrid'); grid.innerHTML='';
  SF_RULES.forEach(r=>{
    const card=document.createElement('div');
    card.className='pf-card sf';
    card.innerHTML=`<div class="pf-name">${r.name}</div><div class="pf-def">${r.example}</div><div class="pf-eg"><span class="pf-eg-num">${r.symbol}</span><span class="pf-eg-result">→ <span class="pf-eg-sf">${r.power}</span></span></div><div class="pf-eg pf-eg2"><span class="pf-eg-num">${r.symbol2}</span><span class="pf-eg-result">→ <span class="pf-eg-sf">${r.power2}</span></span></div>`;
    grid.appendChild(card);
    sfCards.push(card);
  });
  if(sfCards.length) sfCards[0].classList.add('next-up');
  const btn=document.getElementById('sfRevealBtn');
  btn.textContent='Reveal next rule →'; btn.disabled=false;
  document.getElementById('sfCounter').textContent='0 / '+sfCards.length;
}
function revealNextSF(){
  if(sfRevealIndex>=sfCards.length) return;
  const card=sfCards[sfRevealIndex];
  card.classList.remove('next-up');
  card.classList.add('revealed');
  sfRevealIndex++;
  document.getElementById('sfCounter').textContent=sfRevealIndex+' / '+sfCards.length;
  if(sfRevealIndex<sfCards.length){
    sfCards[sfRevealIndex].classList.add('next-up');
  } else {
    const btn=document.getElementById('sfRevealBtn');
    btn.textContent='All done ✓'; btn.disabled=true;
  }
}

/* ───────── THE TRAP — add vs multiply ───────── */
const TRAP_DATA=[
  {rule:'Multiply / Divide → match SIG FIGS',
    eq:'5.7 × 3.4 = 19.38',
    sub:'Both factors have 2 sig figs. How many sig figs should the answer keep?',
    options:[{text:'19.38',correct:false},{text:'19.4',correct:false},{text:'19',correct:true}],
    note:'Multiplication/division rule: match the SIG FIGS of the least precise factor. Both 5.7 and 3.4 have 2 sig figs, so the answer is 19. Writing 19.4 applies the addition (decimal-place) rule by mistake — the single most common slip in this chapter.'},
  {rule:'Add / Subtract → match DECIMAL PLACES',
    eq:'12.11 + 18.0 + 1.013 = 31.123',
    sub:'18.0 has only 1 decimal place. How many decimal places should the answer keep?',
    options:[{text:'31.123',correct:false},{text:'31.12',correct:false},{text:'31.1',correct:true}],
    note:'Addition/subtraction rule: match the DECIMAL PLACES of the least precise term. 18.0 has 1 decimal place, so the answer is 31.1 — even though it has fewer sig figs than the other terms.'},
];
let trapAnswered=[];
function initTrap(){
  trapAnswered=TRAP_DATA.map(()=>false);
  const grid=document.getElementById('trapGrid'); grid.innerHTML='';
  TRAP_DATA.forEach((d,i)=>{
    const card=document.createElement('div');
    card.className='trap-card';
    let optsHtml='';
    d.options.forEach((o,j)=>{ optsHtml+=`<button class="guess-btn" onclick="trapGuess(${i},${j},this)">${o.text}</button>`; });
    card.innerHTML=`<div class="trap-rule">${d.rule}</div><div class="trap-eq">${d.eq}</div><div class="trap-sub">${d.sub}</div><div class="trap-options">${optsHtml}</div><div class="em-note" id="trapNote${i}" style="display:none"></div>`;
    grid.appendChild(card);
  });
}
function trapGuess(i,j,btn){
  if(trapAnswered[i]) return;
  trapAnswered[i]=true;
  const d=TRAP_DATA[i];
  btn.parentElement.querySelectorAll('.guess-btn').forEach((b,k)=>{
    if(d.options[k].correct) b.classList.add('right');
    else if(b===btn) b.classList.add('wrongpick');
  });
  const noteEl=document.getElementById('trapNote'+i);
  noteEl.textContent=d.note;
  noteEl.style.display='block';
}

/* ───────── TYPES OF ERROR — classifier ───────── */
const ERR_DATA=[
  {prompt:'A voltmeter that was never zeroed reads 0.5 V too high on every measurement.',
    answer:'Systematic',
    note:'Caused by a faulty/uncalibrated instrument — every reading is biased in the same direction. More readings won\'t fix this; only recalibration or a better instrument will.'},
  {prompt:'A student times the same pendulum swing 10 times and gets slightly different values each time, due to reaction-time variation in starting/stopping the stopwatch.',
    answer:'Random',
    note:'Unpredictable fluctuations in both directions. Taking more readings and averaging reduces this kind of error.'},
  {prompt:'While copying down a reading of 53 cm, a student accidentally writes 35 cm.',
    answer:'Gross',
    note:'An outright mistake — misreading or miscopying. Fixed by care and cross-checking, not by statistics.'},
  {prompt:'A metre scale has worn down at the zero end, so every length measured with it comes out slightly shorter than the true value.',
    answer:'Systematic',
    note:'A consistent instrumental bias in one direction — recalibrating or replacing the scale is the only fix.'},
  {prompt:'Room temperature fluctuations cause a resistance measurement to drift up and down slightly across repeated trials.',
    answer:'Random',
    note:'Uncontrollable environmental fluctuation, varying in both directions — averaging many readings reduces it.'},
  {prompt:'A student reads "9.8" off the result but writes "8.9" in their notebook by transposing the digits.',
    answer:'Gross',
    note:'A careless transcription mistake — a gross error, not a measurement uncertainty at all.'},
];
let errIndex=0;
function initErr(){ errIndex=0; renderErr(); }
function renderErr(){
  const d=ERR_DATA[errIndex];
  document.getElementById('errLabel').textContent='Example '+(errIndex+1)+' / '+ERR_DATA.length;
  document.getElementById('errPrompt').textContent=d.prompt;
  document.getElementById('errVerdict').style.display='none';
  document.getElementById('errNote').style.display='none';
  const opts=document.getElementById('errOptions'); opts.innerHTML='';
  ['Systematic','Random','Gross'].forEach(label=>{
    const b=document.createElement('button');
    b.className='guess-btn';
    b.textContent=label;
    b.onclick=()=>errGuess(label,b);
    opts.appendChild(b);
  });
}
function errGuess(label,btn){
  const opts=document.getElementById('errOptions');
  if(opts.querySelector('.right,.wrongpick')) return;
  const d=ERR_DATA[errIndex];
  opts.querySelectorAll('.guess-btn').forEach(b=>{
    if(b.textContent===d.answer) b.classList.add('right');
    else if(b===btn) b.classList.add('wrongpick');
  });
  const v=document.getElementById('errVerdict');
  const correct=label===d.answer;
  v.className='em-verdict '+(correct?'ok':'no');
  v.textContent=correct?('✓ Correct — '+d.answer):('✗ Not quite — it\'s '+d.answer);
  v.style.display='block';
  const noteEl=document.getElementById('errNote');
  noteEl.textContent=d.note;
  noteEl.style.display='block';
}
function nextErr(){ errIndex=(errIndex+1)%ERR_DATA.length; renderErr(); }
function prevErr(){ errIndex=(errIndex-1+ERR_DATA.length)%ERR_DATA.length; renderErr(); }

/* ───────── UNIT CONVERTER ───────── */
const CONV_DATA={
  Length:{base:'m',units:[
    {label:'km',factor:1e3,note:'kilometre'},
    {label:'m',factor:1,note:'metre'},
    {label:'cm',factor:1e-2,note:'centimetre'},
    {label:'mm',factor:1e-3,note:'millimetre'},
    {label:'μm',factor:1e-6,note:'micrometre'},
    {label:'nm',factor:1e-9,note:'nanometre'},
    {label:'Å',factor:1e-10,note:'Angstrom'},
    {label:'fm',factor:1e-15,note:'femtometre'},
  ]},
  Mass:{base:'kg',units:[
    {label:'tonne',factor:1e3,note:'metric tonne'},
    {label:'kg',factor:1,note:'kilogram'},
    {label:'g',factor:1e-3,note:'gram'},
    {label:'mg',factor:1e-6,note:'milligram'},
    {label:'μg',factor:1e-9,note:'microgram'},
    {label:'u',factor:1.66054e-27,note:'atomic mass unit'},
  ]},
  Time:{base:'s',units:[
    {label:'hr',factor:3600,note:'hour'},
    {label:'min',factor:60,note:'minute'},
    {label:'s',factor:1,note:'second'},
    {label:'ms',factor:1e-3,note:'millisecond'},
    {label:'μs',factor:1e-6,note:'microsecond'},
    {label:'ns',factor:1e-9,note:'nanosecond'},
  ]},
};
let convCat='Length', convFrom='m';
function initConv(){
  convCat='Length'; convFrom='m';
  document.getElementById('convInput').value='1';
  renderConvTabs(); renderConvTable();
}
function renderConvTabs(){
  const el=document.getElementById('convTabs'); el.innerHTML='';
  Object.keys(CONV_DATA).forEach(cat=>{
    const b=document.createElement('button');
    b.className='conv-tab'+(cat===convCat?' active':'');
    b.textContent=cat;
    b.onclick=()=>{convCat=cat;convFrom=CONV_DATA[cat].base;document.getElementById('convInput').value='1';renderConvTabs();renderConvTable();};
    el.appendChild(b);
  });
}
function renderConvTable(){
  const val=parseFloat(document.getElementById('convInput').value)||0;
  const data=CONV_DATA[convCat];
  const fromUnit=data.units.find(u=>u.label===convFrom)||data.units[0];
  const baseVal=val*fromUnit.factor;
  document.getElementById('convFromLabel').textContent='Converting from '+convFrom+' — tap any card to switch input unit';
  const grid=document.getElementById('convGrid'); grid.innerHTML='';
  data.units.forEach(u=>{
    const converted=baseVal/u.factor;
    let display;
    if(converted===0) display='0';
    else if(Math.abs(converted)>=0.001&&Math.abs(converted)<1e7) display=parseFloat(converted.toPrecision(5))+'';
    else display=converted.toExponential(3);
    const cell=document.createElement('div');
    cell.className='conv-cell'+(u.label===convFrom?' cv-active':'');
    cell.innerHTML=`<div class="cv-val">${display}</div><div class="cv-unit">${u.label} &nbsp;·&nbsp; ${u.note}</div>`;
    cell.onclick=()=>{convFrom=u.label;renderConvTable();};
    grid.appendChild(cell);
  });
}

/* ───────── DIMENSIONAL FORMULA REFERENCE ───────── */
const DIM_REF_DATA=[
  {name:'Momentum',eq:'p = Mass × Velocity',
    steps:['Momentum = Mass × Velocity','= M × [LT⁻¹]'],
    formula:'[M¹ L¹ T⁻¹]',group:'basic',note:null},
  {name:'Force',eq:'F = Mass × Acceleration',
    steps:['Force = Mass × Acceleration','Acceleration = Velocity / Time = LT⁻¹ / T = LT⁻²','= M × [LT⁻²]'],
    formula:'[M¹ L¹ T⁻²]',group:'basic',note:null},
  {name:'Work / Energy',eq:'W = Force × Distance',
    steps:['Work = Force × Distance','= [MLT⁻²] × [L]'],
    formula:'[M¹ L² T⁻²]',group:'basic',note:'Verify: KE = ½mv² → [M][LT⁻¹]² = [M¹ L² T⁻²] ✓'},
  {name:'Pressure',eq:'P = Force / Area',
    steps:['Pressure = Force / Area','= [MLT⁻²] / [L²]'],
    formula:'[M¹ L⁻¹ T⁻²]',group:'basic',note:null},
  {name:'Power',eq:'P = Work / Time',
    steps:['Power = Work / Time','= [ML²T⁻²] / [T]'],
    formula:'[M¹ L² T⁻³]',group:'core',note:null},
  {name:'Impulse',eq:'J = Force × Time',
    steps:['Impulse = Force × Time','= [MLT⁻²] × [T]'],
    formula:'[M¹ L¹ T⁻¹]',group:'core',note:'Same as Momentum — because Impulse = Change in Momentum (F·t = Δmv).'},
  {name:'Torque',eq:'τ = Force × Distance',
    steps:['Torque = Force × perpendicular distance','= [MLT⁻²] × [L]'],
    formula:'[M¹ L² T⁻²]',group:'core',note:'Same as Work — but Work is a scalar (energy), Torque is a vector (turning effect). Same dimensions, different physics.'},
  {name:'Surface Tension',eq:'γ = Force / Length',
    steps:['Surface Tension = Force per unit length','= [MLT⁻²] / [L]'],
    formula:'[M¹ L⁰ T⁻²]',group:'core',note:null},
  {name:'Frequency',eq:'f = 1 / Time period',
    steps:['Frequency = 1 / Time','= 1 / [T]'],
    formula:'[M⁰ L⁰ T⁻¹]',group:'core',note:null},
  {name:'Density',eq:'ρ = Mass / Volume',
    steps:['Density = Mass / Volume','= [M] / [L³]'],
    formula:'[M¹ L⁻³ T⁰]',group:'core',note:null},
  {name:'Gravitational Constant G',eq:'F = G·m₁m₂ / r²',
    steps:['From Newton\'s law of gravitation: F = G·m₁m₂ / r²','Rearrange: G = F·r² / (m₁·m₂)','= [MLT⁻²] × [L²] / [M²]','= [ML³T⁻²] / [M²]'],
    formula:'[M⁻¹ L³ T⁻²]',group:'tricky',note:'The negative power of mass is correct — G is tiny because gravity is extremely weak relative to the masses involved.'},
  {name:"Planck's Constant h",eq:'E = h·f',
    steps:['From E = hf, rearrange: h = E / f','= [ML²T⁻²] / [T⁻¹]','= [ML²T⁻²] × [T]'],
    formula:'[M¹ L² T⁻¹]',group:'tricky',note:"Same as Angular Momentum [ML²T⁻¹] — a deep connection at the heart of quantum mechanics (L = nℏ)."},
  {name:'Viscosity η',eq:'F = η · A · (dv/dx)',
    steps:['Viscous force: F = η · A · (dv/dx)','Rearrange: η = F / (A · dv/dx)','velocity gradient dv/dx = [LT⁻¹]/[L] = [T⁻¹]','= [MLT⁻²] / ([L²] × [T⁻¹])','= [MLT⁻²] / [L²T⁻¹]'],
    formula:'[M¹ L⁻¹ T⁻¹]',group:'tricky',note:null},
  {name:'Boltzmann Constant k',eq:'E = k·T  (T = temperature)',
    steps:['From E = kT, rearrange: k = E / T','T here is temperature in Kelvin','= [ML²T⁻²] / [K]'],
    formula:'[M¹ L² T⁻² K⁻¹]',group:'tricky',note:null},
];
const GROUP_TAG={basic:'Basic — Lecture 2 homework',core:'Core Mechanics',tricky:'Tricky — JEE favourite'};
let dfCards=[];
function initDimRef(){
  dfCards=[];
  ['dfBasic','dfCore','dfTricky'].forEach(id=>{document.getElementById(id).innerHTML='';});
  DIM_REF_DATA.forEach((d,i)=>{
    const card=document.createElement('div');
    card.className='df-card'+(d.group==='tricky'?' tricky':'');
    card.innerHTML=`<div class="df-name">${d.name}</div><div class="df-deriv">${d.steps[0]}</div><div class="df-formula">${d.formula}</div><div class="df-tap-hint">Tap to reveal →</div>`;
    const target=d.group==='basic'?'dfBasic':d.group==='core'?'dfCore':'dfTricky';
    document.getElementById(target).appendChild(card);
    dfCards.push(card);
    card.addEventListener('click',()=>openDimModal(i));
  });
}
let dfActiveCard=null;
function openDimModal(i){
  dfActiveCard=dfCards[i];
  const d=DIM_REF_DATA[i];
  document.getElementById('dmTag').textContent=GROUP_TAG[d.group];
  document.getElementById('dmName').textContent=d.name;
  document.getElementById('dmEq').textContent=d.eq;
  const stepsEl=document.getElementById('dmSteps');
  stepsEl.innerHTML='';
  d.steps.slice(1).forEach(s=>{
    const el=document.createElement('div');
    el.className='dm-step dm-arr';
    el.textContent=s;
    stepsEl.appendChild(el);
  });
  document.getElementById('dmFormula').textContent=d.formula;
  const noteEl=document.getElementById('dmNote');
  if(d.note){noteEl.textContent=d.note;noteEl.style.display='block';}
  else{noteEl.style.display='none';}
  document.getElementById('dimOverlay').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeDimModal(e){
  if(e&&e.target!==document.getElementById('dimOverlay')&&!e.target.classList.contains('dim-modal-close')) return;
  document.getElementById('dimOverlay').classList.remove('open');
  document.body.style.overflow='';
  if(dfActiveCard) dfActiveCard.classList.add('revealed');
  dfActiveCard=null;
}

/* ───────── SAME DIMENSIONS ───────── */
const SAME_DIM_DATA=[
  {formula:'[M¹ L² T⁻²]',items:['Work','Kinetic Energy','Potential Energy','Torque','Heat'],note:'Same structure — but Work is energy transferred, Torque is a turning effect. Completely different physics.'},
  {formula:'[M¹ L¹ T⁻¹]',items:['Momentum','Impulse'],note:'Impulse changes momentum — their shared dimensions reflect that F·t = Δ(mv).'},
  {formula:'[M⁰ L⁰ T⁻¹]',items:['Frequency','Angular Velocity'],note:'Both are "per second" quantities — but one counts cycles, the other measures rotation rate.'},
  {formula:'[M¹ L⁻¹ T⁻²]',items:['Pressure','Stress','Elastic Modulus'],note:'All measure force per unit area — different contexts, same dimensional structure.'},
  {formula:'[M¹ L² T⁻¹]',items:["Planck's Constant h",'Angular Momentum'],note:'A deep connection — quantum mechanics links these two directly through ℏ = h/2π.'},
];
let sdRevealIndex=0, sdGroups=[];
function initSameDim(){
  sdRevealIndex=0; sdGroups=[];
  const grid=document.getElementById('sdGrid'); grid.innerHTML='';
  SAME_DIM_DATA.forEach(d=>{
    const grp=document.createElement('div');
    grp.className='sd-group';
    grp.innerHTML=`<div class="sd-formula">${d.formula}</div><div class="sd-items">${d.items.map(i=>`<span class="sd-item">${i}</span>`).join('')}</div><div class="sd-note">${d.note}</div>`;
    grid.appendChild(grp);
    sdGroups.push(grp);
  });
  if(sdGroups.length) sdGroups[0].classList.add('next-up');
  const btn=document.getElementById('sdRevealBtn');
  btn.textContent='Reveal next group →'; btn.disabled=false;
  document.getElementById('sdCounter').textContent='0 / '+sdGroups.length;
}
function revealNextGroup(){
  if(sdRevealIndex>=sdGroups.length) return;
  sdGroups[sdRevealIndex].classList.remove('next-up');
  sdGroups[sdRevealIndex].classList.add('revealed');
  sdRevealIndex++;
  document.getElementById('sdCounter').textContent=sdRevealIndex+' / '+sdGroups.length;
  if(sdRevealIndex<sdGroups.length) sdGroups[sdRevealIndex].classList.add('next-up');
  else{const b=document.getElementById('sdRevealBtn');b.textContent='All done ✓';b.disabled=true;}
}

/* ───────── SI PREFIX REFERENCE ───────── */
const PREFIX_DATA=[
  {sym:'k', name:'Kilo',  power:'10³',  exp:'1 km — a walkable distance',        size:'large'},
  {sym:'M', name:'Mega',  power:'10⁶',  exp:'100 Mbps internet speed',           size:'large'},
  {sym:'G', name:'Giga',  power:'10⁹',  exp:'128 GB phone storage',              size:'large'},
  {sym:'T', name:'Tera',  power:'10¹²', exp:'1 TB hard drive',                   size:'large'},
  {sym:'P', name:'Peta',  power:'10¹⁵', exp:'1 PB — large data centre storage',  size:'large'},
  {sym:'E', name:'Exa',   power:'10¹⁸', exp:'global internet data per year',     size:'large'},
  {sym:'d', name:'Deci',  power:'10⁻¹', exp:'1 dm — 10 centimetres',            size:'small'},
  {sym:'c', name:'Centi', power:'10⁻²', exp:'1 cm — width of a fingernail',     size:'small'},
  {sym:'m', name:'Milli', power:'10⁻³', exp:'1 mm — thickness of a coin',       size:'small'},
  {sym:'μ', name:'Micro', power:'10⁻⁶', exp:'70 μm — width of a human hair',   size:'small'},
  {sym:'n', name:'Nano',  power:'10⁻⁹', exp:'100 nm — size of a virus',         size:'small'},
  {sym:'p', name:'Pico',  power:'10⁻¹²',exp:'atomic spacing in crystals',        size:'small'},
  {sym:'f', name:'Femto', power:'10⁻¹⁵',exp:'~1 fm — radius of a proton',       size:'small'},
  {sym:'a', name:'Atto',  power:'10⁻¹⁸',exp:'timescale of electron motion',      size:'small'},
  {sym:'Å', name:'Angstrom', power:'10⁻¹⁰ m', exp:'atomic & molecular sizes — H atom radius ≈ 0.5 Å', size:'special'},
];
let pfRevealIndex=0, pfAllCards=[];
function initPrefix(){
  pfRevealIndex=0; pfAllCards=[];
  ['pfLarge','pfSmall','pfSpecial'].forEach(id=>{ document.getElementById(id).innerHTML=''; });
  PREFIX_DATA.forEach(p=>{
    const card=document.createElement('div');
    card.className='pf-card '+p.size;
    card.innerHTML=`<div class="pf-symbol">${p.sym}</div><div class="pf-name">${p.name}</div><div class="pf-power">${p.power}</div><div class="pf-example">${p.exp}</div>`;
    const target=p.size==='large'?'pfLarge':p.size==='small'?'pfSmall':'pfSpecial';
    document.getElementById(target).appendChild(card);
    pfAllCards.push(card);
  });
  if(pfAllCards.length) pfAllCards[0].classList.add('next-up');
  const btn=document.getElementById('pfRevealBtn');
  btn.textContent='Reveal next →'; btn.disabled=false;
  document.getElementById('pfCounter').textContent='0 / '+pfAllCards.length;
}
function revealNext(){
  if(pfRevealIndex>=pfAllCards.length) return;
  const card=pfAllCards[pfRevealIndex];
  card.classList.remove('next-up');
  card.classList.add('revealed');
  pfRevealIndex++;
  document.getElementById('pfCounter').textContent=pfRevealIndex+' / '+pfAllCards.length;
  if(pfRevealIndex<pfAllCards.length){
    pfAllCards[pfRevealIndex].classList.add('next-up');
  } else {
    const btn=document.getElementById('pfRevealBtn');
    btn.textContent='All done ✓'; btn.disabled=true;
  }
}


/* init */
initEqCheck();
initForge();
initSheet();
initSort('FD');
loadQ();
updateError();
initPrefix();
initConv();
initDimRef();
initSameDim();

/* ───────── LECTURE 12 — reveal questions one at a time ───────── */
const L12Q=[
  {tag:'JEE Main PYQ · 28 Jan 2026 (Morning)', text:'In a vernier callipers, 50 vernier scale divisions are equal to 48 main scale divisions. If one main scale division = 0.05 mm, then the least count of the vernier callipers is _______ mm.'},
  {tag:'JEE Main PYQ · 2021 / 2022', text:'When both jaws of a vernier callipers touch each other, the zero mark of the vernier scale is to the RIGHT of the zero mark of the main scale, and the 4th mark on the vernier scale coincides with a certain mark on the main scale. While measuring the length of a cylinder, the observer reads 15 divisions on the main scale and the 5th division of the vernier scale coincides with a main scale division. The measured length of the cylinder is _______ mm.  (Least count of vernier calliper = 0.1 mm)'},
  {tag:'Drill · Negative zero error (the trap)', text:'With the jaws closed, the 8th division (of 10) coincides and the vernier zero is to the LEFT of the main-scale zero. While measuring an object, the main scale reads 2.0 cm and the 5th vernier division coincides.  (Least count = 0.01 cm.)  Find the corrected length.'},
  {tag:'Drill · Reading a screw gauge', text:'A screw gauge has pitch = 1 mm and least count = 0.01 mm. The pitch-scale reading is 5 mm and the 28th circular division lies on the reference line (no zero error). Find the reading.'},
  {tag:'Homework 1', text:'20 vernier divisions coincide with 19 main scale divisions (1 MSD = 1 mm). Find the least count.'},
  {tag:'Homework 2', text:'Vernier least count = 0.01 cm, positive zero error = 0.05 cm. The main scale reads 2.3 cm and the 7th division coincides. Find the corrected length.'},
  {tag:'Homework 3', text:'A screw gauge has pitch = 0.5 mm and 50 divisions on the circular scale. Find the least count.'},
  {tag:'Homework 4', text:'A screw gauge has least count = 0.01 mm and pitch = 1 mm. The pitch scale reads 7 mm and the 45th circular division is on the reference line (no zero error). Find the reading.'}
];
let l12i=0;
function l12Show(){
  document.getElementById('l12Tag').textContent=L12Q[l12i].tag;
  document.getElementById('l12Text').textContent=L12Q[l12i].text;
  document.getElementById('l12Counter').textContent=(l12i+1)+'/'+L12Q.length;
  document.getElementById('l12Prev').disabled=(l12i===0);
  document.getElementById('l12Next').textContent=(l12i===L12Q.length-1)?'↺ Restart':'Reveal next question ›';
}
function l12Step(d){
  if(d>0 && l12i===L12Q.length-1){ l12i=0; l12Show(); return; }
  l12i=Math.max(0,Math.min(L12Q.length-1,l12i+d));
  l12Show();
}
l12Show();

/* ───────── screen-init registry (consumed by studio-core go()) ───────── */
window.SCREEN_INIT = {
  sortFD: () => initSort('FD'),
  sortSV: () => initSort('SV'),
  build:   loadQ,
  reveal:  resetReveal,
  error:   updateError,
  prefix:  initPrefix,
  conv:    initConv,
  dimref:  initDimRef,
  samedim: initSameDim,
  eqcheck: initEqCheck,
  forge:   initForge,
  sheet:   initSheet,
  revision:initRevision,
  sfrules: initSF,
  sftrap:  initTrap,
  errtype: initErr
};
