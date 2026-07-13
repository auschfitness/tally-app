// Trilhas (Discipleship Tracks — Step 4 · Fase 5): lista de trilhas e, no detalhe,
// etapas + matrículas com progresso ("Nome · 3 de 5"). Progresso é PARTICIPAÇÃO
// (etapas concluídas), nunca nota. Concluir a última etapa cria milestone + timeline
// (na camada de dados); a Journey NÃO é movida automaticamente.

import { state } from "../core/state.js";
import { save } from "../core/persist.js";
import { esc, initials } from "../core/helpers.js";
import { inCampus } from "../core/derived.js";
import { createTrack, addStep, enroll, advanceStep } from "../core/tracks-repo.js";
import { openModal, closeModal } from "../ui/modal.js";
import { render } from "../core/render.js";

export function viewStudy(){
  if(state.trackDetail) return viewTrackDetail(state.trackDetail);
  var tracks=state.tracks||[];var enr=state.trackEnrollments||[];
  var cards=tracks.map(function(t){
    var steps=(t.steps||[]).length;
    var ens=enr.filter(function(e){return e.track_id===t.id;});
    var done=ens.filter(function(e){return e.status==="completed";}).length;
    return '<button class="gcard" data-trackdetail="'+t.id+'"><div class="gc-top"><span class="gc-name">'+esc(t.name)+'</span><span class="muted">'+steps+' etapa'+(steps!==1?'s':'')+'</span></div><div class="gc-sub">'+(t.type?esc(t.type)+' · ':'')+ens.length+' matriculado'+(ens.length!==1?'s':'')+(done?(' · '+done+' concluíram'):'')+'</div></button>';
  }).join("")||'<div class="empty">Nenhuma trilha ainda. Crie a primeira (ex.: Fundamentos da Fé).</div>';
  return '<div style="display:flex;align-items:flex-start;margin-bottom:18px"><div><h1 class="page">Trilhas</h1><p class="sub" style="margin:0">Discipulado com caminho claro. Progresso é participação, não nota.</p></div><button class="btn" id="newTrack" style="margin-left:auto">+ Nova trilha</button></div><div class="gcards">'+cards+'</div>';
}

function viewTrackDetail(id){
  var t=(state.tracks||[]).find(function(x){return x.id===id;});
  if(!t) return '<button class="link" id="studyBack">&#8592; Voltar às trilhas</button><div class="empty">Trilha não encontrada.</div>';
  var steps=(t.steps||[]).slice().sort(function(a,b){return a.position-b.position;});var total=steps.length;
  var stepList=steps.map(function(s){return '<div class="li"><div class="av">'+s.position+'</div><div><div><b>'+esc(s.name)+'</b></div>'+(s.description?'<div class="meta">'+esc(s.description)+'</div>':'')+'</div></div>';}).join("")||'<div class="empty">Sem etapas. Adicione a primeira abaixo.</div>';
  var enr=(state.trackEnrollments||[]).filter(function(e){return e.track_id===id;});
  var enrList=enr.map(function(e){
    var p=(state.people||[]).find(function(x){return x.id===e.stick_id;});var nome=p?p.name:"—";
    var curIdx=steps.findIndex(function(s){return s.id===e.current_step_id;});
    var pos=e.status==="completed"?total:(curIdx>=0?curIdx+1:0);var pct=total?Math.round(pos/total*100):0;
    var right=e.status==="completed"?'<span class="hb healthy">Concluída</span>':'<button class="btn ghost sm" data-advance="'+e.id+'">Avançar etapa</button>';
    return '<div class="li"><div class="av'+(e.status==="completed"?'':' c')+'">'+initials(nome)+'</div><div style="flex:1"><div><b>'+esc(nome)+'</b> <span class="muted">· '+pos+' de '+total+'</span></div><div class="gbar" style="margin-top:5px"><i class="healthy" style="width:'+pct+'%"></i></div></div><div class="right">'+right+'</div></div>';
  }).join("")||'<div class="empty">Ninguém matriculado ainda.</div>';
  var enrolledIds=enr.map(function(e){return e.stick_id;});
  var ppl=(state.people||[]).filter(inCampus).filter(function(p){return enrolledIds.indexOf(p.id)<0;});
  var enrollCtl=ppl.length?('<div class="mrow"><div class="field"><label>Matricular pessoa</label><select id="tr-enroll">'+ppl.map(function(p){return '<option value="'+p.id+'">'+esc(p.name)+'</option>';}).join("")+'</select></div><div class="field" style="display:flex;align-items:flex-end"><button class="btn ghost" id="tr-enroll-btn" data-track="'+id+'">Matricular</button></div></div>'):'<div class="muted">Todos do campus já estão matriculados.</div>';
  // Material de ensino (Step 5 · Fase 6): sermões vinculados a esta trilha via
  // content.track_id (vínculo leve, sem tabela nova). Clicar abre o sermão no Study.
  var teaching=(state.sermons||[]).filter(function(s){return s.content&&s.content.track_id===id;});
  var teachList=teaching.map(function(s){
    return '<button class="li" data-sermonlink="'+s.id+'" style="width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--border);cursor:pointer"><div style="flex:1"><b>'+esc(s.title||"(sem título)")+'</b>'+(s.main_passage?' <span class="muted">· '+esc(s.main_passage)+'</span>':'')+'</div></button>';
  }).join("")||'<div class="empty">Nenhum sermão vinculado como material desta trilha. Vincule pelo editor de sermão (Propriedades → Trilha).</div>';
  return '<button class="link" id="studyBack">&#8592; Voltar às trilhas</button><div style="margin:10px 0 18px"><h1 class="page">'+esc(t.name)+'</h1><p class="sub" style="margin:0">'+(t.description?esc(t.description):'Trilha de discipulado')+'</p></div>'
    +'<div class="row2"><div class="panel"><div class="ph"><h3>Etapas</h3></div>'+stepList+'<div class="mrow" style="margin-top:12px"><div class="field"><label>Nova etapa</label><input id="tr-step-name" placeholder="Ex.: Batismo"></div><div class="field" style="display:flex;align-items:flex-end"><button class="btn ghost" id="tr-step-btn" data-track="'+id+'">Adicionar etapa</button></div></div></div>'
    +'<div class="panel"><div class="ph"><h3>Matriculados</h3></div>'+enrList+'<div style="margin-top:12px">'+enrollCtl+'</div></div></div>'
    +'<div class="panel" style="margin-top:16px"><div class="ph"><h3>Material de ensino</h3><span class="muted" style="margin-left:auto">'+teaching.length+' sermã'+(teaching.length===1?'o':'os')+'</span></div>'+teachList+'</div>';
}

