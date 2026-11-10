import { useRef, useState } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import AppIcon from './AppIcon_39';
import { colors, globalStyles } from '../styles_39';

export default function Select({ titulo, valor, opcoes = [], onChange, disabled = false, placeholder = 'Selecione', containerStyle, labelStyle, style }) {
  const ancora = useRef(null), fundo = useRef(null);
  const janela = useWindowDimensions();
  const [posicao, setPosicao] = useState(null), [origem, setOrigem] = useState({ x: 0, y: 0, height: janela.height });
  const atual = opcoes.find(([id]) => String(id) === String(valor));
  function abrir() {
    if (disabled) return;
    Keyboard.dismiss();
    ancora.current?.measureInWindow((x, y, width, height) => setPosicao({ x, y, width, height }));
  }
  function medirFundo(evento) {
    const height = evento.nativeEvent.layout.height;
    fundo.current?.measureInWindow((x, y) => setOrigem({ x, y, height }));
  }
  const y = (posicao?.y || 0) - origem.y;
  const abaixo = origem.height - y - (posicao?.height || 0) - 12;
  const acima = y - 12;
  const paraCima = abaixo < 240 && acima > abaixo;
  const altura = Math.max(48, Math.min(280, Math.max(48, opcoes.length * 48 + 2), paraCima ? acima : abaixo));
  const top = Math.max(8, paraCima ? y - altura - 4 : y + (posicao?.height || 0) + 4);
  return <View style={[globalStyles.field, containerStyle]}>
    {!!titulo && <Text style={[globalStyles.label, labelStyle]}>{titulo}</Text>}
    <Pressable ref={ancora} collapsable={false} accessibilityRole="combobox" accessibilityLabel={titulo}
      accessibilityValue={{ text: atual?.[1] || placeholder }} accessibilityState={{ expanded: !!posicao, disabled }} disabled={disabled}
      onPress={abrir} style={[s.campo, style, disabled && s.disabled]}>
      <Text style={[s.valor, !atual && { color: colors.muted }]} numberOfLines={2}>{atual?.[1] || placeholder}</Text><AppIcon name="chevron-down" size={12} color={colors.darkGreen} />
    </Pressable>
    <Modal visible={!!posicao} transparent animationType="none" onRequestClose={() => setPosicao(null)}>
      <View ref={fundo} collapsable={false} style={s.fundo} onLayout={medirFundo}>
        <Pressable style={StyleSheet.absoluteFillObject} accessibilityLabel="Fechar opções" onPress={() => setPosicao(null)} />
        {posicao && <View accessibilityViewIsModal style={[s.menu, { top, left: Math.max(8, posicao.x - origem.x), width: Math.min(posicao.width, janela.width - 16), height: altura }]}>
          <ScrollView keyboardShouldPersistTaps="handled">{opcoes.map(([id, texto], indice) => {
            const selecionado = String(id) === String(valor);
            return <Pressable key={`${id}:${indice}`} accessibilityRole="button" accessibilityState={{ selected: selecionado }}
              style={[s.opcao, selecionado && s.selecionada]} onPress={() => { setPosicao(null); onChange(id); }}>
              <Text style={[s.opcaoTexto, selecionado && s.textoSelecionado]}>{texto}</Text>{selecionado && <AppIcon name="check" size={12} color={colors.darkGreen} />}
            </Pressable>;
          })}{!opcoes.length && <Text style={s.opcaoTexto}>Nenhuma opção disponível.</Text>}</ScrollView>
        </View>}
      </View>
    </Modal>
  </View>;
}
const s = StyleSheet.create({
  campo: { minHeight: 46, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.white },
  valor: { flex: 1, color: colors.ink, fontSize: 15, lineHeight: 21 }, disabled: { opacity: .5 }, fundo: { flex: 1 },
  menu: { position: 'absolute', backgroundColor: colors.white, borderWidth: 1, borderColor: '#c6dfd0', borderRadius: 8, overflow: 'hidden', elevation: 8, shadowColor: '#173e2c', shadowOpacity: .12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  opcao: { minHeight: 48, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }, selecionada: { backgroundColor: '#eaf5ee' }, opcaoTexto: { flex: 1, color: colors.ink, fontSize: 14, lineHeight: 21 }, textoSelecionado: { color: colors.darkGreen, fontWeight: '700' }
});
