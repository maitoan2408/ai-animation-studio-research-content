// src/Root.tsx
import React from 'react';
import {
  AbsoluteFill, Composition, interpolate, useCurrentFrame,
} from 'remotion';

const Shot: React.FC = () => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, 119], [0, 360], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{backgroundColor: '#eee8d5'}}>
      <div style={{
        position: 'absolute', left: 180, top: 480,
        width: 160, height: 160, backgroundColor: '#203342',
        transform: `translateX(${x}px)`,
      }} />
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => (
  <Composition id="MyVideo" component={Shot}
    width={1920} height={1080}
    fps={24} durationInFrames={120} />
);
