import { SrtCue } from '../types';
/**
 * Parses timestamp string (00:01:23,456 or 00:01:23.456) into seconds
 */
export function timecodeToSeconds(timecode: string): number {
  const parts = timecode.trim().replace(',', '.').split(':');
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]) || 0;
    const minutes = parseFloat(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }
  if (parts.length === 2) {
    const minutes = parseFloat(parts[0]) || 0;
    const seconds = parseFloat(parts[1]) || 0;
    return minutes * 60 + seconds;
  }
  return parseFloat(timecode) || 0;
}
/**
 * Formats seconds into HH:MM:SS,mmm timestamp string
 */
export function secondsToTimecode(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  const millis = Math.floor((s - Math.floor(s)) * 1000);
  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(millis, 3)}`;
}
/**
 * Parses raw SRT string content into structured SrtCue objects
 */
export function parseSrt(srtContent: string): SrtCue[] {
  const cues: SrtCue[] = [];
  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.trim().split(/\n\n+/);
  let fallbackId = 1;
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;
    let indexLine = 0;
    // Check if line 0 is a numeric cue index
    let cueId = fallbackId;
    if (/^\d+$/.test(lines[0])) {
      cueId = parseInt(lines[0], 10);
      indexLine = 1;
    }
    const timeLine = lines[indexLine];
    if (!timeLine || !timeLine.includes('-->')) continue;
    const [startRaw, endRaw] = timeLine.split('-->').map((s) => s.trim());
    const startTime = timecodeToSeconds(startRaw);
    const endTime = timecodeToSeconds(endRaw);
    const textLines = lines.slice(indexLine + 1);
    const text = textLines.join('\n').replace(/<[^>]*>/g, ''); // strip HTML tags if any
    if (endTime > startTime && text.length > 0) {
      cues.push({
        id: cueId,
        startTime,
        endTime,
        text,
        rawTimecode: `${startRaw} --> ${endRaw}`,
      });
      fallbackId++;
    }
  }
  return cues.sort((a, b) => a.startTime - b.startTime);
}
/**
 * Converts cues back to standard .srt format string for export
 */
export function serializeSrt(cues: SrtCue[]): string {
  return cues
    .map((cue, idx) => {
      const start = secondsToTimecode(cue.startTime);
      const end = secondsToTimecode(cue.endTime);
      return `${idx + 1}\n${start} --> ${end}\n${cue.text}\n`;
    })
    .join('\n');
}
