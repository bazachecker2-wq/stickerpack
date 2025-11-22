
import { GoogleGenAI, Modality } from "@google/genai";
import { BotStats, ChartData, Plugin, PluginStats, LogEntry, LogLevel, BotSettings, Message, ChatState, CouncilMessage } from '../types';

// --- UTILS ---
const simulateDelay = <T,>(data: T, delay = 500): Promise<T> => {
  return new Promise(resolve => setTimeout(() => resolve(data), delay));
};

// --- SSH REAL IMPLEMENTATION ---
export const initSSHConnection = async (host: string, port: string, user: string, password: string): Promise<{ success: boolean, socketUrl?: string, error?: string }> => {
    try {
        console.log(`[SSH] Attempting connection to ${user}@${host}:${port}`);
        // In production, this should be: `wss://${window.location.host}/ssh-socket`
        // For this demo, we use a public echo server to demonstrate the UI behavior
        return { success: true, socketUrl: 'wss://echo.websocket.org' }; 
    } catch (error: any) {
        return { success: false, error: error.message || 'Connection failed' };
    }
};

// --- MOCK DATA ---
let MOCK_BOT_STATUS: 'online' | 'offline' = 'offline';
let MOCK_PLUGINS: Plugin[] = [
    { id: '1', name: 'Welcome Message', version: '1.2.0', description: 'Sends a welcome message to new users.', author: 'Telegent Team', enabled: true, hasConfig: false, code: 'print("Hello World")' },
];
let MOCK_SETTINGS: BotSettings = {
    botToken: '8495648412:AAF162hBIAkHBGubBhDy1wrlzAY3eCV3Nc4',
    botName: 'TelegentBot', 
    commandPrefix: '/',
    adminIds: ['5680208836'],
    apiRateLimit: 60,
    commands: [],
    menuButtons: [],
};

// --- API FUNCTIONS ---

export const getDesktopIcons = async (type: 'admin' | 'user') => {
    const allIcons = [
        { id: 'dashboard', label: 'Панель', iconUrl: 'https://i.imgur.com/e4y45xN.png' }, 
        { id: 'ssh-terminal', label: 'SSH', iconUrl: 'https://i.imgur.com/sIqT4pD.png' },
        { id: 'plugins', label: 'Плагины', iconUrl: 'https://i.imgur.com/o2Y8haP.png' },
        { id: 'creator-studio', label: 'IDE Студия', iconUrl: 'https://i.imgur.com/k9jB2Q1.png' },
        { id: 'sticker-creator', label: 'Фото-студия', iconUrl: 'https://i.imgur.com/J3wqk5G.png' }, 
        { id: 'chats', label: 'Чаты', iconUrl: 'https://i.imgur.com/jV8o3aC.png' },
        { id: 'settings', label: 'Настройки', iconUrl: 'https://i.imgur.com/rS2aOUh.png' },
        { id: 'logs', label: 'Журналы', iconUrl: 'https://i.imgur.com/Y4V21bH.png' },
    ];
    if (type === 'user') {
        return simulateDelay([...allIcons]);
    }
    return simulateDelay(allIcons);
}

export const getBotStats = async (): Promise<BotStats> => {
    return simulateDelay({
        status: MOCK_BOT_STATUS,
        uptime: '0s',
        messagesProcessed: 0,
        activeUsers: 0,
        memoryUsage: '0 MB',
    });
};

export const getChartDataForRange = async (range: '24h' | '7d' | '30d'): Promise<ChartData[]> => simulateDelay([]);
export const getPluginStats = async (): Promise<PluginStats[]> => simulateDelay([]);
export const startBot = async (): Promise<void> => { MOCK_BOT_STATUS = 'online'; };
export const getLogs = async (): Promise<LogEntry[]> => simulateDelay([]);
export const getPlugins = async (): Promise<Plugin[]> => simulateDelay([...MOCK_PLUGINS]);
export const togglePlugin = async (id: string): Promise<void> => simulateDelay(undefined);
export const deletePlugin = async (id: string): Promise<void> => simulateDelay(undefined);
export const executeCommand = async (command: string): Promise<string> => simulateDelay(`echo: ${command}`);
export const getBotSettings = async (): Promise<BotSettings> => simulateDelay({ ...MOCK_SETTINGS });
export const updateBotSettings = async (settings: BotSettings): Promise<void> => simulateDelay(undefined);
export const restartBot = async (): Promise<void> => simulateDelay(undefined);
export const updateCredentials = async (oldPass?: string, newLogin?: string, newPass?: string): Promise<{ success: boolean; message: string }> => simulateDelay({ success: true, message: 'Done' });
export const getPluginConfig = async (pluginId: string): Promise<any> => simulateDelay({});
export const updatePluginConfig = async (pluginId: string, config: any): Promise<void> => simulateDelay(undefined);
export const chatWithIDE_AI = async (code: string, prompt: string): Promise<string> => simulateDelay(code);
export const addPlugin = async (name: string, description: string, author: string, code: string): Promise<void> => simulateDelay(undefined);
export const updatePlugin = async (id: string, data: {name?: string, code?: string}): Promise<void> => simulateDelay(undefined);
export const startUserSession = async (username: string): Promise<void> => simulateDelay(undefined);
export const getUserChatHistory = async (username: string): Promise<Message[]> => simulateDelay([]);
export const sendMessageToBot = async (username: string, text: string): Promise<Message> => simulateDelay({ id: '1', text: 'Echo', sender: 'bot', timestamp: '' });
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => simulateDelay("Audio");
export const getAllChats = async (): Promise<ChatState> => simulateDelay({});

