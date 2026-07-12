// Sticks: lista de pessoas (com composição, engajamento e filtros), perfil
// completo (Overview / Timeline / Presença), modais de pessoa e milestone,
// e o check-in de presença. "Uma pessoa = uma Stick."

import { state } from "../core/state.js";
import { esc, initials, agoLabel, iso, today, uid, ageOf, journeyLabel, journeySnap, attStrip, relLabelFull, isLeader, MSTYPE, timelineHtml, weeksSince } from "../core/helpers.js";
import { riskDist, unaccounted, inCampus, careReasons, signalsFor, relChip, stickBy, householdOf, stickTimeline, groupOptions } from "../core/derived.js";
import { save } from "../core/persist.js";
import { upsertStick, archiveStick } from "../core/sticks-repo.js";
import { openModal, openWide, closeModal } from "../ui/modal.js";
import { render } from "../core/render.js";

function stickMatch(p){var q=(state.stickSearch||"").toLowerCase();var rf=state.stickRel;var cf=state.stickCare;
  var mq=!q||p.name.toLowerCase().indexOf(q)>=0;
  var mr=!rf||(rf==="visitor"?p.relationship.indexOf("visitor")===0:(rf==="leader"?isLeader(p):p.relationship===rf));
  var n=careReasons(p).length;var lvl=n===0?"em":(n===1?"at":"ri");var mc=!cf||cf===lvl;
  return mq&&mr&&mc;
}
export function viewPeople(){
  if(state.stickDetail)return viewStickProfile(state.stickDetail);
  var ppl=state.people.filter(inCampus);
  var d=riskDist();var maxc=Math.max(d.em,d.at,d.ri,1);
  var eng=[["em","Em dia",d.em,"healthy"],["at","Atenção",d.at,"attention"],["ri","Em risco",d.ri,"risk"]].map(function(x){var w=Math.round(x[2]/maxc*100);var on=state.stickCare===x[0];return '<div class="engrow'+(on?" on":"")+'" data-scare="'+x[0]+'"><span class="englbl">'+x[1]+'</span><div class="engbar"><i class="'+x[3]+'" style="width:'+w+'%"></i></div><span class="engn">'+x[2]+'</span></div>';}).join("");
  var chips=[["","Todos"],["visitor","Visitantes"],["member","Membros"],["leader","Líderes"],["inactive","Inativos"]].map(function(c){var on=(state.stickRel||"")===c[0]||(!state.stickRel&&c[0]==="");return '<button class="fchip'+(on?" on":"")+'" data-srel="'+c[0]+'">'+c[1]+'</button>';}).join("");
  var list=ppl.filter(stickMatch);
  var rows=list.map(function(p){var sg=signalsFor(p.id).length;var age=ageOf(p);return '<tr data-stick="'+p.id+'"><td><b>'+esc(p.name)+'</b>'+(age!=null?' <span class="muted">· '+age+'a</span>':'')+'</td><td>'+relChip(p)+'</td><td>'+journeyLabel(p.journeyStage)+'</td><td>'+(p.group?esc(p.group):'<span class="muted">sem grupo</span>')+'</td><td>'+esc(agoLabel(p.lastSeen))+'</td><td>'+(sg?('<span class="chip care">'+sg+' sinal'+(sg>1?'is':'')+'</span>'):'<span class="muted">—</span>')+'</td></tr>';}).join("")||'<tr><td colspan="6" class="empty">Nenhuma Stick nesse filtro.</td></tr>';
  return '<div style="display:flex;align-items:flex-start;margin-bottom:6px"><div><h1 class="page">Sticks</h1><p class="sub" style="margin:0">Pessoas da sua igreja. Cada pessoa é uma Stick, uma vida que não passa despercebida.</p></div><button class="btn" id="addBtnTop" style="margin-left:auto">+ Nova pessoa</button></div>'
   +'<div class="ministrip" style="margin-top:14px"><div><div class="mi-k">Sticks</div><div class="mi-v">'+ppl.length+'</div></div><div><div class="mi-k">Visitantes</div><div class="mi-v">'+ppl.filter(function(p){return p.relationship.indexOf("visitor")===0;}).length+'</div></div><div><div class="mi-k">Precisam de atenção</div><div class="mi-v neg">'+unaccounted().length+'</div></div></div>'
   +'<div class="row2"><div class="panel"><div class="ph"><h3>Composição</h3></div><div class="donutwrap"><canvas id="compDonut"></canvas><div class="donutctr"><b>'+ppl.length+'</b><span>Sticks</span></div></div><div class="leg"><span data-srel="visitor" style="cursor:pointer"><i style="background:#2B5CE6"></i>Visitantes</span><span data-srel="member" style="cursor:pointer"><i style="background:#1FA97A"></i>Membros</span><span style="cursor:default"><i style="background:#8A96AE"></i>Inativos</span></div></div>'
   +'<div class="panel"><div class="ph"><h3>Engajamento</h3><span class="muted" style="margin-left:auto">toque numa faixa</span></div>'+eng+'</div></div>'
   +'<div class="panel" style="margin-bottom:16px"><div class="ph"><h3>Todas as Sticks</h3><input class="searchbox" style="max-width:220px;margin:0 0 0 auto" id="stickSearch" placeholder="Buscar por nome..." value="'+esc(state.stickSearch||"")+'"></div><div class="filtchips">'+chips+'</div><table style="border:none"><tr><th>Stick</th><th>Relação</th><th>Jornada</th><th>Grupo</th><th>Última presença</th><th>Sinais</th></tr>'+rows+'</table></div>';
}
function viewStickProfile(id){
  var p=stickBy(id);if(!p)return '<button class="link" id="stickBack">&#8592; Sticks</button><div class="empty">Stick não encontrada.</div>';
  var tab=state.stickTab||"overview";
  var age=ageOf(p);var hh=householdOf(p);
  var head='<button class="link" id="stickBack">&#8592; Voltar para Sticks</button><div class="dh" style="margin:12px 0 6px"><div class="av">'+initials(p.name)+'</div><div><div class="nm">'+esc(p.name)+'</div><div class="rl">'+relLabelFull(p)+(isLeader(p)?" · Líder":"")+' · '+esc(p.campus)+' · Jornada: '+journeyLabel(p.journeyStage)+'</div></div><button class="btn ghost" id="addMs" data-stick="'+p.id+'" style="margin-left:auto">+ Milestone</button></div>';
  var tabs='<div class="tabs2"><button class="tab2 '+(tab==="overview"?"on":"")+'" data-stab="overview">Overview</button><button class="tab2 '+(tab==="timeline"?"on":"")+'" data-stab="timeline">Timeline</button><button class="tab2 '+(tab==="attendance"?"on":"")+'" data-stab="attendance">Presença</button></div>';
  var body="";
  if(tab==="overview"){
    var ev=stickTimeline(p).slice(0,6);
    var grp=p.group?('<div class="kv"><span>Grupo</span><b>'+esc(p.group)+'</b></div>'):'';
    var hhh=hh?('<div class="kv"><span>Household</span><b>'+esc(hh.name)+'</b></div>'+hh.members.map(function(m){return '<div class="kv"><span></span><b style="font-weight:400">'+esc(m)+'</b></div>';}).join("")):'<div class="empty">Sem household conectado.</div>';
    var lastMs=(p.milestones||[]).slice().sort(function(a,b){return b.date.localeCompare(a.date);})[0];
    body='<div class="row2"><div class="panel"><div class="ph"><h3>Jornada</h3><span class="muted" style="margin-left:auto">'+journeyLabel(p.journeyStage)+'</span></div>'+journeySnap(p)+'<div class="ph" style="margin-top:18px"><h3>Timeline recente</h3></div>'+timelineHtml(ev)+'</div>'
     +'<div class="panel"><div class="ph"><h3>Contexto</h3></div><div class="kv"><span>Última presença</span><b>'+esc(agoLabel(p.lastSeen))+'</b></div><div class="kv"><span>Primeira visita</span><b>'+(p.firstVisit?p.firstVisit.split("-").reverse().join("/"):"—")+'</b></div>'+grp+'<div class="kv"><span>Origem</span><b>'+esc(p.source||"—")+'</b></div><div class="kv"><span>Milestone recente</span><b>'+(lastMs?esc(MSTYPE[lastMs.type]||lastMs.type):"—")+'</b></div><div class="ph" style="margin-top:16px"><h3>Household</h3></div>'+hhh+'</div></div>';
  } else if(tab==="timeline"){
    body='<div class="panel">'+timelineHtml(stickTimeline(p))+'</div>';
  } else {
    var ctx='<div class="kv"><span>Cultos de domingo</span><b>'+(72-Math.min(40,weeksSince(p.lastSeen)*6))+'%</b></div>'+(p.group?'<div class="kv"><span>'+esc(p.group)+'</span><b>'+(61)+'%</b></div>':'');
    var obs=careReasons(p).length?('Atenção: '+careReasons(p)[0].full):'Presença consistente.';
    body='<div class="row2"><div class="panel"><div class="ph"><h3>Frequência (12 semanas)</h3></div>'+attStrip(p)+'<div class="muted" style="margin-top:12px">'+esc(obs)+'</div></div><div class="panel"><div class="ph"><h3>Por contexto</h3></div>'+ctx+'</div></div>';
  }
  return head+tabs+body;
}
export function personModal(p){
  var e=p||{};
  openModal('<h3>'+(p?"Editar Stick":"Nova Stick")+'</h3><div class="field"><label>Nome</label><input id="f-name" value="'+(e.name?esc(e.name):"")+'" placeholder="Nome completo"></div><div class="mrow"><div class="field"><label>Relação</label><select id="f-rel"><option value="visitor_first" '+(e.relationship==="visitor_first"?"selected":"")+'>Visitante 1a vez</option><option value="visitor_returning" '+(e.relationship==="visitor_returning"?"selected":"")+'>Visitante recorrente</option><option value="attendee" '+(e.relationship==="attendee"?"selected":"")+'>Frequentador</option><option value="member" '+(e.relationship==="member"||!e.relationship?"selected":"")+'>Membro</option><option value="inactive" '+(e.relationship==="inactive"?"selected":"")+'>Inativo</option></select></div><div class="field"><label>Campus</label><select id="f-campus">'+state.institution.campuses.map(function(c){return '<option '+(((e.campus||state.activeCampus)===c)?"selected":"")+'>'+esc(c)+'</option>';}).join("")+'</select></div></div><div class="mrow"><div class="field"><label>Grupo</label><select id="f-group">'+groupOptions(e.group)+'</select></div><div class="field"><label>Última presença</label><input type="date" id="f-seen" value="'+(e.lastSeen||iso(today()))+'"></div></div><div class="field check"><input type="checkbox" id="f-leader" '+(isLeader(e)?"checked":"")+'><label>É líder</label></div><div class="field check"><input type="checkbox" id="f-followup" '+(e.followup?"checked":"")+'><label>Follow-up em aberto</label></div><div class="actions">'+(p?'<button class="btn danger" id="m-del">Arquivar</button>':"")+'<button class="btn ghost" id="m-cancel">Cancelar</button><button class="btn" id="m-save">Salvar</button></div>');
  document.getElementById("m-cancel").onclick=closeModal;
  document.getElementById("m-save").onclick=function(){var name=document.getElementById("f-name").value.trim();if(!name){document.getElementById("f-name").focus();return;}var rel=document.getElementById("f-rel").value;var roles=document.getElementById("f-leader").checked?["leader"]:[];var data={name:name,relationship:rel,roles:roles,campus:document.getElementById("f-campus").value,group:document.getElementById("f-group").value,lastSeen:document.getElementById("f-seen").value,followup:document.getElementById("f-followup").checked};if(p){Object.assign(p,data);upsertStick(p);}else{data.firstVisit=iso(today());data.journeyStage=(rel==="member")?"connected":"first_visit";data.source="Adicionado manualmente";data.household="";data.milestones=[{type:"first_visit",date:iso(today())}];var np=Object.assign({id:uid()},data);state.people.push(np);upsertStick(np).then(function(newId){if(newId&&newId!==np.id){np.id=newId;save();}});}save();closeModal();render();};
  if(p)document.getElementById("m-del").onclick=function(){archiveStick(p.id);state.people=state.people.filter(function(x){return x.id!==p.id;});save();closeModal();state.stickDetail=null;render();};
}
export function milestoneModal(id){
  var opts=Object.keys(MSTYPE).map(function(k){return '<option value="'+k+'">'+MSTYPE[k]+'</option>';}).join("");
  openModal('<h3>Adicionar milestone</h3><div class="field"><label>Tipo</label><select id="ms-type">'+opts+'</select></div><div class="mrow"><div class="field"><label>Data</label><input type="date" id="ms-date" value="'+iso(today())+'"></div></div><div class="field"><label>Nota (opcional)</label><input id="ms-note"></div><div class="actions"><button class="btn ghost" id="ms-cancel">Cancelar</button><button class="btn" id="ms-save">Adicionar</button></div>');
  document.getElementById("ms-cancel").onclick=closeModal;
  document.getElementById("ms-save").onclick=function(){var pp=stickBy(id);if(!pp)return;pp.milestones=pp.milestones||[];pp.milestones.push({type:document.getElementById("ms-type").value,date:document.getElementById("ms-date").value,note:document.getElementById("ms-note").value.trim()});save();closeModal();render();};
}

