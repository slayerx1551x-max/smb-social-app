import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export type TemplateKey = 'promo' | 'product' | 'event' | 'hours' | 'review';

export type TemplateProps = {
  headline: string;
  subline: string;
  cta: string;
  colors: string[]; // [primary, accent, dark]
  logoUrl?: string | null;
};

export const DEFAULT_PROPS: TemplateProps = {
  headline: 'Weekend Sale',
  subline: '25% off everything, Saturday & Sunday only.',
  cta: 'Shop now',
  colors: ['#2F80FF', '#22D3EE', '#0B2447'],
  logoUrl: null,
};

const FONT = 'Helvetica, Arial, sans-serif';

/** Fade + rise reveal that starts at `delay` frames. */
function useReveal(delay: number) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return { opacity: s, transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px)` };
}

function Reveal({
  delay,
  style,
  children,
}: {
  delay: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const r = useReveal(delay);
  return <div style={{ ...style, opacity: r.opacity, transform: r.transform }}>{children}</div>;
}

function Frame({
  props,
  bg,
  textColor,
  badge,
}: {
  props: TemplateProps;
  bg: string;
  textColor: string;
  badge: string;
}) {
  const [primary, accent, dark] = props.colors;
  return (
    <AbsoluteFill style={{ backgroundColor: bg, fontFamily: FONT }}>
      {/* accent rail */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 20, background: accent }} />
      <AbsoluteFill style={{ padding: 96, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {props.logoUrl ? (
            <Img src={props.logoUrl} style={{ width: 150, height: 150, objectFit: 'contain' }} />
          ) : (
            <div />
          )}
          <Reveal delay={2}>
            <div
              style={{
                background: accent,
                color: dark,
                fontWeight: 800,
                fontSize: 34,
                padding: '14px 28px',
                borderRadius: 60,
              }}
            >
              {badge}
            </div>
          </Reveal>
        </div>

        <div>
          <Reveal delay={8} style={{ marginBottom: 24 }}>
            <div style={{ width: 120, height: 14, borderRadius: 7, background: accent }} />
          </Reveal>
          <Reveal delay={12}>
            <div style={{ color: textColor, fontWeight: 800, fontSize: 132, lineHeight: 1.02 }}>
              {props.headline}
            </div>
          </Reveal>
          <Reveal delay={22}>
            <div style={{ color: textColor, opacity: 0.88, fontSize: 52, marginTop: 32, lineHeight: 1.25 }}>
              {props.subline}
            </div>
          </Reveal>
        </div>

        <Reveal delay={34}>
          <div
            style={{
              alignSelf: 'flex-start',
              background: accent,
              color: dark,
              fontWeight: 700,
              fontSize: 46,
              padding: '26px 54px',
              borderRadius: 70,
            }}
          >
            {props.cta}
          </div>
        </Reveal>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// Five templates — same motion, distinct color treatment + badge.
export const Promo: React.FC<TemplateProps> = (p) => (
  <Frame props={p} bg={p.colors[0]} textColor="#FFFFFF" badge="SALE" />
);
export const ProductSpotlight: React.FC<TemplateProps> = (p) => (
  <Frame props={p} bg={p.colors[2] ?? '#0B0D12'} textColor="#FFFFFF" badge="NEW" />
);
export const EventAnnouncement: React.FC<TemplateProps> = (p) => (
  <Frame props={p} bg={p.colors[0]} textColor="#FFFFFF" badge="EVENT" />
);
export const Hours: React.FC<TemplateProps> = (p) => (
  <Frame props={p} bg="#F4F4F7" textColor={p.colors[2] ?? '#111111'} badge="OPEN" />
);
export const ReviewHighlight: React.FC<TemplateProps> = (p) => (
  <Frame props={p} bg={p.colors[2] ?? '#0B0D12'} textColor="#FFFFFF" badge="★★★★★" />
);

export const TEMPLATE_COMPONENTS: Record<TemplateKey, React.FC<TemplateProps>> = {
  promo: Promo,
  product: ProductSpotlight,
  event: EventAnnouncement,
  hours: Hours,
  review: ReviewHighlight,
};
