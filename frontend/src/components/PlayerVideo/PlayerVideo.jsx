import { useEffect, useRef } from "react";
import shaka from "shaka-player/dist/shaka-player.ui.js";
import "shaka-player/dist/controls.css";
import css from "./PlayerVideo.module.css";

export default function PlayerVideo({
                                        videoAula,
                                        videoUrl,
                                        posterUrl,
                                        marcarAssistida
                                    }) {
    const videoRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        const video = videoRef.current;
        const container = containerRef.current;

        if (!video || !container) return;

        const player = new shaka.Player();

        const ui = new shaka.ui.Overlay(
            player,
            container,
            video
        );

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
            console.error("Erro do Shaka:", evento.detail);
        };

        player.addEventListener("error", erroShaka);

        const quandoTerminar = () => {
            marcarAssistida(videoAula);
        };

        video.addEventListener("ended", quandoTerminar);

        const carregarVideo = async () => {
            try {
                console.log("URL do vídeo:", videoUrl);

                await player.attach(video);

                console.log("Player anexado ao vídeo");

                await player.load(videoUrl);

                console.log("Vídeo carregado com sucesso!");
            } catch (erro) {
                console.error("Falha ao carregar vídeo:", erro);
            }
        };

        carregarVideo();

        return () => {
            video.removeEventListener("ended", quandoTerminar);
            player.removeEventListener("error", erroShaka);

            ui.destroy();
        };
    }, [videoUrl, videoAula, marcarAssistida]);

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