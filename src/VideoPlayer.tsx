import React from 'react';

interface VideoPlayerProps {
  src: string;
  onShare: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, onShare }) => {
  return (
    <div className="mt-4 p-4 border rounded shadow-lg">
      <h2 className="text-xl font-bold">Preview:</h2>
      <video src={src} controls className="w-full max-w-lg mt-2" />
      <div className="mt-2 flex gap-2">
        <a href={src} download className="bg-green-500 text-white p-2 rounded">Download Video</a>
        <button onClick={onShare} className="bg-purple-500 text-white p-2 rounded">Share Video</button>
      </div>
    </div>
  );
};