// Check-in de presença
let checkinSel=new Set();
function renderChk(filter){const f=(filter||"").toLowerCase();const list=state.people.filter(p=>p.campus===state.activeCampus&&p.name.toLowerCase().includes(f));document.getElementById("chklist").innerHTML=list.map(p=>'<div class="chkrow '+(checkinSel.has(p.id)?"sel":"")+'" data-chk="'+p.id+'"><span class="box">'+(checkinSel.has(p.id)?"✓":"")+'</span><span class="nm">'+esc(p.name)+'</span><span class="mt">'+esc(agoLabel(p.lastSeen))+'</span></div>').join("")||'<div class="empty">Ninguém neste campus.</div>';}
export function checkinModal(){
  checkinSel=new Set();
  openWide('<h3>Registrar presença</h3><div class="msub">'+esc(state.activeCampus)+' · hoje · toque em quem veio ao culto</div><input class="searchbox" id="chk-search" placeholder="Buscar pessoa..."><div class="chklist" id="chklist"></div><div class="actions"><button class="btn ghost" id="chk-cancel">Cancelar</button><button class="btn" id="chk-save">Salvar presença</button></div>');
  renderChk("");
  document.getElementById("chk-search").addEventListener("input",ev=>renderChk(ev.target.value));
  document.getElementById("chk-cancel").onclick=closeModal;
  document.getElementById("chk-save").onclick=()=>{const d=iso(today());state.people.forEach(p=>{if(checkinSel.has(p.id)){p.lastSeen=d;p.followup=false;upsertStick(p);}});if(checkinSel.size){if(!state.sessions)state.sessions=[];state.sessions.push({id:uid(),campus:state.activeCampus,group:"",date:d,attendees:Array.from(checkinSel),photo:null});}save();closeModal();render();};
}

