import { useEffect, useRef, useState } from "react";
import shaka from "shaka-player/dist/shaka-player.ui.js";
import "shaka-player/dist/controls.css";
import css from "./PlayerVideo_38.module.css";

function navegadorMovel() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export default function PlayerVideo({
    videoAula,
    videoUrl,
    mobileUrl,
    posterUrl,
    marcaDagua,
    marcarAssistida,
    salvarProgresso,
}) {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const callbacksRef = useRef({});
    const [preparandoMobile, setPreparandoMobile] = useState(false);
    const [erroReproducao, setErroReproducao] = useState("");
    const [tentativa, setTentativa] = useState(0);
    const usarNativo = Boolean(mobileUrl && navegadorMovel());
    callbacksRef.current = { videoAula, marcarAssistida, salvarProgresso };

    useEffect(() => {
        const video = videoRef.current;
        const container = containerRef.current;
        if (!video || !container || (!videoUrl && !mobileUrl)) return;

        const controlador = new AbortController();
        const posicaoInicial = Math.max(0, Number(videoAula?.progresso_segundos) || 0);
        let ultimaPosicaoSalva = posicaoInicial;
        let filaSalvamentos = Promise.resolve();
        let aulaConcluida = false;
        let progressoInicialRegistrado = false;
        let retomadaPronta = false;
        let desmontado = false;
        setErroReproducao("");
        setPreparandoMobile(usarNativo);

        // O mesmo acompanhamento de progresso é usado pelo Shaka e pelo vídeo nativo.
        function salvarPosicao(forcar = false) {
            if (aulaConcluida || !retomadaPronta) return filaSalvamentos;
            const posicao = Number(video.currentTime);
            if (!Number.isFinite(posicao) || posicao < 0) return filaSalvamentos;
            if (!forcar && Math.abs(posicao - ultimaPosicaoSalva) < 1) return filaSalvamentos;
            ultimaPosicaoSalva = posicao;
            const idAula = videoAula.id;
            filaSalvamentos = filaSalvamentos
                .then(() => callbacksRef.current.salvarProgresso?.(idAula, posicao))
                .catch((erro) => console.error("Erro ao salvar progresso da aula:", erro));
            return filaSalvamentos;
        }

        function quandoTerminar() {
            if (aulaConcluida) return;
            salvarPosicao(true);
            aulaConcluida = true;
            filaSalvamentos.then(() => callbacksRef.current.marcarAssistida?.(callbacksRef.current.videoAula));
        }

        function quandoIniciar() {
            if (!retomadaPronta || progressoInicialRegistrado || aulaConcluida) return;
            progressoInicialRegistrado = true;
            ultimaPosicaoSalva = Number(video.currentTime) - 0.5;
            salvarPosicao(true);
        }

        const quandoPausar = () => salvarPosicao(true);
        const quandoAtualizar = () => salvarPosicao(false);
        const quandoBuscar = () => salvarPosicao(true);
        const quandoOcultar = () => {
            if (document.hidden) {
                salvarPosicao(true);
                video.pause();
            }
        };
        const aoCarregarMetadados = () => {
            if (desmontado) return;
            if (posicaoInicial > 0) {
                const limite = Number.isFinite(video.duration)
                    ? Math.max(0, video.duration - 0.5)
                    : posicaoInicial;
                video.currentTime = Math.min(posicaoInicial, limite);
            }
            retomadaPronta = true;
            setPreparandoMobile(false);
        };
        const aoFalharVideoNativo = () => {
            if (!desmontado) {
                setPreparandoMobile(false);
                setErroReproducao("Não foi possível reproduzir este vídeo neste aparelho.");
            }
        };

        video.addEventListener("ended", quandoTerminar);
        video.addEventListener("timeupdate", quandoAtualizar);
        video.addEventListener("playing", quandoIniciar);
        video.addEventListener("pause", quandoPausar);
        video.addEventListener("seeked", quandoBuscar);
        video.addEventListener("loadedmetadata", aoCarregarMetadados);
        video.addEventListener("error", aoFalharVideoNativo);
        document.addEventListener("visibilitychange", quandoOcultar);
        window.addEventListener("pagehide", quandoPausar);

        // O DRM continua no desktop; no celular, o backend entrega um MP4 H.264/AAC autenticado.
        const player = usarNativo ? null : new shaka.Player();
        const ui = usarNativo ? null : new shaka.ui.Overlay(player, container, video);
        if (player) {
            player.configure({
                drm: {
                    clearKeys: {
                        "00112233445566778899aabbccddeeff": "000102030405060708090a0b0c0d0e0f",
                        "11112222333344445555666677778888": "101112131415161718191a1b1c1d1e1f",
                    },
                },
            });
            ui.configure({
                controlPanelElements: [
                    "play_pause", "rewind", "fast_forward", "time_and_duration",
                    "mute", "volume", "spacer", "playback_rate", "overflow_menu", "fullscreen",
                ],
                overflowMenuButtons: ["quality", "language", "captions"],
                playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
                bigButtons: ["play_pause"],
            });
        }
        const erroShaka = (evento) => {
            console.error("Erro no player:", evento.detail);
            setErroReproducao("Não foi possível carregar o vídeo. Tente novamente.");
        };
        player?.addEventListener("error", erroShaka);

        async function carregarVideo() {
            try {
                if (usarNativo) {
                    // HEAD inicia a conversão de aulas antigas e informa quando o MP4 está pronto.
                    while (!desmontado) {
                        const resposta = await fetch(mobileUrl, {
                            method: "HEAD",
                            credentials: "include",
                            signal: controlador.signal,
                        });
                        if (resposta.status === 202) {
                            await new Promise((resolver) => setTimeout(resolver, 2000));
                            continue;
                        }
                        if (!resposta.ok) throw new Error("Falha ao preparar o MP4.");
                        if (desmontado) return;
                        video.src = mobileUrl;
                        video.load();
                        setPreparandoMobile(false);
                        return;
                    }
                    return;
                }

                await player.attach(video);
                await player.load(videoUrl, posicaoInicial > 0 ? posicaoInicial : null);
                if (desmontado) return;
                retomadaPronta = true;
                if (!video.paused) quandoIniciar();
            } catch (erro) {
                if (desmontado || erro.name === "AbortError") return;
                console.error("Falha ao carregar vídeo:", erro);
                setPreparandoMobile(false);
                setErroReproducao("Não foi possível carregar o vídeo. Tente novamente.");
            }
        }
        carregarVideo();

        const bloquearEvento = (evento) => evento.preventDefault();
        const bloquearTeclas = (evento) => {
            const tecla = evento.key.toLowerCase();
            if (evento.key === "PrintScreen"
                || (evento.shiftKey && evento.metaKey && ["3", "4", "5"].includes(tecla))
                || (evento.shiftKey && evento.ctrlKey && tecla === "s")) {
                evento.preventDefault();
            }
        };
        container.addEventListener("contextmenu", bloquearEvento);
        container.addEventListener("dragstart", bloquearEvento);
        document.addEventListener("keydown", bloquearTeclas);

        return () => {
            salvarPosicao(true);
            desmontado = true;
            controlador.abort();
            video.removeEventListener("ended", quandoTerminar);
            video.removeEventListener("timeupdate", quandoAtualizar);
            video.removeEventListener("playing", quandoIniciar);
            video.removeEventListener("pause", quandoPausar);
            video.removeEventListener("seeked", quandoBuscar);
            video.removeEventListener("loadedmetadata", aoCarregarMetadados);
            video.removeEventListener("error", aoFalharVideoNativo);
            document.removeEventListener("visibilitychange", quandoOcultar);
            window.removeEventListener("pagehide", quandoPausar);
            player?.removeEventListener("error", erroShaka);
            if (ui) {
                Promise.resolve(ui.destroy()).then(() => player.destroy()).catch((erro) => {
                    console.error("Erro ao fechar o player:", erro);
                });
            }
            if (usarNativo) {
                video.pause();
                video.removeAttribute("src");
                video.load();
            }
            container.removeEventListener("contextmenu", bloquearEvento);
            container.removeEventListener("dragstart", bloquearEvento);
            document.removeEventListener("keydown", bloquearTeclas);
        };
    }, [videoUrl, mobileUrl, posterUrl, videoAula?.id, usarNativo, tentativa]);

    return (
        <div ref={containerRef} className={`${css.shakaVideoContainer} shaka-video-container`}>
            <video
                ref={videoRef}
                className={css.shakaVideo}
                poster={posterUrl}
                playsInline
                controls={usarNativo}
                preload="metadata"
                controlsList="nodownload noremoteplayback"
                disablePictureInPicture
                onContextMenu={(evento) => evento.preventDefault()}
            />
            {preparandoMobile && <div className={css.estadoVideo} role="status">Preparando vídeo para reprodução no celular...</div>}
            {erroReproducao && (
                <div className={css.estadoVideo} role="alert">
                    <span>{erroReproducao}</span>
                    <button type="button" onClick={() => setTentativa((valor) => valor + 1)}>
                        Tentar novamente
                    </button>
                </div>
            )}
            {marcaDagua && <span className={css.marcaDagua} aria-hidden="true">{marcaDagua}</span>}
        </div>
    );
}
