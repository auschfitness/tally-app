// Camada Supabase: cria o cliente, controla o "gate" (login/cadastro/onboarding)
// e carrega/cria a organização. É o único módulo que fala com o Auth e escreve
// diretamente nas tabelas organizations/campuses/app_state (fora o save()).

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";
import { setSB, setOrg, setUser, SB, USER } from "./session.js";
import { setState, blankState, state } from "./state.js";
import { hydratePeople } from "./sticks-repo.js";
import { hydrateGroups } from "./groups-repo.js";
import { hydratePrayers } from "./prayer-repo.js";
import { render } from "./render.js";
import { esc } from "./helpers.js";

var SB_URL=SUPABASE_URL;
var SB_KEY=SUPABASE_ANON_KEY;
var LOGO_SVG='<svg width="44" height="44" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="96" height="96" rx="26" fill="#2B5CE6"/><g stroke="#fff" stroke-width="6" stroke-linecap="round"><line x1="34" y1="34" x2="34" y2="66"/><line x1="43" y1="34" x2="43" y2="66"/><line x1="52" y1="34" x2="52" y2="66"/><line x1="61" y1="34" x2="61" y2="66"/><line x1="28" y1="68" x2="67" y2="32"/></g></svg>';
function gel(){return document.getElementById("gate");}
export function hideGate(){var g=gel();if(g)g.style.display="none";}
function showGate(inner){var g=gel();if(!g)return;g.style.display="flex";g.innerHTML='<div class="gcard">'+LOGO_SVG+inner+'</div>';}
function gateError(m){var e=document.getElementById("g-err");if(e){e.textContent=String(m);}else{showGate('<div class="gerr">'+esc(String(m))+'</div><button class="gbtn" id="g-retry">Voltar</button>');var r=document.getElementById("g-retry");if(r)r.onclick=function(){showAuth("login");};}}
export function startApp(){console.log("Tally build v3 (rpc create_org)");var g=gel();if(g){g.style.display="flex";g.innerHTML='<div class="gcard">'+LOGO_SVG+'<div class="gsub">Carregando…</div></div>';}
  var client=createClient(SB_URL,SB_KEY);setSB(client);
  client.auth.getSession().then(function(res){if(res.data&&res.data.session){afterAuth();}else{showAuth("login");}});}
function showAuth(mode){mode=mode||"login";
  showGate('<div class="gtitle">Tally</div><div class="gsub">'+(mode==="login"?"Entre na sua conta":"Crie a sua conta")+'</div><div class="gfield"><input id="g-email" type="email" placeholder="E-mail" autocomplete="email"></div><div class="gfield"><input id="g-pw" type="password" placeholder="Senha" autocomplete="current-password"></div><div id="g-err" class="gerr"></div><button class="gbtn" id="g-primary">'+(mode==="login"?"Entrar":"Criar conta")+'</button><button class="gbtn goauth" id="g-google">Continuar com Google</button><div class="gswitch">'+(mode==="login"?'Não tem conta? <a id="g-toswitch">Cadastre-se</a>':'Já tem conta? <a id="g-toswitch">Entrar</a>')+'</div>');
  document.getElementById("g-primary").onclick=function(){var em=document.getElementById("g-email").value.trim();var pw=document.getElementById("g-pw").value;if(mode==="login")doLogin(em,pw);else doSignup(em,pw);};
  document.getElementById("g-google").onclick=doGoogle;
  document.getElementById("g-toswitch").onclick=function(){showAuth(mode==="login"?"signup":"login");};}
function doLogin(em,pw){if(!em||!pw){gateError("Preencha e-mail e senha.");return;}SB.auth.signInWithPassword({email:em,password:pw}).then(function(r){if(r.error){gateError(r.error.message);return;}afterAuth();});}
function doSignup(em,pw){if(!em||!pw){gateError("Preencha e-mail e senha.");return;}SB.auth.signUp({email:em,password:pw}).then(function(r){if(r.error){gateError(r.error.message);return;}if(r.data&&r.data.session){afterAuth();}else{showGate('<div class="gsub">Conta criada. Se a confirmação de e-mail estiver ligada, confirme pelo link enviado e depois entre.</div><button class="gbtn" id="g-back">Ir para o login</button>');document.getElementById("g-back").onclick=function(){showAuth("login");};}});}
function doGoogle(){SB.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin}}).then(function(r){if(r&&r.error)gateError(r.error.message);});}
function afterAuth(){showGate('<div class="gsub">Carregando…</div>');SB.auth.getUser().then(function(u){if(u.error||!u.data.user){showAuth("login");return;}setUser(u.data.user);SB.from("memberships").select("org_id").limit(1).then(function(m){if(m.error){gateError(m.error.message);return;}if(!m.data||!m.data.length){showOnboarding();return;}loadOrg(m.data[0].org_id);});});}
function showOnboarding(){
  showGate('<div class="gtitle">Sua igreja</div><div class="gsub">Vamos criar a sua igreja no Tally.</div><div class="gfield"><input id="o-name" placeholder="Nome da igreja"></div><div class="gfield"><input id="o-campus" placeholder="Primeiro campus (ex.: Sede)"></div><div class="gfield"><select id="o-cur"><option value="BRL">Real (BRL)</option><option value="USD">Dólar (USD)</option></select></div><div id="g-err" class="gerr"></div><button class="gbtn" id="o-create">Criar igreja</button><div class="gswitch"><a id="o-logout">Sair</a></div>');
  document.getElementById("o-create").onclick=function(){var n=document.getElementById("o-name").value.trim();var c=document.getElementById("o-campus").value.trim()||"Sede";var cur=document.getElementById("o-cur").value;if(!n){gateError("Dê um nome à igreja.");return;}createOrg(n,c,cur);};
  document.getElementById("o-logout").onclick=function(){SB.auth.signOut().then(function(){location.reload();});};}
function createOrg(name,campusName,currency){
  showGate('<div class="gsub">Criando sua igreja…</div>');
  var st=blankState(name,campusName,currency);
  SB.rpc("create_org",{p_name:name,p_currency:currency,p_campus:campusName,p_state:st}).then(function(r){
   if(r.error){gateError(r.error.message);return;}
   setOrg(r.data);setState(st);render();hideGate();
  });
}
function loadOrg(orgId){setOrg(orgId);
  SB.from("app_state").select("data").eq("org_id",orgId).maybeSingle().then(function(r){
   if(r.error){gateError(r.error.message);return;}
   if(r.data&&r.data.data&&r.data.data.institution){setState(r.data.data);Promise.all([hydratePeople(state),hydrateGroups(state),hydratePrayers(state)]).then(function(){render();hideGate();});return;}
   SB.from("organizations").select("name,currency").eq("id",orgId).single().then(function(o){
    SB.from("campuses").select("name").eq("org_id",orgId).then(function(cs){
     var org=(o.data)||{name:"Minha igreja",currency:"BRL"};var camps=((cs.data)||[]).map(function(x){return x.name;});if(!camps.length)camps=["Sede"];
     var s=blankState(org.name,camps[0],org.currency);s.institution.campuses=camps;s.institution.institutions=[org.name];setState(s);
     SB.from("app_state").upsert({org_id:orgId,data:s,updated_by:USER.id}).then(function(){Promise.all([hydratePeople(state),hydrateGroups(state),hydratePrayers(state)]).then(function(){render();hideGate();});});});});});}
