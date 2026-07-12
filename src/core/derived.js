// Camada de inteligência: tudo que é CALCULADO a partir do estado —
// motivos de cuidado, saúde dos grupos, Signals, Timeline, séries de
// frequência e finanças, nuvem de oração. É o coração do "um pastor vê o um".

import { state } from "./state.js";
import { save } from "./persist.js";
import { weeksSince, agoLabel, iso, today, esc, MSTYPE, relLabel, relCls, isLeader } from "./helpers.js";

export function careReasons(p){const r=[];if(weeksSince(p.lastSeen)>=state.careWeeks)r.push({t:agoLabel(p.lastSeen),full:"Sem aparecer "+agoLabel(p.lastSeen)});if(!p.group)r.push({t:"sem grupo",full:"Ainda não está em um grupo"});if(p.followup)r.push({t:"follow-up",full:"Follow-up em aberto"});return r;}
export const inCampus=p=>p.campus===state.activeCampus;
export const unaccounted=()=>state.people.filter(p=>inCampus(p)&&careReasons(p).length>0);
export function allFunds(){const s=new Set(state.institution.funds);state.entries.forEach(e=>s.add(e.fund));return[...s];}
export function showInstSwitcher(){return state.institution.multiInstitution&&state.account.role==="owner";}

export function relChip(p){if(careReasons(p).length>0)return '<span class="chip care">Atenção</span>';return '<span class="chip '+relCls(p)+'">'+relLabel(p)+'</span>'+(isLeader(p)?' <span class="chip leader">Líder</span>':'');}

export function groupOptions(sel){var o='<option value="">(nenhum)</option>';(state.groups||[]).forEach(function(g){o+='<option '+(sel===g.name?'selected':'')+'>'+esc(g.name)+'</option>';});return o;}
export function groupsHealth(){
  var gs=(state.groups||[]).filter(function(g){return g.campus===state.activeCampus;});
  return gs.map(function(g){var members=state.people.filter(function(p){return p.group===g.name&&p.campus===state.activeCampus;});var acc=members.filter(function(p){return careReasons(p).length===0;}).length;var rate=members.length?Math.round(acc/members.length*100):0;var band=members.length===0?"attention":(rate>=85?"healthy":(rate>=70?"attention":"risk"));return {name:g.name,leader:g.leader,count:members.length,acc:acc,rate:rate,band:band};}).sort(function(a,b){return a.rate-b.rate;});
}

export function riskDist(){var em=0,at=0,ri=0;state.people.filter(inCampus).forEach(function(p){var n=careReasons(p).length;if(n===0)em++;else if(n===1)at++;else ri++;});return {em:em,at:at,ri:ri};}

export function attendanceSeries(){
  var members=state.people.filter(inCampus).filter(function(p){return p.relationship&&p.relationship.indexOf("visitor")!==0;}).length||18;
  var base=Math.max(8,Math.round(members*0.82));var factors=[1.0,1.03,0.99,1.05,1.02,0.86,0.9,0.98];var labels=[],data=[];
  for(var i=7;i>=0;i--){var d=new Date();d.setDate(d.getDate()-i*7);labels.push(d.getDate()+"/"+(d.getMonth()+1));}
  factors.forEach(function(f){data.push(Math.round(base*f));});return {labels:labels,data:data};
}

export function financeMonthly(){
  var ce=state.entries.filter(function(e){return e.campus===state.activeCampus;});
  var months=[],labels=[];var now=today();var mn=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  for(var i=5;i>=0;i--){var dd=new Date(now.getFullYear(),now.getMonth()-i,1);months.push(dd.getFullYear()+"-"+String(dd.getMonth()+1).padStart(2,"0"));labels.push(mn[dd.getMonth()]);}
  var inc=[0,0,0,0,0,0],exp=[0,0,0,0,0,0];
  ce.forEach(function(e){var idx=months.indexOf((e.date||"").slice(0,7));if(idx>=0){if(e.type==="in")inc[idx]+=e.amount;else exp[idx]+=e.amount;}});
  var baseIn=inc[5]||7550,baseEx=exp[5]||4080;var f=[0.82,0.9,1.18,0.95,1.06,1.0];
  for(var j=0;j<6;j++){if(inc[j]===0)inc[j]=Math.round(baseIn*f[j]);if(exp[j]===0)exp[j]=Math.round(baseEx*f[j]*0.98);}
  return {labels:labels,inc:inc,exp:exp};
}
export function expenseByCat(){var m={};state.entries.filter(function(e){return e.campus===state.activeCampus&&e.type==="out";}).forEach(function(e){m[e.cat]=(m[e.cat]||0)+e.amount;});return Object.keys(m).map(function(k){return {cat:k,val:m[k]};}).sort(function(a,b){return b.val-a.val;});}

