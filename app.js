/* ScafMORL client-side explorer — samples from a pre-generated molecule pool
   (molecules.json). No server; structure drawing via SmilesDrawer (CDN). */
let drawer=null, count=0, active=0, potent=0, best=0, history=[];
let POOL=[], order=[], cursor=0;

function initDrawer(w,h){
  return new SmilesDrawer.Drawer({width:w,height:h,
    bondThickness:1.5,compactDrawing:false,terminalCarbons:false,
    themes:{light:{C:'#1a1a1a',O:'#c0392b',N:'#2471a3',S:'#b7950b',
      F:'#1e8449',Cl:'#1e8449',Br:'#6c3483',P:'#ca6f1e',BACKGROUND:'#ffffff'}}});
}
function drawOn(smiles,id,w,h){
  if(!drawer) drawer=initDrawer(w,h);
  SmilesDrawer.parse(smiles,t=>drawer.draw(t,id,'light',false),e=>console.warn(e));
}
function scoreColor(v){return v>=8?'var(--green)':v>=7?'var(--orange)':'var(--gray)';}
function yesno(v,yC,nC){return v?`<span class="${yC||'green'}">Yes</span>`:`<span class="${nC||'gray'}">No</span>`;}
function set(id,html){document.getElementById(id).innerHTML=html;}
function filter(pass,label){return pass?`<span class="green">${label} ✓</span>`:`<span class="red">${label} ✗</span>`;}
function actionClass(a){
  return {AGONIST:'act-agon',ANTAGONIST:'act-antag',MODULATOR:'act-mod',DEGRADER:'act-deg'}[(a||'').toUpperCase()]||'act-other';
}
function phaseClass(p){return {4:'ph4',3:'ph3',2:'ph2',1:'ph1'}[p]||'ph1';}

function renderSimTable(drugs){
  document.getElementById('sim-body').innerHTML=drugs.map(d=>{
    const pct=Math.round(d.similarity*100), barW=Math.max(4,pct);
    const col=d.similarity>=0.5?'#2ecc71':d.similarity>=0.3?'#f39c12':'#5b8fff';
    return `<tr>
      <td><div class="drug-name">${d.name}</div><div class="drug-chembl">${d.chembl_id}</div></td>
      <td><span class="action-badge ${actionClass(d.action)}">${d.action||'—'}</span></td>
      <td><span class="phase-pill ${phaseClass(d.phase)}">${d.phase_label}</span></td>
      <td><div class="sim-bar-wrap"><div class="sim-bar" style="width:${barW}%;background:${col}"></div>
          <div class="sim-num" style="color:${col}">${pct}%</div></div></td>
      <td style="font-size:.78rem">${d.MW!=null?d.MW:''}</td>
      <td style="font-size:.78rem">${d.LogP!=null?d.LogP:''}</td>
    </tr>`;
  }).join('');
}

function populate(d){
  set('smiles-txt',d.smiles);
  drawOn(d.smiles,'mol-canvas',620,300);
  const sv=document.getElementById('score-val');
  sv.textContent=d.pred_pIC50.toFixed(2); sv.style.color=scoreColor(d.pred_pIC50);

  let bl='';
  if(d.pred_pIC50>=8)      bl+='<span class="badge b-potent">Potent</span>';
  else if(d.pred_pIC50>=7) bl+='<span class="badge b-active">Active</span>';
  else                      bl+='<span class="badge b-weak">Moderate</span>';
  if(d.Lipinski)  bl+='<span class="badge b-blue">Lipinski ✓</span>';
  if(d.novel)     bl+='<span class="badge b-purple">Novel</span>';
  if(d.LeadLike)  bl+='<span class="badge b-blue">Lead-like</span>';
  if(d.PAINS)     bl+='<span class="badge b-red">PAINS</span>';
  set('badges',bl);

  set('p-mw',d.MW); set('p-logp',d.LogP); set('p-tpsa',d.TPSA);
  set('p-hbd',d.HBD); set('p-hba',d.HBA); set('p-rb',d.RotBonds);
  set('p-rings',d.Rings); set('p-ar',d.AromaticRings); set('p-ha',d.HeavyAtoms);
  set('p-fsp3',d.Fsp3); set('p-mr',d.MR); set('p-qed',d.QED);

  set('a-form',d.formula);
  const sC=d.Solubility==='Soluble'?'green':d.Solubility.startsWith('Moderate')?'orange':'red';
  set('a-esol',`<span class="${d.ESOL_logS>=-4?'green':d.ESOL_logS>=-6?'orange':'red'}">${d.ESOL_logS}</span>`);
  set('a-sol',`<span class="${sC}">${d.Solubility}</span>`);

  set('a-gi',  `<span class="${d.GI_absorption==='High'?'green':'orange'}">${d.GI_absorption}</span>`);
  set('a-bbb', yesno(d.BBB));
  set('a-pgp', yesno(d.Pgp_substrate,'orange','green'));
  set('a-kp',  `<span class="${d.LogKp>=-6?'orange':'green'}">${d.LogKp}</span>`);
  set('a-cyp1a2',  yesno(d.CYP1A2_inhibitor,'orange','green'));
  set('a-cyp2c9',  yesno(d.CYP2C9_inhibitor,'orange','green'));
  set('a-cyp2c19', yesno(d.CYP2C19_inhibitor,'orange','green'));
  set('a-cyp2d6',  yesno(d.CYP2D6_inhibitor,'orange','green'));
  set('a-cyp3a4',  yesno(d.CYP3A4_inhibitor,'orange','green'));
  set('a-herg',`<span class="${d.hERG==='Low'?'green':d.hERG==='Medium'?'orange':'red'}">${d.hERG}</span>`);

  const lC=d.LipViolations===0?'green':d.LipViolations===1?'orange':'red';
  set('a-lip',`<span class="${lC}">${d.LipViolations===0?'Pass':d.LipViolations+' violation'+(d.LipViolations>1?'s':'')}</span>`);
  set('a-ghose',  filter(d.Ghose,'Ghose'));
  set('a-veber',  filter(d.Veber,'Veber'));
  set('a-egan',   filter(d.Egan,'Egan'));
  set('a-muegge', filter(d.Muegge,'Muegge'));
  set('a-lead',   yesno(d.LeadLike));
  set('a-pains',  d.PAINS?`<span class="red">${d.PAINS}</span>`:`<span class="green">None</span>`);

  if(d.similar_drugs&&d.similar_drugs.length) renderSimTable(d.similar_drugs);
}

