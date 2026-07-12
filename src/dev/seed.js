// Dados de exemplo (a org demo "Grace Church"). NÃO faz parte do app publicado:
// serve para o preview de desenvolvimento e para os testes de fumaça.
// Cópia fiel do seed() original.

import { uid, daysAgo } from "../core/helpers.js";

export function seed(){
  return {
    view:"dashboard",settingsTab:"inst",activeCampus:"McKinney",careWeeks:3,
    institution:{name:"Grace Church",currency:"BRL",campuses:["McKinney","Anna North"],funds:["Geral","Missões","Construção","Social"],catIn:["Dízimo","Oferta","Doação","Campanha"],catOut:["Aluguel","Utilidades","Salários","Missões","Ação social","Eventos","Manutenção"],multiInstitution:false,institutions:["Grace Church"],activeInstitution:"Grace Church"},
    account:{name:"Gaybiel",role:"owner",language:"pt",timezone:"America/Sao_Paulo"},
    groups:[{id:uid(),name:"Célula Norte",leader:"Marcos Vieira",campus:"McKinney",day:"Quarta",time:"20h"},{id:uid(),name:"Jovens",leader:"Beatriz Rocha",campus:"McKinney",day:"Sábado",time:"19h"},{id:uid(),name:"Mulheres",leader:"",campus:"McKinney",day:"Terça",time:"15h"},{id:uid(),name:"Novos convertidos",leader:"",campus:"McKinney",day:"Domingo",time:"09h"},{id:uid(),name:"Casais",leader:"Pedro Almeida",campus:"McKinney",day:"Domingo",time:"18h"},{id:uid(),name:"Louvor",leader:"João Prado",campus:"Anna North",day:"Sábado",time:"16h"},{id:uid(),name:"Kids",leader:"Clara Dias",campus:"Anna North",day:"Domingo",time:"09h"}],
    prayerFilter:null,
    prayers:[
      {id:uid(),author:"Ruth Alves",request:"Peço oração pela saúde da minha mãe, cirurgia na quinta.",privacy:"church",group:"Mulheres",topics:["saúde","família"],praying:8,answered:false,date:daysAgo(1)},
      {id:uid(),author:"Daniel Melo",request:"Gratidão! Consegui o emprego pelo qual oramos juntos.",privacy:"church",group:"",topics:["provisão financeira","trabalho","gratidão"],praying:15,answered:true,date:daysAgo(3),answeredDate:daysAgo(3)},
      {id:uid(),author:"Anônimo",request:"Oração pela minha família nesse momento difícil.",privacy:"group",group:"Casais",topics:["família","restauração"],praying:4,answered:false,date:daysAgo(2)},
      {id:uid(),author:"Marcos Vieira",request:"Sabedoria para liderar bem a célula neste semestre.",privacy:"church",group:"Célula Norte",topics:["sabedoria","liderança"],praying:6,answered:false,date:daysAgo(2)},
      {id:uid(),author:"Lea Santos",request:"Oração pela minha fé e crescimento como nova convertida.",privacy:"church",group:"Novos convertidos",topics:["fé","crescimento"],praying:9,answered:false,date:daysAgo(4)},
      {id:uid(),author:"Pedro Almeida",request:"Paz e cura para o meu casamento.",privacy:"leader",group:"Casais",topics:["paz","cura","casamento"],praying:3,answered:false,date:daysAgo(5)},
      {id:uid(),author:"Sara Nunes",request:"Direção sobre a mudança de cidade e novo trabalho.",privacy:"church",group:"",topics:["direção","trabalho"],praying:5,answered:false,date:daysAgo(1)},
      {id:uid(),author:"Clara Dias",request:"Gratidão pela cura da minha filha!",privacy:"church",group:"Kids",topics:["cura","saúde","gratidão"],praying:20,answered:true,date:daysAgo(6),answeredDate:daysAgo(6)},
      {id:uid(),author:"João Prado",request:"Provisão financeira para a família neste mês.",privacy:"group",group:"Louvor",topics:["provisão financeira","família"],praying:7,answered:false,date:daysAgo(3)}
    ],
    people:[
      {id:uid(),name:"Marcos Vieira",relationship:"member",roles:["leader"],campus:"McKinney",group:"Célula Norte",lastSeen:daysAgo(2),followup:false,firstVisit:"2019-03-10",journeyStage:"leadership",source:"Amigo/família",household:"",milestones:[{type:"first_visit",date:"2019-03-10"},{type:"membership",date:"2019-09-01"},{type:"leadership",date:"2021-02-01"}]},
      {id:uid(),name:"Beatriz Rocha",relationship:"member",roles:["leader"],campus:"McKinney",group:"Jovens",lastSeen:daysAgo(3),followup:false,firstVisit:"2021-05-02",journeyStage:"serving",source:"Evento",household:"",milestones:[{type:"first_visit",date:"2021-05-02"},{type:"membership",date:"2021-11-01"},{type:"started_serving",date:"2022-03-01"}]},
      {id:uid(),name:"Ruth Alves",relationship:"member",roles:[],campus:"McKinney",group:"Mulheres",lastSeen:daysAgo(24),followup:false,firstVisit:"2026-01-12",journeyStage:"group",source:"Amigo/família",household:"Família Alves",milestones:[{type:"first_visit",date:"2026-01-12"},{type:"second_visit",date:"2026-01-19"},{type:"joined_group",date:"2026-02-03"}]},
      {id:uid(),name:"Daniel Melo",relationship:"visitor_returning",roles:[],campus:"McKinney",group:"",lastSeen:daysAgo(14),followup:false,firstVisit:daysAgo(28),journeyStage:"returned",source:"Google",household:"",milestones:[{type:"first_visit",date:daysAgo(28)},{type:"second_visit",date:daysAgo(14)}]},
      {id:uid(),name:"Lea Santos",relationship:"member",roles:[],campus:"McKinney",group:"Novos convertidos",lastSeen:daysAgo(4),followup:true,firstVisit:daysAgo(60),journeyStage:"connected",source:"Redes sociais",household:"",milestones:[{type:"first_visit",date:daysAgo(60)},{type:"conversion",date:daysAgo(40)}]},
      {id:uid(),name:"Pedro Almeida",relationship:"member",roles:["leader"],campus:"McKinney",group:"Casais",lastSeen:daysAgo(3),followup:false,firstVisit:"2018-08-19",journeyStage:"leadership",source:"Amigo/família",household:"Família Almeida",milestones:[{type:"first_visit",date:"2018-08-19"},{type:"membership",date:"2019-02-01"},{type:"leadership",date:"2020-06-01"}]},
      {id:uid(),name:"Lucas Alves",relationship:"member",roles:[],campus:"McKinney",group:"",lastSeen:daysAgo(2),followup:false,firstVisit:"2026-01-12",journeyStage:"connected",source:"Amigo/família",household:"Família Alves",birthDate:"2016-05-01",milestones:[{type:"first_visit",date:"2026-01-12"}]},
      {id:uid(),name:"Sara Nunes",relationship:"visitor_first",roles:[],campus:"Anna North",group:"",lastSeen:daysAgo(9),followup:false,firstVisit:daysAgo(9),journeyStage:"first_visit",source:"Website",household:"",milestones:[{type:"first_visit",date:daysAgo(9)}]},
      {id:uid(),name:"João Prado",relationship:"member",roles:["leader"],campus:"Anna North",group:"Louvor",lastSeen:daysAgo(31),followup:false,firstVisit:"2020-02-16",journeyStage:"serving",source:"Amigo/família",household:"",milestones:[{type:"first_visit",date:"2020-02-16"},{type:"membership",date:"2020-08-01"},{type:"started_serving",date:"2021-01-01"}]},
      {id:uid(),name:"Clara Dias",relationship:"member",roles:["leader"],campus:"Anna North",group:"Kids",lastSeen:daysAgo(2),followup:false,firstVisit:"2022-07-01",journeyStage:"serving",source:"Evento",household:"Família Dias",milestones:[{type:"first_visit",date:"2022-07-01"},{type:"membership",date:"2023-01-01"},{type:"started_serving",date:"2023-05-01"}]}
    ],
    households:[
      {id:uid(),name:"Família Alves",campus:"McKinney",members:["Ruth Alves","Lucas Alves"]},
      {id:uid(),name:"Família Almeida",campus:"McKinney",members:["Pedro Almeida"]},
      {id:uid(),name:"Família Dias",campus:"Anna North",members:["Clara Dias"]}
    ],
    posts:[
      {id:uid(),title:"Plano do culto de domingo",body:"Ordem, músicas e avisos definidos.",team:"Louvor",date:daysAgo(0)},
      {id:uid(),title:"Abertura do campus Anna",body:"Checklist de mídia e recepção para o primeiro domingo em Anna.",team:"Comunicação",date:daysAgo(1)}
    ],
    tasks:[
      {id:uid(),text:"Fechar escala de louvor",who:"Ana",done:true},
      {id:uid(),text:"Imprimir etiquetas Kids",who:"Rafa",done:false},
      {id:uid(),text:"Confirmar recepção Anna",who:"Você",done:false}
    ],
    entries:[
      {id:uid(),type:"in",desc:"Dízimos de domingo",cat:"Dízimo",fund:"Geral",amount:4200,date:daysAgo(3),campus:"McKinney"},
      {id:uid(),type:"in",desc:"Ofertas",cat:"Oferta",fund:"Geral",amount:1350,date:daysAgo(3),campus:"McKinney"},
      {id:uid(),type:"in",desc:"Campanha de missões",cat:"Doação",fund:"Missões",amount:2000,date:daysAgo(6),campus:"McKinney"},
      {id:uid(),type:"out",desc:"Aluguel do salão",cat:"Aluguel",fund:"Geral",amount:2500,date:daysAgo(5),campus:"McKinney"},
      {id:uid(),type:"out",desc:"Energia e água",cat:"Utilidades",fund:"Geral",amount:680,date:daysAgo(4),campus:"McKinney"},
      {id:uid(),type:"out",desc:"Cestas básicas",cat:"Ação social",fund:"Social",amount:900,date:daysAgo(2),campus:"McKinney"},
      {id:uid(),type:"in",desc:"Dízimos",cat:"Dízimo",fund:"Geral",amount:1800,date:daysAgo(3),campus:"Anna North"},
      {id:uid(),type:"out",desc:"Equipamento de som",cat:"Eventos",fund:"Construção",amount:1200,date:daysAgo(7),campus:"Anna North"}
    ]};
}
