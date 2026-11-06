import { TypographyScene, SrtCue } from './types';
// Easing helpers
function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);
}
function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const t = Math.min(Math.max(x, 0), 1) - 1;
  return 1 + c3 * Math.pow(t, 3) + c1 * Math.pow(t, 2);
}
// Pseudo-random deterministic character picker for matrix builds
const MATRIX_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!<>_@#%*+';
function getPseudoRandomChar(seed: number): string {
  const idx = Math.abs(Math.floor(Math.sin(seed * 9999) * MATRIX_CHARS.length)) % MATRIX_CHARS.length;
  return MATRIX_CHARS[idx];
}
/**
 * Draws a single frame of kinetic typography onto the given canvas context
 */
export function drawKineticFrame(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  scene: TypographyScene,
  timeInScene: number,
  width: number,
  height: number,
  options?: {
    backgroundElement?: HTMLImageElement | HTMLVideoElement | ImageBitmap | null;
    activeSrtCue?: SrtCue | null;
    showDragHandle?: boolean;
  }
) {
  const fadeOutWindow = 0.4;
  const timeLeft = scene.duration - timeInScene;
  const exitOpacity = timeLeft < fadeOutWindow ? Math.max(timeLeft / fadeOutWindow, 0) : 1;
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  // 1. Background Media or Gradient
  const bgElement = options?.backgroundElement;
  const grad = scene.gradient;
  if (scene.backgroundMode === 'media' && bgElement) {
    ctx.save();
    try {
      const srcW = (bgElement as HTMLVideoElement).videoWidth || bgElement.width || width;
      const srcH = (bgElement as HTMLVideoElement).videoHeight || bgElement.height || height;
      const hRatio = width / srcW;
      const vRatio = height / srcH;
      const ratio = Math.max(hRatio, vRatio);
      const centerShiftX = (width - srcW * ratio) / 2;
      const centerShiftY = (height - srcH * ratio) / 2;
      ctx.drawImage(bgElement, 0, 0, srcW, srcH, centerShiftX, centerShiftY, srcW * ratio, srcH * ratio);
      const dimOpacity = typeof scene.mediaDimOpacity === 'number' ? scene.mediaDimOpacity : 0.25;
      if (dimOpacity > 0.01) {
        ctx.fillStyle = `rgba(0, 0, 0, ${dimOpacity})`;
        ctx.fillRect(0, 0, width, height);
      }
    } catch {
      ctx.fillStyle = scene.backgroundColor || '#0a0d14';
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
  } else if (scene.backgroundMode === 'gradient') {
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0a0b12');
    bgGrad.addColorStop(0.5, '#131422');
    bgGrad.addColorStop(1, '#08080f');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.fillStyle = scene.backgroundColor || '#0a0d14';
    ctx.fillRect(0, 0, width, height);
  }
  // 2. Ambient Gradient Spotlight
  const shouldApplyAmbient = scene.backgroundMode !== 'media' || Boolean(scene.applyAmbientTint);
  if (shouldApplyAmbient) {
    const ambientGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      50,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.7
    );
    ambientGrad.addColorStop(0, `${grad.colors[1]}28`);
    ambientGrad.addColorStop(0.5, `${grad.colors[0]}12`);
    ambientGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = ambientGrad;
    ctx.fillRect(0, 0, width, height);
  }
  // Grid lines
  if (scene.backgroundMode !== 'media') {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    const gridSize = 80;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }
  // Calculate scales
  const minDim = Math.min(width, height);
  const baseScale = minDim / 800;
  let titleFontSize = 64 * baseScale;
  if (scene.fontSize === 'compact') titleFontSize = 46 * baseScale;
  if (scene.fontSize === 'heroic') titleFontSize = 84 * baseScale;
  const eyebrowFontSize = 14 * baseScale;
  const subtitleFontSize = 22 * baseScale;
  const badgeFontSize = 12 * baseScale;
  ctx.globalAlpha = exitOpacity;
  // 3. Animation Phase Calculations
  const tBadge = easeOutBack(timeInScene / 0.5);
  const tEyebrow = easeOutCubic(Math.max((timeInScene - 0.1) / 0.6, 0));
  const tTitle = easeOutCubic(Math.max((timeInScene - 0.25) / 0.8, 0));
  const tSubtitle = easeOutCubic(Math.max((timeInScene - 0.45) / 0.7, 0));
  const tWipe = easeInOutCubic(Math.max((timeInScene - 0.15) / 0.7, 0));
  const pos = scene.textPosition || { x: 0.5, y: 0.46 };
  const centerX = width * pos.x;
  const centerY = height * pos.y;
  ctx.textAlign = scene.textAlign;
  ctx.textBaseline = 'middle';
  // 4. Render Top Badge Pill
  if (scene.badgeText && tBadge > 0.01) {
    ctx.save();
    const badgeY = centerY - titleFontSize * 1.5 - (1 - tBadge) * 20;
    ctx.font = `600 ${badgeFontSize}px "Space Grotesk", system-ui, sans-serif`;
    const badgeMetrics = ctx.measureText(scene.badgeText);
    const badgePaddingX = 14 * baseScale;
    const badgePaddingY = 6 * baseScale;
    const badgeW = badgeMetrics.width + badgePaddingX * 2;
    const badgeH = badgeFontSize + badgePaddingY * 2;
    let badgeLeft = centerX - badgeW / 2;
    if (scene.textAlign === 'left') badgeLeft = centerX;
    if (scene.textAlign === 'right') badgeLeft = centerX - badgeW;
    ctx.fillStyle = 'rgba(10, 13, 20, 0.75)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(badgeLeft, badgeY - badgeH / 2, badgeW, badgeH, badgeH / 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = grad.colors[0];
    ctx.beginPath();
    ctx.arc(badgeLeft + 12 * baseScale, badgeY, 3 * baseScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(scene.badgeText, badgeLeft + 20 * baseScale, badgeY);
    ctx.restore();
  }
  // 5. Render Eyebrow Category Tag
  if (scene.eyebrow && tEyebrow > 0.01) {
    ctx.save();
    ctx.globalAlpha = Math.min(tEyebrow, 1) * exitOpacity;
    const eyebrowY = centerY - titleFontSize * 0.85 - (1 - tEyebrow) * 15;
    ctx.font = `700 ${eyebrowFontSize}px "Space Grotesk", system-ui, sans-serif`;
    ctx.fillStyle = grad.colors[1];
    ctx.textAlign = scene.textAlign;
    ctx.letterSpacing = `${scene.letterSpacing * 4}em`;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 8 * baseScale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2 * baseScale;
    ctx.fillText(scene.eyebrow.toUpperCase(), centerX, eyebrowY);
    ctx.restore();
  }
  // Subtle glowing effects setup
  const glowAmount = typeof scene.glowIntensity === 'number' ? scene.glowIntensity : 0.5;
  // 6. Render Main Kinetic Title
  if (scene.title && timeInScene >= 0.15) {
    ctx.save();
    ctx.textAlign = scene.textAlign;
    ctx.font = `900 ${titleFontSize}px "Plus Jakarta Sans", "Inter", sans-serif`;
    ctx.letterSpacing = `${scene.letterSpacing}em`;
    let titleY = centerY;
    let titleScale = 1;
    let maskProgress = 1;
    // Gradient creation
    const titleGrad = ctx.createLinearGradient(
      centerX - width * 0.35,
      titleY - titleFontSize / 2,
      centerX + width * 0.35,
      titleY + titleFontSize / 2
    );
    titleGrad.addColorStop(0, grad.colors[0]);
    titleGrad.addColorStop(0.5, grad.colors[1]);
    titleGrad.addColorStop(1, grad.colors[2]);
    // Apply glow
    if (glowAmount > 0.05) {
      ctx.shadowColor = grad.colors[1];
      ctx.shadowBlur = (14 * glowAmount) * baseScale;
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 12 * baseScale;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4 * baseScale;
    }
    const words = scene.title.split(' ');
    const chars = scene.title.split('');
    // --- PRESET A: WORD BY WORD REVEAL ---
    if (scene.style === 'word-by-word') {
      const fullWidth = ctx.measureText(scene.title).width;
      let startX = scene.textAlign === 'center' ? -fullWidth / 2 : scene.textAlign === 'right' ? -fullWidth : 0;
      ctx.translate(centerX, titleY);
      const wordDuration = 0.35;
      const staggerDelay = 0.15;
      words.forEach((word, wIdx) => {
        const wordStartTime = 0.2 + wIdx * staggerDelay;
        const wProgress = easeOutBack(Math.max((timeInScene - wordStartTime) / wordDuration, 0));
        const wAlpha = Math.min(Math.max((timeInScene - wordStartTime) / (wordDuration * 0.6), 0), 1);
        if (wAlpha > 0.01) {
          ctx.save();
          const wordOffset = (1 - Math.min(wProgress, 1)) * 35;
          const wordScale = 0.6 + Math.min(wProgress, 1) * 0.4;
          const wordWidth = ctx.measureText(word + ' ').width;
          ctx.translate(startX + wordWidth / 2, wordOffset);
          ctx.scale(wordScale, wordScale);
          ctx.globalAlpha = wAlpha * exitOpacity;
          const isAccent = scene.accentWord && word.toUpperCase().replace(/[^A-Z0-9]/g, '') === scene.accentWord.toUpperCase();
          ctx.fillStyle = isAccent ? titleGrad : '#ffffff';
          ctx.fillText(word, -wordWidth / 2, 0);
          ctx.restore();
        }
        startX += ctx.measureText(word + ' ').width;
      });
    }
    // --- PRESET B: TYPEWRITER CADENCE ---
    else if (scene.style === 'typewriter') {
      const totalChars = chars.length;
      const typeDuration = Math.min(scene.duration * 0.65, 2.2);
      const progressChar = Math.min(Math.max((timeInScene - 0.2) / typeDuration, 0), 1);
      const visibleCharCount = Math.floor(progressChar * totalChars);
      const displayedText = scene.title.slice(0, visibleCharCount);
      ctx.translate(centerX, titleY);
      ctx.globalAlpha = exitOpacity;
      ctx.fillStyle = titleGrad;
      ctx.fillText(displayedText, 0, 0);
      // Blinking cursor block
      const isCursorBlink = Math.floor(timeInScene * 3.5) % 2 === 0;
      if (isCursorBlink && timeInScene < scene.duration - 0.2) {
        const fullW = ctx.measureText(displayedText).width;
        let curX = 0;
        if (scene.textAlign === 'center') curX = fullW / 2 + 6 * baseScale;
        else if (scene.textAlign === 'left') curX = fullW + 6 * baseScale;
        else curX = 6 * baseScale;
        ctx.fillStyle = grad.colors[0];
        ctx.fillRect(curX, -titleFontSize * 0.45, 4 * baseScale, titleFontSize * 0.9);
      }
    }
    // --- PRESET C: RANDOMIZED CHARACTER MATRIX ---
    else if (scene.style === 'random-char-matrix') {
      ctx.translate(centerX, titleY);
      ctx.globalAlpha = exitOpacity;
      const totalChars = chars.length;
      const matrixDuration = Math.min(scene.duration * 0.6, 2.0);
      const globalMatrixProgress = Math.min(Math.max((timeInScene - 0.2) / matrixDuration, 0), 1);
      let assembledString = '';
      for (let i = 0; i < totalChars; i++) {
        const charThreshold = i / totalChars;
        if (chars[i] === ' ') {
          assembledString += ' ';
        } else if (globalMatrixProgress >= charThreshold + 0.15) {
          // Resolved final character
          assembledString += chars[i];
        } else if (globalMatrixProgress >= charThreshold - 0.1) {
          // Scrambled glyph
          const seed = i * 37 + Math.floor(timeInScene * 24);
          assembledString += getPseudoRandomChar(seed);
        } else {
          // Still unseen or masked
          assembledString += ' ';
        }
      }
      ctx.fillStyle = titleGrad;
      ctx.fillText(assembledString, 0, 0);
    }
    // --- STANDARD ANIMATION STYLES (Slide-wipe, Stagger, Kinetic Scale, Glitch, Fade) ---
    else {
      if (scene.style === 'slide-wipe') {
        titleY = centerY + (1 - tTitle) * 45;
        maskProgress = tWipe;
      } else if (scene.style === 'kinetic-scale') {
        titleScale = 0.85 + tTitle * 0.15;
      } else if (scene.style === 'stagger-rise') {
        titleY = centerY + (1 - tTitle) * 60;
      } else if (scene.style === 'glitch-snap') {
        const jitter = (1 - tTitle) * 8 * Math.sin(timeInScene * 60);
        titleY = centerY + jitter;
      }
      ctx.translate(centerX, titleY);
      ctx.scale(titleScale, titleScale);
      ctx.globalAlpha = Math.min(tTitle, 1) * exitOpacity;
      const hasAccent = scene.accentWord && scene.title.toUpperCase().includes(scene.accentWord.toUpperCase());
      if (scene.style === 'slide-wipe' && maskProgress < 0.99) {
        ctx.fillStyle = titleGrad;
        ctx.fillText(scene.title, 0, 0);
        const lineWidth = (width * 0.4) * maskProgress;
        ctx.strokeStyle = grad.colors[1];
        ctx.lineWidth = 4 * baseScale;
        ctx.beginPath();
        ctx.moveTo(-lineWidth / 2, titleFontSize * 0.65);
        ctx.lineTo(lineWidth / 2, titleFontSize * 0.65);
        ctx.stroke();
      } else if (hasAccent && words.length > 1) {
        const fullWidth = ctx.measureText(scene.title).width;
        const startX = scene.textAlign === 'center' ? -fullWidth / 2 : scene.textAlign === 'right' ? -fullWidth : 0;
        let currentX = startX;
        words.forEach((word) => {
          const isTarget = word.toUpperCase().replace(/[^A-Z0-9]/g, '') === scene.accentWord?.toUpperCase();
          ctx.fillStyle = isTarget ? titleGrad : '#ffffff';
          ctx.fillText(word, currentX, 0);
          currentX += ctx.measureText(word + ' ').width;
        });
      } else {
        ctx.fillStyle = titleGrad;
        ctx.fillText(scene.title, 0, 0);
      }
    }
    ctx.restore();
  }
  // 7. Render Subtitle Narrative (with Line-by-Line cascade support)
  if (scene.subtitle && timeInScene >= 0.35) {
    ctx.save();
    const subtitleY = centerY + titleFontSize * 0.85;
    ctx.font = `500 ${subtitleFontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = scene.textAlign;
    ctx.letterSpacing = '0.02em';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 8 * baseScale;
    ctx.shadowOffsetY = 2 * baseScale;
    const maxSubWidth = width * 0.74;
    const words = scene.subtitle.split(' ');
    let line = '';
    const lines: string[] = [];
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxSubWidth && n > 0) {
        lines.push(line);
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line);
    const lineHeight = subtitleFontSize * 1.45;
    // Line-by-line staggered reveal logic
    if (scene.style === 'line-by-line') {
      const lineDuration = 0.45;
      const lineStagger = 0.2;
      lines.forEach((l, index) => {
        const lineStartTime = 0.4 + index * lineStagger;
        const lProg = easeOutCubic(Math.max((timeInScene - lineStartTime) / lineDuration, 0));
        const lAlpha = Math.min(Math.max((timeInScene - lineStartTime) / (lineDuration * 0.7), 0), 1);
        if (lAlpha > 0.01) {
          ctx.save();
          const lineYOffset = (1 - lProg) * 20;
          ctx.globalAlpha = lAlpha * exitOpacity;
          ctx.fillText(l.trim(), centerX, subtitleY + index * lineHeight + lineYOffset);
          ctx.restore();
        }
      });
    } else {
      ctx.globalAlpha = Math.min(tSubtitle, 1) * exitOpacity;
      const lineYOffset = (1 - tSubtitle) * 20;
      lines.forEach((l, index) => {
        ctx.fillText(l.trim(), centerX, subtitleY + index * lineHeight + lineYOffset);
      });
    }
    ctx.restore();
  }
  // 8. Interactive Drag Target Reticle
  if (options?.showDragHandle) {
    ctx.save();
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, 24 * baseScale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4 * baseScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // 9. Synchronized SRT Subtitle Cue Overlay
  const activeCue = options?.activeSrtCue;
  if (activeCue && activeCue.text) {
    ctx.save();
    const cueFontSize = 20 * baseScale;
    ctx.font = `700 ${cueFontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cueLines = activeCue.text.split('\n');
    let maxCueLineWidth = 0;
    cueLines.forEach((cl) => {
      const w = ctx.measureText(cl).width;
      if (w > maxCueLineWidth) maxCueLineWidth = w;
    });
    const cuePadX = 20 * baseScale;
    const cuePadY = 10 * baseScale;
    const boxW = Math.min(maxCueLineWidth + cuePadX * 2, width * 0.88);
    const boxH = cueLines.length * cueFontSize * 1.35 + cuePadY * 2;
    const boxX = width / 2 - boxW / 2;
    const boxY = height - boxH - 26 * baseScale;
    ctx.fillStyle = 'rgba(10, 13, 20, 0.82)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 12 * baseScale);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = grad.colors[0];
    ctx.fillRect(boxX + 16 * baseScale, boxY, boxW - 32 * baseScale, 2 * baseScale);
    ctx.fillStyle = '#ffffff';
    cueLines.forEach((cl, idx) => {
      const lineY = boxY + cuePadY + cueFontSize * 0.65 + idx * cueFontSize * 1.35;
      ctx.fillText(cl, width / 2, lineY);
    });
    ctx.restore();
  }
  // 10. Progress Micro-Bar
  ctx.save();
  const progress = Math.min(Math.max(timeInScene / scene.duration, 0), 1);
  const barY = height - 5;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(0, barY, width, 5);
  const fillGrad = ctx.createLinearGradient(0, barY, width, barY);
  fillGrad.addColorStop(0, grad.colors[0]);
  fillGrad.addColorStop(1, grad.colors[1]);
  ctx.fillStyle = fillGrad;
  ctx.fillRect(0, barY, width * progress, 5);
  ctx.restore();
  ctx.restore();
}
