import React from 'react';

interface IntroModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IntroModal: React.FC<IntroModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-rose-500 flex items-center justify-center text-white shadow-lg">
              <span className="material-symbols-outlined text-xl">match_word</span>
            </div>
            <div>
              <h2 className="font-black text-lg text-white tracking-wide">Kinetic Type Lab</h2>
              <p className="text-xs text-indigo-400 font-mono">MODERN MOTION GRAPHICS & TYPOGRAPHY</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
        <div className="space-y-3 py-2 text-xs text-slate-300">
          <p className="text-slate-400">
            A versatile collection of kinetic typography presets designed to elevate any video project, title sequence, promotional clip, or social reel without manual keyframing.
          </p>
          <div className="space-y-2 pt-1">
            <div className="flex items-start gap-2.5 p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
              <span className="material-symbols-outlined text-indigo-400 text-lg">match_word</span>
              <div>
                <p className="font-semibold text-white">Word-by-Word & Line-by-Line Reveals</p>
                <p className="text-[11px] text-slate-400">Smooth staggered reveals and cascades with subtle glowing highlights against minimalist dark frames.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
              <span className="material-symbols-outlined text-amber-400 text-lg">password</span>
              <div>
                <p className="font-semibold text-white">Randomized Character Builds & Typewriter</p>
                <p className="text-[11px] text-slate-400">Sophisticated cipher scrambles and classic typewriter typing cadence with live blinking cursor.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
              <span className="material-symbols-outlined text-emerald-400 text-lg">movie</span>
              <div>
                <p className="font-semibold text-white">Fast Export & Video Overlays</p>
                <p className="text-[11px] text-slate-400">Export in 16:9 widescreen, 9:16 vertical reels, or 1:1 square formats with burned-in SRT cues directly to MP4.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="pt-4 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98]"
          >
            Launch Kinetic Studio
          </button>
        </div>
      </div>
    </div>
  );
};
