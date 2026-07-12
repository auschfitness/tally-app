// Janelas modais (o overlay escuro com o cartão no centro).

export function openModal(html){document.getElementById("modalHost").innerHTML='<div class="overlay" id="ov"><div class="modal">'+html+'</div></div>';}
export function openWide(html){document.getElementById("modalHost").innerHTML='<div class="overlay" id="ov"><div class="modal wide">'+html+'</div></div>';}
export function closeModal(){document.getElementById("modalHost").innerHTML="";}
