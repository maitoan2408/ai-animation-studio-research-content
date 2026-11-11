import React from 'react';
import {AbsoluteFill, Audio, Composition, Img, Sequence, staticFile, useCurrentFrame, registerRoot} from 'remotion';
import {Root as ReportRoot} from './RemotionReport';
import './scene.js';
const Study = () => {
  const frame = useCurrentFrame();
  return <AbsoluteFill>
    <div dangerouslySetInnerHTML={{__html: (globalThis as any).studySvg(frame)}}/>
    <Sequence from={24} durationInFrames={48}>
      <div style={{position:'absolute', left:8, top:8, width:30, height:30, background:'#f00'}}/>
    </Sequence>
    <Audio src={staticFile('sync.wav')}/>
  </AbsoluteFill>;
};
const MissingNative = () => <img src={staticFile('does-not-exist.png')} width={80} height={80}/>;
const MissingGuarded = () => <Img src={staticFile('does-not-exist.png')} width={80} height={80}/>;
const Root = () => <><ReportRoot/><Composition id="Study" component={Study} width={640} height={360} fps={24} durationInFrames={240}/>
  <Composition id="MissingNative" component={MissingNative} width={320} height={180} fps={24} durationInFrames={12}/>
  <Composition id="MissingGuarded" component={MissingGuarded} width={320} height={180} fps={24} durationInFrames={12}/>
</>;
registerRoot(Root);
