import { useEffect, useRef } from "react";
import shaka from "shaka-player/dist/shaka-player.ui.js";
import "shaka-player/dist/controls.css";
import css from "./PlayerVideo_38.module.css";

export default
function PlayerVideo({
                                        videoAula,
                                        videoUrl,
                                        posterUrl,
                                        marcaDagua,
                                        marcarAssistida,
                                        salvarProgresso,
                                    }) {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const callbacksRef = useRef({});
    /* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Consulta, salva ou retoma a posição e a conclusão da aula */
    callbacksRef.current = { videoAula, marcarAssistida, salvarProgresso };
    /* Fim item 4 */

    useEffect(
() => {
        const video = videoRef.current;
        const container = containerRef.current;

        if (!video || !container || !videoUrl) return;

        const player = new shaka.Player();
        /* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Consulta, salva ou retoma a posição e a conclusão da aula */
        const posicaoInicial = Math.max(0, Number(videoAula?.progresso_segundos) || 0);
        let ultimaPosicaoSalva = posicaoInicial;
        /* Fim item 4 */
        let filaSalvamentos = Promise.resolve();
        let aulaConcluida = false;
        let progressoInicialRegistrado = false;
        let retomadaPronta = false;
        let desmontado = false;

/* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Enfileira o envio da posição atual do vídeo */
function salvarPosicao(forcar = false) {


            if (aulaConcluida || !retomadaPronta) return filaSalvamentos;

            const posicao = Number(video.currentTime);
            if (!Number.isFinite(posicao) || posicao < 0) return filaSalvamentos;

            const diferenca = Math.abs(posicao - ultimaPosicaoSalva);



            if (!forcar && diferenca < 1) return filaSalvamentos;

            ultimaPosicaoSalva = posicao;
            const idAula = videoAula.id;

            filaSalvamentos = filaSalvamentos
                .then(() => callbacksRef.current.salvarProgresso?.(idAula, posicao))
                .catch((erro) => console.error("Erro ao enfileirar progresso da aula:", erro));
            return filaSalvamentos;
        }
/* Fim item 4 */

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

        /* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Salva a posição final e registra a aula como assistida */
        const quandoTerminar =
() => {
            if (aulaConcluida) return;

            salvarPosicao(true);
            aulaConcluida = true;
            const aulaAtual = callbacksRef.current.videoAula;
            filaSalvamentos.then(() => callbacksRef.current.marcarAssistida?.(aulaAtual));
        }
;


        const quandoIniciar = () => {
            if (!retomadaPronta || progressoInicialRegistrado || aulaConcluida) return;
            progressoInicialRegistrado = true;
            ultimaPosicaoSalva = Number(video.currentTime) - 0.5;
            salvarPosicao(true);
        };
        /* Fim item 4 */
        const quandoPausar = () => salvarPosicao(true);
        const quandoAtualizar = () => salvarPosicao(false);
        const quandoBuscar = () => salvarPosicao(true);
        const quandoOcultar = () => {
            /* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Consulta, salva ou retoma a posição e a conclusão da aula */
            if (document.hidden) salvarPosicao(true);
            /* Fim item 4 */
        };

        video.addEventListener(
            "ended",
            quandoTerminar
        );
        video.addEventListener("timeupdate", quandoAtualizar);
        video.addEventListener("playing", quandoIniciar);
        video.addEventListener("pause", quandoPausar);
        video.addEventListener("seeked", quandoBuscar);
        /* Sprint item 26 - Bloquear gravação de tela durante o curso - Protege a reprodução diante de gravação ou ocultação da tela detectável */
        document.addEventListener("visibilitychange", quandoOcultar);
        /* Fim item 26 */
        window.addEventListener("pagehide", quandoPausar);

        /* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Retoma a reprodução na posição anteriormente salva */
        const carregarVideo =
async () => {
            try {
                console.log(
                    "Manifesto:",
                    videoUrl
                );

                await player.attach(video);

                console.log(
                    "Player anexado ao vídeo"
                );




                await player.load(videoUrl, posicaoInicial > 0 ? posicaoInicial : null);
                if (desmontado) return;
                retomadaPronta = true;
                if (!video.paused) quandoIniciar();

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
        }
;
        /* Fim item 4 */

        carregarVideo();


        const bloquearEvento = (evento) => {
            evento.preventDefault();
        };

        /* Sprint item 10 - Bloquear captura de tela durante o curso - Intercepta os atalhos de captura de tela reconhecidos pelo navegador */
        const bloquearTeclas = (evento) => {
            const tecla = evento.key.toLowerCase();
            const atalhoCaptura = evento.key === "PrintScreen"
                || (evento.shiftKey && evento.metaKey && ["3", "4", "5"].includes(tecla))
                || (evento.shiftKey && evento.ctrlKey && tecla === "s");
            if (atalhoCaptura) {
                evento.preventDefault();
            }
        };
        /* Fim item 10 */

        container.addEventListener("contextmenu", bloquearEvento);
        container.addEventListener("dragstart", bloquearEvento);
        /* Sprint item 10 - Bloquear captura de tela durante o curso - Trata os atalhos ou eventos detectáveis de captura de tela */
        document.addEventListener("keydown", bloquearTeclas);
        /* Fim item 10 */

        return () => {
            /* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Consulta, salva ou retoma a posição e a conclusão da aula */
            salvarPosicao(true);
            /* Fim item 4 */
            desmontado = true;
            video.removeEventListener(
                "ended",
                quandoTerminar
            );
            video.removeEventListener("timeupdate", quandoAtualizar);
            video.removeEventListener("playing", quandoIniciar);
            video.removeEventListener("pause", quandoPausar);
            video.removeEventListener("seeked", quandoBuscar);
            /* Sprint item 26 - Bloquear gravação de tela durante o curso - Protege a reprodução diante de gravação ou ocultação da tela detectável */
            document.removeEventListener("visibilitychange", quandoOcultar);
            /* Fim item 26 */
            window.removeEventListener("pagehide", quandoPausar);

            player.removeEventListener(
                "error",
                erroShaka
            );

            ui.destroy();
            container.removeEventListener("contextmenu", bloquearEvento);
            container.removeEventListener("dragstart", bloquearEvento);
            /* Sprint item 10 - Bloquear captura de tela durante o curso - Trata os atalhos ou eventos detectáveis de captura de tela */
            document.removeEventListener("keydown", bloquearTeclas);
            /* Fim item 10 */
        };
    }
, [videoUrl, posterUrl, videoAula?.id]);

    return (
        /* Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou - Consulta, salva ou retoma a posição e a conclusão da aula */ <div
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
                                                                                                                                                                        
            {marcaDagua && <span className={css.marcaDagua} aria-hidden="true">{marcaDagua}</span>}
        </div> /* Fim item 4 */
    );
}
