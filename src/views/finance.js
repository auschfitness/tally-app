// Finance Lite: entradas/saídas do mês, gráficos, saldo por fundo,
// lançamentos e o modal de novo lançamento.

import { state } from "../core/state.js";
import { esc, uid, iso, today, isThisMonth, FINPAL } from "../core/helpers.js";
import { money } from "../core/format.js";
import { allFunds, expenseByCat } from "../core/derived.js";
import { save } from "../core/persist.js";
import { upsertEntry } from "../core/finance-repo.js";
import { openModal, closeModal } from "../ui/modal.js";
import { render } from "../core/render.js";

export function viewFinance(){
  var ce=state.entries.filter(function(e){return e.campus===state.activeCampus;});
  var monthE=ce.filter(function(e){return isThisMonth(e.date);});
  var income=monthE.filter(function(e){return e.type==="in";}).reduce(function(a,e){return a+e.amount;},0);
  var expense=monthE.filter(function(e){return e.type==="out";}).reduce(function(a,e){return a+e.amount;},0);
  var cat=state.finCat;
  var arr=expenseByCat();
  var exlegend=arr.map(function(x,i){return '<span style="cursor:pointer" data-fincat="'+esc(x.cat)+'"><i style="background:'+FINPAL[i%FINPAL.length]+'"></i>'+esc(x.cat)+' · '+money(x.val)+'</span>';}).join("")||'<span class="muted">Sem saídas</span>';
  var funds=allFunds().map(function(f){var bal=ce.filter(function(e){return e.fund===f;}).reduce(function(a,e){return a+(e.type==="in"?e.amount:-e.amount);},0);return {f:f,bal:bal};}).filter(function(x){return ce.some(function(e){return e.fund===x.f;});});
  var maxAbs=Math.max.apply(null,funds.map(function(x){return Math.abs(x.bal);}).concat([1]));
  var fbars=funds.map(function(x){var w=Math.round(Math.abs(x.bal)/maxAbs*100);return '<div class="fundrow"><div class="fundlbl">'+esc(x.f)+'<span class="'+(x.bal>=0?"pos":"neg")+'">'+money(x.bal)+'</span></div><div class="gbar"><i class="'+(x.bal>=0?"healthy":"risk")+'" style="width:'+w+'%"></i></div></div>';}).join("")||'<div class="empty">Sem fundos.</div>';
  var rows=ce.filter(function(e){return !cat||e.cat===cat;}).slice().sort(function(a,b){return b.date.localeCompare(a.date);}).map(function(e){return '<tr><td>'+e.date.split("-").reverse().join("/")+'</td><td><b>'+esc(e.desc)+'</b></td><td><span class="muted">'+esc(e.cat)+'</span></td><td>'+esc(e.fund)+'</td><td style="text-align:right" class="'+(e.type==="in"?"pos":"neg")+'">'+(e.type==="in"?"+":"-")+money(e.amount)+'</td><td style="text-align:right"><button class="del" data-delentry="'+e.id+'" style="color:var(--text-2);border:none;background:none;font-size:15px">×</button></td></tr>';}).join("")||'<tr><td colspan="6" class="empty">Nenhum lançamento.</td></tr>';
  var cathead=cat?('Categoria: '+esc(cat)+' <button class="link" id="clearFinCat">limpar</button>'):'';
  return '<div style="display:flex;align-items:baseline;gap:14px;margin-bottom:14px"><h1 class="page">Finance Lite</h1><span class="sub" style="margin:0">'+esc(state.activeCampus)+' · este mês</span></div>'
   +'<div class="ministrip"><div><div class="mi-k">Entradas</div><div class="mi-v pos">'+money(income)+'</div></div><div><div class="mi-k">Saídas</div><div class="mi-v neg">'+money(expense)+'</div></div><div><div class="mi-k">Saldo</div><div class="mi-v '+((income-expense)>=0?"pos":"neg")+'">'+money(income-expense)+'</div></div></div>'
   +'<div class="row2"><div class="panel"><div class="ph"><h3>Entradas vs Saídas</h3><span class="muted" style="margin-left:auto">6 meses</span></div><div class="chartbox"><canvas id="finBars"></canvas></div></div><div class="panel"><div class="ph"><h3>Despesas por categoria</h3></div><div class="donutwrap"><canvas id="expDonut"></canvas></div><div class="leg">'+exlegend+'</div></div></div>'
   +'<div class="row2"><div class="panel"><div class="ph"><h3>Lançamentos</h3><span class="muted" style="margin-left:auto">'+cathead+'</span><button class="btn ghost sm" id="addEntry" style="margin-left:10px">+ Lançamento</button></div><table style="border:none"><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Fundo</th><th style="text-align:right">Valor</th><th></th></tr>'+rows+'</table></div><div class="panel"><div class="ph"><h3>Saldo por fundo</h3></div>'+fbars+'</div></div>';
}

