import { GoogleGenAI } from "@google/genai";
import fs from 'fs';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function transcribeAudio(audioPath: string) {
    try {
        const audioData = fs.readFileSync(audioPath).toString('base64');
        const interaction = await ai.interactions.create({
            model: 'gemini-3.5-transcribe',
            input: [
                {
                    type: "audio",
                    data: audioData,
                    mime_type: "audio/mp3",
                },
                {
                    type: "text",
                    text: "Transcribe this audio with timestamps.",
                },
            ],
        });
        return interaction.output_text || "";
    } catch (e) {
        console.error('Transcription failed:', e);
        return "";
    }
}
