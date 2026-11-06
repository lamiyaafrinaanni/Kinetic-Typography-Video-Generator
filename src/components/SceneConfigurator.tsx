import React from 'react';
import { TypographyScene, AnimationStyle, BackgroundMedia } from '../types';
import { GRADIENT_PRESETS } from '../constants';

interface SceneConfiguratorProps {
  scene: TypographyScene;
  backgroundMedia: BackgroundMedia | null;
  onSelectMedia: () => void;
  onClearMedia: () => void;
  onChange: (updated: Partial<TypographyScene>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isOnlyScene: boolean;
}

const ANIMATION_STYLES: { id: AnimationStyle; label: string; icon: string; tag: string }[] = [
  { id: 'word-by-word', label: 'Word By Word', icon: 'match_word', tag: 'NEW' },
  { id: 'line-by-line', label: 'Line By Line', icon: 'format_align_left', tag: 'POPULAR' },
  { id: 'random-char-matrix', label: 'Randomized Matrix', icon: 'password', tag: 'CIPHER' },
  { id: 'typewriter', label: 'Typewriter', icon: 'keyboard', tag: 'CLASSIC' },
  { id: 'slide-wipe', label: 'Slide Wipe', icon: 'swipe_right', tag: 'SMOOTH' },
  { id: 'stagger-rise', label: 'Stagger Rise', icon: 'vertical_align_top', tag: 'MODERN' },
  { id: 'kinetic-scale', label: 'Kinetic Scale', icon: 'zoom_out_map', tag: 'ZOOM' },
  { id: 'glitch-snap', label: 'Glitch Snap', icon: 'bolt', tag: 'PUNCH' },
  { id: 'minimal-fade', label: 'Minimal Fade', icon: 'blur_on', tag: 'CLEAN' },
];

export const SceneConfigurator: React.FC<SceneConfiguratorProps> = ({
  scene,
  backgroundMedia,
  onSelectMedia,
  onClearMedia,
  onChange,
  onDuplicate,
  onDelete,
  isOnlyScene,
}) => {
  const currentPos = scene.textPosition || { x: 0.5, y: 0.46 };
  const dimOpacity = typeof scene.mediaDimOpacity === 'number' ? scene.mediaDimOpacity : 0.25;
  const glow = typeof scene.glowIntensity === 'number' ? scene.glowIntensity : 0.5;

  const handleShuffle = () => {
    const randomStyle = ANIMATION_STYLES[Math.floor(Math.random() * ANIMATION_STYLES.length)];
    const randomGradient = GRADIENT_PRESETS[Math.floor(Math.random() * GRADIENT_PRESETS.length)];
    const motionEffects = ['pulse', 'slide-in', 'glitch', 'fade-up', 'none'];
    const randomMotion = motionEffects[Math.floor(Math.random() * motionEffects.length)] as any;
    onChange({ style: randomStyle.id, gradient: randomGradient, motionEffect: randomMotion });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-400 text-lg">tune</span>
          <span className="font-bold text-sm text-white">TYPOGRAPHY CUSTOMIZER</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleShuffle}
            className="p-1.5 rounded-lg text-indigo-400 hover:text-white hover:bg-slate-800 text-xs flex items-center gap-1 transition-colors"
            title="Shuffle Styles"
          >
            <span className="material-symbols-outlined text-base">shuffle</span>
          </button>
          <button
            onClick={onDuplicate}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs flex items-center gap-1 transition-colors"
            title="Duplicate Scene"
          >
            <span className="material-symbols-outlined text-base">content_copy</span>
          </button>
          {!isOnlyScene && (
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 text-xs flex items-center gap-1 transition-colors"
              title="Delete Scene"
            >
              <span className="material-symbols-outlined text-base">delete</span>
            </button>
          )}
        </div>
      </div>
      {/* Content Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-slate-300">
        {/* Background Mode & Video Color Preservation */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-slate-400 font-semibold tracking-wider text-[11px] uppercase">
            <span>Background Layer</span>
          </div>
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            {['media', 'dark-slate', 'gradient'].map((mode) => (
              <button
                key={mode}
                onClick={() => onChange({ backgroundMode: mode as any })}
                className={`flex-1 py-1.5 rounded text-center font-medium transition-colors ${
                  scene.backgroundMode === mode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode.replace('-', ' ')}
              </button>
            ))}
          </div>
          {scene.backgroundMode === 'media' && backgroundMedia && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <p className="text-white font-semibold text-[11px] truncate">{backgroundMedia.name}</p>
              <div className="flex items-center justify-between">
                <button onClick={onSelectMedia} className="text-indigo-400">Change</button>
                <button onClick={onClearMedia} className="text-rose-400">Clear</button>
              </div>
              <input
                type="range" min="0" max="0.8" step="0.05"
                value={dimOpacity}
                onChange={(e) => onChange({ mediaDimOpacity: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Text Positioning */}
        <div className="space-y-2">
          <label className="block text-[11px] uppercase font-semibold text-slate-400">Text Positioning</label>
          <div className="grid grid-cols-2 gap-2">
            <input type="range" min="0.1" max="0.9" step="0.01" value={currentPos.x} onChange={(e) => onChange({ textPosition: { ...currentPos, x: parseFloat(e.target.value) } })} />
            <input type="range" min="0.1" max="0.9" step="0.01" value={currentPos.y} onChange={(e) => onChange({ textPosition: { ...currentPos, y: parseFloat(e.target.value) } })} />
          </div>
        </div>

        {/* Typography Settings */}
        <div className="space-y-2">
          <label className="block text-[11px] uppercase font-semibold text-slate-400">Typography</label>
          <select value={scene.fontSize} onChange={(e) => onChange({ fontSize: e.target.value as any })} className="w-full bg-slate-950 p-2 border border-slate-800 rounded">
            <option value="compact">Compact</option>
            <option value="medium">Medium</option>
            <option value="heroic">Heroic</option>
          </select>
          <input type="number" step="0.01" value={scene.letterSpacing} onChange={(e) => onChange({ letterSpacing: parseFloat(e.target.value) })} className="w-full bg-slate-950 p-2 border border-slate-800 rounded" />
        </div>

        {/* Gradient Picker */}
        <div className="space-y-2">
          <label className="block text-[11px] uppercase font-semibold text-slate-400">Color Gradient</label>
          <select value={scene.gradient.id} onChange={(e) => onChange({ gradient: GRADIENT_PRESETS.find(g => g.id === e.target.value) })} className="w-full bg-slate-950 p-2 border border-slate-800 rounded">
            {GRADIENT_PRESETS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>

        {/* Intro/Outro Presets */}
        <div className="space-y-2">
          <label className="block text-[11px] uppercase font-semibold text-slate-400">Sequence Presets</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onChange({ introAnimation: 'energetic', outroAnimation: 'energetic' })}
              className={`p-2 rounded border text-left ${scene.introAnimation === 'energetic' ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-950 border-slate-800'}`}
            >
              Energetic
            </button>
            <button
              onClick={() => onChange({ introAnimation: 'subtle', outroAnimation: 'subtle' })}
              className={`p-2 rounded border text-left ${scene.introAnimation === 'subtle' ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-950 border-slate-800'}`}
            >
              Subtle
            </button>
          </div>
        </div>

        {/* Motion Effects */}
        <div className="space-y-2">
          <label className="block text-[11px] uppercase font-semibold text-slate-400">Motion Effect</label>
          <select 
            value={scene.motionEffect} 
            onChange={(e) => onChange({ motionEffect: e.target.value as any })} 
            className="w-full bg-slate-950 p-2 border border-slate-800 rounded text-slate-300"
          >
            <option value="none">None</option>
            <option value="pulse">Pulse</option>
            <option value="slide-in">Slide In</option>
            <option value="glitch">Glitch</option>
            <option value="fade-up">Fade Up</option>
          </select>
        </div>

        {/* Motion Transition Presets */}
        <div className="space-y-2">
          <label className="block text-[11px] uppercase font-semibold text-slate-400">Animation Style</label>
          {Object.entries({
            'Energetic': ['NEW', 'POPULAR', 'PUNCH', 'ZOOM'],
            'Minimalist': ['CLEAN', 'SMOOTH'],
            'Professional': ['MODERN', 'CLASSIC', 'CIPHER']
          }).map(([cat, tags]) => (
            <div key={cat} className="space-y-1 mt-3">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase">{cat}</h4>
              <div className="grid grid-cols-2 gap-2">
                {ANIMATION_STYLES.filter(s => tags.includes(s.tag)).map((anim) => (
                  <button
                    key={anim.id}
                    onClick={() => onChange({ style: anim.id })}
                    className={`p-2 rounded border text-left ${scene.style === anim.id ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-950 border-slate-800'}`}
                  >
                    {anim.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
