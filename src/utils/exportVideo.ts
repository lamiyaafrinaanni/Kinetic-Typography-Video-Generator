import {
  Output,
  Mp4OutputFormat,
  BufferTarget,
  CanvasSource,
  AudioBufferSource,
  QUALITY_HIGH
} from 'mediabunny';
import { TypographyScene, AspectRatio, BackgroundMedia, AudioTrack, SrtCue } from '../types';
import { ASPECT_RATIO_CONFIGS } from '../constants';
import { drawKineticFrame } from '../utils/renderTypography';
/**
 * Loads image element from URL or data URL
 */
async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
/**
 * Renders kinetic typography sequence into an MP4 video buffer using MediaBunny
 */
export async function exportKineticTypographyVideo(
  scenes: TypographyScene[],
  aspectRatio: AspectRatio,
  fps: number = 30,
  options: {
    backgroundMedia?: BackgroundMedia | null;
    audioTrack?: AudioTrack | null;
    cues?: SrtCue[];
    onProgress: (progress: number, message: string) => void;
  }
): Promise<ArrayBuffer> {
  const { backgroundMedia, audioTrack, cues = [], onProgress } = options;
  const dims = ASPECT_RATIO_CONFIGS[aspectRatio];
  const width = dims.width;
  const height = dims.height;
  // Offscreen canvas for rendering frames
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  // Pre-load background image if any
  let loadedBgImage: HTMLImageElement | null = null;
  if (backgroundMedia?.type === 'image' && backgroundMedia.url) {
    try {
      loadedBgImage = await loadImage(backgroundMedia.url);
    } catch (e) {
      console.warn('Could not pre-load background image for render:', e);
    }
  }
  // Pre-load background video if any
  let loadedBgVideo: HTMLVideoElement | null = null;
  if (backgroundMedia?.type === 'video' && backgroundMedia.url) {
    try {
      const v = document.createElement('video');
      v.src = backgroundMedia.url;
      v.crossOrigin = 'anonymous';
      v.muted = true;
      v.playsInline = true;
      await new Promise<void>((res) => {
        v.onloadeddata = () => res();
        v.load();
      });
      loadedBgVideo = v;
    } catch (e) {
      console.warn('Could not load background video for render:', e);
    }
  }
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target: new BufferTarget(),
  });
  const canvasSource = new CanvasSource(canvas, {
    codec: 'avc',
    bitrate: QUALITY_HIGH,
  });
  output.addVideoTrack(canvasSource);
  // Audio track setup if provided
  let audioSource: AudioBufferSource | null = null;
  let audioBuffer: AudioBuffer | null = null;
  if (audioTrack && audioTrack.url) {
    try {
      onProgress(0.05, 'Decoding audio track...');
      const audioCtx = new AudioContext();
      const response = await fetch(audioTrack.url);
      const arrayBuffer = await response.arrayBuffer();
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      audioCtx.close();
      audioSource = new AudioBufferSource({
        codec: 'aac',
        bitrate: QUALITY_HIGH,
      });
      output.addAudioTrack(audioSource);
      audioSource.writeBuffer(audioBuffer);
    } catch (e) {
      console.warn('Could not load audio for render:', e);
    }
  }

  // Rendering Loop
  const totalDuration = scenes.reduce((acc, s) => acc + s.duration, 0);
  const totalFrames = Math.floor(totalDuration * fps);

  let currentSceneIdx = 0;
  let elapsedDuration = 0;

  for (let i = 0; i < totalFrames; i++) {
    const currentTime = i / fps;
    
    // Find active scene
    if (currentTime >= elapsedDuration + scenes[currentSceneIdx].duration) {
      elapsedDuration += scenes[currentSceneIdx].duration;
      currentSceneIdx = Math.min(currentSceneIdx + 1, scenes.length - 1);
    }
    
    const scene = scenes[currentSceneIdx];
    const timeInScene = currentTime - elapsedDuration;

    const activeSrtCue = cues.find(c => currentTime >= c.startTime && currentTime <= c.endTime) || null;

    drawKineticFrame(ctx, scene, timeInScene, width, height, {
      backgroundElement: loadedBgVideo || loadedBgImage,
      activeSrtCue,
      showDragHandle: false,
    });

    await canvasSource.add(currentTime, 1/fps);
    
    if (i % 10 === 0) {
      onProgress(0.1 + (i / totalFrames) * 0.85, `Rendering frame ${i}/${totalFrames}...`);
    }
  }

  onProgress(1.0, 'Finalizing video...');
  await output.close();
  
  return (output.target as BufferTarget).getBuffer();
}
