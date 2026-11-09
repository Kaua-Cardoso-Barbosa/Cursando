const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Isola somente o armazenamento nativo; executa o cliente real com fetch controlado.
function cliente(fetch) {
  const arquivo = path.join(__dirname, '../src/api/client_3_17.js');
  const codigo = fs.readFileSync(arquivo, 'utf8')
    .replace(/import AsyncStorage from .*?;/, '')
    .replace(/\bexport\s*/g, '');
  const contexto = vm.createContext({
    fetch, console, AbortController, FormData, setTimeout, clearTimeout,
    process: { env: { EXPO_PUBLIC_API_URL: 'http://api:5000' } },
    AsyncStorage: { multiRemove: async () => {}, multiSet: async () => {} },
  });
  vm.runInContext(codigo + '\nglobalThis.cliente = { apiRequest, limparSessao, definirAoInvalidarSessao };', contexto);
  return contexto.cliente;
}
const resposta = (dados = {}, status = 200) => ({ ok: status < 400, status, json: async () => dados });

test('compartilha GETs em andamento e conserva perfil no cache curto', async () => {
  let resolver;
  let chamadas = 0;
  const api = cliente(async () => { chamadas++; return new Promise(resolve => { resolver = resolve; }); });
  const primeira = api.apiRequest('/perfil', {}, 'token');
  const segunda = api.apiRequest('/perfil', {}, 'token');
  assert.equal(chamadas, 1);
  resolver(resposta({ nome: 'Aluno' }));
  assert.equal((await primeira).nome, 'Aluno');
  assert.equal((await segunda).nome, 'Aluno');
  assert.equal((await api.apiRequest('/perfil', {}, 'token')).nome, 'Aluno');
  assert.equal(chamadas, 1);
});

test('gravação invalida o perfil e GET não envia Content-Type desnecessário', async () => {
  const chamadas = [];
  const api = cliente(async (url, opcoes) => { chamadas.push({ url, opcoes }); return resposta({ nome: 'Aluno' }); });
  await api.apiRequest('/perfil', {}, 'token');
  await api.apiRequest('/perfil', { method: 'PUT', body: '{}' }, 'token');
  await api.apiRequest('/perfil', {}, 'token');
  assert.equal(chamadas.length, 3);
  assert.equal(chamadas[0].opcoes.headers['Content-Type'], undefined);
  assert.equal(chamadas[1].opcoes.headers['Content-Type'], 'application/json');
});

test('primeiro envio descobre a API por health e não repete POST após timeout', async () => {
  const chamadas = [];
  const api = cliente(async (url, opcoes) => {
    chamadas.push({ url, opcoes });
    if (url.endsWith('/health')) return resposta({ status: 'ok' });
    const erro = new Error('timeout'); erro.name = 'AbortError'; throw erro;
  });
  await assert.rejects(api.apiRequest('/chat/cursos/11/mensagens', { method: 'POST', body: '{}' }, 'token'));
  assert.equal(chamadas.length, 2);
  assert.ok(chamadas[0].url.endsWith('/health'));
  assert.equal(chamadas[1].opcoes.method, 'POST');
});

test('401 informa o token invalidado e preserva o status do erro', async () => {
  let invalidado;
  const api = cliente(async () => resposta({ mensagem: 'Sessao expirada' }, 401));
  api.definirAoInvalidarSessao(token => { invalidado = token; });
  await assert.rejects(api.apiRequest('/perfil', {}, 'expirado'), erro => erro.status === 401);
  assert.equal(invalidado, 'expirado');
});

test('leituras anteriores a uma gravação não repovoam o cache com perfil antigo', async () => {
  let resolver;
  let perfis = 0;
  const api = cliente(async url => {
    if (url.endsWith('/health')) return resposta({ status: 'ok' });
    if (url.endsWith('/perfil') && ++perfis === 1) return new Promise(resolve => { resolver = resolve; });
    return resposta({ nome: 'Atualizado' });
  });
  const antiga = api.apiRequest('/perfil', {}, 'token');
  await api.apiRequest('/alterar', { method: 'PUT', body: '{}' }, 'token');
  resolver(resposta({ nome: 'Anterior' }));
  await antiga;
  assert.equal((await api.apiRequest('/perfil', {}, 'token')).nome, 'Atualizado');
  assert.equal(perfis, 2);
});