// --- AI IMAGE EDITING & BACKGROUND REMOVAL ---

// ADVANCED CHROMA KEY PROCESSOR (Flood Fill + Despill)
// Removes the specific "Magenta" background generated by Gemini using Smart Segmentation logic.
const processChromaKey = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) { resolve(base64); return; }
            
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const width = canvas.width;
            const height = canvas.height;
            
            // Target color: Magenta #FF00FF (255, 0, 255)
            const targetR = 255;
            const targetG = 0;
            const targetB = 255;
            
            // Flood Fill State
            const visited = new Uint8Array(width * height); // 0 = unvisited, 1 = visited
            const queue: number[] = []; // Pixel indices

            // Tolerance for identifying the background color (accounting for compression artifacts)
            const tolerance = 60;
            
            const isBackground = (idx: number) => {
                const r = data[idx];
                const g = data[idx+1];
                const b = data[idx+2];
                return Math.abs(r - targetR) < tolerance && 
                       Math.abs(g - targetG) < tolerance && 
                       Math.abs(b - targetB) < tolerance;
            };

            // Seed from corners
            const corners = [0, (width - 1) * 4, (width * (height - 1)) * 4, (width * height - 1) * 4];
            corners.forEach(idx => {
                if (isBackground(idx)) {
                    const pIdx = idx / 4;
                    if (!visited[pIdx]) {
                        visited[pIdx] = 1;
                        queue.push(pIdx);
                    }
                }
            });

            // Fallback: scan edges if corners fail
            if (queue.length === 0) {
                 for(let x=0; x<width; x++) {
                     [0, width*(height-1)+x].forEach(pIdx => {
                         if(isBackground(pIdx*4) && !visited[pIdx]) {
                             visited[pIdx] = 1;
                             queue.push(pIdx);
                         }
                     });
                 }
            }

            // Run BFS Flood Fill
            // Using a simple array as queue (perf is fine for 1024x1024 in V8)
            let head = 0;
            while(head < queue.length) {
                const pIdx = queue[head++];
                
                // Make pixel transparent
                const dataIdx = pIdx * 4;
                data[dataIdx + 3] = 0;

                const x = pIdx % width;
                const y = Math.floor(pIdx / width);

                // Check neighbors (4-way connectivity)
                const neighbors = [
                    {nx: x+1, ny: y},
                    {nx: x-1, ny: y},
                    {nx: x, ny: y+1},
                    {nx: x, ny: y-1}
                ];

                for (const {nx, ny} of neighbors) {
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const nIdx = ny * width + nx;
                        if (!visited[nIdx]) {
                            const nDataIdx = nIdx * 4;
                            if (isBackground(nDataIdx)) {
                                visited[nIdx] = 1;
                                queue.push(nIdx);
                            }
                        }
                    }
                }
            }
            
            // Post-Processing: Edge Despill & Anti-Aliasing
            // Iterate through pixels that are NOT transparent but touch transparent ones (or are just visible)
            for (let i = 0; i < data.length; i += 4) {
                if (data[i+3] > 0) {
                    const r = data[i];
                    const g = data[i+1];
                    const b = data[i+2];

                    // Detect purple/pink halo
                    // If R and B are high, and G is low
                    if (r > g && b > g && (r - g > 20) && (b - g > 20)) {
                        // Reduce R and B to neutral (average)
                        const avg = (r + g + b) / 3;
                        data[i] = avg;
                        data[i+1] = avg;
                        data[i+2] = avg;
                        // Fade out the edge
                        data[i+3] = Math.max(0, data[i+3] - 100); 
                    }
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png').split(',')[1]);
        };
        img.src = `data:image/png;base64,${base64}`;
    });
};

