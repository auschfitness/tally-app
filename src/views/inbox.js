// Inbox: os Signals que a igreja deveria notar, com filtros por categoria.

import { state } from "../core/state.js";
import { esc, initials } from "../core/helpers.js";
import { activeSignals, sigStatus, setSig } from "../core/derived.js";
import { render } from "../core/render.js";

export function viewInbox(){
  var cats=[["all","Todos"],["Care","Care"],["Journey","Pessoas"],["Groups","Grupos"],["Celebration","Celebrações"]];
  var cf=state.inboxCat||"all";var rank={attention:0,notice:1,celebration:2};
  var sigs=activeSignals().filter(function(s){return sigStatus(s.key)!=="snoozed"&&sigStatus(s.key)!=="assigned";}).filter(function(s){return cf==="all"||s.category===cf;}).slice().sort(function(a,b){return (rank[a.level]||0)-(rank[b.level]||0);});
  var tabs='<div class="filtchips">'+cats.map(function(c){return '<button class="fchip'+(cf===c[0]?" on":"")+'" data-inboxcat="'+c[0]+'">'+c[1]+'</button>';}).join("")+'</div>';
  var rows=sigs.map(function(s){var col=s.level==="celebration"?"#8b74e8":(s.level==="attention"?"var(--coral)":"var(--blue)");var bg=s.level==="celebration"?"rgba(139,116,232,.16)":(s.level==="attention"?"rgba(234,91,76,.16)":"rgba(43,92,230,.13)");return '<div class="li"><div class="av" style="background:'+bg+';color:'+col+'">'+(s.stickName?initials(s.stickName):(s.groupName?"G":"!"))+'</div><div style="flex:1"><div><b>'+esc(s.title)+'</b></div><div class="meta">'+esc(s.category)+(s.why.length?" · "+esc(s.why[0]):"")+'</div></div><div class="right">'+(s.stickId?'<button class="btn ghost sm" data-stick="'+s.stickId+'">Abrir</button>':"")+(s.category==="Care"?'<button class="link" data-assign="'+s.key+'">Atribuir</button>':"")+'<button class="link" data-snooze="'+s.key+'">Adiar</button><button class="link" data-dismiss="'+s.key+'">Dispensar</button></div></div>';}).join("")||'<div class="empty">Nada para notar nessa categoria.</div>';
  return '<h1 class="page">Inbox</h1><p class="sub">Coisas que a sua igreja deveria notar.</p>'+tabs+'<div class="panel">'+rows+'</div>';
}

// Dispensar um Signal (usado no Inbox e no Care)
document.addEventListener("click",function(e){var t=e.target.closest?e.target.closest("[data-dismiss]"):null;if(t&&t.getAttribute("data-dismiss")){setSig(t.getAttribute("data-dismiss"),"dismissed");render();}});
