import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';

const AutoTextarea = forwardRef(function AutoTextarea({ onInput, style, value, ...props }, ref) {
    const campoRef = useRef(null);
    useImperativeHandle(ref, () => campoRef.current);

    function ajustarAltura(campo = campoRef.current) {
        if (!campo) return;
        campo.style.height = 'auto';
        campo.style.height = `${campo.scrollHeight}px`;
    }

    useLayoutEffect(() => {
        ajustarAltura();
    }, [value]);

    return <textarea
        {...props}
        ref={campoRef}
        value={value}
        style={{ ...style, resize: 'none', overflowY: 'hidden' }}
        onInput={(evento) => {
            ajustarAltura(evento.currentTarget);
            onInput?.(evento);
        }}
    />;
});

export default AutoTextarea;
