import { useEffect, useRef } from "react";
import shaka from "shaka-player/dist/shaka-player.ui.js";
import "shaka-player/dist/controls.css";
import css from "./PlayerVideo.module.css";

export default function PlayerVideo({
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
        let progressoInicialRegistrado = false;
        let retomadaPronta = false;
        let desmontado = false;

        function salvarPosicao(forcar = false) {
            // Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou. durante o carregamento, o elemento de vídeo ainda
            // pode estar em 0. Não devemos sobrescrever o segundo salvo na API.
            if (aulaConcluida || !retomadaPronta) return filaSalvamentos;

            const posicao = Number(video.currentTime);
            if (!Number.isFinite(posicao) || posicao < 0) return filaSalvamentos;

            const diferenca = Math.abs(posicao - ultimaPosicaoSalva);
            // Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou. timeupdate grava a cada segundo. Assim, fechar uma
            // aula curta após cinco segundos não perde dez segundos de progresso.
            // Pausa, busca e saída da página sempre gravam o segundo exato.
            if (!forcar && diferenca < 1) return filaSalvamentos;

            ultimaPosicaoSalva = posicao;
            const idAula = videoAula.id;
            // Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou. envia periodicamente o ponto atual para o mesmo progresso usado pelo aplicativo.
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
            // Sprint item 7 - Criar métricas para o instrutor: alunos, conclusões, módulos concluídos e horas assistidas. registra o último intervalo assistido antes de encerrar a aula.
            salvarPosicao(true);
            aulaConcluida = true;
            const aulaAtual = callbacksRef.current.videoAula;
            filaSalvamentos.then(() => callbacksRef.current.marcarAssistida?.(aulaAtual));
        };

        // Sprint item 7 - Criar métricas para o instrutor: alunos, conclusões, módulos concluídos e horas assistidas. grava o ponto inicial quando o aluno realmente começa a reproduzir a aula.
        const quandoIniciar = () => {
            if (!retomadaPronta || progressoInicialRegistrado || aulaConcluida) return;
            progressoInicialRegistrado = true;
            ultimaPosicaoSalva = Number(video.currentTime) - 0.5;
            salvarPosicao(true);
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
        video.addEventListener("playing", quandoIniciar);
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

                // Sprint item 4 - Salvar o progresso das aulas para que o aluno continue de onde parou. Shaka recebe a posição ao carregar o manifesto
                // e prepara os segmentos a partir desse segundo. Alterar
                // currentTime depois do load podia deixar o player em zero.
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
        };

        carregarVideo();

        // Sprint item 10 - Bloquear captura de tela durante o curso. dificulta salvar ou arrastar o vídeo pelo menu e pelos gestos do navegador.
        const bloquearEvento = (evento) => {
            evento.preventDefault();
        };

        const bloquearTeclas = (evento) => {
            const tecla = evento.key.toLowerCase();
            const atalhoCaptura = evento.key === "PrintScreen"
                || (evento.shiftKey && evento.metaKey && ["3", "4", "5"].includes(tecla))
                || (evento.shiftKey && evento.ctrlKey && tecla === "s");
            if (atalhoCaptura) {
                evento.preventDefault();
            }
        };

        container.addEventListener("contextmenu", bloquearEvento);
        container.addEventListener("dragstart", bloquearEvento);
        document.addEventListener("keydown", bloquearTeclas);

        return () => {
            salvarPosicao(true);
            desmontado = true;
            video.removeEventListener(
                "ended",
                quandoTerminar
            );
            video.removeEventListener("timeupdate", quandoAtualizar);
            video.removeEventListener("playing", quandoIniciar);
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
            container.removeEventListener("dragstart", bloquearEvento);
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
            {/* Sprint item 10 - Bloquear captura de tela durante o curso. identifica visualmente a sessão do aluno para desencorajar a redistribuição de gravações. */}
            {marcaDagua && <span className={css.marcaDagua} aria-hidden="true">{marcaDagua}</span>}
        </div>
    );
}
