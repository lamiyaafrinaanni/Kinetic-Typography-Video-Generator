import React, { useState, useEffect, useRef } from 'react';
import { Flow } from 'flow-sdk';
import {
  TypographyScene,
  AspectRatio,
  ExportStatus,
  BackgroundMedia,
  AudioTrack,
  SrtCue,
} from './types';
import { INITIAL_SCENES, ASPECT_RATIO_CONFIGS, GRADIENT_PRESETS } from './constants';
import { PlayerPreview } from './components/PlayerPreview';
import { SceneConfigurator } from './components/SceneConfigurator';
import { SceneTimeline } from './components/SceneTimeline';
import { SrtSubtitleManager } from './components/SrtSubtitleManager';
import { ExportModal } from './components/ExportModal';
import { IntroModal } from './components/IntroModal';
import { exportKineticTypographyVideo } from './utils/exportVideo';

const DEFAULT_SAMPLE_SRT_CUES: SrtCue[] = [
  {
    id: 1,
    startTime: 0.2,
    endTime: 3.2,
    text: 'Welcome to Kinetic Type Lab.\nSync your audio and typography.',
  },
  {
    id: 2,
    startTime: 3.5,
    endTime: 6.2,
    text: 'Frame-accurate SRT timestamps with radiant styling.',
  },
  {
    id: 3,
    startTime: 6.5,
    endTime: 9.5,
    text: 'Ready for reels, TikTok & widescreen broadcast.',
  },
];

