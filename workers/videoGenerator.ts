import { GoogleGenAI } from "@google/genai";
import fs from 'fs';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function generateVideo(prompt: string, theme: string, animationStyle: string, font: string, resolution: string, highlightColor: string, aspectRatio: string, start: number, end: number) {
    const refinedPrompt = `
        Create a high-quality kinetic typography motion graphics video based on this request: "${prompt}".
        Theme: ${theme}.
        Animation Style: ${animationStyle}.
        Font: ${font}.
        Highlight Color: ${highlightColor}.
        Aspect Ratio: ${aspectRatio}.
        Duration: ${end - start} seconds.
        
        Strict Motion Graphics Guidelines:
        1. Use the ${font} font for the text.
        2. Use the ${animationStyle} animation style for the typography.
        3. Use ${highlightColor} to highlight the active word as it is spoken.
        4. Use aggressive, dynamic text animations synced perfectly to the timing.
        5. Ensure high contrast and clear readability.
        6. No conversational filler; focus strictly on visual impact.
        7. Apply the aesthetics of the ${theme} theme.
    `;

    const interaction = await ai.interactions.create({
        model: 'gemini-omni-1.1-flash',
        input: refinedPrompt,
        background: false,
        store: false,
        stream: false,
        response_format: {
            type: 'video',
            aspect_ratio: aspectRatio as '16:9' | '9:16',
            duration: `${end - start}s`,
            resolution: resolution as '360p' | '720p' | '1080p' | '4k',
        }
    }, { timeout: 300000 }); // 5 minutes timeout

    const videoPart = interaction.output_video;
    if (videoPart && videoPart.data) {
        return Buffer.from(videoPart.data, 'base64');
    }
    throw new Error('Video generation failed');
}
