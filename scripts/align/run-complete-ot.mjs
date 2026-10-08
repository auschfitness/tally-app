// Geração -> medição -> montagem -> SQL, sem gravar no banco.
// Uso: node --env-file=.env.local scripts/align/run-complete-ot.mjs
import { spawn } from "node:child_process";
import fs from "node:fs";

const run = (args) => new Promise((resolve) => {
  const child = spawn(process.execPath,args,{stdio:"inherit",env:process.env,windowsHide:true});
  child.on("error",()=>resolve(1));
  child.on("close",(code)=>resolve(code ?? 1));
});
const stateFile = "scripts/align/work/gem-ot/pipeline-status.json";
const model=process.env.GEMINI_ALIGN_MODEL||"gemini-3.5-flash-lite";
if (!/^[a-z0-9.-]+$/.test(model)) throw new Error("Modelo inválido");
if (model!=="gemini-3.5-flash-lite"&&!process.env.ALIGN_PILOT_DIR) process.env.ALIGN_PILOT_DIR=`scripts/align/work/gem-ot-word-pilot-${model}`;
fs.mkdirSync("scripts/align/work/gem-ot",{recursive:true});
const state = { startedAt:new Date().toISOString(), model, stage:"pilot", complete:false };
const save = () => fs.writeFileSync(stateFile,JSON.stringify(state,null,2));
save();
for (const [stage,args] of [
  ["pilot",["scripts/align/run-gemini-ot.mjs","--pilot"]],
  ["quality",["scripts/align/measure-ot.mjs"]],
  ["generation",["scripts/align/run-gemini-ot.mjs"]],
  ["build",["scripts/align/build-ot.mjs"]],
  ["prepare",["scripts/align/prepare-complete-ot.mjs"]],
]) {
  state.stage=stage;save();
  console.log(`Etapa: ${stage}`);
  let code=await run(args);
  if (stage === "generation") {
    const maxAttempts = Number(process.env.ALIGN_MAX_ATTEMPTS || 50);
    for (let attempt=2;(code===1||code===2)&&attempt<=maxAttempts;attempt++) {
      console.log(`Nova tentativa dos capítulos pendentes: ${attempt}/${maxAttempts}`);
      await new Promise((resolve)=>setTimeout(resolve, code===2 ? 60000 : 30000));
      code=await run(args);
    }
  }
  if (code) { state.exitCode=code; state.stoppedAt=new Date().toISOString();save();process.exit(code); }
}
state.complete=true;state.stage="ready_for_review";state.finishedAt=new Date().toISOString();save();
console.log("Geração e SQL prontos para revisão. Nenhum dado foi gravado no banco.");
