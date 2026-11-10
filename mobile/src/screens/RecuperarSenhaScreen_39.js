import BotaoVoltar from '../components/BotaoVoltar_39';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { apiRequest } from '../api/client_3_17';
import Field from '../components/Field_39';
import { useFeedback } from '../components/FeedbackProvider_39';
import { globalStyles as g } from '../styles_39';

export default function RecuperarSenhaScreen({ emailInicial = '', onBack }) {
  const [email, setEmail] = useState(emailInicial), [enviado, setEnviado] = useState(false);
  const [codigo, setCodigo] = useState(''), [senha, setSenha] = useState(''), [confirmacao, setConfirmacao] = useState('');
  const [ocupado, setOcupado] = useState(false), [erro, setErro] = useState('');
  const { mostrarAlerta } = useFeedback();
  async function enviar() {
    if (ocupado) return;
    setOcupado(true); setErro('');
    try {
      await apiRequest('/esqueci_minha_senha', { method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase() }) }, null, 30000);
      setEnviado(true); mostrarAlerta('Recuperação de senha', 'Confira o código enviado ao seu e-mail.', 'sucesso');
    } catch (e) { setErro(e.message); } finally { setOcupado(false); }
  }
  async function redefinir() {
    if (ocupado) return;
    if (!codigo.trim() || !senha || senha !== confirmacao) { setErro('Informe o código e duas senhas iguais.'); return; }
    setOcupado(true); setErro('');
    try {
      await apiRequest('/alterar_senha', { method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase(), codigo: codigo.trim(), nova_senha: senha, confirmar_nova_senha: confirmacao }) }, null, 15000);
      mostrarAlerta('Senha alterada', 'Entre usando sua nova senha.', 'sucesso'); onBack();
    } catch (e) { setErro(e.message); } finally { setOcupado(false); }
  }
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[g.page, { justifyContent: 'center', paddingBottom: 32, gap: 20 }]}>
    <BotaoVoltar disabled={ocupado} onPress={onBack}>Voltar ao login</BotaoVoltar>
    <Text style={g.title}>Esqueci minha senha</Text><Text>{enviado ? 'Digite o código recebido por e-mail e escolha sua nova senha.' : 'Informe o e-mail da sua conta para receber um código de recuperação.'}</Text>
    <View style={[g.card, { padding: 18, gap: 12 }]}>
      <Field label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={!enviado && !ocupado} />
      {enviado && <><Field label="Código recebido" value={codigo} onChangeText={setCodigo} autoCapitalize="none" editable={!ocupado} /><Field label="Nova senha" value={senha} onChangeText={setSenha} secureTextEntry editable={!ocupado} /><Field label="Confirmar nova senha" value={confirmacao} onChangeText={setConfirmacao} secureTextEntry editable={!ocupado} /><Text style={{ fontSize: 12 }}>Use pelo menos 8 caracteres, com maiúscula, minúscula, número e caractere especial.</Text></>}
      {!!erro && <Text accessibilityRole="alert" style={g.error}>{erro}</Text>}
      <Pressable disabled={ocupado} style={g.primaryButton} onPress={enviado ? redefinir : enviar}><Text style={g.buttonText}>{ocupado ? 'Aguarde...' : enviado ? 'Alterar senha' : 'Enviar código'}</Text></Pressable>
      {enviado && <Pressable disabled={ocupado} onPress={() => { setEnviado(false); setCodigo(''); setErro(''); }}><Text style={g.secondaryText}>Usar outro e-mail</Text></Pressable>}
    </View>
  </ScrollView></KeyboardAvoidingView>;
}
