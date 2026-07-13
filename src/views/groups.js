// Saúde dos Grupos: distribuição, cards por grupo, relatório de grupo
// e modal de novo grupo. (O donut clicável vive em ui/charts.js.)

import { state } from "../core/state.js";
import { esc, uid, initials, agoLabel } from "../core/helpers.js";
import { groupsHealth, inCampus, careReasons, relChip } from "../core/derived.js";
import { save } from "../core/persist.js";
import { upsertGroup } from "../core/groups-repo.js";
import { openModal, closeModal } from "../ui/modal.js";
import { render } from "../core/render.js";

export function viewGroups(){
  if(state.groupDetail)return viewGroupDetail(state.groupDetail);
  var gs=groupsHealth();
  var h=gs.filter(function(x){return x.band==="healthy";}).length,a=gs.filter(function(x){return x.band==="attention";}).length,r=gs.filter(function(x){return x.band==="risk";}).length;
  var bandf=state.groupBand;
  var cards=gs.filter(function(x){return !bandf||x.band===bandf;}).map(function(x){return '<button class="gcard" data-groupdetail="'+esc(x.name)+'"><div class="gc-top"><span class="gc-name">'+esc(x.name)+'</span><span class="hb '+x.band+'">'+x.rate+'%</span></div><div class="gc-sub">'+(x.leader?esc(x.leader):'sem líder')+' · '+x.count+' membros</div><div class="gbar"><i class="'+x.band+'" style="width:'+x.rate+'%"></i></div><div class="gc-foot">'+x.acc+' em dia · '+(x.count-x.acc)+' sinalizados'+(x.newMembers>0?(' · '+x.newMembers+' novo'+(x.newMembers>1?'s':'')):'')+'</div></button>';}).join("")||'<div class="empty">Nenhum grupo aqui. Crie o primeiro.</div>';
  var clr=bandf?'<button class="link" id="clearBand" style="margin-left:8px">limpar</button>':'';
  return '<div style="display:flex;align-items:flex-start;margin-bottom:18px"><div><h1 class="page">Saúde dos Grupos</h1><p class="sub" style="margin:0">'+esc(state.activeCampus)+' · toque num grupo para ver o relatório'+clr+'</p></div><button class="btn" id="newGroup" style="margin-left:auto">+ Novo grupo</button></div><div class="gtop"><div class="panel"><div class="ph"><h3>Distribuição de saúde</h3></div><div class="donutwrap"><canvas id="gdist"></canvas><div class="donutctr"><b>'+gs.length+'</b><span>grupos</span></div></div><div class="leg"><span><i style="background:#1FA97A"></i>Saudável · '+h+'</span><span><i style="background:#E8833A"></i>Atenção · '+a+'</span><span><i style="background:#EA5B4C"></i>Em risco · '+r+'</span></div></div><div class="gcards">'+cards+'</div></div>';
}
export function viewGroupDetail(name){
  var g=(state.groups||[]).find(function(x){return x.name===name;})||{name:name};
  var members=state.people.filter(function(p){return p.group===name&&inCampus(p);});
  var acc=members.filter(function(p){return careReasons(p).length===0;}).length;
  var rate=members.length?Math.round(acc/members.length*100):0;var band=members.length===0?"attention":(rate>=85?"healthy":(rate>=70?"attention":"risk"));
  var mem=members.map(function(p){var care=careReasons(p);var chip=relChip(p);return '<div class="li"><div class="av'+(care.length?' c':'')+'">'+initials(p.name)+'</div><div><div><b>'+esc(p.name)+'</b></div><div class="meta">'+esc(agoLabel(p.lastSeen))+(care.length?' · '+esc(care[0].t):'')+'</div></div><div class="right">'+chip+'</div></div>';}).join("")||'<div class="empty">Sem membros. Adicione pessoas na aba Pessoas e defina o grupo.</div>';
  var prs=(state.prayers||[]).filter(function(p){return p.group===name&&!p.answered;});
  var prl=prs.map(function(p){return '<div class="li"><div class="av c">'+initials(p.author)+'</div><div><div><b>'+esc(p.author)+'</b></div><div class="meta">'+esc(p.request)+'</div></div></div>';}).join("")||'<div class="empty">Nenhum pedido ativo.</div>';
  return '<button class="link" id="groupsBack">&#8592; Voltar aos grupos</button><div style="margin:10px 0 18px"><h1 class="page">'+esc(name)+'</h1><p class="sub" style="margin:0">'+(g.leader?('Líder: '+esc(g.leader)):'Sem líder')+(g.day?(' · '+esc(g.day)+' '+esc(g.time||'')):'')+'</p></div><div class="cards"><div class="stat"><div class="k">Membros</div><div class="v">'+members.length+'</div></div><div class="stat"><div class="k">Em dia</div><div class="v pos">'+acc+'</div></div><div class="stat"><div class="k">Saúde</div><div class="v" style="padding-top:4px"><span class="hb '+band+'">'+rate+'%</span></div></div><div class="stat"><div class="k">Pedidos ativos</div><div class="v">'+prs.length+'</div></div></div><div class="row2"><div class="panel"><div class="ph"><h3>Membros</h3></div>'+mem+'</div><div class="panel"><div class="ph"><h3>Orações do grupo</h3></div>'+prl+'</div></div>';
}
export function newGroupModal(){
  var ppl=state.people.filter(inCampus);
  openModal('<h3>Novo grupo</h3><div class="field"><label>Nome do grupo</label><input id="g-name" placeholder="Ex.: Jovens"></div><div class="mrow"><div class="field"><label>Líder</label><select id="g-leader"><option value="">(sem líder)</option>'+ppl.map(function(p){return '<option>'+esc(p.name)+'</option>';}).join("")+'</select></div><div class="field"><label>Campus</label><select id="g-campus">'+state.institution.campuses.map(function(c){return '<option '+(c===state.activeCampus?'selected':'')+'>'+esc(c)+'</option>';}).join("")+'</select></div></div><div class="mrow"><div class="field"><label>Dia</label><input id="g-day" placeholder="Ex.: Quarta"></div><div class="field"><label>Horário</label><input id="g-time" placeholder="Ex.: 20h"></div></div><div class="actions"><button class="btn ghost" id="g-cancel">Cancelar</button><button class="btn" id="g-save">Criar grupo</button></div>');
  document.getElementById("g-cancel").onclick=closeModal;
  document.getElementById("g-save").onclick=function(){var n=document.getElementById("g-name").value.trim();if(!n)return;var ng={id:uid(),name:n,leader:document.getElementById("g-leader").value,campus:document.getElementById("g-campus").value,day:document.getElementById("g-day").value.trim(),time:document.getElementById("g-time").value.trim()};state.groups.push(ng);upsertGroup(ng).then(function(newId){if(newId&&newId!==ng.id){ng.id=newId;save();}});save();closeModal();render();};
}

// Navegação de grupos + limpar filtros (grupos, risco do dashboard, categoria de finanças)
document.addEventListener("click",function(e){var t=e.target.closest?e.target.closest("[data-groupdetail],#groupsBack,#newGroup,#clearBand,#clearRisk,#clearFinCat"):null;if(!t)return;
  if(t.getAttribute&&t.getAttribute("data-groupdetail")){state.groupDetail=t.getAttribute("data-groupdetail");state.groupBand=null;state.view="groups";save();render();}
  else if(t.id==="groupsBack"){state.groupDetail=null;save();render();}
  else if(t.id==="newGroup")newGroupModal();
  else if(t.id==="clearBand"){state.groupBand=null;save();render();}
  else if(t.id==="clearRisk"){state.dashRisk=null;save();render();}
  else if(t.id==="clearFinCat"){state.finCat=null;save();render();}
});
