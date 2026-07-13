// Home: saudação, "Hoje no Tally" (Pulse), frequência, risco pastoral,
// Care Radar, grupos em atenção e a faixa "Para celebrar".

import { state } from "../core/state.js";
import { save } from "../core/persist.js";
import { render } from "../core/render.js";
import { esc, initials, agoLabel, isThisMonth } from "../core/helpers.js";
import { inCampus, riskDist, attendanceSeries, careReasons, groupsHealth, activeSignals, communityInsights } from "../core/derived.js";

var SERMON_STATUS_LBL = { draft: "Rascunho", preparing: "Preparando", ready: "Pronto", preached: "Pregado", archived: "Arquivado" };
function hBrDate(d) { return d ? d.split("-").reverse().join("/") : ""; }

export function viewDashboard(){
  var ppl=state.people.filter(inCampus);var d=riskDist();var total=d.em+d.at+d.ri;
  var s=attendanceSeries();var last=s.data[s.data.length-1],prev=s.data[s.data.length-2];
  var wk=(state.dashWeek!=null&&s.data[state.dashWeek]!=null)?state.dashWeek:null;var cap;
  if(wk!=null){var dv=wk>0?(s.data[wk]-s.data[wk-1]):0;cap="Semana "+s.labels[wk]+": "+s.data[wk]+" presentes "+(dv>=0?("(+"+dv+")"):("("+dv+")"));}
  else{var drop=last-prev;cap=(drop<0?("Queda de "+(-drop)+" na última semana"):("Última semana: "+last+" presentes"));}
  var rf=state.dashRisk;
  var flagged=ppl.filter(function(p){var n=careReasons(p).length;if(rf==="em")return n===0;if(rf==="at")return n===1;if(rf==="ri")return n>=2;return n>0;});
  flagged.sort(function(a,b){return careReasons(b).length-careReasons(a).length;});
  var care=flagged.slice(0,8).map(function(p){var rs=careReasons(p);var ok=rs.length===0;return '<div class="li"><div class="av'+(ok?"":" c")+'">'+initials(p.name)+'</div><div><div><b>'+esc(p.name)+'</b></div><div class="meta">'+(ok?"Em dia":esc(rs[0].full))+'</div></div><div class="right">'+(ok?'<span class="chip member">Em dia</span>':'<button class="btn ghost sm" data-seen="'+p.id+'">Marquei presença</button>')+'</div></div>';}).join("")||'<div class="empty">Ninguém nessa faixa.</div>';
  var rl={em:"em dia",at:"em atenção",ri:"em risco"};
  var carehead=rf?('Filtrando: '+rl[rf]+' <button class="link" id="clearRisk">limpar</button>'):'Pessoas que precisam de atenção';
  var gs=(typeof groupsHealth==="function")?groupsHealth().slice(0,3):[];
  var grows=gs.map(function(x){return '<button class="gcard" data-groupdetail="'+esc(x.name)+'" style="width:100%;margin-bottom:9px"><div class="gc-top"><span class="gc-name">'+esc(x.name)+'</span><span class="hb '+x.band+'">'+x.rate+'%</span></div><div class="gbar"><i class="'+x.band+'" style="width:'+x.rate+'%"></i></div></button>';}).join("")||'<div class="empty">Sem grupos.</div>';
  return '<div style="display:flex;align-items:baseline;margin-bottom:16px"><h1 class="page">Bom te ver, '+esc(state.account.name||"")+'</h1><span class="sub" style="margin:0 0 0 12px">'+esc(state.activeCampus)+' · últimas 8 semanas</span></div>'+todayStrip()+'<div class="row2"><div class="panel"><div class="ph"><h3>Frequência</h3><span class="muted" style="margin-left:auto">'+cap+'</span></div><div class="chartbox"><canvas id="attChart"></canvas></div></div><div class="panel"><div class="ph"><h3>Risco pastoral</h3></div><div class="donutwrap"><canvas id="riskDonut"></canvas><div class="donutctr"><b>'+total+'</b><span>pessoas</span></div></div><div class="leg"><span><i style="background:#1FA97A"></i>Em dia · '+d.em+'</span><span><i style="background:#E8833A"></i>Atenção · '+d.at+'</span><span><i style="background:#EA5B4C"></i>Em risco · '+d.ri+'</span></div></div></div><div class="row2"><div class="panel"><div class="ph"><h3>Care Radar</h3><span class="muted" style="margin-left:auto">'+carehead+'</span></div>'+care+'</div><div class="panel"><div class="ph"><h3>Grupos em atenção</h3></div>'+grows+'</div></div>'+communityPanel()+studyPanel()+celebRow();
}

