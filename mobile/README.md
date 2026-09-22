# Cursando Mobile

Aplicativo mobile em Expo/React Native para professor e aluno.

O professor gerencia os cursos existentes. O aluno acessa somente os cursos em que ja esta matriculado pelo site, ve as aulas do curso e assiste pelo player do app.

## Rodar

1. Garanta que o backend esteja ativo em `http://SEU_IP_DA_REDE:5000`.
2. Copie `.env.example` para `.env` e ajuste:

```env
EXPO_PUBLIC_API_URL=http://SEU_IP_DA_REDE:5000
```

3. Instale e inicie:

```bash
npm install
npm start
```

No Android emulator, a URL pode ser `http://10.0.2.2:5000`. No celular fisico pelo Expo Go, use o IP do computador na rede.