export function prayerCloudData(){
  var all=(state.prayers||[]).filter(function(p){return !p.answered;});var m={};
  function add(text,cat){var k=cat+"|"+text;if(!m[k])m[k]={text:text,cat:cat,count:0};m[k].count++;}
  all.forEach(function(p){(p.topics||[]).forEach(function(tp){add(tp,"topic");});if(p.group)add(p.group,"group");if(p.author&&p.author!=="Anônimo")add(p.author,"name");});
  var arr=Object.keys(m).map(function(k){return m[k];});
  arr.sort(function(a,b){return b.count-a.count;});
  return arr.slice(0,28);
}
export function prayerMatch(p,f){if(!f)return true;if(f.cat==="topic")return (p.topics||[]).indexOf(f.val)>=0;if(f.cat==="group")return p.group===f.val;if(f.cat==="name")return p.author===f.val;return true;}
export function prunePrayers(){var t=today();var b=state.prayers.length;state.prayers=state.prayers.filter(function(p){if(!p.answered||!p.answeredDate)return true;return (t-new Date(p.answeredDate))/(1000*60*60*24)<30;});if(state.prayers.length!==b)save();}
export function ansLeft(p){if(!p.answeredDate)return"";var d=Math.ceil(30-(today()-new Date(p.answeredDate))/(1000*60*60*24));return d>0?("some em "+d+" dia"+(d>1?"s":"")):"some em breve";}

export function stickBy(id){return (state.people||[]).find(function(p){return p.id===id;});}
export function householdOf(p){if(!p.household)return null;return (state.households||[]).find(function(h){return h.name===p.household;});}
export function stickTimeline(p){
  var ev=[];
  (p.milestones||[]).forEach(function(m){ev.push({date:m.date,type:"milestone",title:MSTYPE[m.type]||m.type,sub:""});});
  (state.sessions||[]).forEach(function(s){if((s.attendees||[]).indexOf(p.id)>=0)ev.push({date:s.date,type:"attendance",title:"Presente no culto",sub:s.campus});});
  (state.prayers||[]).forEach(function(pr){if(pr.author===p.name){var open=pr.privacy==="church";ev.push({date:pr.date,type:"prayer",title:open?"Pedido de oração":"Contexto pastoral atualizado",sub:open?pr.request:"Visibilidade restrita"});if(pr.answered&&pr.answeredDate)ev.push({date:pr.answeredDate,type:"milestone",title:"Oração respondida",sub:""});}});
  var cr=careReasons(p);if(cr.length)ev.push({date:iso(today()),type:"care",title:"Tally notou uma mudança",sub:cr.map(function(r){return r.full;}).join(" · ")});
  ev.sort(function(a,b){return b.date.localeCompare(a.date);});return ev;
}

export function signals(){
  var out=[];
  state.people.filter(inCampus).forEach(function(p){
    var w=weeksSince(p.lastSeen);
    if(w>=3){out.push({key:"att-"+p.id,type:"attendance",level:"attention",stickId:p.id,stickName:p.name,title:p.name+" pode precisar de atenção",why:["Sem aparecer há "+w+" semanas"].concat(!p.group?["Não está em um grupo"]:[]).concat(p.followup?["Follow-up em aberto"]:[]),date:iso(today()),category:"Care"});}
    else if(!p.group&&(p.relationship==="visitor_first"||p.relationship==="visitor_returning")){out.push({key:"grp-"+p.id,type:"journey",level:"notice",stickId:p.id,stickName:p.name,title:p.name+" ainda não entrou em um grupo",why:["Visitante sem grupo"],date:iso(today()),category:"Journey"});}
    else if(p.followup){out.push({key:"fu-"+p.id,type:"care",level:"attention",stickId:p.id,stickName:p.name,title:p.name+" tem follow-up em aberto",why:["Follow-up pendente"],date:iso(today()),category:"Care"});}
    (p.milestones||[]).forEach(function(m){var dd=Math.round((today()-new Date(m.date))/(1000*60*60*24));if(dd>=0&&dd<=21)out.push({key:"ms-"+p.id+"-"+m.type,type:"milestone",level:"celebration",stickId:p.id,stickName:p.name,title:p.name+" · "+(MSTYPE[m.type]||m.type),why:[],date:m.date,category:"Celebration"});});
  });
  (typeof groupsHealth==="function"?groupsHealth():[]).forEach(function(g){if(g.band==="risk")out.push({key:"gh-"+g.name,type:"group_health",level:"attention",groupName:g.name,title:"Grupo "+g.name+" com saúde baixa",why:[g.rate+"% dos membros em dia"],date:iso(today()),category:"Groups"});});
  state.tasks.filter(function(t){return !t.done&&t.who;}).forEach(function(t){out.push({key:"task-"+t.id,type:"team",level:"notice",title:esc(t.who)+" foi designado: "+esc(t.text),why:[],date:iso(today()),category:"Teams",stickName:t.who});});
  return out;
}
export function sigStatus(k){var o=(state.signalOverrides||{})[k];return o?o.status:"new";}
export function setSig(k,st){if(!state.signalOverrides)state.signalOverrides={};state.signalOverrides[k]=Object.assign({},state.signalOverrides[k]||{},{status:st});save();}
export function activeSignals(){return signals().filter(function(s){return sigStatus(s.key)!=="dismissed";});}
export function signalsFor(id){return activeSignals().filter(function(s){return s.stickId===id;});}
