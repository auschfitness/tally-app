// Saúde dos Grupos: distribuição, cards por grupo, relatório de grupo
// e modal de novo grupo. (O donut clicável vive em ui/charts.js.)

import { state } from "../core/state.js";
import { esc, uid, initials, agoLabel, iso, today } from "../core/helpers.js";
import { groupsHealth, inCampus, careReasons, relChip } from "../core/derived.js";
import { save } from "../core/persist.js";
import { upsertGroup } from "../core/groups-repo.js";
import { setGroupLeader } from "../core/group-members-repo.js";
import { upsertSession } from "../core/attendance-repo.js";
import { openModal, openWide, closeModal } from "../ui/modal.js";
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
  // Presença recente do grupo (sessões com context='group')
  var gss=(state.sessions||[]).filter(function(s){return s.group===name;}).slice().sort(function(a,b){return (b.date||"").localeCompare(a.date||"");});
  var att=gss.slice(0,6).map(function(s){var n=(s.attendees||[]).length;return '<div class="li"><div class="av">'+n+'</div><div><div><b>'+(s.date?s.date.split("-").reverse().join("/"):'')+'</b></div><div class="meta">'+n+' presente'+(n!==1?'s':'')+'</div></div></div>';}).join("")||'<div class="empty">Sem registros de presença ainda. Toque em "Registrar presença".</div>';
  // Controle de líder (select dos membros)
  var lsel='<select id="gd-leader"><option value="">(sem líder)</option>'+members.map(function(p){return '<option'+(g.leader===p.name?' selected':'')+'>'+esc(p.name)+'</option>';}).join("")+'</select>';
  return '<button class="link" id="groupsBack">&#8592; Voltar aos grupos</button><div style="display:flex;align-items:flex-start;margin:10px 0 18px"><div><h1 class="page">'+esc(name)+'</h1><p class="sub" style="margin:0">'+(g.leader?('Líder: '+esc(g.leader)):'Sem líder')+(g.day?(' · '+esc(g.day)+' '+esc(g.time||'')):'')+'</p></div><button class="btn" id="gd-attend" data-group="'+esc(name)+'" style="margin-left:auto">Registrar presença</button></div><div class="cards"><div class="stat"><div class="k">Membros</div><div class="v">'+members.length+'</div></div><div class="stat"><div class="k">Em dia</div><div class="v pos">'+acc+'</div></div><div class="stat"><div class="k">Saúde</div><div class="v" style="padding-top:4px"><span class="hb '+band+'">'+rate+'%</span></div></div><div class="stat"><div class="k">Pedidos ativos</div><div class="v">'+prs.length+'</div></div></div><div class="row2"><div class="panel"><div class="ph"><h3>Membros</h3></div>'+mem+'</div><div class="panel"><div class="ph"><h3>Presença recente</h3></div>'+att+'</div></div><div class="row2"><div class="panel"><div class="ph"><h3>Líder</h3></div><div class="mrow"><div class="field"><label>Definir líder do grupo</label>'+lsel+'</div><div class="field" style="display:flex;align-items:flex-end"><button class="btn ghost" id="gd-savelead" data-group="'+esc(name)+'">Salvar líder</button></div></div></div><div class="panel"><div class="ph"><h3>Orações do grupo</h3></div>'+prl+'</div></div>';
}
export function groupAttendanceModal(name){
  var members=state.people.filter(function(p){return p.group===name&&inCampus(p);});
  var list=members.map(function(p){return '<label class="chkrow"><input type="checkbox" class="gd-att-chk" value="'+p.id+'"><span>'+esc(p.name)+'</span></label>';}).join("")||'<div class="empty">Sem membros neste grupo. Adicione pessoas ao grupo primeiro.</div>';
  openWide('<h3>Registrar presença · '+esc(name)+'</h3><div class="msub">'+esc(state.activeCampus)+' · hoje · marque quem veio</div><div class="chklist">'+list+'</div><div class="actions"><button class="btn ghost" id="gd-att-cancel">Cancelar</button><button class="btn" id="gd-att-save" data-group="'+esc(name)+'">Salvar presença</button></div>');
  document.getElementById("gd-att-cancel").onclick=closeModal;
  document.getElementById("gd-att-save").onclick=function(){
    var sel=[].slice.call(document.querySelectorAll(".gd-att-chk:checked")).map(function(c){return c.value;});
    if(!sel.length){closeModal();return;}
    var ns={id:uid(),campus:state.activeCampus,group:name,date:iso(today()),attendees:sel,photo:null};
    if(!state.sessions)state.sessions=[];state.sessions.push(ns);
    upsertSession(ns).then(function(newId){if(newId&&newId!==ns.id){ns.id=newId;save();}});
    save();closeModal();render();
  };
}
export function newGroupModal(){
  var ppl=state.people.filter(inCampus);
  openModal('<h3>Novo grupo</h3><div class="field"><label>Nome do grupo</label><input id="g-name" placeholder="Ex.: Jovens"></div><div class="mrow"><div class="field"><label>Líder</label><select id="g-leader"><option value="">(sem líder)</option>'+ppl.map(function(p){return '<option>'+esc(p.name)+'</option>';}).join("")+'</select></div><div class="field"><label>Campus</label><select id="g-campus">'+state.institution.campuses.map(function(c){return '<option '+(c===state.activeCampus?'selected':'')+'>'+esc(c)+'</option>';}).join("")+'</select></div></div><div class="mrow"><div class="field"><label>Dia</label><input id="g-day" placeholder="Ex.: Quarta"></div><div class="field"><label>Horário</label><input id="g-time" placeholder="Ex.: 20h"></div></div><div class="actions"><button class="btn ghost" id="g-cancel">Cancelar</button><button class="btn" id="g-save">Criar grupo</button></div>');
  document.getElementById("g-cancel").onclick=closeModal;
  document.getElementById("g-save").onclick=function(){var n=document.getElementById("g-name").value.trim();if(!n)return;var ng={id:uid(),name:n,leader:document.getElementById("g-leader").value,campus:document.getElementById("g-campus").value,day:document.getElementById("g-day").value.trim(),time:document.getElementById("g-time").value.trim()};state.groups.push(ng);upsertGroup(ng).then(function(newId){if(newId&&newId!==ng.id){ng.id=newId;save();}if(ng.leader)setGroupLeader(ng.name,ng.leader);});save();closeModal();render();};
}

// Navegação de grupos + limpar filtros (grupos, risco do dashboard, categoria de finanças)
document.addEventListener("click",function(e){var t=e.target.closest?e.target.closest("[data-groupdetail],#groupsBack,#newGroup,#gd-attend,#gd-savelead,#clearBand,#clearRisk,#clearFinCat"):null;if(!t)return;
  if(t.id==="gd-attend"){groupAttendanceModal(t.getAttribute("data-group"));return;}
  if(t.id==="gd-savelead"){var sl=document.getElementById("gd-leader");setGroupLeader(t.getAttribute("data-group"),sl?sl.value:"");render();return;}
  if(t.getAttribute&&t.getAttribute("data-groupdetail")){state.groupDetail=t.getAttribute("data-groupdetail");state.groupBand=null;state.view="groups";save();render();}
  else if(t.id==="groupsBack"){state.groupDetail=null;save();render();}
  else if(t.id==="newGroup")newGroupModal();
  else if(t.id==="clearBand"){state.groupBand=null;save();render();}
  else if(t.id==="clearRisk"){state.dashRisk=null;save();render();}
  else if(t.id==="clearFinCat"){state.finCat=null;save();render();}
});