// Painel de Comunidade (Fase 6): padrões úteis de conexão — dado real, sem grafo.
export function communityPanel(){
  var ci=communityInsights();
  var pat='<div class="li"><div><b>'+ci.inGroup+' de '+ci.total+'</b> em algum grupo <span class="muted">('+ci.connRate+'% conectados)</span></div></div>';
  if(ci.noGroup.length)pat+='<div class="li"><div><b class="neg">'+ci.noGroup.length+'</b> sem comunidade</div></div>';
  if(ci.groupsNoNew.length)pat+='<div class="li"><div><b>'+ci.groupsNoNew.length+'</b> grupo(s) sem novatos <span class="muted">(30 dias)</span></div></div>';
  if(ci.groupsNoLeader.length)pat+='<div class="li"><div><b>'+ci.groupsNoLeader.length+'</b> grupo(s) sem líder</div></div>';
  pat+='<div class="li"><div>'+(ci.movement30>0?('<b>'+ci.movement30+'</b> mudança(s) de estágio nos últimos 30 dias'):'<span class="muted">Sem movimento de jornada registrado ainda.</span>')+'</div></div>';
  var noGroupList=ci.noGroup.slice(0,6).map(function(p){var vis=(p.relationship&&p.relationship.indexOf("visitor")===0);return '<div class="li"><div class="av c">'+initials(p.name)+'</div><div><div><b>'+esc(p.name)+'</b></div><div class="meta">sem grupo'+(vis?' · visitante':'')+'</div></div><div class="right"><button class="btn ghost sm" data-stick="'+p.id+'">Abrir</button></div></div>';}).join("")||'<div class="empty">Todo mundo está em algum grupo.</div>';
  return '<div class="row2" style="margin-top:16px"><div class="panel"><div class="ph"><h3>Comunidade</h3><span class="muted" style="margin-left:auto">onde as relações acontecem</span></div>'+pat+'</div><div class="panel"><div class="ph"><h3>Pessoas sem comunidade</h3></div>'+noGroupList+'</div></div>';
}

// Painel de Estudo na Home (Step 5 · Fase 6): superfície de dado REAL do ensino —
// último sermão, série atual, atividade recente. Não é ilha: alimenta a Home como
// os outros módulos. Some por inteiro quando a igreja ainda não usa o Study (evita
// painel de ensino vazio), como a faixa "Para celebrar".
export function studyPanel(){
  var sermons=state.sermons||[];var series=state.series||[];var notes=state.notes||[];
  if(!sermons.length&&!series.length&&!notes.length)return "";
  // Último sermão: pregado mais recente; senão o mais recente por data (hydrate já ordena).
  function byDateDesc(a,b){var da=a.sermon_date||"",db=b.sermon_date||"";return da<db?1:(da>db?-1:0);}
  var preached=sermons.filter(function(s){return s.status==="preached";}).slice().sort(byDateDesc);
  var last=preached[0]||sermons[0]||null;
  // Série atual: ativa; senão planejando.
  var cur=series.filter(function(s){return s.status==="active";})[0]||series.filter(function(s){return s.status==="planning";})[0]||null;
  var lastBox=last
    ? '<button class="li" data-sermonopen="'+last.id+'" style="width:100%;text-align:left;background:none;border:0;cursor:pointer;padding:6px 0"><div style="flex:1"><div class="mi-k">Último sermão</div><div><b>'+esc(last.title||"(sem título)")+'</b></div><div class="meta">'+((last.main_passage?esc(last.main_passage)+" · ":"")+(last.sermon_date?hBrDate(last.sermon_date):(SERMON_STATUS_LBL[last.status]||"")))+'</div></div></button>'
    : '<div style="padding:6px 0"><div class="mi-k">Último sermão</div><div class="empty">Nenhum sermão ainda.</div></div>';
  var curBox=cur
    ? '<button class="li" data-seriesopen="'+cur.id+'" style="width:100%;text-align:left;background:none;border:0;cursor:pointer;padding:6px 0"><div style="flex:1"><div class="mi-k">Série atual</div><div><b>'+esc(cur.title||"(sem título)")+'</b></div><div class="meta">'+(cur.theme?esc(cur.theme):"Série de ensino")+'</div></div></button>'
    : '<div style="padding:6px 0"><div class="mi-k">Série atual</div><div class="empty">Nenhuma série ativa.</div></div>';
  // Atividade recente: notas atualizadas (hydrate ordena por updated_at desc).
  var recent=notes.slice(0,3).map(function(n){return '<button class="li" data-noteopen="1" style="width:100%;text-align:left;background:none;border:0;cursor:pointer;padding:5px 0"><div style="flex:1"><b>'+esc(n.title||"(sem título)")+'</b> <span class="muted">· nota</span></div></button>';}).join("")
    ||'<div class="empty">Sem atividade recente.</div>';
  return '<div class="row2" style="margin-top:16px"><div class="panel"><div class="ph"><h3>Estudo</h3><button class="link" data-studyopen="library" style="margin-left:auto">Abrir Estudo</button></div>'+lastBox+curBox+'</div><div class="panel"><div class="ph"><h3>Atividade recente de estudo</h3></div>'+recent+'</div></div>';
}

