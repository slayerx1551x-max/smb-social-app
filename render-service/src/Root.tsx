import React from 'react';
import { Composition } from 'remotion';

import { DEFAULT_PROPS, TEMPLATE_COMPONENTS, type TemplateKey } from './templates';

const KEYS: TemplateKey[] = ['promo', 'product', 'event', 'hours', 'review'];

// 9:16 vertical, 1080x1920, 5 seconds at 30fps.
export const RemotionRoot: React.FC = () => (
  <>
    {KEYS.map((key) => (
      <Composition
        key={key}
        id={key}
        component={TEMPLATE_COMPONENTS[key]}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={DEFAULT_PROPS}
      />
    ))}
  </>
);
