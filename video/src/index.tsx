import React from 'react';
import { registerRoot, Composition } from 'remotion';
import { Film } from './Film';

const Root: React.FC = () => <>
  <Composition id="CursandoLandscape" component={Film} durationInFrames={1800} fps={30} width={1920} height={1080} defaultProps={{ vertical: false, short: false }} />
  <Composition id="CursandoVertical" component={Film} durationInFrames={1800} fps={30} width={1080} height={1920} defaultProps={{ vertical: true, short: false }} />
  <Composition id="CursandoShort" component={Film} durationInFrames={450} fps={30} width={1080} height={1920} defaultProps={{ vertical: true, short: true }} />
</>;
registerRoot(Root);