// Navegação do painel de Estudo na Home → abre o módulo Study no ponto certo.
document.addEventListener("click",function(e){
  var t=e.target.closest?e.target.closest("[data-sermonopen],[data-seriesopen],[data-studyopen],[data-noteopen]"):null;if(!t)return;
  if(t.getAttribute("data-sermonopen")){state.view="sermons";state.studyTab="library";state.seriesDetail=null;state.scriptureMap=false;state.sermonEdit=t.getAttribute("data-sermonopen");save();render();return;}
  if(t.getAttribute("data-seriesopen")){state.view="sermons";state.studyTab="library";state.sermonEdit=null;state.scriptureMap=false;state.seriesDetail=t.getAttribute("data-seriesopen");save();render();return;}
  if(t.getAttribute("data-noteopen")){state.view="sermons";state.studyTab="notes";state.sermonEdit=null;state.seriesDetail=null;state.scriptureMap=false;save();render();return;}
  if(t.getAttribute("data-studyopen")){state.view="sermons";state.studyTab=t.getAttribute("data-studyopen");state.sermonEdit=null;state.seriesDetail=null;state.scriptureMap=false;save();render();return;}
});

export function celebRow(){
  var cs=activeSignals().filter(function(s){return s.level==="celebration";}).slice(0,6);
  if(!cs.length)return "";
  var items=cs.map(function(s){return '<div class="li"><div class="av" style="background:rgba(139,116,232,.16);color:#8b74e8">'+initials(s.stickName||"?")+'</div><div><div><b>'+esc(s.title)+'</b></div><div class="meta">'+esc(agoLabel(s.date))+'</div></div></div>';}).join("");
  return '<div class="panel" style="margin-top:16px"><div class="ph"><h3>Para celebrar</h3><span class="muted" style="margin-left:auto">'+cs.length+' esta semana</span></div>'+items+'</div>';
}

export function todayStrip(){
  var care=activeSignals().filter(function(s){return s.category==="Care";}).length;
  var celeb=activeSignals().filter(function(s){return s.level==="celebration";}).length;
  var gatt=(typeof groupsHealth==="function"?groupsHealth():[]).filter(function(g){return g.band!=="healthy";}).length;
  var ans=(state.prayers||[]).filter(function(p){return p.answered&&p.answeredDate&&isThisMonth(p.answeredDate);}).length;
  var noComm=state.people.filter(inCampus).filter(function(p){return !p.archived&&!p.group;}).length;
  return '<div class="panel" style="margin-bottom:16px;display:flex;gap:28px;flex-wrap:wrap;align-items:center"><div class="mi-k">Hoje no Tally</div><div><b style="color:var(--coral);font-size:16px">'+care+'</b> <span class="muted">precisam de follow-up</span></div><div><b style="color:#E8833A;font-size:16px">'+gatt+'</b> <span class="muted">grupos em atenção</span></div><div><b style="color:var(--blue);font-size:16px">'+noComm+'</b> <span class="muted">sem comunidade</span></div><div><b style="color:#8b74e8;font-size:16px">'+celeb+'</b> <span class="muted">avançaram</span></div><div><b style="color:var(--green);font-size:16px">'+ans+'</b> <span class="muted">orações respondidas</span></div></div>';
}
