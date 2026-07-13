// Estado da aplicação (os dados que aparecem nas telas). É um único objeto
// mutável. `setState` troca o objeto inteiro (usado ao carregar a org do banco);
// as telas mutam campos (state.people.push, state.view=...) pelo binding vivo.

import { USER } from "./session.js";

export function emptyState(){return {view:"dashboard",settingsTab:"inst",activeCampus:"",careWeeks:3,institution:{name:"",currency:"BRL",campuses:[],funds:[],catIn:[],catOut:[],multiInstitution:false,institutions:[],activeInstitution:""},account:{name:"",role:"owner",language:"pt",timezone:"America/Sao_Paulo"},groups:[],prayers:[],prayerFilter:null,people:[],households:[],posts:[],tasks:[],entries:[],sessions:[],careItems:[],signalOverrides:{},journey:null,journeyFocus:null,tracks:[],trackEnrollments:[],trackDetail:null,sermons:[],sermonEdit:null,sermonFilter:null,series:[],seriesDetail:null,scriptures:[],scriptureOn:true,scriptureMap:false,scriptureMapBook:null,notes:[],resources:[],studyTab:"library",resourceFilter:null,noteEdit:null,studySearchQuery:"",memoryOn:true,ministries:[],teams:[],teamMembers:[],teamDetail:null};}

export let state = emptyState();
export function setState(s) { state = s; }

export function blankState(orgName,campusName,currency){var s=emptyState();s.activeCampus=campusName;s.institution={name:orgName,currency:currency,campuses:[campusName],funds:["Geral","Missões","Construção","Social"],catIn:["Dízimo","Oferta","Doação","Campanha"],catOut:["Aluguel","Utilidades","Salários","Missões","Ação social","Eventos","Manutenção"],multiInstitution:false,institutions:[orgName],activeInstitution:orgName};s.account.name=(USER&&USER.email)?USER.email.split("@")[0]:"Você";return s;}
