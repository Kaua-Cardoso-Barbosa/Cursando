import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = await fs.readFile(path.join(root, '.env.elevenlabs'), 'utf8');
const key = env.split(/\r?\n/).map(line => line.trim())
  .find(line => line.startsWith('ELEVENLABS_API_KEY='))?.slice('ELEVENLABS_API_KEY='.length).trim().replace(/^['"]|['"]$/g, '');
if (!key) throw new Error('Preencha ELEVENLABS_API_KEY no arquivo local indicado.');

async function api(route) {
  const response = await fetch(`https://api.elevenlabs.io${route}`, {
    headers: {'xi-api-key': key}, signal: AbortSignal.timeout(45000),
  });
  const data = await response.json();
  if (!response.ok) {
    // A mensagem do provedor nunca inclui a credencial no log local.
    const status = data.detail?.status || data.detail?.code || 'request_failed';
    console.log(JSON.stringify({route, http: response.status, status}));
    return null;
  }
  return data;
}

const subscription = await api('/v1/user/subscription');
if (!subscription) process.exit(1);
const voices = await api('/v2/voices?page_size=100');
const models = await api('/v1/models');
const shared = await api('/v1/shared-voices?language=pt&gender=female&page_size=20');
const report = {
  subscription: {
    tier: subscription.tier,
    status: subscription.status,
    character_count: subscription.character_count,
    character_limit: subscription.character_limit,
    can_extend_character_limit: subscription.can_extend_character_limit,
  },
  voices: (voices?.voices || []).map(v => ({
    voice_id: v.voice_id, name: v.name, labels: v.labels,
    category: v.category, description: v.description,
    preview_url: v.preview_url, verified_languages: v.verified_languages,
    high_quality_base_model_ids: v.high_quality_base_model_ids,
    available_for_tiers: v.available_for_tiers,
  })),
  models: (models || []).filter(m => m.can_do_text_to_speech).map(m => ({
    model_id: m.model_id, name: m.name,
    can_be_finetuned: m.can_be_finetuned,
    languages: m.languages?.filter(l => l.language_id === 'pt'),
    model_rates: m.model_rates,
  })),
  shared: (shared?.voices || []).map(v => ({
    voice_id: v.voice_id, public_owner_id: v.public_owner_id,
    name: v.name, language: v.language, accent: v.accent,
    category: v.category, free_users_allowed: v.free_users_allowed,
    description: v.description, preview_url: v.preview_url,
  })),
};
await fs.mkdir(path.join(root, 'out'), {recursive: true});
await fs.writeFile(path.join(root, 'out/elevenlabs-account.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({subscription: report.subscription,
  voices: report.voices.map(v => ({id:v.voice_id, name:v.name, language:v.labels?.language})),
  models: report.models.map(m => m.model_id), shared: report.shared}, null, 2));
