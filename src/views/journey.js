// Journey Map (Step 4 · Fase 2): movimento das Sticks pelos estágios — distribuição,
// tempo no estágio, funil/evasão e tendência de movimento. TUDO dado real (nada
// inventado). Clicar num estágio abre as pessoas dele (drill-down reusa o handler
// global data-stick de sticks.js). Estágio é caminho OPERACIONAL, não ranking espiritual.

import { state } from "../core/state.js";
import { esc, agoLabel } from "../core/helpers.js";
import { journeyStats, journeyFunnel, journeyFirstVisitDrop, journeyMovement, STUCK_DAYS } from "../core/derived.js";
import { render } from "../core/render.js";
import { save } from "../core/persist.js";

function daysLabel(n){ return n==null?"—":(n+" dia"+(n===1?"":"s")); }

export function viewJourney(){
  var stats=journeyStats();
  var total=stats.reduce(function(a,s){return a+s.count;},0);
  var maxCount=Math.max.apply(null,stats.map(function(s){return s.count;}).concat([1]));
  var stuckTotal=stats.reduce(function(a,s){return a+s.stuck;},0);
  var fv=journeyFirstVisitDrop();
  var mov=journeyMovement(6);
  var mov6=mov.reduce(function(a,b){return a+b.count;},0);
  var focus=state.journeyFocus;

  var cards='<div class="cards" style="margin-bottom:16px">'
    +'<div class="stat"><div class="k">Pessoas na jornada</div><div class="v">'+total+'</div></div>'
    +'<div class="stat'+(stuckTotal?' alert':'')+'"><div class="k">Parados +'+STUCK_DAYS+' dias</div><div class="v">'+stuckTotal+'</div></div>'
    +'<div class="stat"><div class="k">Vieram uma vez</div><div class="v">'+fv.lost+'</div></div>'
    +'<div class="stat"><div class="k">Movimentos (6 meses)</div><div class="v">'+mov6+'</div></div>'
    +'</div>';

  var mapRows=stats.map(function(s){
    var w=Math.round(s.count/maxCount*100);var on=focus===s.code;
    var meta=s.count?('tempo médio no estágio: '+daysLabel(s.avgDays)+(s.stuck?(' · '+s.stuck+' parado'+(s.stuck>1?'s':'')):'')):'ninguém aqui';
    return '<button class="jmap-row'+(on?' on':'')+'" data-jstage="'+s.code+'">'
      +'<div class="jmap-head"><span class="jmap-name">'+esc(s.label)+'</span><span class="jmap-count">'+s.count+'</span></div>'
      +'<div class="gbar"><i style="width:'+w+'%;background:var(--blue)"></i></div>'
      +'<div class="jmap-meta muted">'+meta+'</div></button>';
  }).join("");

  var funnel=journeyFunnel();
  var fmax=Math.max.apply(null,funnel.map(function(f){return f.reached;}).concat([1]));
  var funRows=funnel.map(function(f){
    var w=Math.round(f.reached/fmax*100);
    var drop=(f.dropFromPrev!=null&&f.dropFromPrev>0)?(' <span class="neg">−'+f.dropFromPrev+'%</span>'):'';
    return '<div style="margin-bottom:11px"><div style="display:flex;font-size:13px;margin-bottom:4px;color:var(--text)"><span>'+esc(f.label)+'</span><span style="margin-left:auto;font-weight:600">'+f.reached+drop+'</span></div><div class="gbar"><i style="width:'+w+'%;background:var(--blue)"></i></div></div>';
  }).join("");

  var movMax=Math.max.apply(null,mov.map(function(m){return m.count;}).concat([1]));
  var hasMov=mov.some(function(m){return m.count>0;});
  var movHtml=hasMov
    ?('<div class="jmov">'+mov.map(function(m){var h=Math.max(Math.round(m.count/movMax*100),4);return '<div class="jmov-col"><div class="jmov-barwrap"><div class="jmov-bar" style="height:'+h+'%"></div></div><span class="jmov-n">'+m.count+'</span><span class="jmov-l muted">'+m.label+'</span></div>';}).join("")+'</div>')
    :'<div class="muted" style="font-size:13px;line-height:1.7">Ainda não há histórico de movimento suficiente. Conforme as pessoas mudam de estágio, a tendência aparece aqui — sem números inventados.</div>';

  var drill='';
  if(focus){
    var fs=stats.filter(function(s){return s.code===focus;})[0];
    var ppl=fs?fs.people.slice().sort(function(a,b){return (a.name||"").localeCompare(b.name||"");}):[];
    var list=ppl.map(function(p){return '<div class="jdrill-row" data-stick="'+p.id+'"><span class="jdrill-nm">'+esc(p.name)+'</span><span class="muted">'+(p.group?esc(p.group):'sem grupo')+' · '+esc(agoLabel(p.lastSeen))+'</span></div>';}).join("")||'<div class="empty">Ninguém neste estágio.</div>';
    drill='<div class="panel" style="margin-top:16px"><div class="ph"><h3>'+esc(fs?fs.label:'')+' · '+(fs?fs.count:0)+' pessoa'+((fs&&fs.count!==1)?'s':'')+'</h3><button class="link" id="jClear" style="margin-left:auto">limpar</button></div><div class="jdrill">'+list+'</div></div>';
  }

  return '<div style="margin-bottom:14px"><h1 class="page">Journey Map</h1><p class="sub" style="margin:0">Como as pessoas se movem pela vida da igreja. Caminho operacional definido pela igreja, não um ranking espiritual.</p></div>'
    +cards
    +'<div class="row2"><div class="panel"><div class="ph"><h3>Estágios</h3><span class="muted" style="margin-left:auto">clique para ver as pessoas</span></div>'+mapRows+'</div>'
    +'<div class="panel"><div class="ph"><h3>Onde as pessoas param</h3></div>'+funRows
    +'<div class="ph" style="margin-top:16px"><h3>Primeira visita</h3></div><div class="muted" style="font-size:13px;line-height:1.6">'+fv.came+' vieram pela primeira vez · '+fv.returned+' voltaram · <b>'+fv.lost+'</b> ainda não voltaram.</div></div></div>'
    +'<div class="panel" style="margin-top:16px"><div class="ph"><h3>Movimento (6 meses)</h3><span class="muted" style="margin-left:auto">mudanças de estágio por mês</span></div>'+movHtml+'</div>'
    +drill;
}

// clique num estágio → foca (drill-down); "limpar" remove o foco.
document.addEventListener("click",function(e){
  var t=e.target.closest?e.target.closest("[data-jstage],#jClear"):null;if(!t)return;
  if(t.id==="jClear"){state.journeyFocus=null;save();render();return;}
  if(t.getAttribute("data-jstage")){var c=t.getAttribute("data-jstage");state.journeyFocus=(state.journeyFocus===c)?null:c;save();render();return;}
});