export default function App() {
  const [scenes, setScenes] = useState<TypographyScene[]>(INITIAL_SCENES);
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  
  // Media Background & Audio Track
  const [backgroundMedia, setBackgroundMedia] = useState<BackgroundMedia | null>(null);
  const [audioTrack, setAudioTrack] = useState<AudioTrack | null>(null);
  const [audioNormalized, setAudioNormalized] = useState<boolean>(false);
  const [srtCues, setSrtCues] = useState<SrtCue[]>(DEFAULT_SAMPLE_SRT_CUES);
  const [activeTab, setActiveTab] = useState<'typography' | 'subtitles'>('typography');

  const normalizeAudio = async (buffer: AudioBuffer): Promise<AudioBuffer> => {
    const channelData = [];
    let maxAmp = 0;
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      const channel = buffer.getChannelData(i);
      for (let j = 0; j < channel.length; j++) {
        maxAmp = Math.max(maxAmp, Math.abs(channel[j]));
      }
    }
    const gain = maxAmp > 0 ? 1.0 / maxAmp : 1.0;
    const audioCtx = new AudioContext();
    const newBuffer = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      const channel = buffer.getChannelData(i);
      const newChannel = newBuffer.getChannelData(i);
      for (let j = 0; j < channel.length; j++) {
        newChannel[j] = channel[j] * gain;
      }
    }
    audioCtx.close();
    return newBuffer;
  };
  
  // Modals & Export state
  const [showIntro, setShowIntro] = useState<boolean>(true);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportStatus, setExportStatus] = useState<ExportStatus>({ state: 'idle', progress: 0 });
  const [renderedBuffer, setRenderedBuffer] = useState<ArrayBuffer | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [downloadFeedback, setDownloadFeedback] = useState<'idle' | 'downloading' | 'done' | 'error'>('idle');
  
  const activeScene = scenes[activeSceneIndex] || scenes[0];
  const animationFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(performance.now());
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  
  // Keyboard Shortcut Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === 'ArrowLeft') {
        if (activeSceneIndex > 0) {
          setActiveSceneIndex(activeSceneIndex - 1);
          setCurrentTime(0);
        }
      } else if (e.key === 'ArrowRight') {
        if (activeSceneIndex < scenes.length - 1) {
          setActiveSceneIndex(activeSceneIndex + 1);
          setCurrentTime(0);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleStartExport();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSceneIndex, scenes.length, isPlaying]);
  
  // Compute global timeline timestamp
  const calculateGlobalTime = (sceneIdx: number, timeInSc: number) => {
    let sum = 0;
    for (let i = 0; i < sceneIdx; i++) {
      sum += scenes[i].duration;
    }
    return sum + timeInSc;
  };
  const globalTime = calculateGlobalTime(activeSceneIndex, currentTime);
  
  // Determine active SRT cue
  const activeSrtCue = srtCues.find(
    (c) => globalTime >= c.startTime && globalTime <= c.endTime
  ) || null;
  
  // Audio Playback synchronization
  useEffect(() => {
    if (!audioElementRef.current && audioTrack) {
      audioElementRef.current = new Audio(audioTrack.url);
    }
    if (audioTrack && audioElementRef.current && audioElementRef.current.src !== audioTrack.url) {
      audioElementRef.current.src = audioTrack.url;
    }
    const audio = audioElementRef.current;
    if (!audio) return;
    if (isPlaying) {
      // Tighter threshold for initial sync/seek
      if (Math.abs(audio.currentTime - globalTime) > 0.05) {
        audio.currentTime = globalTime;
      }
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying, audioTrack, globalTime]);
  
  // Main Playback Loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }
    lastTimestampRef.current = performance.now();
    const loop = (now: number) => {
      const delta = (now - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = now;
      
      setCurrentTime((prev) => {
        const next = prev + delta;
        // Robust sync during playback
        if (isPlaying && audioElementRef.current) {
          const drift = Math.abs(audioElementRef.current.currentTime - calculateGlobalTime(activeSceneIndex, next));
          if (drift > 0.1) {
            audioElementRef.current.currentTime = calculateGlobalTime(activeSceneIndex, next);
          }
        }
        
        if (next >= activeScene.duration) {
          if (activeSceneIndex < scenes.length - 1) {
            setActiveSceneIndex((idx) => idx + 1);
            return 0;
          } else {
            // Loop back to scene 0
            setActiveSceneIndex(0);
            if (audioElementRef.current) audioElementRef.current.currentTime = 0;
            return 0;
          }
        }
        return next;
      });
      animationFrameRef.current = requestAnimationFrame(loop);
    };
    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, activeScene.duration, activeSceneIndex, scenes.length]);
  
  // Seek helper that aligns scene index & audio
  const handleSeekGlobal = (targetTime: number) => {
    let accumulated = 0;
    for (let i = 0; i < scenes.length; i++) {
      const sceneDur = scenes[i].duration;
      if (targetTime <= accumulated + sceneDur || i === scenes.length - 1) {
        setActiveSceneIndex(i);
        const inScene = Math.max(0, targetTime - accumulated);
        setCurrentTime(Math.min(inScene, sceneDur));
        if (audioElementRef.current) {
          audioElementRef.current.currentTime = targetTime;
        }
        return;
      }
      accumulated += sceneDur;
    }
  };
  
  // Upload Background Media via Flow Gallery
  const handleSelectBackgroundMedia = async () => {
    try {
      const media = await Flow.media.select({ filter: 'all' });
      if (media && (media.type === 'image' || media.type === 'video')) {
        const url = `data:${media.mimeType};base64,${media.base64}`;
        setBackgroundMedia({
          mediaId: media.mediaId,
          url,
          type: media.type,
          name: media.name || 'Background Media',
          mimeType: media.mimeType,
        });
        handleUpdateScene({
          backgroundMode: 'media',
          mediaDimOpacity: 0.15, // Light natural dim to keep original video vivid while maintaining crisp text
        });
      }
    } catch (err) {
      console.warn('Media selection cancelled or failed:', err);
    }
  };
  
  // Upload Audio Track via Flow Gallery or local file
  const handleSelectAudioFromGallery = async () => {
    try {
      const media = await Flow.media.select({ filter: 'audio' });
      if (media) {
        const url = `data:${media.mimeType};base64,${media.base64}`;
        setAudioTrack({
          mediaId: media.mediaId,
          url,
          name: media.name || 'Audio Track',
          mimeType: media.mimeType,
        });
      }
    } catch {
      // Fallback to local audio file picker
      audioInputRef.current?.click();
    }
  };
  
  const handleAudioFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAudioTrack({
      url,
      name: file.name,
      mimeType: file.type || 'audio/mpeg',
    });
    e.target.value = '';
  };
  
  // Handle Scene updates
  const handleUpdateScene = (updated: Partial<TypographyScene>) => {
    setScenes((prev) => {
      const next = [...prev];
      next[activeSceneIndex] = { ...next[activeSceneIndex], ...updated };
      return next;
    });
  };
  
  const handleUpdateTextPosition = (pos: { x: number; y: number }) => {
    handleUpdateScene({ textPosition: pos });
  };
  
  const handleDuplicateScene = () => {
    const current = scenes[activeSceneIndex];
    const newScene: TypographyScene = {
      ...current,
      id: `scene-${Date.now()}`,
      title: `${current.title} (Copy)`,
    };
    const nextScenes = [...scenes];
    nextScenes.splice(activeSceneIndex + 1, 0, newScene);
    setScenes(nextScenes);
    setActiveSceneIndex(activeSceneIndex + 1);
    setCurrentTime(0);
  };
  
  const handleDeleteScene = () => {
    if (scenes.length <= 1) return;
    const nextScenes = scenes.filter((_, idx) => idx !== activeSceneIndex);
    setScenes(nextScenes);
    setActiveSceneIndex(Math.max(0, activeSceneIndex - 1));
    setCurrentTime(0);
  };
  
  const handleAddScene = () => {
    const newScene: TypographyScene = {
      id: `scene-${Date.now()}`,
      eyebrow: 'BRAND HEADLINE',
      title: 'DYNAMIC STATEMENT',
      subtitle: 'Customize this title with bold typographic motion and radiant gradient styling.',
      badgeText: 'HIGHLIGHT 2025',
      duration: 3.0,
      style: 'stagger-rise',
      gradient: GRADIENT_PRESETS[(scenes.length) % GRADIENT_PRESETS.length],
      fontSize: 'heroic',
      textAlign: 'center',
      letterSpacing: 0.05,
      accentWord: 'STATEMENT',
      backgroundMode: backgroundMedia ? 'media' : 'dark-slate',
      backgroundColor: '#0a0d14',
      motionEffect: 'none',
      introAnimation: 'none',
      outroAnimation: 'none',
      transitionType: 'none',
      textPosition: { x: 0.5, y: 0.46 },
      mediaDimOpacity: 0.15,
    };
    setScenes([...scenes, newScene]);
    setActiveSceneIndex(scenes.length);
    setCurrentTime(0);
  };
  
  const handleReorderScenes = (fromIdx: number, toIdx: number) => {
    const next = [...scenes];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setScenes(next);
    setActiveSceneIndex(toIdx);
  };
  
  // Video Export Handler
  const handleStartExport = async () => {
    setIsPlaying(false);
    setShowExportModal(true);
    setExportStatus({ state: 'rendering', progress: 0, message: 'Initializing WebCodecs engine...' });
    setRenderedBuffer(null);
    try {
      const buffer = await exportKineticTypographyVideo(
        scenes,
        aspectRatio,
        30,
        {
          backgroundMedia,
          audioTrack,
          cues: srtCues,
          onProgress: (progress, message) => {
            setExportStatus({ state: 'rendering', progress, message });
          },
        }
      );
      setRenderedBuffer(buffer);
      setExportStatus({ state: 'completed', progress: 1, message: 'Render finished!' });
    } catch (err) {
      console.error(err);
      setExportStatus({
        state: 'error',
        progress: 0,
        message: err instanceof Error ? err.message : 'Render failed.',
      });
    }
  };
  
  // Save to Flow Gallery
  const handleSaveToGallery = async () => {
    if (!renderedBuffer) return;
    setSaveFeedback('saving');
    try {
      const blob = new Blob([renderedBuffer], { type: 'video/mp4' });
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          await Flow.save({
            base64,
            mimeType: 'video/mp4',
            name: `Kinetic_Type_${Date.now()}`,
          });
          setSaveFeedback('saved');
          setTimeout(() => setSaveFeedback('idle'), 2500);
        } catch {
          setSaveFeedback('error');
          setTimeout(() => setSaveFeedback('idle'), 3000);
        }
      };
      reader.readAsDataURL(blob);
    } catch {
      setSaveFeedback('error');
      setTimeout(() => setSaveFeedback('idle'), 3000);
    }
  };
  
  // Download to Local Computer
  const handleDownloadFile = async () => {
    if (!renderedBuffer) return;
    setDownloadFeedback('downloading');
    try {
      const blob = new Blob([renderedBuffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Kinetic_Typography_${aspectRatio.replace(':', '_')}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloadFeedback('done');
      setTimeout(() => setDownloadFeedback('idle'), 2500);
    } catch {
      setDownloadFeedback('error');
      setTimeout(() => setDownloadFeedback('idle'), 3000);
    }
  };
  
  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Hidden Audio file input */}
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        onChange={handleAudioFileInput}
        className="hidden"
      />
      {/* Top Application Bar */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-rose-500 flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-white text-lg">match_word</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              Kinetic Type Lab
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-mono">
                v2.1
              </span>
            </h1>
          </div>
        </div>
        {/* Media / Audio & Aspect Ratio Controls */}
        <div className="flex items-center gap-2">
          {/* Audio Upload Button */}
          <button
            onClick={handleSelectAudioFromGallery}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              audioTrack
                ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-300 ring-1 ring-emerald-500/30'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
            title={audioTrack ? `Audio loaded: ${audioTrack.name}` : 'Upload audio track'}
          >
            <span className="material-symbols-outlined text-base">
              {audioTrack ? 'music_note' : 'volume_up'}
            </span>
            <span className="hidden sm:inline">
              {audioTrack ? audioTrack.name.slice(0, 14) + '...' : 'Add Audio'}
            </span>
          </button>
          {audioTrack && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setAudioNormalized(!audioNormalized)}
                className={`p-1.5 rounded-lg border ${audioNormalized ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'} text-[10px] font-bold`}
                title="Normalize Audio"
              >
                NORM
              </button>
              <button
                onClick={() => setAudioTrack(null)}
                className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                title="Remove audio"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          )}
          {/* Background Media Button */}
          <button
            onClick={handleSelectBackgroundMedia}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              backgroundMedia
                ? 'bg-indigo-950/60 border-indigo-500/80 text-indigo-300 ring-1 ring-indigo-500/30'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
            title="Upload image or video background"
          >
            <span className="material-symbols-outlined text-base">perm_media</span>
            <span className="hidden sm:inline">
              {backgroundMedia ? backgroundMedia.name.slice(0, 12) + '...' : 'Upload Media'}
            </span>
          </button>
          {/* Aspect Ratio Selector */}
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
            {(Object.keys(ASPECT_RATIO_CONFIGS) as AspectRatio[]).map((ar) => (
              <button
                key={ar}
                onClick={() => setAspectRatio(ar)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                  aspectRatio === ar ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title={ASPECT_RATIO_CONFIGS[ar].label}
              >
                <span className="material-symbols-outlined text-sm">{ASPECT_RATIO_CONFIGS[ar].icon}</span>
                <span className="hidden sm:inline font-mono">{ar}</span>
              </button>
            ))}
          </div>
          {/* Info Button */}
          <button
            onClick={() => setShowIntro(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="About Kinetic Type Lab"
          >
            <span className="material-symbols-outlined text-lg">help_outline</span>
          </button>
          {/* Render Export Button */}
          <button
            onClick={handleStartExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-base">movie_creation</span>
            <span>Render MP4</span>
          </button>
        </div>
      </header>
      {/* Main Workspace Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden">
        {/* Left / Top Stage: Monitor & Storyboard Timeline */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3 h-full overflow-hidden">
          <div className="flex-1 min-h-0">
            <PlayerPreview
              scene={activeScene}
              currentTime={currentTime}
              globalTime={globalTime}
              isPlaying={isPlaying}
              aspectRatio={aspectRatio}
              backgroundMedia={backgroundMedia}
              audioTrack={audioTrack}
              activeSrtCue={activeSrtCue}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              onSeek={(t) => {
                setCurrentTime(t);
                if (audioElementRef.current) {
                  audioElementRef.current.currentTime = calculateGlobalTime(activeSceneIndex, t);
                }
              }}
              onPrevScene={() => {
                if (activeSceneIndex > 0) {
                  setActiveSceneIndex(activeSceneIndex - 1);
                  setCurrentTime(0);
                }
              }}
              onNextScene={() => {
                if (activeSceneIndex < scenes.length - 1) {
                  setActiveSceneIndex(activeSceneIndex + 1);
                  setCurrentTime(0);
                }
              }}
              onUpdateTextPosition={handleUpdateTextPosition}
              sceneIndex={activeSceneIndex}
              totalScenes={scenes.length}
              scenes={scenes}
            />
          </div>
          {/* Bottom Storyboard Sequence Timeline */}
          <div className="flex-shrink-0">
            <SceneTimeline
              scenes={scenes}
              activeSceneIndex={activeSceneIndex}
              onSelectScene={(idx) => {
                setActiveSceneIndex(idx);
                setCurrentTime(0);
                if (audioElementRef.current) {
                  audioElementRef.current.currentTime = calculateGlobalTime(idx, 0);
                }
              }}
              onAddScene={handleAddScene}
              onReorder={handleReorderScenes}
              onBatchAction={(action, ids) => {
                const sourceScene = scenes[activeSceneIndex];
                setScenes(prev => prev.map(s => ids.includes(s.id) ? {
                  ...s,
                  ...(action === 'style' ? { style: sourceScene.style, fontSize: sourceScene.fontSize } : { gradient: sourceScene.gradient })
                } : s));
              }}
            />
          </div>
        </div>
        {/* Right / Side Panel: Switcher between Typography & SRT Subtitle Manager */}
        <div className="lg:col-span-5 xl:col-span-4 h-full min-h-0 flex flex-col">
          {/* Tab Bar */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-t-xl">
            <button
              onClick={() => setActiveTab('typography')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'typography'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">tune</span>
              <span>Typography</span>
            </button>
            <button
              onClick={() => setActiveTab('subtitles')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'subtitles'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">subtitles</span>
              <span>SRT Timestamps ({srtCues.length})</span>
            </button>
          </div>
          <div className="flex-1 min-h-0">
            {activeTab === 'typography' ? (
              <SceneConfigurator
                scene={activeScene}
                backgroundMedia={backgroundMedia}
                onSelectMedia={handleSelectBackgroundMedia}
                onClearMedia={() => {
                  setBackgroundMedia(null);
                  handleUpdateScene({ backgroundMode: 'dark-slate' });
                }}
                onChange={handleUpdateScene}
                onDuplicate={handleDuplicateScene}
                onDelete={handleDeleteScene}
                isOnlyScene={scenes.length <= 1}
              />
            ) : (
              <SrtSubtitleManager
                cues={srtCues}
                currentGlobalTime={globalTime}
                onUpdateCues={setSrtCues}
                onSeek={handleSeekGlobal}
              />
            )}
          </div>
        </div>
      </div>
      {/* Modals */}
      <IntroModal isOpen={showIntro} onClose={() => setShowIntro(false)} />
      <ExportModal
        isOpen={showExportModal}
        status={exportStatus}
        onClose={() => setShowExportModal(false)}
        hasRenderedVideo={Boolean(renderedBuffer)}
        onSaveToGallery={handleSaveToGallery}
        onDownloadToDevice={handleDownloadFile}
        saveFeedback={saveFeedback}
        downloadFeedback={downloadFeedback}
      />
    </div>
  );
}
