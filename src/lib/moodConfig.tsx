import { DetailedMood } from './mood';

export type BalloonStyle = {
  fill: string;
  label: string;
  darkFill: string;
  Icon: React.ElementType; 
  fontColor?: string;
};

// Generic icons based on broad categories
const IconJoy = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
  </svg>
);

const IconLove = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const IconSadness = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
  </svg>
);

const IconGuilt = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    <path d="M12 8v4M12 16h.01"/>
  </svg>
);

const IconSensitive = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
  </svg>
);

const IconChaos = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4M12 14a2 2 0 0 0 2-2M15 12a3 3 0 0 1-3-3M9 12a3 3 0 0 0 3-3M12 3v3M12 18v3M5 12h3M16 12h3M7 7l2 2M15 15l2 2M17 7l-2 2M7 17l2-2" />
  </svg>
);

const IconAnger = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M10 2L2 12h8l-2 10 10-10h-8l2-10z" />
  </svg>
);

const IconAnxiety = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
     <path d="M22 12A10 10 0 1 1 12 2a10 10 0 0 1 10 10zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
  </svg>
);

const IconApathy = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 12h20M7 7l5 5-5 5M17 7l-5 5 5 5"/>
  </svg>
);

const IconMystery = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>
  </svg>
);

// Map high-level categories to their comic icons
export const CATEGORY_ICONS: Record<string, React.ElementType> = {
  joy: IconJoy,
  sadness: IconSadness,
  anger: IconAnger,
  anxiety: IconAnxiety,
  love: IconLove,
  guilt: IconGuilt,
  sensitive: IconSensitive,
  extreme_sensitive: IconSensitive, // uses same icon but styling is special
  disgust: IconMystery,
  apathy: IconApathy,
  chaos: IconChaos,
  surprise: IconMystery,
};

// Helper: HSL to HEX
function hslToHex(h: number, s: number, l: number) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Convert a parsed mood result into a full visual BalloonStyle
export function getMoodStyle(parsedMood: { id: string, name: string, category: string, hue: number, baseSat: number, baseLight: number }, intensity: number): BalloonStyle {
  if (!parsedMood) {
    return {
      fill: '#FFA07A',
      darkFill: '#E05010',
      label: 'Mystery',
      Icon: IconMystery,
    };
  }

  // Handle special sensitive extreme case (dark ashy black-red)
  if (parsedMood.category === 'extreme_sensitive') {
    // Highly desaturated, very dark red/black
    return {
      fill: '#2c1e1e', // extremely dark red-ash
      darkFill: '#111111',
      label: 'Trigger/Sensitive',
      fontColor: '#ffe5e5', // Make text readable inside black balloon
      Icon: IconSensitive,
    };
  }

  // Handle normal sensitive case (deep visceral red)
  if (parsedMood.category === 'sensitive') {
    return {
      fill: '#D63031',
      darkFill: '#991515',
      label: 'Sensitive',
      fontColor: '#ffffff',
      Icon: IconSensitive,
    };
  }

  // Dynamic colors based on intensity
  // Intensity is normalized (usually 0 to ~4, mostly clamped at 2 in code)
  // Higher intensity pushes colors to be bolder: higher saturation, lower lightness
  // We clamp intensity factor to max 3
  const clampInt = Math.min(3, Math.max(0.5, intensity));
  
  // Calculate dynamic lightness and sat based on intensity
  // e.g., higher intensity = darker, deeper color
  const lightnessOffset = (clampInt - 1) * 8; // deeper intensity reduces lightness by up to -16%
  const satOffset = (clampInt - 1) * 5;     // increases sat by up to +10%

  const s = Math.min(100, Math.max(0, parsedMood.baseSat + satOffset));
  const l = Math.min(95, Math.max(20, parsedMood.baseLight - lightnessOffset));
  const darkL = Math.max(10, l - 15); // Shadow color

  return {
    fill: hslToHex(parsedMood.hue, s, l),
    darkFill: hslToHex(parsedMood.hue, s, darkL),
    label: parsedMood.name,
    Icon: CATEGORY_ICONS[parsedMood.category] || IconMystery,
    fontColor: l < 40 ? '#ffffff' : '#111111',
  };
}
