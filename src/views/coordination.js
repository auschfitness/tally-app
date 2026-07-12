// Coordenação: quadro de avisos e tarefas das equipes (+ modais de aviso/tarefa).

import { state } from "../core/state.js";
import { esc, uid, iso, today, agoLabel, isLeader } from "../core/helpers.js";
import { inCampus } from "../core/derived.js";
import { save } from "../core/persist.js";
import { openModal, closeModal } from "../ui/modal.js";
import { render } from "../core/render.js";

export function viewCoord(){
  var posts=state.posts,tasks=state.tasks;
  var done=tasks.filter(function(t){return t.done;}).length,total=tasks.length,pct=total?Math.round(done/total*100):0;
  var postsHtml=posts.map(function(p){return '<div class="post"><div class="pt">'+esc(p.title)+'</div><div class="pb">'+esc(p.body)+'</div><div class="pm">'+esc(p.team)+' · '+agoLabel(p.date)+'</div></div>';}).join("")||'<div class="empty">Nenhum aviso ainda.</div>';
  var tasksHtml=tasks.map(function(t){return '<div class="t '+(t.done?"done":"")+'"><button class="cbx '+(t.done?"done":"")+'" data-toggle="'+t.id+'">'+(t.done?"✓":"")+'</button><span class="tx">'+esc(t.text)+'</span><span class="who">'+esc(t.who||"-")+'</span><button class="del" data-deltask="'+t.id+'">×</button></div>';}).join("")||'<div class="empty">Sem tarefas.</div>';
  var byWho={};tasks.filter(function(t){return !t.done;}).forEach(function(t){var w=t.who||"—";byWho[w]=(byWho[w]||0)+1;});
  var whoArr=Object.keys(byWho).map(function(k){return {who:k,n:byWho[k]};}).sort(function(a,b){return b.n-a.n;});
  var maxw=Math.max.apply(null,whoArr.map(function(x){return x.n;}).concat([1]));
  var whoBars=whoArr.map(function(x){var w=Math.round(x.n/maxw*100);return '<div class="engrow" style="cursor:default"><span class="englbl">'+esc(x.who)+'</span><div class="engbar"><i style="width:'+w+'%;background:var(--blue)"></i></div><span class="engn">'+x.n+'</span></div>';}).join("")||'<div class="empty">Nada pendente. Tudo concluído.</div>';
  return '<h1 class="page">Coordenação</h1><p class="sub">Quadro de avisos e tarefas das equipes</p>'
   +'<div class="ministrip"><div><div class="mi-k">Avisos</div><div class="mi-v">'+posts.length+'</div></div><div><div class="mi-k">Tarefas abertas</div><div class="mi-v">'+(total-done)+'</div></div><div><div class="mi-k">Concluídas</div><div class="mi-v pos">'+done+'</div></div></div>'
   +'<div class="row2"><div class="panel"><div class="ph"><h3>Quadro de avisos</h3><button class="btn ghost sm" id="addPost" style="margin-left:auto">+ Aviso</button></div>'+postsHtml+'</div>'
   +'<div class="panel"><div class="ph"><h3>Tarefas</h3><button class="btn ghost sm" id="addTask" style="margin-left:auto">+ Tarefa</button></div><div class="muted" style="margin-bottom:6px">'+done+' de '+total+' concluídas · '+pct+'%</div><div class="gbar" style="margin-bottom:14px"><i class="healthy" style="width:'+pct+'%"></i></div><div class="todo">'+tasksHtml+'</div></div></div>'
   +'<div class="panel"><div class="ph"><h3>Pendências por responsável</h3></div>'+whoBars+'</div>';
}

export function postModal(){
  openModal('<h3>Novo aviso</h3><div class="field"><label>Título</label><input id="p-title"></div><div class="field"><label>Mensagem</label><input id="p-body"></div><div class="field"><label>Equipe</label><input id="p-team" placeholder="Ex.: Louvor"></div><div class="actions"><button class="btn ghost" id="p-cancel">Cancelar</button><button class="btn" id="p-save">Publicar</button></div>');
  document.getElementById("p-cancel").onclick=closeModal;
  document.getElementById("p-save").onclick=()=>{const title=document.getElementById("p-title").value.trim();if(!title)return;state.posts.unshift({id:uid(),title,body:document.getElementById("p-body").value.trim(),team:document.getElementById("p-team").value.trim()||"Geral",date:iso(today())});save();closeModal();render();};
}

export function taskModal(){
  var names=[];if(state.account&&state.account.name)names.push(state.account.name);
  state.people.filter(function(p){return inCampus(p)&&isLeader(p);}).forEach(function(p){if(names.indexOf(p.name)<0)names.push(p.name);});
  var opts=names.map(function(n){return '<option>'+esc(n)+'</option>';}).join("");
  openModal('<h3>Nova tarefa</h3><div class="field"><label>Tarefa</label><input id="t-text"></div><div class="field"><label>Responsável</label><select id="t-who">'+opts+'</select><div class="muted" style="margin-top:5px;font-size:11.5px">Só aparecem pessoas com cargo (líderes). Ao ser designada, a pessoa é pingada no Inbox.</div></div><div class="actions"><button class="btn ghost" id="t-cancel">Cancelar</button><button class="btn" id="t-save">Adicionar</button></div>');
  document.getElementById("t-cancel").onclick=closeModal;
  document.getElementById("t-save").onclick=function(){var text=document.getElementById("t-text").value.trim();if(!text)return;state.tasks.push({id:uid(),text:text,who:document.getElementById("t-who").value,done:false});save();closeModal();render();};
}
