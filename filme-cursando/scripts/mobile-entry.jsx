import React from 'react';
import { createRoot } from 'react-dom/client';
import { View } from 'react-native';
import Inicio from '../../mobile/src/screens/InicioScreen_7_39';
import Aulas from '../../mobile/src/screens/AulasAlunoScreen_4_5_6_20_21_27_39';
import Prova from '../../mobile/src/screens/ProvaAlunoScreen_20_39';
import Chat from '../../mobile/src/screens/ChatScreen_3_19_39';
import Feedback from '../../mobile/src/components/FeedbackProvider_39';
import BottomNav from '../../mobile/src/components/BottomNav_19_23_25_28_39';
const d = window.productData;
const screen = new URLSearchParams(location.search).get('screen') || 'home';
const noop = () => {};
const content = screen === 'home' ? <Inicio tipoUsuario={2} usuario={{ nome: 'Aluno' }} dashboard={d.dashboard} onOpenLesson={noop} />
  : screen === 'exam' ? <Prova curso={d.course.curso} prova={d.exam} onBack={noop} />
  : screen === 'chat' ? <Chat token="demo" tipoUsuario={2} />
  : <Aulas detalhe={{ ...d.course, prova: d.exam }} token="demo" onBack={noop} onOpenLesson={noop} onDownloadCertificate={noop} />;
createRoot(document.getElementById('root')).render(<Feedback><View style={{ flex: 1 }}>{content}</View><BottomNav active={screen === 'home' ? 'home' : screen === 'chat' ? 'chat' : 'courses'} tipoUsuario={2} onChange={noop} /></Feedback>);
