// Mural de Oração: métricas, "Foco de Oração" (nuvem semântica com layout
// em espiral), lista de pedidos e o modal de novo pedido.

import { state } from "../core/state.js";
import { esc, initials, iso, today, uid } from "../core/helpers.js";
import { prayerCloudData, prayerMatch, prunePrayers, ansLeft } from "../core/derived.js";
import { save } from "../core/persist.js";
import { upsertPrayer } from "../core/prayer-repo.js";
import { openModal, closeModal } from "../ui/modal.js";
import { render } from "../core/render.js";

export function viewPrayer(){prunePrayers();
  var pvl={group:"Só o grupo",church:"Igreja toda",leader:"Só líderes"};
  var all=state.prayers||[];
  var total=all.length,ans=all.filter(function(p){return p.answered;}).length;
  var rate=total?Math.round(ans/total*100):0;
  var data=prayerCloudData();var max=data.length?data[0].count:1;var f=state.prayerFilter;
  var cloud=data.map(function(d,i){var sz=Math.round(15+(d.count/max)*30);var vert=(i%3===1&&sz<33)?1:0;var on=f&&f.cat===d.cat&&f.val===d.text;return '<button class="cw cw-'+d.cat+(on?" on":"")+'" data-cat="'+d.cat+'" data-val="'+esc(d.text)+'" data-vert="'+vert+'" style="font-size:'+sz+'px;visibility:hidden">'+esc(d.text)+'</button>';}).join("");
  var legend='<div class="cloudleg"><span><i class="lg-name"></i>Nomes</span><span><i class="lg-topic"></i>Temas</span><span><i class="lg-group"></i>Grupos</span></div>';
  var clr=f?'<button class="btn ghost sm" data-cat="__all__" data-val="">Limpar filtro</button>':'';
  var pr=all.filter(function(p){return prayerMatch(p,f)&&(state.showAnswered||!p.answered);}).slice().sort(function(a,b){return (a.answered-b.answered)||b.date.localeCompare(a.date);});
  var list=pr.map(function(p){return '<div class="pray '+(p.answered?"answered":"")+'"><div class="ph2"><div class="av'+(p.answered?"":" c")+'">'+initials(p.author)+'</div><span class="who">'+esc(p.author)+'</span><span class="pv">'+(pvl[p.privacy]||"")+(p.group?" · "+esc(p.group):"")+'</span>'+(p.answered?'<span class="answeredtag" style="margin-left:auto">Respondida</span>':'')+'</div><div class="rx">'+((p.title)?('<b>'+esc(p.title)+'</b> · '):'')+esc(p.request)+'</div>'+((p.topics&&p.topics.length)?'<div class="ptopics">'+p.topics.map(function(x){return '<span class="ptag">'+esc(x)+'</span>';}).join("")+'</div>':'')+'<div class="pa"><button class="btn ghost sm" data-pray="'+p.id+'">Orando ('+(p.praying||0)+')</button>'+(p.answered?('<button class="link" data-restore="'+p.id+'">Recolocar no mural</button><span class="muted" style="margin-left:auto">'+ansLeft(p)+'</span>'):'<button class="link" data-answered="'+p.id+'">Marcar como respondida</button>')+'</div></div>';}).join("")||'<div class="empty">Nenhum pedido com esse filtro.</div>';
  return '<div style="display:flex;align-items:flex-start;margin-bottom:18px"><div><h1 class="page">Mural de Oração</h1><p class="sub" style="margin:0">Todo pedido visto, todo pedido acompanhado.</p></div><button class="btn" id="addPrayer" style="margin-left:auto">+ Pedido</button></div><div class="cards" style="margin-bottom:16px"><div class="stat"><div class="k">Total de pedidos</div><div class="v">'+total+'</div></div><div class="stat"><div class="k">Respondidas</div><div class="v pos">'+ans+'</div></div><div class="stat"><div class="k">Taxa de resposta</div><div class="v">'+rate+'%</div></div><div class="stat"><div class="k">Aguardando</div><div class="v">'+(total-ans)+'</div></div></div><div class="panel" style="margin-bottom:16px"><div class="ph"><h3>Foco de Oração</h3>'+legend+'<div style="margin-left:auto;display:flex;gap:10px;align-items:center"><span class="muted">O que a comunidade está carregando</span>'+clr+'</div></div><div class="cloudbox" id="cloudbox">'+(cloud||'<div class="empty">Nada pendente no momento. Tudo foi respondido.</div>')+'</div></div><div class="prbar"><span class="muted">'+pr.length+' pedido(s)</span><button class="link" id="toggleAns">'+(state.showAnswered?"Ocultar respondidas":("Mostrar respondidas ("+ans+")"))+'</button></div>'+list;
}
export function layoutPrayerCloud(){
  var box=document.getElementById("cloudbox");if(!box)return;
  var W=box.clientWidth,H=box.clientHeight,cx=W/2,cy=H/2;
  var words=[].slice.call(box.querySelectorAll(".cw"));var placed=[];
  words.forEach(function(el){
    var vert=el.dataset.vert==="1";var w=el.offsetWidth,h=el.offsetHeight;
    var bw=vert?h:w,bh=vert?w:h,pad=7,done=false;
    for(var r=0;r<900&&!done;r++){
      var ang=r*0.55,rad=r*1.15;
      var px=cx+rad*Math.cos(ang)-bw/2,py=cy+rad*Math.sin(ang)*0.6-bh/2;
      if(px<2||py<2||px+bw>W-2||py+bh>H-2)continue;
      var b2={x:px-pad,y:py-pad,w:bw+2*pad,h:bh+2*pad};
      var hit=placed.some(function(b){return !(b2.x+b2.w<b.x||b2.x>b.x+b.w||b2.y+b2.h<b.y||b2.y>b.y+b.h);});
      if(!hit){placed.push(b2);if(vert){el.style.left=(px+bw/2-w/2)+"px";el.style.top=(py+bh/2-h/2)+"px";}else{el.style.left=px+"px";el.style.top=py+"px";}el.style.visibility="visible";done=true;}
    }
    if(!done){el.style.visibility="hidden";}
  });
}
export function prayerModal(){
  openModal('<h3>Novo pedido de oração</h3><div class="field"><label>Nome do pedido</label><input id="pr-title" placeholder="Ex.: Saúde da mãe da Ruth"></div><div class="field"><label>Pedido</label><input id="pr-text" placeholder="Escreva o pedido..."></div><div class="mrow"><div class="field"><label>Quem vê</label><select id="pr-priv"><option value="church">Igreja toda</option><option value="group">Só o grupo</option><option value="leader">Só líderes</option></select></div><div class="field"><label>Grupo (opcional)</label><input id="pr-group" placeholder="Ex.: Mulheres"></div></div><div class="field"><label>Temas (separados por vírgula)</label><input id="pr-topics" placeholder="Ex.: saúde, família"></div><div class="field"><label>Nome</label><input id="pr-author" value="'+esc(state.account.name||"")+'" placeholder="Seu nome ou Anônimo"></div><div class="actions"><button class="btn ghost" id="pr-cancel">Cancelar</button><button class="btn" id="pr-save">Publicar</button></div>');
  document.getElementById("pr-cancel").onclick=closeModal;
  document.getElementById("pr-save").onclick=function(){var tx=document.getElementById("pr-text").value.trim();if(!tx)return;var tp=(document.getElementById("pr-topics").value||"").split(",").map(function(s){return s.trim();}).filter(Boolean);var np={id:uid(),title:document.getElementById("pr-title").value.trim(),author:document.getElementById("pr-author").value.trim()||"Anônimo",request:tx,privacy:document.getElementById("pr-priv").value,group:document.getElementById("pr-group").value.trim(),topics:tp,praying:0,answered:false,date:iso(today())};state.prayers.unshift(np);upsertPrayer(np).then(function(newId){if(newId&&newId!==np.id){np.id=newId;save();}});state.prayerFilter=null;save();closeModal();render();};
}
document.addEventListener("click",function(e){var t=e.target;
  if(t.dataset&&t.dataset.cat){if(t.dataset.cat==="__all__"){state.prayerFilter=null;}else{state.prayerFilter={cat:t.dataset.cat,val:t.dataset.val};}save();render();}
  if(t.dataset&&t.dataset.pray){var pp=(state.prayers||[]).find(function(x){return x.id===t.dataset.pray;});if(pp){pp.praying=(pp.praying||0)+1;upsertPrayer(pp);save();render();}}
  if(t.dataset&&t.dataset.answered){var pa=(state.prayers||[]).find(function(x){return x.id===t.dataset.answered;});if(pa){pa.answered=true;pa.answeredDate=iso(today());upsertPrayer(pa);save();render();}}
  if(t.dataset&&t.dataset.restore){var prr=(state.prayers||[]).find(function(x){return x.id===t.dataset.restore;});if(prr){prr.answered=false;prr.answeredDate=null;upsertPrayer(prr);save();render();}}
  if(t.id==="addPrayer")prayerModal();
  if(t.id==="toggleAns"){state.showAnswered=!state.showAnswered;save();render();}
});
if(document.fonts&&document.fonts.ready){document.fonts.ready.then(function(){if(state.view==="prayer")layoutPrayerCloud();});}
window.addEventListener("resize",function(){if(state.view==="prayer")layoutPrayerCloud();});
