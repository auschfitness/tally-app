// Care: cuidado pastoral. Care Items em aberto (com histórico de contatos)
// e os Signals de cuidado aguardando atribuição. Modais de atribuir e registrar.

import { state } from "../core/state.js";
import { esc, initials, iso, today, uid, isLeader } from "../core/helpers.js";
import { activeSignals, sigStatus, setSig, stickBy } from "../core/derived.js";
import { save } from "../core/persist.js";
import { openModal, closeModal } from "../ui/modal.js";
import { render } from "../core/render.js";

export function assignCareModal(key){
  var s=activeSignals().find(function(x){return x.key===key;});if(!s)return;
  var leaders=state.people.filter(function(p){return isLeader(p);});
  openModal('<h3>Atribuir Care</h3><div class="msub">'+esc(s.title)+'</div><div class="field"><label>Responsável</label><select id="ca-who"><option>'+esc(state.account.name||"Você")+'</option>'+leaders.map(function(p){return '<option>'+esc(p.name)+'</option>';}).join("")+'</select></div><div class="mrow"><div class="field"><label>Próxima ação</label><input id="ca-action" placeholder="Ex.: Ligar para a pessoa"></div><div class="field"><label>Prazo</label><input type="date" id="ca-due" value="'+iso(today())+'"></div></div><div class="field"><label>Prioridade</label><select id="ca-pri"><option>Notice</option><option selected>Attention</option><option>Urgent</option></select></div><div class="actions"><button class="btn ghost" id="ca-cancel">Cancelar</button><button class="btn" id="ca-save">Criar Care</button></div>');
  document.getElementById("ca-cancel").onclick=closeModal;
  document.getElementById("ca-save").onclick=function(){if(!state.careItems)state.careItems=[];state.careItems.push({id:uid(),stickId:s.stickId,stickName:s.stickName,signalKey:s.key,title:s.title,reason:(s.why||[]).join(" · "),assignedTo:document.getElementById("ca-who").value,nextAction:document.getElementById("ca-action").value.trim(),due:document.getElementById("ca-due").value,priority:document.getElementById("ca-pri").value,status:"assigned",createdAt:iso(today()),contacts:[]});setSig(s.key,"assigned");save();closeModal();render();};
}
export function contactModal(id){
  openModal('<h3>Registrar contato</h3><div class="field"><label>O que aconteceu</label><input id="cc-note" placeholder="Ex.: Liguei para a pessoa, conversamos..."></div><div class="mrow"><div class="field"><label>Data</label><input type="date" id="cc-date" value="'+iso(today())+'"></div></div><div class="field check"><input type="checkbox" id="cc-resolve"><label>Marcar como resolvido</label></div><div class="actions"><button class="btn ghost" id="cc-cancel">Cancelar</button><button class="btn" id="cc-save">Salvar</button></div>');
  document.getElementById("cc-cancel").onclick=closeModal;
  document.getElementById("cc-save").onclick=function(){var it=(state.careItems||[]).find(function(x){return x.id===id;});if(!it)return;it.contacts=it.contacts||[];var n=document.getElementById("cc-note").value.trim();if(n)it.contacts.push({date:document.getElementById("cc-date").value,note:n,by:state.account.name});it.status=document.getElementById("cc-resolve").checked?"resolved":"in_progress";save();closeModal();render();};
}
export function viewCare(){
  var items=(state.careItems||[]).filter(function(it){var st=stickBy(it.stickId);return (!st)||st.campus===state.activeCampus;}).filter(function(it){return it.status!=="resolved"&&it.status!=="closed";});
  var resolved=(state.careItems||[]).filter(function(it){return it.status==="resolved"||it.status==="closed";}).length;
  var open=activeSignals().filter(function(s){return s.category==="Care"&&sigStatus(s.key)!=="assigned";});
  var itemCards=items.map(function(it){var contacts=(it.contacts||[]).slice().reverse().map(function(c){return '<div style="font-size:12.5px;color:var(--text-2);padding:3px 0"><b style="color:var(--text)">'+c.date.split("-").reverse().join("/")+'</b> · '+esc(c.note)+'</div>';}).join("");
    return '<div class="panel" style="margin-bottom:12px"><div style="display:flex;align-items:flex-start;gap:12px"><div class="av c">'+(it.stickName?initials(it.stickName):"!")+'</div><div style="flex:1"><div style="font-weight:600;color:var(--text)">'+esc(it.stickName||it.title)+'</div><div class="muted" style="margin:5px 0">'+esc(it.reason)+'</div><div style="font-size:12.5px;color:var(--text-2)">Responsável: <b style="color:var(--text)">'+esc(it.assignedTo)+'</b> · Próxima ação: '+esc(it.nextAction||"—")+' · Prazo: '+(it.due?it.due.split("-").reverse().join("/"):"—")+'</div>'+(contacts?'<div style="margin-top:8px;border-top:1px solid var(--border);padding-top:6px">'+contacts+'</div>':"")+'</div><div style="display:flex;flex-direction:column;gap:6px">'+(it.stickId?'<button class="btn ghost sm" data-stick="'+it.stickId+'">Ver Stick</button>':"")+'<button class="btn ghost sm" data-contact="'+it.id+'">Registrar contato</button></div></div></div>';}).join("")||'<div class="empty">Nenhum care em aberto. Atribua um a partir de um sinal abaixo.</div>';
  var sigCards=open.map(function(s){return '<div class="panel" style="margin-bottom:12px"><div style="display:flex;align-items:flex-start;gap:12px"><div class="av c">'+(s.stickName?initials(s.stickName):"!")+'</div><div style="flex:1"><div style="font-weight:600;color:var(--text)">'+esc(s.title)+'</div><div class="muted" style="margin:6px 0 3px">Por que o Tally notou</div>'+s.why.map(function(w){return '<div style="font-size:13px;color:var(--text-2)">• '+esc(w)+'</div>';}).join("")+'</div><div style="display:flex;flex-direction:column;gap:6px">'+(s.stickId?'<button class="btn ghost sm" data-stick="'+s.stickId+'">Ver Stick</button>':"")+'<button class="btn sm" data-assign="'+s.key+'">Atribuir Care</button><button class="btn ghost sm" data-dismiss="'+s.key+'">Dispensar</button></div></div></div>';}).join("")||'<div class="empty">Nenhum sinal de cuidado aguardando.</div>';
  return '<h1 class="page">Care</h1><p class="sub">Cuidado pastoral. Quem precisa de atenção, e o que estamos fazendo.</p><div class="ministrip"><div><div class="mi-k">Care em aberto</div><div class="mi-v">'+items.length+'</div></div><div><div class="mi-k">Sinais aguardando</div><div class="mi-v neg">'+open.length+'</div></div><div><div class="mi-k">Resolvidos</div><div class="mi-v pos">'+resolved+'</div></div></div><h3 style="font-size:15px;font-weight:600;margin:6px 0 12px;color:var(--text)">Care em aberto</h3>'+itemCards+'<h3 style="font-size:15px;font-weight:600;margin:22px 0 12px;color:var(--text)">Sinais aguardando ação</h3>'+sigCards;
}

document.addEventListener("click",function(e){var t=e.target.closest?e.target.closest("[data-assign],[data-contact],[data-snooze],[data-inboxcat]"):null;if(!t)return;
  if(t.getAttribute("data-assign")){assignCareModal(t.getAttribute("data-assign"));return;}
  if(t.getAttribute("data-contact")){contactModal(t.getAttribute("data-contact"));return;}
  if(t.getAttribute("data-snooze")){setSig(t.getAttribute("data-snooze"),"snoozed");render();return;}
  if(t.getAttribute("data-inboxcat")){state.inboxCat=t.getAttribute("data-inboxcat");save();render();return;}
});