let entryType="in";
function catOptions(type){const list=type==="in"?state.institution.catIn:state.institution.catOut;return list.map(c=>'<option>'+esc(c)+'</option>').join("")+'<option value="__new__">+ Nova categoria...</option>';}
function fillCats(){document.getElementById("e-cat").innerHTML=catOptions(entryType);}
export function entryModal(){
  entryType="in";
  openModal('<h3>Novo lançamento</h3><div class="field"><label>Tipo</label><div class="seg" id="e-seg"><button data-t="in" class="on">Entrada</button><button data-t="out">Saída</button></div></div><div class="field"><label>Descrição</label><input id="e-desc" placeholder="Ex.: Dízimos de domingo"></div><div class="mrow"><div class="field"><label>Valor</label><input id="e-amount" type="number" min="0" step="0.01" placeholder="0,00"></div><div class="field"><label>Data</label><input id="e-date" type="date" value="'+iso(today())+'"></div></div><div class="mrow"><div class="field"><label>Categoria</label><select id="e-cat">'+catOptions("in")+'</select></div><div class="field"><label>Fundo</label><select id="e-fund">'+allFunds().map(f=>'<option>'+esc(f)+'</option>').join("")+'</select></div></div><div class="field"><label>Campus</label><select id="e-campus">'+state.institution.campuses.map(c=>'<option '+(c===state.activeCampus?'selected':'')+'>'+esc(c)+'</option>').join("")+'</select></div><div class="actions"><button class="btn ghost" id="e-cancel">Cancelar</button><button class="btn" id="e-save">Salvar</button></div>');
  document.getElementById("e-seg").addEventListener("click",ev=>{const b=ev.target.closest("button");if(!b)return;entryType=b.dataset.t;document.querySelectorAll("#e-seg button").forEach(x=>x.classList.toggle("on",x===b));fillCats();});
  document.getElementById("e-cat").addEventListener("change",ev=>{if(ev.target.value==="__new__"){const nc=(prompt("Nova categoria:")||"").trim();const list=entryType==="in"?state.institution.catIn:state.institution.catOut;if(nc&&!list.includes(nc)){list.push(nc);save();}fillCats();if(nc)ev.target.value=nc;else ev.target.selectedIndex=0;}});
  document.getElementById("e-cancel").onclick=closeModal;
  document.getElementById("e-save").onclick=()=>{const desc=document.getElementById("e-desc").value.trim();const amount=parseFloat(document.getElementById("e-amount").value);const cat=document.getElementById("e-cat").value;if(!desc||!(amount>0)||cat==="__new__")return;var ne={id:uid(),type:entryType,desc,cat,fund:document.getElementById("e-fund").value,amount,date:document.getElementById("e-date").value,campus:document.getElementById("e-campus").value};state.entries.push(ne);upsertEntry(ne).then(function(newId){if(newId&&newId!==ne.id){ne.id=newId;save();}});save();closeModal();render();};
}

// Filtro por categoria de despesa (donut clicável / legenda)
document.addEventListener("click",function(e){var t=e.target.closest?e.target.closest("[data-fincat]"):null;if(t&&t.getAttribute("data-fincat")){var c=t.getAttribute("data-fincat");state.finCat=(state.finCat===c)?null:c;save();render();}});
