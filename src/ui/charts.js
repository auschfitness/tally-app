// Gráficos (Chart.js). Todos os donuts/linhas/barras clicáveis com drill-down.
// Cada build* procura o <canvas> da tela atual; se não existir, não faz nada.

import Chart from "chart.js/auto";
import { state } from "../core/state.js";
import { save } from "../core/persist.js";
import { render } from "../core/render.js";
import { moneyShort } from "../core/format.js";
import { FINPAL } from "../core/helpers.js";
import { groupsHealth, riskDist, attendanceSeries, financeMonthly, expenseByCat, inCampus } from "../core/derived.js";

var CHARTS={};
export function renderCharts(){
  Object.keys(CHARTS).forEach(function(k){try{CHARTS[k].destroy();}catch(e){}});CHARTS={};
  if(!Chart)return;
  if(state.view==="dashboard"){buildAttendanceChart();buildRiskDonut();}
  if(state.view==="finance"){buildFinanceBars();buildExpenseDonut();}
  if(state.view==="people"&&!state.stickDetail)buildPeopleDonut();
  if(state.view==="groups"&&!state.groupDetail)buildGroupDist();
}
function buildGroupDist(){
  var el=document.getElementById("gdist");if(!el)return;
  var gs=groupsHealth();
  var h=gs.filter(function(x){return x.band==="healthy";}).length,a=gs.filter(function(x){return x.band==="attention";}).length,r=gs.filter(function(x){return x.band==="risk";}).length;
  CHARTS.gd=new Chart(el,{type:"doughnut",data:{labels:["Saudável","Atenção","Em risco"],datasets:[{data:[h,a,r],backgroundColor:["#1FA97A","#E8833A","#EA5B4C"],borderWidth:0,hoverOffset:7}]},options:{cutout:"70%",maintainAspectRatio:false,responsive:true,plugins:{legend:{display:false}},onClick:function(ev,els){if(els&&els.length){var b=["healthy","attention","risk"][els[0].index];state.groupBand=(state.groupBand===b)?null:b;save();render();}}}});
}
function buildAttendanceChart(){
  var el=document.getElementById("attChart");if(!el)return;var s=attendanceSeries();
  var colors=s.data.map(function(v,i){return i===5?"#EA5B4C":"#2B5CE6";});
  var radii=s.data.map(function(v,i){return i===5?5:3;});
  CHARTS.att=new Chart(el,{type:"line",data:{labels:s.labels,datasets:[{data:s.data,borderColor:"#2B5CE6",backgroundColor:"rgba(43,92,230,.10)",fill:true,tension:.35,pointBackgroundColor:colors,pointBorderColor:colors,pointRadius:radii,pointHoverRadius:6,borderWidth:2}]},options:{maintainAspectRatio:false,responsive:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return c.parsed.y+" presentes";}}}},scales:{y:{grid:{color:"rgba(120,130,150,.12)"},ticks:{precision:0}},x:{grid:{display:false}}},onClick:function(ev,els){if(els&&els.length){state.dashWeek=els[0].index;save();render();}}}});
}
function buildRiskDonut(){
  var el=document.getElementById("riskDonut");if(!el)return;var d=riskDist();
  CHARTS.rd=new Chart(el,{type:"doughnut",data:{labels:["Em dia","Atenção","Em risco"],datasets:[{data:[d.em,d.at,d.ri],backgroundColor:["#1FA97A","#E8833A","#EA5B4C"],borderWidth:0,hoverOffset:7}]},options:{cutout:"68%",maintainAspectRatio:false,responsive:true,plugins:{legend:{display:false}},onClick:function(ev,els){if(els&&els.length){var b=["em","at","ri"][els[0].index];state.dashRisk=(state.dashRisk===b)?null:b;save();render();}}}});
}
function buildFinanceBars(){var el=document.getElementById("finBars");if(!el)return;var m=financeMonthly();
  CHARTS.fb=new Chart(el,{type:"bar",data:{labels:m.labels,datasets:[{label:"Entradas",data:m.inc,backgroundColor:"#1FA97A",borderRadius:4},{label:"Saídas",data:m.exp,backgroundColor:"#EA5B4C",borderRadius:4}]},options:{maintainAspectRatio:false,responsive:true,plugins:{legend:{display:true,position:"bottom",labels:{boxWidth:10,font:{family:"Poppins"}}},tooltip:{callbacks:{label:function(c){return c.dataset.label+": "+moneyShort(c.parsed.y);}}}},scales:{y:{grid:{color:"rgba(120,130,150,.12)"},ticks:{callback:function(v){return moneyShort(v);}}},x:{grid:{display:false}}}}});
}
function buildExpenseDonut(){var el=document.getElementById("expDonut");if(!el)return;var arr=expenseByCat();
  CHARTS.ed=new Chart(el,{type:"doughnut",data:{labels:arr.map(function(x){return x.cat;}),datasets:[{data:arr.map(function(x){return x.val;}),backgroundColor:arr.map(function(x,i){return FINPAL[i%FINPAL.length];}),borderWidth:0,hoverOffset:6}]},options:{cutout:"66%",maintainAspectRatio:false,responsive:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return c.label+": "+moneyShort(c.parsed);}}}},onClick:function(ev,els){if(els&&els.length){var c=arr[els[0].index].cat;state.finCat=(state.finCat===c)?null:c;save();render();}}}});
}
function buildPeopleDonut(){var el=document.getElementById("compDonut");if(!el)return;var ppl=state.people.filter(inCampus);
  var c={visitor:0,attendee:0,member:0,inactive:0};ppl.forEach(function(p){var r=p.relationship;if(r==="visitor_first"||r==="visitor_returning")c.visitor++;else if(r==="attendee")c.attendee++;else if(r==="inactive")c.inactive++;else c.member++;});
  CHARTS.pc=new Chart(el,{type:"doughnut",data:{labels:["Visitantes","Frequentadores","Membros","Inativos"],datasets:[{data:[c.visitor,c.attendee,c.member,c.inactive],backgroundColor:["#2B5CE6","#3E9AB0","#1FA97A","#8A96AE"],borderWidth:0,hoverOffset:6}]},options:{cutout:"66%",maintainAspectRatio:false,responsive:true,plugins:{legend:{display:false}},onClick:function(ev,els){if(els&&els.length){var v=["visitor","attendee","member","inactive"][els[0].index];state.stickRel=(state.stickRel===v)?null:v;save();render();}}}});
}
