// Configurações: abas Instituição e Conta.

import { state } from "../core/state.js";
import { esc } from "../core/helpers.js";

export function tagList(items,kind){return '<div class="taglist">'+items.map(x=>'<span class="tagx">'+esc(x)+'<button data-rm="'+kind+'" data-val="'+esc(x)+'">×</button></span>').join("")+'<button class="btn ghost sm" data-add="'+kind+'">+ Adicionar</button></div>';}

export function viewSettings(){
  const I=state.institution,A=state.account,owner=A.role==="owner";
  const tabs='<div class="tabs"><button class="tab '+(state.settingsTab==="inst"?"on":"")+'" data-tab="inst">Instituição</button><button class="tab '+(state.settingsTab==="acc"?"on":"")+'" data-tab="acc">Conta</button></div>';
  let body="";
  if(state.settingsTab==="inst"){
    const multi=owner?'<button class="switch '+(I.multiInstitution?"on":"")+'" id="sw-multi"></button>':'<span class="muted">Apenas o dono da conta pode ativar</span>';
    const instList=(I.multiInstitution&&owner)?'<div class="setrow"><div class="lbl">Instituições<small>Cada uma com seus dados e equipe</small></div><div class="ctrl">'+tagList(I.institutions,"inst")+'</div></div>':"";
    body='<div class="panel">'
      +'<div class="setrow"><div class="lbl">Nome da instituição</div><div class="ctrl"><input id="set-inst-name" value="'+esc(I.name)+'"></div></div>'
      +'<div class="setrow"><div class="lbl">Moeda<small>Usada em todo o Finance Lite</small></div><div class="ctrl"><select id="set-currency"><option value="BRL" '+(I.currency==="BRL"?"selected":"")+'>Real (BRL)</option><option value="USD" '+(I.currency==="USD"?"selected":"")+'>Dólar (USD)</option></select></div></div>'
      +'<div class="setrow"><div class="lbl">Campus</div><div class="ctrl">'+tagList(I.campuses,"campus")+'</div></div>'
      +'<div class="setrow"><div class="lbl">Fundos</div><div class="ctrl">'+tagList(I.funds,"fund")+'</div></div>'
      +'<div class="setrow"><div class="lbl">Categorias de entrada</div><div class="ctrl">'+tagList(I.catIn,"catin")+'</div></div>'
      +'<div class="setrow"><div class="lbl">Categorias de saída</div><div class="ctrl">'+tagList(I.catOut,"catout")+'</div></div>'
      +'<div class="setrow"><div class="lbl">Multi-instituição<small>Gerir mais de uma igreja na mesma conta</small></div><div class="ctrl">'+multi+'</div></div>'
      +instList
      +'</div>';
  } else {
    body='<div class="panel">'
      +'<div class="setrow"><div class="lbl">Seu nome</div><div class="ctrl"><input id="set-acc-name" value="'+esc(A.name)+'"></div></div>'
      +'<div class="setrow"><div class="lbl">Idioma<small>Tradução completa da interface em breve</small></div><div class="ctrl"><select id="set-lang"><option value="pt" '+(A.language==="pt"?"selected":"")+'>Português (BR)</option><option value="en" '+(A.language==="en"?"selected":"")+'>English</option><option value="es" '+(A.language==="es"?"selected":"")+'>Español</option></select></div></div>'
      +'<div class="setrow"><div class="lbl">Tema</div><div class="ctrl"><select id="set-theme"><option value="system">Sistema</option><option value="light" '+(localStorage.getItem("tally_theme")==="light"?"selected":"")+'>Claro</option><option value="dark" '+(localStorage.getItem("tally_theme")==="dark"?"selected":"")+'>Escuro</option></select></div></div>'
      +'<div class="setrow"><div class="lbl">Fuso horário</div><div class="ctrl"><select id="set-tz"><option value="America/Sao_Paulo" '+(A.timezone==="America/Sao_Paulo"?"selected":"")+'>São Paulo (GMT-3)</option><option value="America/Chicago" '+(A.timezone==="America/Chicago"?"selected":"")+'>Central US / Texas (GMT-6)</option><option value="America/New_York" '+(A.timezone==="America/New_York"?"selected":"")+'>New York (GMT-5)</option></select></div></div>'
      +'<div class="setrow"><div class="lbl">Cargo</div><div class="ctrl"><span class="chip leader">'+(owner?"Dono da conta":"Membro da equipe")+'</span></div></div>'
      +'</div>';
  }
  return '<h1 class="page">Configurações</h1><p class="sub">Ajustes da instituição e da sua conta</p>'+tabs+body;
}

export function instArr(kind){const I=state.institution;return {campus:I.campuses,fund:I.funds,catin:I.catIn,catout:I.catOut,inst:I.institutions}[kind];}
