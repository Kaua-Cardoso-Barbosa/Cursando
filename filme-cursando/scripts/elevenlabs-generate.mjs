import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const env=await fs.readFile(path.join(root,'.env.elevenlabs'),'utf8');
const key=env.match(/^\s*ELEVENLABS_API_KEY\s*=\s*(.+)\s*$/m)?.[1]?.trim().replace(/^['"]|['"]$/g,'');
if(!key) throw Error('Chave local nao preenchida.');
const clips=JSON.parse(await fs.readFile(path.join(root,'audio/roteiro.json'),'utf8'));
const text=clips.map(c=>c.text).join('\n\n');
const audioPath=path.join(root,'audio/elevenlabs-original.mp3');
const metadataPath=path.join(root,'audio/elevenlabs-original.json');
const hash=createHash('sha256').update(text).digest('hex');
try{
 const old=JSON.parse(await fs.readFile(metadataPath,'utf8'));
 if(old.text_sha256===hash){await fs.access(audioPath);console.log('Audio existente preservado; nenhum credito consumido.');process.exit(0);}
 throw Error('Ha outra geracao salva. Preserve-a e escolha novos nomes antes de gerar novamente.');
}catch(error){if(error.code!=='ENOENT')throw error;}

async function api(route,body){
 const response=await fetch('https://api.elevenlabs.io'+route,{
  method:body?'POST':'GET',headers:{'xi-api-key':key,'Content-Type':'application/json'},
  body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(180000),
 });
 const data=await response.json();
 if(!response.ok)throw Error(`ElevenLabs HTTP ${response.status}: ${data.detail?.status||'request_failed'}`);
 return {data,requestId:response.headers.get('request-id'),credits:response.headers.get('character-cost')};
}
const {data:subscription}=await api('/v1/user/subscription');
if(text.length>2000||subscription.character_limit-subscription.character_count<text.length)throw Error('Limite de creditos para esta geracao excedido.');
const account=JSON.parse(await fs.readFile(path.join(root,'out/elevenlabs-account.json'),'utf8'));
const source=account.shared.find(v=>v.name.startsWith('Alice')&&v.accent==='brazilian'&&v.free_users_allowed);
if(!source)throw Error('Voz brasileira selecionada indisponivel; nenhuma sintese realizada.');
const {data:added}=await api(`/v1/voices/add/${source.public_owner_id}/${source.voice_id}`,{new_name:'Cursando - Alice Brasileira'});
const voiceId=added.voice_id||source.voice_id;
const model='eleven_multilingual_v2';
console.log(JSON.stringify({voice:source.name,model,characters:text.length,tier:subscription.tier,commercial_license:subscription.tier!=='free'}));
const {data,requestId,credits}=await api(`/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`,{
 text,model_id:model,seed:20261110,
 voice_settings:{stability:.48,similarity_boost:.75,style:.28,use_speaker_boost:true,speed:1},
});
if(!data.audio_base64||!data.alignment)throw Error('Resposta sem audio ou alinhamento. Nao repetir automaticamente.');
await fs.writeFile(audioPath,Buffer.from(data.audio_base64,'base64'),{flag:'wx'});
await fs.writeFile(metadataPath,JSON.stringify({provider:'ElevenLabs',voice_name:source.name,voice_id:voiceId,model_id:model,
 text,text_sha256:hash,alignment:data.alignment,normalized_alignment:data.normalized_alignment,
 request_id:requestId,credits:credits??text.length,tier:subscription.tier,
 commercial_license:subscription.tier!=='free',usage:subscription.tier==='free'?'Previa para revisao; sem licenca comercial.':'Gerado durante plano pago.'},null,2),{flag:'wx'});
console.log('Narracao e alinhamento salvos; chave nao registrada.');
