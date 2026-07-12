// Home: saudação, "Hoje no Tally" (Pulse), frequência, risco pastoral,
// Care Radar, grupos em atenção e a faixa "Para celebrar".

import { state } from "../core/state.js";
import { esc, initials, agoLabel, isThisMonth } from "../core/helpers.js";
import { inCampus, riskDist, attendanceSeries, careReasons, groupsHealth, activeSignals } from "../core/derived.js";

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
  return '<div style="display:flex;align-items:baseline;margin-bottom:16px"><h1 class="page">Bom te ver, '+esc(state.account.name||"")+'</h1><span class="sub" style="margin:0 0 0 12px">'+esc(state.activeCampus)+' · últimas 8 semanas</span></div>'+todayStrip()+'<div class="row2"><div class="panel"><div class="ph"><h3>Frequência</h3><span class="muted" style="margin-left:auto">'+cap+'</span></div><div class="chartbox"><canvas id="attChart"></canvas></div></div><div class="panel"><div class="ph"><h3>Risco pastoral</h3></div><div class="donutwrap"><canvas id="riskDonut"></canvas><div class="donutctr"><b>'+total+'</b><span>pessoas</span></div></div><div class="leg"><span><i style="background:#1FA97A"></i>Em dia · '+d.em+'</span><span><i style="background:#E8833A"></i>Atenção · '+d.at+'</span><span><i style="background:#EA5B4C"></i>Em risco · '+d.ri+'</span></div></div></div><div class="row2"><div class="panel"><div class="ph"><h3>Care Radar</h3><span class="muted" style="margin-left:auto">'+carehead+'</span></div>'+care+'</div><div class="panel"><div class="ph"><h3>Grupos em atenção</h3></div>'+grows+'</div></div>'+celebRow();
}

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
  return '<div class="panel" style="margin-bottom:16px;display:flex;gap:28px;flex-wrap:wrap;align-items:center"><div class="mi-k">Hoje no Tally</div><div><b style="color:var(--coral);font-size:16px">'+care+'</b> <span class="muted">precisam de follow-up</span></div><div><b style="color:#E8833A;font-size:16px">'+gatt+'</b> <span class="muted">grupos em atenção</span></div><div><b style="color:#8b74e8;font-size:16px">'+celeb+'</b> <span class="muted">avançaram</span></div><div><b style="color:var(--green);font-size:16px">'+ans+'</b> <span class="muted">orações respondidas</span></div></div>';
}