function newTrackModal(){
  openModal('<h3>Nova trilha</h3><div class="field"><label>Nome</label><input id="tr-name" placeholder="Ex.: Fundamentos da Fé"></div><div class="field"><label>Descrição (opcional)</label><input id="tr-desc" placeholder="Para quem é / objetivo"></div><div class="field"><label>Tipo (opcional)</label><input id="tr-type" placeholder="Ex.: Novo convertido"></div><div class="actions"><button class="btn ghost" id="tr-cancel">Cancelar</button><button class="btn" id="tr-save">Criar trilha</button></div>');
  document.getElementById("tr-cancel").onclick=closeModal;
  document.getElementById("tr-save").onclick=function(){var n=document.getElementById("tr-name").value.trim();if(!n)return;createTrack({name:n,description:document.getElementById("tr-desc").value.trim(),type:document.getElementById("tr-type").value.trim()}).then(function(id){closeModal();if(id)state.trackDetail=id;render();});};
}

document.addEventListener("click",function(e){
  var t=e.target.closest?e.target.closest("[data-trackdetail],#studyBack,#newTrack,[data-advance],#tr-step-btn,#tr-enroll-btn,[data-sermonlink]"):null;if(!t)return;
  if(t.getAttribute("data-sermonlink")){state.view="sermons";state.studyTab="library";state.seriesDetail=null;state.scriptureMap=false;state.sermonEdit=t.getAttribute("data-sermonlink");save();render();return;}
  if(t.getAttribute("data-trackdetail")){state.trackDetail=t.getAttribute("data-trackdetail");save();render();return;}
  if(t.id==="studyBack"){state.trackDetail=null;save();render();return;}
  if(t.id==="newTrack"){newTrackModal();return;}
  if(t.getAttribute("data-advance")){advanceStep(t.getAttribute("data-advance")).then(function(){render();});return;}
  if(t.id==="tr-step-btn"){var nm=document.getElementById("tr-step-name");var v=nm?nm.value.trim():"";if(!v)return;addStep(t.getAttribute("data-track"),{name:v}).then(function(){render();});return;}
  if(t.id==="tr-enroll-btn"){var sel=document.getElementById("tr-enroll");if(!sel||!sel.value)return;enroll(sel.value,t.getAttribute("data-track")).then(function(){render();});return;}
});
