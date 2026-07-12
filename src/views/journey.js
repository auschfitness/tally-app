// Journey: distribuição das Sticks pelos estágios da caminhada.

import { state } from "../core/state.js";
import { JOURNEY } from "../core/helpers.js";
import { inCampus } from "../core/derived.js";

export function viewJourney(){
  var ppl=state.people.filter(inCampus);
  var counts=JOURNEY.map(function(j){return ppl.filter(function(p){return p.journeyStage===j[0];}).length;});
  var max=Math.max.apply(null,counts.concat([1]));
  var rows=JOURNEY.map(function(j,i){var w=Math.round(counts[i]/max*100);return '<div style="margin-bottom:13px"><div style="display:flex;font-size:13px;margin-bottom:5px;color:var(--text)"><span>'+j[1]+'</span><span style="margin-left:auto;font-weight:600">'+counts[i]+'</span></div><div class="gbar"><i style="width:'+w+'%;background:var(--blue)"></i></div></div>';}).join("");
  return '<h1 class="page">Journey</h1><p class="sub">Como as pessoas se movem pela vida da igreja.</p><div class="row2"><div class="panel"><div class="ph"><h3>Sticks por estágio</h3></div>'+rows+'</div><div class="panel"><div class="ph"><h3>Onde as pessoas param</h3></div><div class="muted" style="font-size:13px;line-height:1.7">A maior parte dos visitantes que não voltam se perde entre a Primeira visita e a Segunda. Acompanhe os visitantes recentes na aba Care para reduzir a evasão. Estágios de Journey são caminhos operacionais definidos pela igreja, não um ranking espiritual.</div></div></div>';
}
