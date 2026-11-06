import { useState, useEffect, useCallback } from 'react';
import { staticFile, useDelayRender } from 'remotion';
import { parseSrt } from '@remotion/captions';
import type { Caption } from '@remotion/captions';

export const CaptionsComponent: React.FC = () => {
  const [captions, setCaptions] = useState<Caption[] | null>(null);
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender());

  const fetchCaptions = useCallback(async () => {
    try {
      const response = await fetch(staticFile('subtitles.srt'));
      const text = await response.text();
      const { captions: parsed } = parseSrt({ input: text });
      setCaptions(parsed);
      continueRender(handle);
    } catch (e) {
      cancelRender(e);
    }
  }, [continueRender, cancelRender, handle]);

  useEffect(() => {
    fetchCaptions();
  }, [fetchCaptions]);

  if (!captions) return null;

  return (
    <div>
      {captions.map((caption, i) => (
        <p key={i}>{caption.text}</p>
      ))}
    </div>
  );
};
