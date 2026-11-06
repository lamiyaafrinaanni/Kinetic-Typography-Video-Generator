import React from 'react';
import { ExportStatus } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  status: ExportStatus;
  onClose: () => void;
  onSaveToGallery?: () => void;
  onDownloadToDevice?: () => void;
  hasRenderedVideo: boolean;
  saveFeedback: 'idle' | 'saving' | 'saved' | 'error';
  downloadFeedback: 'idle' | 'downloading' | 'done' | 'error';
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  status,
  onClose,
  onSaveToGallery,
  onDownloadToDevice,
  hasRenderedVideo,
  saveFeedback,
  downloadFeedback,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-400">movie_creation</span>
            <h3 className="font-bold text-white text-base">Export Kinetic Video</h3>
          </div>
          {status.state !== 'rendering' && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          )}
        </div>
        {/* Progress or Completion State */}
        {status.state === 'rendering' ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300">{status.message || 'Processing frames...'}</span>
              <span className="text-indigo-400 font-bold">{Math.round(status.progress * 100)}%</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800 p-0.5">
              <div
                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 h-full rounded-full transition-all duration-150"
                style={{ width: `${Math.round(status.progress * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 text-center">
              Rendering WebCodecs MP4 video with high-definition gradients...
            </p>
          </div>
        ) : status.state === 'error' ? (
          <div className="py-4 space-y-3">
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs">
              {status.message || 'Export encountered an error. Please try again.'}
            </div>
          </div>
        ) : (
          <div className="py-2 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs">
              <span className="material-symbols-outlined text-xl">check_circle</span>
              <div>
                <p className="font-bold">Render Completed</p>
                <p className="text-[11px] text-emerald-500/90">Your MP4 video is ready for high-resolution distribution.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={onSaveToGallery}
                disabled={saveFeedback === 'saving'}
                className="flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-all border border-slate-700 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">
                  {saveFeedback === 'saved' ? 'done' : 'save'}
                </span>
                <span>
                  {saveFeedback === 'saving'
                    ? 'Saving...'
                    : saveFeedback === 'saved'
                    ? 'Saved ✓'
                    : 'Save to Gallery'}
                </span>
              </button>
              <button
                onClick={onDownloadToDevice}
                disabled={downloadFeedback === 'downloading'}
                className="flex items-center justify-center gap-2 p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">download</span>
                <span>
                  {downloadFeedback === 'downloading'
                    ? 'Downloading...'
                    : downloadFeedback === 'done'
                    ? 'Downloaded ✓'
                    : 'Download Video'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
