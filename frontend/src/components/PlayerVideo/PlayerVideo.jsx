import { useEffect, useRef } from "react";
import shaka from "shaka-player/dist/shaka-player.ui.js";
import "shaka-player/dist/controls.css";
import css from "./PlayerVideo.module.css";

export default function PlayerVideo({
                                        videoAula,
                                        videoUrl,
                                        posterUrl,
                                        marcarAssistida,
                                        salvarProgresso,
                                    }) {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const callbacksRef = useRef({});
    callbacksRef.current = { videoAula, marcarAssistida, salvarProgresso };

    useEffect(() => {
        const video = videoRef.current;
        const container = containerRef.current;

        if (!video || !container || !videoUrl) return;

        const player = new shaka.Player();
        const posicaoInicial = Math.max(0, Number(videoAula?.progresso_segundos) || 0);
        let ultimaPosicaoSalva = posicaoInicial;
        let filaSalvamentos = Promise.resolve();
        let aulaConcluida = false;

        function salvarPosicao(forcar = false) {
            if (aulaConcluida) return filaSalvamentos;

            const posicao = Number(video.currentTime);
            if (!Number.isFinite(posicao) || posicao < 0) return filaSalvamentos;

            const diferenca = Math.abs(posicao - ultimaPosicaoSalva);
            if (diferenca < 0.5 || (!forcar && diferenca < 10)) return filaSalvamentos;

            ultimaPosicaoSalva = posicao;
            const idAula = videoAula.id;
            // Sprint item 4: envia periodicamente o ponto atual para o mesmo progresso usado pelo aplicativo.
            filaSalvamentos = filaSalvamentos
                .then(() => callbacksRef.current.salvarProgresso?.(idAula, posicao))
                .catch((erro) => console.error("Erro ao enfileirar progresso da aula:", erro));
            return filaSalvamentos;
        }

        const ui = new shaka.ui.Overlay(
            player,
            container,
            video
        );

        player.configure({
            drm: {
                clearKeys: {
                    "00112233445566778899aabbccddeeff":
                        "000102030405060708090a0b0c0d0e0f",

                    "11112222333344445555666677778888":
                        "101112131415161718191a1b1c1d1e1f"
                }
            }
        });

        ui.configure({
            controlPanelElements: [
                "play_pause",
                "rewind",
                "fast_forward",
                "time_and_duration",
                "mute",
                "volume",
                "spacer",
                "playback_rate",
                "overflow_menu",
                "fullscreen"
            ],

            overflowMenuButtons: [
                "quality",
                "language",
                "captions"
            ],

            playbackRates: [
                0.5,
                0.75,
                1,
                1.25,
                1.5,
                1.75,
                2
            ],

            bigButtons: [
                "play_pause"
            ]
        });

        const erroShaka = (evento) => {
            console.error("ERRO SHAKA:", evento.detail);
            console.error(
                "ERRO SHAKA JSON:",
                JSON.stringify(evento.detail, null, 2)
            );
        };

        player.addEventListener(
            "error",
            erroShaka
        );

        const quandoTerminar = () => {
            if (aulaConcluida) return;
            aulaConcluida = true;
            const aulaAtual = callbacksRef.current.videoAula;
            filaSalvamentos.then(() => callbacksRef.current.marcarAssistida?.(aulaAtual));
        };

        const quandoPausar = () => salvarPosicao(true);
        const quandoAtualizar = () => salvarPosicao(false);
        const quandoBuscar = () => salvarPosicao(true);
        const quandoOcultar = () => {
            if (document.hidden) salvarPosicao(true);
        };

        video.addEventListener(
            "ended",
            quandoTerminar
        );
        video.addEventListener("timeupdate", quandoAtualizar);
        video.addEventListener("pause", quandoPausar);
        video.addEventListener("seeked", quandoBuscar);
        document.addEventListener("visibilitychange", quandoOcultar);
        window.addEventListener("pagehide", quandoPausar);

        const carregarVideo = async () => {
            try {
                console.log(
                    "Manifesto:",
                    videoUrl
                );

                await player.attach(video);

                console.log(
                    "Player anexado ao vídeo"
                );

                await player.load(videoUrl);

                if (posicaoInicial > 0) {
                    const duracao = Number(video.duration);
                    const posicao = Number.isFinite(duracao) && duracao > 0
                        ? Math.min(posicaoInicial, Math.max(0, duracao - 1))
                        : posicaoInicial;
                    video.currentTime = posicao;
                }

                console.log(
                    "Vídeo carregado com sucesso!"
                );

            } catch (erro) {
                console.error("Falha ao carregar vídeo:", erro);
                console.error("Código:", erro?.code);
                console.error("Categoria:", erro?.category);
                console.error("Severidade:", erro?.severity);
                console.error("Dados:", erro?.data);
                console.error("Erro completo:", JSON.stringify(erro, null, 2));
            }
        };

        carregarVideo();

        const bloquearEvento = (evento) => {
            evento.preventDefault();
        };

        const bloquearTeclas = (evento) => {
            if (
                evento.key === "PrintScreen" ||
                (evento.ctrlKey && evento.shiftKey) ||
                (evento.metaKey && evento.shiftKey)
            ) {
                evento.preventDefault();
            }
        };

        container.addEventListener("contextmenu", bloquearEvento);
        document.addEventListener("keydown", bloquearTeclas);

        return () => {
            salvarPosicao(true);
            video.removeEventListener(
                "ended",
                quandoTerminar
            );
            video.removeEventListener("timeupdate", quandoAtualizar);
            video.removeEventListener("pause", quandoPausar);
            video.removeEventListener("seeked", quandoBuscar);
            document.removeEventListener("visibilitychange", quandoOcultar);
            window.removeEventListener("pagehide", quandoPausar);

            player.removeEventListener(
                "error",
                erroShaka
            );

            ui.destroy();
            container.removeEventListener("contextmenu", bloquearEvento);
            document.removeEventListener("keydown", bloquearTeclas);
        };
    }, [videoUrl, posterUrl, videoAula?.id]);

    return (
        <div
            ref={containerRef}
            className={`${css.shakaVideoContainer} shaka-video-container`}
        >
            <video
                ref={videoRef}
                className={css.shakaVideo}
                poster={posterUrl}
                playsInline
                controlsList="nodownload noremoteplayback"
                disablePictureInPicture
                onContextMenu={(evento) => evento.preventDefault()}
            />
        </div>
    );
}
