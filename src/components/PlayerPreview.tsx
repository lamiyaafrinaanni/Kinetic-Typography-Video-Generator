import React, { useRef, useEffect, useState, useCallback } from 'react';
import { TypographyScene, AspectRatio, BackgroundMedia, AudioTrack, SrtCue } from '../types';
import { ASPECT_RATIO_CONFIGS } from '../constants';
import { drawKineticFrame } from '../utils/renderTypography';
interface PlayerPreviewProps {
  scene: TypographyScene;
  currentTime: number;
  globalTime: number;
  isPlaying: boolean;
  aspectRatio: AspectRatio;
  backgroundMedia: BackgroundMedia | null;
  audioTrack: AudioTrack | null;
  activeSrtCue: SrtCue | null;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onPrevScene: () => void;
  onNextScene: () => void;
  onUpdateTextPosition: (pos: { x: number; y: number }) => void;
  sceneIndex: number;
  totalScenes: number;
  scenes: TypographyScene[];
}
export const PlayerPreview: React.FC<PlayerPreviewProps> = ({
  scene,
  currentTime,
  globalTime,
  isPlaying,
  aspectRatio,
  backgroundMedia,
  audioTrack,
  activeSrtCue,
  onTogglePlay,
  onSeek,
  onPrevScene,
  onNextScene,
  onUpdateTextPosition,
  sceneIndex,
  totalScenes,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoBgRef = useRef<HTMLVideoElement>(null);
  const imageBgRef = useRef<HTMLImageElement>(null);
  const dims = ASPECT_RATIO_CONFIGS[aspectRatio];
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  // Sync video background element playback
  useEffect(() => {
    const video = videoBgRef.current;
    if (!video || !backgroundMedia || backgroundMedia.type !== 'video') return;
    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying, backgroundMedia]);
  // Sync video time when seeking
  useEffect(() => {
    const video = videoBgRef.current;
    if (!video || !backgroundMedia || backgroundMedia.type !== 'video') return;
    if (Math.abs(video.currentTime - globalTime) > 0.3) {
      video.currentTime = globalTime % (video.duration || 10);
    }
  }, [globalTime, backgroundMedia]);
  // Render Canvas Frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = dims.width;
    canvas.height = dims.height;
    let bgElement: HTMLImageElement | HTMLVideoElement | null = null;
    if (scene.backgroundMode === 'media' && backgroundMedia) {
      if (backgroundMedia.type === 'video') {
        bgElement = videoBgRef.current;
      } else {
        bgElement = imageBgRef.current;
      }
    }
    drawKineticFrame(ctx, scene, currentTime, dims.width, dims.height, {
      backgroundElement: bgElement,
      activeSrtCue,
      showDragHandle: isHovered || isDragging,
    });
  }, [scene, currentTime, dims, backgroundMedia, activeSrtCue, isHovered, isDragging]);
  // Direct On-Canvas Drag-and-Drop Positioning Logic
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    setIsDragging(true);
    const rect = canvas.getBoundingClientRect();
    const nx = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0.05), 0.95);
    const ny = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0.1), 0.9);
    onUpdateTextPosition({ x: nx, y: ny });
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0.05), 0.95);
    const ny = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0.1), 0.9);
    onUpdateTextPosition({ x: nx, y: ny });
  };
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      try {
        canvasRef.current?.releasePointerCapture(e.pointerId);
      } catch {}
      setIsDragging(false);
    }
  };
  const resetToCenter = () => {
    onUpdateTextPosition({ x: 0.5, y: 0.46 });
  };
  const formattedTime = currentTime.toFixed(2);
  const formattedDuration = scene.duration.toFixed(2);
  const progressPercent = Math.min((currentTime / scene.duration) * 100, 100);
  const pos = scene.textPosition || { x: 0.5, y: 0.46 };
  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Hidden media elements for canvas sampling */}
      {backgroundMedia?.type === 'video' && (
        <video
          ref={videoBgRef}
          src={backgroundMedia.url}
          playsInline
          muted
          loop
          className="absolute opacity-0 pointer-events-none w-0 h-0"
        />
      )}
      {backgroundMedia?.type === 'image' && (
        <img
          ref={imageBgRef}
          src={backgroundMedia.url}
          alt="bg"
          crossOrigin="anonymous"
          className="absolute opacity-0 pointer-events-none w-0 h-0"
        />
      )}
      {/* Top Monitor Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="font-mono font-semibold tracking-wider text-slate-300">
            SCENE {sceneIndex + 1}/{totalScenes} &bull; {scene.style.toUpperCase()}
          </span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
            {dims.width}x{dims.height}
          </span>
          {backgroundMedia && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-950/60 border border-indigo-800/60 text-indigo-300">
              MEDIA: {backgroundMedia.type.toUpperCase()}
            </span>
          )}
          {audioTrack && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950/60 border border-emerald-800/60 text-emerald-300">
              AUDIO ON
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 font-mono">
          <span className="text-amber-400 font-bold">{formattedTime}s</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400">{formattedDuration}s</span>
        </div>
      </div>
      {/* Main Canvas Stage with Direct Drag-and-Drop Text Repositioning */}
      <div
        ref={containerRef}
        className="relative flex-1 flex items-center justify-center p-4 bg-slate-950/90 overflow-hidden min-h-[300px]"
      >
        <div className="relative max-h-full max-w-full flex items-center justify-center group">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`rounded-lg shadow-2xl border border-slate-800/80 object-contain max-h-[58vh] max-w-full transition-shadow select-none touch-none ${
              isDragging ? 'cursor-grabbing ring-2 ring-indigo-500' : 'cursor-grab hover:ring-1 hover:ring-indigo-400/50'
            }`}
            style={{
              aspectRatio: `${dims.width} / ${dims.height}`,
            }}
          />
          {/* Subtle Direct-Drag Hint Pill */}
          <div className="absolute bottom-3 right-3 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity">
            <span className="px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-sans text-slate-300 flex items-center gap-1 border border-white/10">
              <span className="material-symbols-outlined text-xs text-indigo-400">touch_app</span>
              <span>Click & drag to reposition text</span>
            </span>
          </div>
          {/* Transition Overlay */}
          {scene.transitionType !== 'none' && (currentTime < 0.3 || currentTime > scene.duration - 0.3) && (
            <div className={`absolute inset-0 z-10 bg-slate-950 transition-opacity duration-300 ${scene.transitionType === 'dissolve' ? 'opacity-50' : ''}`}
                 style={{ opacity: currentTime < 0.3 ? 1 - (currentTime / 0.3) : (currentTime - (scene.duration - 0.3)) / 0.3 }}
            />
          )}
          {/* Corner Framing Marks */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-white/20 pointer-events-none" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white/20 pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-white/20 pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-white/20 pointer-events-none" />
        </div>
      </div>
      {/* Transport Controls & Timeline Scrubber */}
      <div className="p-3 bg-slate-950/95 border-t border-slate-800/80 flex flex-col gap-2">
        <div className="relative flex items-center group">
          <input
            type="range"
            min="0"
            max={scene.duration}
            step="0.01"
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:h-2 transition-all"
          />
          <div
            className="absolute left-0 top-0 h-1.5 bg-gradient-to-r from-indigo-500 to-rose-500 rounded-lg pointer-events-none group-hover:h-2 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <button
              onClick={onPrevScene}
              disabled={sceneIndex === 0}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Previous Scene"
            >
              <span className="material-symbols-outlined text-lg">skip_previous</span>
            </button>
            <button
              onClick={onTogglePlay}
              className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center active:scale-95"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              <span className="material-symbols-outlined text-xl">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>
            <button
              onClick={onNextScene}
              disabled={sceneIndex === totalScenes - 1}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Next Scene"
            >
              <span className="material-symbols-outlined text-lg">skip_next</span>
            </button>
            <button
              onClick={() => onSeek(0)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
              title="Restart Scene"
            >
              <span className="material-symbols-outlined text-lg">replay</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-mono">
              PACE: <strong className="text-slate-200">{scene.duration}s</strong>
            </span>
            <div className="h-3 w-[1px] bg-slate-800" />
            <span className="text-[11px] text-indigo-400 font-mono uppercase font-semibold">
              {scene.style.replace('-', ' ')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
