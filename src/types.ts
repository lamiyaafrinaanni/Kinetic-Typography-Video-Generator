export type AnimationStyle = 
  | 'slide-wipe'
  | 'stagger-rise'
  | 'gradient-reveal'
  | 'kinetic-scale'
  | 'glitch-snap'
  | 'minimal-fade'
  | 'word-by-word'
  | 'line-by-line'
  | 'typewriter'
  | 'random-char-matrix';
export type AnimationEffect = 'none' | 'energetic' | 'subtle';
export type TransitionType = 'none' | 'fade' | 'slide' | 'dissolve';
export type AspectRatio = '16:9' | '9:16' | '1:1';
export interface GradientPreset {
  id: string;
  name: string;
  colors: [string, string, string];
  angle: number;
}
export interface SrtCue {
  id: number;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  text: string;
  rawTimecode?: string;
}
export interface BackgroundMedia {
  mediaId?: string;
  url: string;
  type: 'image' | 'video';
  name: string;
  mimeType: string;
}
export interface AudioTrack {
  mediaId?: string;
  url: string;
  name: string;
  mimeType: string;
  duration?: number;
}
export interface TypographyScene {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  badgeText: string;
  duration: number; // in seconds
  style: AnimationStyle;
  gradient: GradientPreset;
  fontSize: 'compact' | 'medium' | 'heroic';
  textAlign: 'center' | 'left' | 'right';
  letterSpacing: number; // em
  accentWord?: string;
  backgroundMode: 'gradient' | 'dark-slate' | 'editorial-cream' | 'custom-color' | 'media';
  backgroundColor: string;
  motionEffect: 'pulse' | 'slide-in' | 'glitch' | 'fade-up' | 'none';
  // Normalized viewport position offsets (0.0 to 1.0, defaults to 0.5 center)
  textPosition?: {
    x: number; // normalized 0 to 1
    y: number; // normalized 0 to 1
  };
  // Media backdrop transparency/tint options
  mediaDimOpacity?: number; // 0 = original video colors with no darkening, up to 1.0
  applyAmbientTint?: boolean; // whether ambient color spotlight spills over background media
  glowIntensity?: number; // 0 to 1.0 subtle kinetic glow
  introAnimation: AnimationEffect;
  outroAnimation: AnimationEffect;
  transitionType: TransitionType;
}
export interface ExportStatus {
  state: 'idle' | 'rendering' | 'encoding' | 'completed' | 'error';
  progress: number;
  message?: string;
}
