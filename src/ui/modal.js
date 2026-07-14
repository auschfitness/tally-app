// Janelas modais (o overlay escuro com o cartão no centro).

export function openModal(html){document.getElementById("modalHost").innerHTML='<div class="overlay" id="ov"><div class="modal">'+html+'</div></div>';}
export function openWide(html){document.getElementById("modalHost").innerHTML='<div class="overlay" id="ov"><div class="modal wide">'+html+'</div></div>';}
// Fecha com fade-out (design-principles.md). Guarda anti-clobber: só limpa se o overlay em
// fecho ainda for o mesmo (um novo modal aberto no meio troca o host e cancela a remoção).
export function closeModal(){
  var host=document.getElementById("modalHost");if(!host)return;
  var ov=document.getElementById("ov");
  if(!ov){host.innerHTML="";return;}
  ov.classList.add("closing");
  setTimeout(function(){if(ov.parentNode===host)host.innerHTML="";},150);
}
