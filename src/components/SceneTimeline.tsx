import React, { useState } from 'react';
import { TypographyScene } from '../types';
interface SceneTimelineProps {
  scenes: TypographyScene[];
  activeSceneIndex: number;
  onSelectScene: (index: number) => void;
  onAddScene: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onBatchAction: (action: 'style' | 'gradient', selectedIds: string[]) => void;
}
export const SceneTimeline: React.FC<SceneTimelineProps> = ({
  scenes,
  activeSceneIndex,
  onSelectScene,
  onAddScene,
  onReorder,
  onBatchAction,
}) => {
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const totalDuration = scenes.reduce((acc, s) => acc + s.duration, 0);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 shadow-lg">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-indigo-400">video_library</span>
          <span className="font-semibold text-slate-300">STORYBOARD SEQUENCE ({scenes.length} CLIPS)</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => {setIsBatchMode(!isBatchMode); setSelectedIds([]);}} className={`px-2 py-1 rounded text-[10px] ${isBatchMode ? 'bg-indigo-600 text-white' : 'bg-slate-800'}`}>
            {isBatchMode ? 'Cancel Batch' : 'Batch Edit'}
          </button>
          {isBatchMode && selectedIds.length > 0 && (
            <>
              <button onClick={() => onBatchAction('style', selectedIds)} className="px-2 py-1 rounded bg-amber-600 text-white text-[10px]">Apply Style</button>
              <button onClick={() => onBatchAction('gradient', selectedIds)} className="px-2 py-1 rounded bg-indigo-600 text-white text-[10px]">Apply Gradient</button>
            </>
          )}
          <div className="font-mono text-[11px] text-slate-400">
            TOTAL: <strong className="text-white">{totalDuration.toFixed(1)}s</strong>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
        {scenes.map((scene, idx) => {
          const isActive = idx === activeSceneIndex;
          const isSelected = selectedIds.includes(scene.id);
          const grad = scene.gradient;
          return (
            <div
              key={scene.id}
              onClick={() => isBatchMode ? toggleSelect(scene.id) : onSelectScene(idx)}
              className={`flex-shrink-0 cursor-pointer rounded-lg p-2.5 border transition-all w-44 relative group ${
                isBatchMode && isSelected ? 'border-amber-500 ring-2 ring-amber-500/50' :
                isActive
                  ? 'bg-slate-800 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700 opacity-75 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span className="font-bold text-slate-300">{isBatchMode && isSelected ? 'SELECTED' : `SCENE ${idx + 1}`}</span>
                <span className="text-amber-400">{scene.duration}s</span>
              </div>
              <div
                className="w-full h-1.5 rounded-full mb-1.5"
                style={{
                  background: `linear-gradient(90deg, ${grad.colors[0]}, ${grad.colors[1]}, ${grad.colors[2]})`,
                }}
              />
              <p className="text-xs font-bold text-white truncate">{scene.title || 'Untitled'}</p>
              <p className="text-[10px] text-slate-400 font-mono truncate">{scene.style}</p>
              <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-0.5 bg-slate-900/90 rounded p-0.5">
                {idx > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onReorder(idx, idx - 1);
                    }}
                    className="text-slate-400 hover:text-white p-0.5"
                    title="Move Left"
                  >
                    <span className="material-symbols-outlined text-xs">chevron_left</span>
                  </button>
                )}
                {idx < scenes.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onReorder(idx, idx + 1);
                    }}
                    className="text-slate-400 hover:text-white p-0.5"
                    title="Move Right"
                  >
                    <span className="material-symbols-outlined text-xs">chevron_right</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <button
          onClick={onAddScene}
          className="flex-shrink-0 flex flex-col items-center justify-center w-28 h-[88px] rounded-lg border-2 border-dashed border-slate-800 hover:border-indigo-500/60 bg-slate-950 hover:bg-indigo-950/20 text-slate-400 hover:text-indigo-300 transition-all gap-1"
        >
          <span className="material-symbols-outlined text-xl">add</span>
          <span className="text-[11px] font-semibold">New Scene</span>
        </button>
      </div>
    </div>
  );
};
