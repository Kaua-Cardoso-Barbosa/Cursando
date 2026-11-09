import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import css from './PixQrCode.module.css';

export default function PixQrCode({ pagamento }) {
    const [falhaImagem, setFalhaImagem] = useState(false);
    const svg = pagamento?.qr_code_svg;
    const imagem = typeof svg === 'string' && svg.trim().startsWith('<svg')
        ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
        : pagamento?.qr_code_png;

    useEffect(() => setFalhaImagem(false), [imagem, pagamento?.codigo_pagamento]);

    if (!pagamento?.codigo_pagamento) return null;

    return <figure className={css.qrcode}>
        <div className={css.imagem}>
            {imagem && !falhaImagem
                ? <img src={imagem} width="224" height="224" alt="QR Code para pagar esta cobrança Pix" onError={() => setFalhaImagem(true)} />
                : <QRCodeSVG value={pagamento.codigo_pagamento} size={224} marginSize={4} title="QR Code para pagar esta cobrança Pix" />}
        </div>
        <figcaption>Escaneie no Arkhé ou use o Pix Copia e Cola abaixo.</figcaption>
    </figure>;
}
