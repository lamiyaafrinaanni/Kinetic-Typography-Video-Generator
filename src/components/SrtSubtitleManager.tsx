import React, { useRef } from 'react';
import { SrtCue } from '../types';
import { parseSrt, secondsToTimecode, serializeSrt } from '../utils/srtParser';

interface SrtSubtitleManagerProps {
  cues: SrtCue[];
  currentGlobalTime: number;
  onUpdateCues: (cues: SrtCue[]) => void;
  onSeek: (timestamp: number) => void;
  audioDuration?: number;
}

export const SrtSubtitleManager: React.FC<SrtSubtitleManagerProps> = ({
  cues,
  currentGlobalTime,
  onUpdateCues,
  onSeek,
  audioDuration,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const parsed = parseSrt(content);
        onUpdateCues(parsed);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAddCue = () => {
    const start = Math.round(currentGlobalTime * 10) / 10;
    const end = start + 3;
    const newCue: SrtCue = {
      id: cues.length + 1,
      startTime: start,
      endTime: end,
      text: 'New subtitle cue text',
    };
    onUpdateCues([...cues, newCue].sort((a, b) => a.startTime - b.startTime));
  };

  const handleUpdateCueText = (index: number, text: string) => {
    const next = [...cues];
    next[index] = { ...next[index], text };
    onUpdateCues(next);
  };

  const handleUpdateCueTimes = (index: number, startTime: number, endTime: number) => {
    const next = [...cues];
    next[index] = { ...next[index], startTime: Math.max(0, startTime), endTime: Math.max(startTime + 0.1, endTime) };
    onUpdateCues(next.sort((a, b) => a.startTime - b.startTime));
  };

  const handleDeleteCue = (index: number) => {
    onUpdateCues(cues.filter((_, i) => i !== index));
  };

  const handleDownloadSrt = () => {
    if (cues.length === 0) return;
    const srtText = serializeSrt(cues);
    const blob = new Blob([srtText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subtitles.srt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl text-xs">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-400 text-lg">subtitles</span>
          <span className="font-bold text-white text-sm">SRT TIMESTAMPS & CUES</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
            {cues.length} CUES
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".srt,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1 transition-all"
            title="Upload SRT subtitle file"
          >
            <span className="material-symbols-outlined text-base">upload_file</span>
            <span>Upload .SRT</span>
          </button>
          {cues.length > 0 && (
            <button
              onClick={handleDownloadSrt}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Download SRT file"
            >
              <span className="material-symbols-outlined text-base">download</span>
            </button>
          )}
          <button
            onClick={handleAddCue}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Add Cue at Current Time"
          >
            <span className="material-symbols-outlined text-base">add</span>
          </button>
        </div>
      </div>
      {/* Subtitles Cue List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cues.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
            <span className="material-symbols-outlined text-4xl mb-2 text-slate-600">subtitles_off</span>
            <p className="font-bold text-slate-400">No Subtitle Cues Loaded</p>
            <p className="text-[11px] max-w-xs mt-1 text-slate-500">
              Upload an .SRT file with timestamps or click "+" to add timestamped lines manually.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1.5 text-xs transition-colors"
            >
              <span className="material-symbols-outlined text-base">upload_file</span>
              <span>Import SRT File</span>
            </button>
          </div>
        ) : (
          cues.map((cue, idx) => {
            const isCurrentlyActive =
              currentGlobalTime >= cue.startTime && currentGlobalTime <= cue.endTime;
            return (
              <div
                key={cue.id || idx}
                className={`p-2.5 rounded-lg border transition-all ${
                  isCurrentlyActive
                    ? 'bg-amber-950/20 border-amber-500/70 shadow-sm ring-1 ring-amber-500/40'
                    : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Time Range Header */}
                <div className="flex items-center justify-between gap-2 mb-1.5 font-mono text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onSeek(cue.startTime)}
                      className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold"
                      title="Seek player to start of this cue"
                    >
                      <span className="material-symbols-outlined text-xs">play_arrow</span>
                      <span>{secondsToTimecode(cue.startTime)}</span>
                    </button>
                    <span className="text-slate-600">&rarr;</span>
                    <span className="text-slate-400">{secondsToTimecode(cue.endTime)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-sans">
                      {Math.max(0, cue.endTime - cue.startTime).toFixed(1)}s
                    </span>
                    <button
                      onClick={() => handleDeleteCue(idx)}
                      className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                      title="Delete subtitle cue"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                </div>
                {/* Subtitle Text Input */}
                <textarea
                  rows={2}
                  value={cue.text}
                  onChange={(e) => handleUpdateCueText(idx, e.target.value)}
                  placeholder="Subtitle text..."
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-sans resize-none text-xs"
                />
                {/* Micro time adjustment handles */}
                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 font-mono">
                  <div className="flex items-center gap-2">
                    <label>
                      In:{' '}
                      <input
                        type="number"
                        step="0.1"
                        value={cue.startTime}
                        onChange={(e) =>
                          handleUpdateCueTimes(idx, parseFloat(e.target.value) || 0, cue.endTime)
                        }
                        className="w-14 bg-slate-900 border border-slate-800 rounded px-1 text-slate-300"
                      />
                    </label>
                    <label>
                      Out:{' '}
                      <input
                        type="number"
                        step="0.1"
                        value={cue.endTime}
                        onChange={(e) =>
                          handleUpdateCueTimes(idx, cue.startTime, parseFloat(e.target.value) || 0)
                        }
                        className="w-14 bg-slate-900 border border-slate-800 rounded px-1 text-slate-300"
                      />
                    </label>
                  </div>
                  {isCurrentlyActive && (
                    <span className="text-amber-400 font-sans font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                      LIVE
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