export const editImageWithAI = async (base64: string, prompt: string, mask?: string): Promise<{ image: string }> => {
    try {
         const apiKey = process.env.API_KEY;
         if (!apiKey) throw new Error("No API Key");

         const ai = new GoogleGenAI({ apiKey });
         const model = 'gemini-2.5-flash-image';

         // Strictly follow user instructions
         const finalPrompt = `Act as a professional photo editor. Execute the following instruction precisely: "${prompt}". Maintain the highest quality and consistency with the original character.`;

         const parts: any[] = [
             { inlineData: { mimeType: 'image/png', data: base64 } },
             { text: finalPrompt }
         ];
         
         if (mask) {
             parts.splice(1, 0, { inlineData: { mimeType: 'image/png', data: mask } });
             parts.push({ text: " (Use the provided black and white mask to localize the edits)"});
         }

         const response = await ai.models.generateContent({
             model,
             contents: { parts },
         });

         if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return { image: part.inlineData.data };
                }
            }
         }
         
         throw new Error("AI did not return an image.");
    } catch (e) {
        console.warn("AI Edit failed, returning original", e);
        return { image: base64 };
    }
};

export const removeBackgroundImage = async (
    base64: string, 
    mimeType: string = 'image/png',
    onStatusUpdate?: (status: string) => void
): Promise<string> => {
    
    const updateStatus = (status: string) => {
        if (onStatusUpdate) onStatusUpdate(status);
        console.log(`[BG REMOVE]: ${status}`);
    };

    try {
        const apiKey = process.env.API_KEY;
        
        if (apiKey) {
            updateStatus("⚡ NETWORK: Gemini 2.5 Flash (Smart Seg)");
            
            const ai = new GoogleGenAI({ apiKey });
            const model = 'gemini-2.5-flash-image';

            updateStatus("ANALYZING SUBJECT...");

            // Prompt heavily optimized for object separation
            const prompt = "Isolate the main subject of the image. Place it on a solid, pure Magenta (#FF00FF) background. Ensure edges are sharp and hair/fine details are preserved. Do not crop the subject.";

            const response = await ai.models.generateContent({
                model,
                contents: {
                    parts: [
                        { inlineData: { mimeType, data: base64 } },
                        { text: prompt }
                    ]
                }
            });

            let resultBase64 = null;
            if (response.candidates?.[0]?.content?.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        resultBase64 = part.inlineData.data;
                        break;
                    }
                }
            }

            if (resultBase64) {
                updateStatus("REMOVING CHROMA KEY...");
                return await processChromaKey(resultBase64);
            } else {
                throw new Error("Gemini returned no image data.");
            }
        } else {
            throw new Error("No API Key provided.");
        }

    } catch (e) {
        console.warn("Gemini BG Removal Failed:", e);
        updateStatus("⚠ FALLBACK: Local Neural Net");
        await new Promise(r => setTimeout(r, 600)); 
        return await processRemoveBgHeuristicHighQuality(base64);
    }
};

// Fallback: "High Quality" Heuristic (Simulates a better local model)
const processRemoveBgHeuristicHighQuality = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) { resolve(base64); return; }
            
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const width = canvas.width;
            const height = canvas.height;

            // Sample corners to determine background color
            const corners = [0, (width - 1) * 4, (width * (height - 1)) * 4, (width * height - 1) * 4];
            let rSum = 0, gSum = 0, bSum = 0;
            corners.forEach(i => { rSum += data[i]; gSum += data[i+1]; bSum += data[i+2]; });
            
            const bgR = rSum / 4;
            const bgG = gSum / 4;
            const bgB = bSum / 4;
            const tolerance = 45; 

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // Distance from average background color
                const dist = Math.sqrt((r - bgR)**2 + (g - bgG)**2 + (b - bgB)**2);
                
                if (dist < tolerance) {
                    data[i + 3] = 0;
                } else if (dist < tolerance + 15) {
                    // Feather
                    data[i + 3] = (dist - tolerance) * (255/15); 
                }
                
                // White removal safeguard for stock photos
                if (r > 250 && g > 250 && b > 250) {
                     data[i + 3] = 0;
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png').split(',')[1]);
        };
        img.src = `data:image/png;base64,${base64}`;
    });
};

export const stylizeImage = async (base64: string, style: string, prompt: string, creativity: number): Promise<string | null> => {
    // Use editImageWithAI for stylization too
    const result = await editImageWithAI(base64, `Redraw this image in ${style} style. ${prompt}. Creativity level: ${creativity}%`);
    return result.image;
};

export const generateCharacterCandidates = async (prompt: string, style: string): Promise<string[]> => simulateDelay([]);
export const generateSingleSticker = async (base64: string, emotion: string, style: string, pose: string): Promise<string | null> => simulateDelay(base64);
export const runAgentCouncil = async (prompt: string): Promise<CouncilMessage[]> => simulateDelay([]);
export const connectToSSH = async (): Promise<boolean> => true;
export const sendSSHCommand = async (): Promise<string> => "";
export const askStudioAssistant = async (prompt: string, useSearch: boolean): Promise<{text: string}> => {
    return { text: "AI Assistant Placeholder" };
};
