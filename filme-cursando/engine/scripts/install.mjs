import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {args,ROOT,run,main} from './common.mjs';
export const contents=['SKILL.md','AGENTS.md','CLAUDE.md','agents','references','assets','scripts','tests','examples','package.json','package-lock.json','requirements-audio.txt','README.md','LICENSE','THIRD_PARTY_NOTICES.md'];
export async function installTo(base,{update=false}={}) {
  const target=path.resolve(base,'motion-video-studio');
  if(target===ROOT || ROOT.startsWith(target+path.sep) || target.startsWith(ROOT+path.sep)) throw new Error('Destino deve ser separado da origem');
  await fs.mkdir(base,{recursive:true});
  let exists=false;try{await fs.access(target);exists=true;}catch{}
  if(exists){
    if(!update)throw new Error(`Destino já existe: ${target}. Use --update para criar backup e atualizar.`);
    const backupRoot=path.join(path.dirname(base),'skill-backups');
    await fs.mkdir(backupRoot,{recursive:true});
    await fs.rename(target,path.join(backupRoot,`motion-video-studio-${Date.now()}`));
  }
  await fs.mkdir(target);
  for(const item of contents) await fs.cp(path.join(ROOT,item),path.join(target,item),{recursive:true,errorOnExist:true});
  return target;
}
main(async()=>{
  const a=args(), agent=a.agent || 'both';
  if(!['both','codex','claude'].includes(agent))throw new Error('--agent: both, codex ou claude');
  const home=a.home ? path.resolve(a.home) : os.homedir();
  const targets=[];
  if(agent!=='claude')targets.push(path.join(home,'.agents','skills'));
  if(agent!=='codex')targets.push(path.join(home,'.claude','skills'));
  const npmCli=process.env.npm_execpath;
  if(!a['skip-deps'] && !npmCli)throw new Error('Execute via npm run install:skills, ou use --skip-deps e npm ci manualmente.');
  for(const base of targets){
    const target=await installTo(base,{update:!!a.update});
    if(!a['skip-deps'])run(process.execPath,[npmCli,'ci','--ignore-scripts'],{cwd:target});
    console.log(`Instalada: ${target}`);
  }
  console.log('Reabra o agente para atualizar a descoberta de skills. Chromium usa cache compartilhado do Playwright.');
});
