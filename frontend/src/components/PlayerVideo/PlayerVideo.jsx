import { useEffect, useRef } from "react";
import shaka from "shaka-player/dist/shaka-player.ui.js";
import "shaka-player/dist/controls.css";
import css from "./PlayerVideo.module.css";

export default function PlayerVideo({
                                        videoAula,
                                        videoUrl,
                                        posterUrl,
                                        marcarAssistida,
                                        drmConfig
                                    }) {
    const videoRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        const video = videoRef.current;
        const container = containerRef.current;

        if (!video || !container || !videoUrl) return;

        const player = new shaka.Player();

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
            marcarAssistida(videoAula);
        };

        video.addEventListener(
            "ended",
            quandoTerminar
        );

        const carregarVideo = async () => {
            try {

                await player.attach(video);

                console.log(
                    "Player anexado ao vídeo"
                );

                await player.load(videoUrl);

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

        return () => {
            video.removeEventListener(
                "ended",
                quandoTerminar
            );

            player.removeEventListener(
                "error",
                erroShaka
            );

            ui.destroy();

            player.destroy();
        };
    }, [videoUrl, marcarAssistida]);

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
            />
        </div>
    );
}