// Marcar/desmarcar quem veio, dentro do modal de presença
document.addEventListener("click",e=>{const t=e.target;
  if(t.closest&&t.closest(".chkrow")){const row=t.closest(".chkrow");const id=row.dataset.chk;if(checkinSel.has(id))checkinSel.delete(id);else checkinSel.add(id);renderChk(document.getElementById("chk-search").value);return;}
});

// Navegação e filtros das Sticks
document.addEventListener("click",function(e){var t=e.target.closest?e.target.closest("[data-stick],[data-srel],[data-scare],#stickBack,[data-stab],#addBtnTop,#addMs"):null;if(!t)return;
  if(t.id==="addMs"){milestoneModal(t.getAttribute("data-stick"));return;}
  if(t.getAttribute("data-stick")){state.stickDetail=t.getAttribute("data-stick");state.stickTab="overview";state.view="people";save();render();return;}
  if(t.id==="stickBack"){state.stickDetail=null;save();render();return;}
  if(t.getAttribute("data-stab")){state.stickTab=t.getAttribute("data-stab");save();render();return;}
  if(t.id==="addBtnTop"){personModal(null);return;}
  if(t.hasAttribute("data-srel")){var v=t.getAttribute("data-srel");state.stickRel=v||null;save();render();return;}
  if(t.hasAttribute("data-scare")){var c=t.getAttribute("data-scare");state.stickCare=(state.stickCare===c)?null:c;save();render();return;}
});
document.addEventListener("input",function(e){if(e.target.id==="stickSearch"){state.stickSearch=e.target.value;var ppl=state.people.filter(inCampus).filter(stickMatch);/*light re-render*/render();var si=document.getElementById("stickSearch");if(si){si.focus();si.value=state.stickSearch;si.setSelectionRange(si.value.length,si.value.length);}}});
document.addEventListener("click",function(e){var t=e.target.closest?e.target.closest("[data-pfilter],#clearPfilter"):null;if(!t)return;
  if(t.id==="clearPfilter"){state.peopleFilter=null;save();render();return;}
  var v=t.getAttribute("data-pfilter");if(v){var p=v.split(":");var nf={type:p[0],val:p[1]};state.peopleFilter=(state.peopleFilter&&state.peopleFilter.type===nf.type&&state.peopleFilter.val===nf.val)?null:nf;save();render();}
});
