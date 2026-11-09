import { Image, StyleSheet, Text, View } from 'react-native';

export default function PixQrCode({ pagamento }) {
    if (!pagamento?.codigo_pagamento || !pagamento?.qr_code_png) return null;

    return <View style={styles.container}>
        <View style={styles.moldura}>
            <Image
                source={{ uri: pagamento.qr_code_png }}
                style={styles.imagem}
                resizeMode="contain"
                accessibilityLabel="QR Code para pagar esta cobrança Pix"
            />
        </View>
        <Text style={styles.legenda}>Escaneie no Arkhé ou use o Pix Copia e Cola abaixo.</Text>
    </View>;
}

const styles = StyleSheet.create({
    container: { alignItems: 'center', gap: 10, marginVertical: 12 },
    moldura: { width: '100%', maxWidth: 248, padding: 12, borderWidth: 1, borderColor: '#dfe9e3', borderRadius: 12, backgroundColor: '#ffffff' },
    imagem: { width: '100%', aspectRatio: 1 },
    legenda: { color: '#607468', fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
