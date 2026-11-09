import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppIcon from './AppIcon_39';

export default function EtapaModulo({ modulo, numero, ultima, onAbrir, expandido, children }) {
    const total = modulo.total_aulas ?? modulo.aulas?.length ?? 0;
    return <View style={styles.etapa}>
        {!ultima && <View style={styles.linha} pointerEvents="none" />}
        <View style={styles.numero} accessible={false}><Text style={styles.numeroTexto}>{numero}</Text></View>
        <View style={styles.cartao}>
            <Pressable
                style={styles.abrir}
                onPress={onAbrir}
                accessibilityRole="button"
                accessibilityLabel={`Módulo ${numero}: ${modulo.titulo}`}
                accessibilityState={expandido === undefined ? undefined : { expanded: expandido }}
            >
                <View style={styles.conteudo}>
                    <Text style={styles.rotulo}>Módulo {numero}</Text>
                    <Text style={styles.titulo}>{modulo.titulo}</Text>
                    {modulo.descricao ? <Text style={styles.descricao}>{modulo.descricao}</Text> : null}
                    <Text style={styles.detalhes}>{total} {Number(total) === 1 ? 'aula' : 'aulas'}{modulo.status_nome ? ` · ${modulo.status_nome}` : ''}</Text>
                </View>
                <AppIcon name={expandido === undefined ? 'chevron-right' : expandido ? 'chevron-up' : 'chevron-down'} size={16} color="#087044" />
            </Pressable>
            {children}
        </View>
    </View>;
}

const styles = StyleSheet.create({
    etapa: { position: 'relative', flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    linha: { position: 'absolute', top: 40, bottom: -20, left: 19, width: 2, backgroundColor: '#c6dfd0' },
    numero: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#087044', alignItems: 'center', justifyContent: 'center' },
    numeroTexto: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
    cartao: { flex: 1, minWidth: 0, overflow: 'hidden', borderWidth: 1, borderColor: '#d5e5da', borderRadius: 12, backgroundColor: '#f5faf7' },
    abrir: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    conteudo: { flex: 1, minWidth: 0, gap: 7 },
    rotulo: { color: '#087044', fontSize: 12, fontWeight: '700' },
    titulo: { color: '#173e2c', fontSize: 18, lineHeight: 24, fontWeight: '700' },
    descricao: { color: '#607468', fontSize: 14, lineHeight: 21 },
    detalhes: { color: '#365b48', fontSize: 13 },
});