function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

function nextMolecule(){
  if(!POOL.length) return null;
  if(cursor>=order.length){order=shuffle([...Array(POOL.length).keys()]);cursor=0;}
  return POOL[order[cursor++]];
}

function gen(){
  const btn=document.getElementById('btn');
  if(!POOL.length){return;}
  btn.classList.add('busy');
  // brief async yield so the spinner shows, keeps the original feel
  setTimeout(()=>{
    const d=nextMolecule();
    if(!d){btn.classList.remove('busy');return;}
    count++; if(d.pred_pIC50>=7)active++; if(d.pred_pIC50>=8)potent++;
    if(d.pred_pIC50>best)best=d.pred_pIC50;
    document.getElementById('stats').style.display='flex';
    set('s-count',count);set('s-active',active);set('s-potent',potent);set('s-best',best.toFixed(2));
    const o=document.getElementById('outer');
    o.style.display='grid';
    o.classList.remove('refresh');void o.offsetWidth;o.classList.add('refresh');
    populate(d);
    history.unshift(d);if(history.length>10)history.pop();
    renderHistory();
    document.getElementById('hist-wrap').style.display='block';
    btn.classList.remove('busy');
  },120);
}

function renderHistory(){
  const strip=document.getElementById('hist-strip');
  strip.innerHTML='';
  history.forEach((mol,i)=>{
    const hc=document.createElement('div');
    hc.className='hcard';
    hc.innerHTML=`<canvas id="hc${i}" width="103" height="78"></canvas>
      <div class="hscore" style="color:${scoreColor(mol.pred_pIC50)}">${mol.pred_pIC50.toFixed(2)}</div>`;
    hc.onclick=()=>{populate(mol);const o=document.getElementById('outer');
      o.classList.remove('refresh');void o.offsetWidth;o.classList.add('refresh');};
    strip.appendChild(hc);
    setTimeout(()=>{
      const d2=new SmilesDrawer.Drawer({width:103,height:78,compactDrawing:true,terminalCarbons:false,
        themes:{light:{C:'#1a1a1a',O:'#c0392b',N:'#2471a3',S:'#b7950b',F:'#1e8449',
          Cl:'#1e8449',Br:'#6c3483',P:'#ca6f1e',BACKGROUND:'#ffffff'}}});
      SmilesDrawer.parse(mol.smiles,t=>d2.draw(t,`hc${i}`,'light',false),()=>{});
    },40*i);
  });
}

function copyS(){
  navigator.clipboard.writeText(document.getElementById('smiles-txt').textContent)
    .then(()=>{const b=document.getElementById('copy-btn');
      b.textContent='Copied!';b.style.color='var(--green)';
      setTimeout(()=>{b.textContent='Copy';b.style.color='';},1500);});
}

/* ---- load the pre-generated pool ---- */
(async function init(){
  const btnText=document.getElementById('btn-text');
  try{
    const r=await fetch('molecules.json');
    POOL=await r.json();
    order=shuffle([...Array(POOL.length).keys()]);
    btnText.textContent='Show Molecule';
    document.getElementById('btn').removeAttribute('disabled');
  }catch(e){
    btnText.textContent='Failed to load data';
    console.error('Could not load molecules.json',e);
  }
})();
