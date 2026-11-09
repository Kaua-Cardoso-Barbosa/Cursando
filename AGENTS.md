# Orientações de interface

- Antes de criar um componente, procure componentes existentes no projeto e reutilize ou adapte o que já atende à necessidade.
- Todos os alertas e confirmações controlados pelo site e pelo aplicativo devem usar a interface própria do sistema. Não use `window.alert`, `window.confirm`, `window.prompt`, equivalentes globais, `Alert.alert` do React Native ou diálogos genéricos do Expo para essas mensagens.
- No site, reutilize `frontend/src/components/Alerts/Alerts.jsx` para avisos e `frontend/src/components/ConfirmAlert/ConfirmAlert.jsx` para confirmações.
- No aplicativo, reutilize `mostrarAlerta` e `confirmar` de `mobile/src/components/FeedbackProvider_39.js`.
- Uma ação que exige confirmação só pode executar depois da confirmação explícita. Cancelar ou fechar o diálogo não deve executar a ação.
- Toda confirmação de exclusão deve aguardar 3 segundos a partir de cada abertura antes de habilitar o botão de confirmar ou excluir. Mostre a contagem regressiva e mantenha o cancelamento disponível durante a espera.
