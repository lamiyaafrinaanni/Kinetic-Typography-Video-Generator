import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
import { GoogleGenAI } from "@google/genai";
import { transcribeAudio } from './workers/transcription';
import { generateVideo } from './workers/videoGenerator';
import path from 'path';
import fs from 'fs';

const app = express();
const upload = multer({ dest: 'uploads/' });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.post('/api/upload', upload.single('audio'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
    res.json({ file: req.file });
  });

const jobs = new Map<string, { status: string, progress: number, file?: string }>();

app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  console.log('Received audio for transcription:', req.file.path);
  const transcription = await transcribeAudio(req.file.path);
  console.log('Transcription result:', transcription);
  res.json({ transcription });
});

app.post('/api/process', upload.fields([{ name: 'audio' }, { name: 'backgroundMusic' }, { name: 'logo' }]), async (req, res) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  if (!files.audio) return res.status(400).send('No voice audio uploaded.');
  const jobId = Math.random().toString(36).substring(7);
  jobs.set(jobId, { status: 'Transcribing', progress: 25 });
  res.json({ jobId });

  (async () => {
    try {
      let audioPath = files.audio[0].path;

      if (files.backgroundMusic && req.body.enableMusic === 'true') {
        const mixedPath = `uploads/mixed_${jobId}.mp3`;
        await new Promise((resolve, reject) => {
          ffmpeg()
            .input(audioPath)
            .input(files.backgroundMusic[0].path)
            .complexFilter(['amix=inputs=2:duration=first'])
            .save(mixedPath)
            .on('end', resolve)
            .on('error', reject);
        });
        audioPath = mixedPath;
      }

      const transcription = req.body.transcript || await transcribeAudio(audioPath);
      jobs.set(jobId, { status: 'Generating', progress: 75 });
      const theme = req.body.theme || 'modern-dark';
      const animationStyle = req.body.animationStyle || 'Bounce';
      const font = req.body.font || 'Roboto';
      const resolution = req.body.resolution || '720p';
      const highlightColor = req.body.highlightColor || '#FF0000';
      const aspectRatio = req.body.aspectRatio || '16:9';
      const start = Number(req.body.start) || 0;
      const end = Number(req.body.end) || 10;
      const videoBuffer = await generateVideo(`Kinetic typography animation with the following text: ${transcription}`, theme, animationStyle, font, resolution, highlightColor, aspectRatio, start, end);
      
      const rawVideo = `uploads/raw_${jobId}.mp4`;
      fs.writeFileSync(rawVideo, videoBuffer);
      
      let finalPath = `uploads/${jobId}.mp4`;
      if (files.logo) {
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(rawVideo)
                .input(files.logo[0].path)
                .complexFilter(['overlay=main_w-overlay_w-10:main_h-overlay_h-10']) // Bottom right
                .save(finalPath)
                .on('end', resolve)
                .on('error', reject);
        });
      } else {
        fs.renameSync(rawVideo, finalPath);
      }
      
      jobs.set(jobId, { status: 'Done', progress: 100, file: `${jobId}.mp4` });
    } catch (err) {
      console.error(err);
      jobs.set(jobId, { status: 'Failed', progress: 0 });
    }
  })();
});

app.get('/api/status/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).send('Job not found');
  res.json(job);
});

app.get('/api/video/:filename', (req, res) => {
  const filePath = path.join(process.cwd(), req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

  app.listen(3000, () => console.log('Server running on port 3000'));
}

startServer();
