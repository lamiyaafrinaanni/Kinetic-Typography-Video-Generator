Usage in your Remotion project:
1) Copy MTCaptions.tsx and chunks.json into src/.
2) Add Inter font (e.g. @remotion/google-fonts/Inter) or keep the fallback.
3) In your composition, on top of your video + voice-over:
     <AbsoluteFill>
       <OffthreadVideo src={staticFile('your-video.mp4')} />
       <Audio src={staticFile('voice.wav')} />
       <MTCaptions />            // offsetSeconds={n} if the voice starts at n seconds in your timeline
     </AbsoluteFill>
Timings in chunks.json are seconds relative to the start of the supplied voice-over WAV.
To nudge a line: edit that chunk's s/e and its words' start/end values.
