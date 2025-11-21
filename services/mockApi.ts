
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { BotStats, ChartData, Plugin, PluginStats, LogEntry, LogLevel, BotSettings, Message, ChatState, CouncilMessage } from '../types';

const simulateDelay = <T,>(data: T, delay = 500): Promise<T> => {
  return new Promise(resolve => setTimeout(() => resolve(data), delay));
};

// --- MOCK DATABASE ---
let MOCK_BOT_STATUS: 'online' | 'offline' = 'offline';
let MOCK_BOT_START_TIME: Date | null = null;

let MOCK_PLUGINS: Plugin[] = [
    { id: '1', name: 'Welcome Message', version: '1.2.0', description: 'Sends a welcome message to new users.', author: 'Telegent Team', enabled: true, hasConfig: false, code: 'print("Hello World")' },
    { id: '2', name: 'AI Responder (Gemini)', version: '0.9.5', description: 'Responds to user messages using Google Gemini.', author: 'Telegent Team', enabled: true, hasConfig: true, code: 'import gemini\n\n# ... code ...' },
    { id: '3', name: 'Profanity Filter', version: '1.0.0', description: 'Filters out profane language from chats.', author: 'Community Contributor', enabled: false, hasConfig: true, code: '# ... code ...' },
];

let MOCK_PLUGIN_CONFIGS: { [key: string]: any } = {
    '2': { model: 'gemini-2.5-flash', systemInstruction: 'You are a helpful assistant.', temperature: 0.7 },
    '3': { filter_level: 'high', banned_words: ['example1', 'example2'] },
};

let MOCK_LOGS: LogEntry[] = [
    { id: 1, timestamp: new Date().toISOString(), level: 'INFO', message: 'Bot server initializing...' },
];

let MOCK_SETTINGS: BotSettings = {
    botToken: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
    botName: 'MyTelegentBot',
    commandPrefix: '/',
    adminIds: ['123456789'],
    apiRateLimit: 60,
    commands: [
        { command: 'start', description: 'Start interacting with the bot' },
        { command: 'help', description: 'Show help message' },
    ],
    menuButtons: [{ text: 'Help' }, { text: 'Plugins' }],
};

let MOCK_CHATS: ChatState = {
    'demo_user': [
        { id: '1', text: 'Hello bot!', sender: 'user', timestamp: '10:00' },
        { id: '2', text: 'Hello! How can I help you?', sender: 'bot', timestamp: '10:01' },
    ]
};

// --- MOCK API FUNCTIONS ---

const addLog = (level: LogLevel, message: string) => {
    MOCK_LOGS.unshift({ id: MOCK_LOGS.length + 1, timestamp: new Date().toISOString(), level, message });
    if (MOCK_LOGS.length > 200) MOCK_LOGS.pop(); // Keep logs from growing indefinitely
}

export const getDesktopIcons = async (type: 'admin' | 'user') => {
    const allIcons = [
        { id: 'dashboard', label: 'Панель', iconUrl: 'https://i.imgur.com/e4y45xN.png' }, // My Computer
        { id: 'agent-council', label: 'Совет ИИ', iconUrl: 'https://i.imgur.com/o2Y8haP.png' },
        { id: 'ssh-terminal', label: 'SSH', iconUrl: 'https://i.imgur.com/sIqT4pD.png' },
        { id: 'plugins', label: 'Плагины', iconUrl: 'https://i.imgur.com/o2Y8haP.png' }, // Network Neighborhood
        { id: 'creator-studio', label: 'IDE Студия', iconUrl: 'https://i.imgur.com/k9jB2Q1.png' },
        { id: 'sticker-creator', label: 'Фото-студия', iconUrl: 'https://i.imgur.com/J3wqk5G.png' }, // Paint icon
        { id: 'chats', label: 'Чаты', iconUrl: 'https://i.imgur.com/jV8o3aC.png' },
        { id: 'terminal', label: 'MS-DOS', iconUrl: 'https://i.imgur.com/gJZKxGz.png' },
        { id: 'settings', label: 'Настройки', iconUrl: 'https://i.imgur.com/rS2aOUh.png' },
        { id: 'logs', label: 'Журналы', iconUrl: 'https://i.imgur.com/Y4V21bH.png' },
        { id: 'commands', label: 'Команды', iconUrl: 'https://i.imgur.com/fJg8j4b.png' },
    ];
    if (type === 'user') {
        // Give user access to everything + their own chat
        const userIcons = [
            ...allIcons,
            { id: 'chat', label: 'Чат с ботом', iconUrl: 'https://i.imgur.com/jV8o3aC.png' }
        ];
        return simulateDelay(userIcons);
    }
    return simulateDelay(allIcons);
}

export const getBotStats = async (): Promise<BotStats> => {
    let uptime = '0s';
    if (MOCK_BOT_STATUS === 'online' && MOCK_BOT_START_TIME) {
        const diff = new Date().getTime() - MOCK_BOT_START_TIME.getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        uptime = `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    }
    const stats: BotStats = {
        status: MOCK_BOT_STATUS,
        uptime: MOCK_BOT_STATUS === 'online' ? uptime : 'N/A',
        messagesProcessed: 1337,
        activeUsers: Object.keys(MOCK_CHATS).length,
        memoryUsage: '128.5 MB',
    };
    return simulateDelay(stats);
};

export const getChartDataForRange = async (range: '24h' | '7d' | '30d'): Promise<ChartData[]> => {
    const dataPoints = range === '24h' ? 24 : range === '7d' ? 7 : 30;
    const data = Array.from({ length: dataPoints }, (_, i) => ({
        name: range === '24h' ? `${i}:00` : `Day ${i + 1}`,
        messages: Math.floor(Math.random() * 100 * (i + 1) / 2) + 10,
    }));
    return simulateDelay(data);
};

export const getPluginStats = async (): Promise<PluginStats[]> => {
    const stats: PluginStats[] = MOCK_PLUGINS.map(p => ({
        id: p.id,
        name: p.name,
        messagesHandled: p.enabled ? Math.floor(Math.random() * 500) : 0,
        errors: p.enabled ? Math.floor(Math.random() * 5) : 0,
        enabled: p.enabled,
    }));
    return simulateDelay(stats);
};

export const startBot = async (): Promise<void> => {
    addLog('INFO', 'Bot start sequence initiated by admin.');
    await simulateDelay(null, 2000);
    MOCK_BOT_STATUS = 'online';
    MOCK_BOT_START_TIME = new Date();
    addLog('INFO', 'Bot is now online.');
    return;
};

export const getLogs = async (): Promise<LogEntry[]> => {
    return simulateDelay([...MOCK_LOGS]);
};

export const getPlugins = async (): Promise<Plugin[]> => {
    return simulateDelay([...MOCK_PLUGINS]);
};

export const togglePlugin = async (id: string): Promise<void> => {
    const plugin = MOCK_PLUGINS.find(p => p.id === id);
    if (plugin) {
        plugin.enabled = !plugin.enabled;
        addLog('INFO', `Plugin '${plugin.name}' was ${plugin.enabled ? 'enabled' : 'disabled'}.`);
    }
    return simulateDelay(undefined);
};

export const deletePlugin = async (id: string): Promise<void> => {
    const plugin = MOCK_PLUGINS.find(p => p.id === id);
    MOCK_PLUGINS = MOCK_PLUGINS.filter(p => p.id !== id);
    if (plugin) addLog('WARN', `Plugin '${plugin.name}' was deleted.`);
    return simulateDelay(undefined);
};

export const togglePlugins = async (ids: string[], enable: boolean): Promise<void> => {
    MOCK_PLUGINS.forEach(p => {
        if (ids.includes(p.id)) {
            p.enabled = enable;
        }
    });
    addLog('INFO', `${ids.length} plugins were ${enable ? 'enabled' : 'disabled'}.`);
    return simulateDelay(undefined);
};

export const deletePlugins = async (ids: string[]): Promise<void> => {
    MOCK_PLUGINS = MOCK_PLUGINS.filter(p => !ids.includes(p.id));
    addLog('WARN', `${ids.length} plugins were deleted.`);
    return simulateDelay(undefined);
};

export const executeCommand = async (command: string): Promise<string> => {
    addLog('DEBUG', `Terminal command executed: ${command}`);
    if (command === 'help') {
        return simulateDelay('Available commands: \n- help: Show this message\n- status: Get bot status\n- logs: Show recent logs');
    }
    if (command === 'status') {
        return simulateDelay(`Bot status: ${MOCK_BOT_STATUS}`);
    }
    if (command === 'logs') {
        return simulateDelay(MOCK_LOGS.slice(0, 5).map(l => `[${l.level}] ${l.message}`).join('\n'));
    }
    return simulateDelay(`command not found: ${command}`);
};

export const getBotSettings = async (): Promise<BotSettings> => {
    return simulateDelay({ ...MOCK_SETTINGS });
};

export const updateBotSettings = async (settings: BotSettings): Promise<void> => {
    MOCK_SETTINGS = { ...settings };
    addLog('INFO', 'Bot settings updated.');
    return simulateDelay(undefined);
};

export const restartBot = async (): Promise<void> => {
    addLog('WARN', 'Bot restart initiated.');
    MOCK_BOT_STATUS = 'offline';
    await simulateDelay(null, 1500);
    MOCK_BOT_STATUS = 'online';
    MOCK_BOT_START_TIME = new Date();
    addLog('INFO', 'Bot has been restarted and is now online.');
    return;
};

export const updateCredentials = async (current: string, login: string, newPass: string): Promise<{ success: boolean; message: string }> => {
    // This is highly insecure, for mock purposes only.
    const creds = JSON.parse(localStorage.getItem('telegentCredentials') || '{}');
    if (creds.password !== current) {
        return simulateDelay({ success: false, message: 'Текущий пароль неверен.' });
    }
    localStorage.setItem('telegentCredentials', JSON.stringify({ login, password: newPass }));
    return simulateDelay({ success: true, message: 'Учетные данные успешно обновлены.' });
};

export const getPluginConfig = async (pluginId: string): Promise<any> => {
    return simulateDelay(MOCK_PLUGIN_CONFIGS[pluginId] || {});
};

export const updatePluginConfig = async (pluginId: string, config: any): Promise<void> => {
    MOCK_PLUGIN_CONFIGS[pluginId] = config;
    addLog('INFO', `Configuration for plugin ID ${pluginId} was updated.`);
    return simulateDelay(undefined);
};

export const chatWithIDE_AI = async (code: string, prompt: string): Promise<string> => {
    try {
        if (process.env.API_KEY) {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `You are an expert Python developer. Edit the following code based on this request: "${prompt}". Return ONLY the code, no markdown. Code:\n${code}`
            });
            return response.text || code;
        }
    } catch (e) { console.error(e); }
    
    await simulateDelay(null, 1500);
    return `# AI-generated code based on prompt: "${prompt}"\n${code}\n\nprint("New functionality added!")`;
};

export const addPlugin = async (name: string, description: string, author: string, code: string): Promise<void> => {
    const newPlugin: Plugin = {
        id: (MOCK_PLUGINS.length + 1).toString(),
        name,
        description,
        author,
        code,
        version: '1.0.0',
        enabled: false,
        hasConfig: false,
    };
    MOCK_PLUGINS.push(newPlugin);
    addLog('INFO', `New plugin created: ${name}`);
    return simulateDelay(undefined);
};

export const updatePlugin = async (id: string, data: { name: string, code: string }): Promise<void> => {
    const plugin = MOCK_PLUGINS.find(p => p.id === id);
    if (plugin) {
        plugin.name = data.name;
        plugin.code = data.code;
        addLog('INFO', `Plugin '${plugin.name}' was updated in IDE.`);
    }
    return simulateDelay(undefined);
};

export const startUserSession = async (username: string): Promise<void> => {
    if (!MOCK_CHATS[username]) {
        MOCK_CHATS[username] = [];
    }
    return simulateDelay(undefined);
};

export const getUserChatHistory = async (username: string): Promise<Message[]> => {
    return simulateDelay(MOCK_CHATS[username] || []);
};

export const sendMessageToBot = async (username: string, text: string): Promise<Message> => {
    if (!MOCK_CHATS[username]) MOCK_CHATS[username] = [];
    
    await simulateDelay(null, 1500);
    let responseText = `I received your message: "${text}"`;
    
    try {
        if (process.env.API_KEY) {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: text,
            });
            responseText = response.text || responseText;
        }
    } catch(e) { console.error(e); }

    const botResponse: Message = { id: `bot-${Date.now()}`, text: responseText, sender: 'bot', timestamp: new Date().toLocaleTimeString() };
    MOCK_CHATS[username].push(botResponse);
    return botResponse;
};

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    await simulateDelay(null, 1000);
    return "This is a transcribed audio message. ";
};

export const getAllChats = async (): Promise<ChatState> => {
    return simulateDelay({ ...MOCK_CHATS });
};

export const editImageWithAI = async (base64Image: string, prompt: string, maskBase64?: string): Promise<{ image: string }> => {
    console.log(`AI received editing prompt: "${prompt}"`);
    try {
        if (process.env.API_KEY) {
             const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
             const parts: any[] = [
                { inlineData: { data: base64Image, mimeType: 'image/png' } }, // Assuming png for input simplicity
                { text: prompt }
             ];
             
             // Using Gemini 2.5 Flash Image for editing/generation
             const response = await ai.models.generateContent({
                 model: 'gemini-2.5-flash-image',
                 contents: { parts },
                 config: { responseModalities: [Modality.IMAGE] },
             });
             
             const newImage = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
             if (newImage) {
                 return { image: newImage };
             }
        }
    } catch (e) {
        console.error("Editing failed", e);
    }
    return { image: base64Image };
};

export const removeBackgroundImage = async (base64Image: string, mimeType: string): Promise<string> => {
    try {
        if (process.env.API_KEY) {
             const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
             const parts: any[] = [
                { inlineData: { data: base64Image, mimeType: mimeType } },
                { text: "Isolate the main subject and place it on a solid white background. Ensure high edge quality." }
             ];
             
             const response = await ai.models.generateContent({
                 model: 'gemini-2.5-flash-image',
                 contents: { parts },
                 config: { responseModalities: [Modality.IMAGE] },
             });
             
             const newImage = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
             if (newImage) {
                 return newImage;
             }
        }
        await simulateDelay(null, 1500); 
        // Fallback for mock: If no key, simulate success by returning original (logic handled in UI component)
        return base64Image;
    } catch (error) {
        console.error("Error in background removal", error);
        // Return original image on failure so UI doesn't break
        return base64Image;
    }
};

export const upscaleImage = async (base64Image: string): Promise<string> => {
    try {
        await simulateDelay(null, 1500);
        return base64Image;
    } catch (e) {
        return base64Image;
    }
};

// NEW: Stylize raw image to create a character base with Fine Tuning
export const stylizeImage = async (base64Image: string, style: string, description: string, creativity: number = 40, additionalDetails: string = ''): Promise<string | null> => {
    if (process.env.API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Construct prompt based on creativity level
        let constraintInstruction = "";
        if (creativity < 30) {
            constraintInstruction = "EXTREME RIGIDITY. You MUST preserve the exact pose, facial structure, and composition of the input image. Do NOT change the angle or body shape. Only change the texture/rendering to match the style.";
        } else if (creativity < 70) {
            constraintInstruction = "Balanced Transformation. Keep the character recognizable and the pose similar, but you may adapt details to better fit the style.";
        } else {
            constraintInstruction = "High Creativity. Reimagine this character in the target style. You may adjust the pose and composition to make it more dynamic and aesthetically pleasing for this art style.";
        }
        
        const prompt = `
        Task: Transform the input photo into a character design.
        Target Style: ${style}.
        Character Description: ${description}.
        Additional Details: ${additionalDetails || 'None'}.
        
        Transformation Strength/Rules: ${constraintInstruction}
        
        Requirements:
        1. Clean background (white).
        2. High detail character design.
        3. The character MUST resemble the input person.
        `;

        try {
             const parts: any[] = [
                { inlineData: { data: base64Image, mimeType: 'image/png' } },
                { text: prompt }
             ];
             
             const response = await ai.models.generateContent({
                 model: 'gemini-2.5-flash-image',
                 contents: { parts },
                 config: { responseModalities: [Modality.IMAGE] },
             });
             
             return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
        } catch (e) {
            console.error(e);
            return null;
        }
    }
    await simulateDelay(null, 2000);
    return base64Image;
}

// NEW: Generate 4 character candidates
export const generateCharacterCandidates = async (prompt: string, style: string): Promise<string[]> => {
    const candidates: string[] = [];
    if (process.env.API_KEY) {
         const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
         
         const fullPrompt = `Character Design Sheet. 
         Subject: ${prompt}. 
         Art Style: ${style}. 
         Requirements: Full body character standing in a neutral pose. White background. High quality, detailed, clean lines.`;
         
         const promises = [1, 2, 3, 4].map(async () => {
            try {
                 const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [{ text: fullPrompt }] },
                    config: { responseModalities: [Modality.IMAGE] },
                });
                return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            } catch (e) { console.error(e); return null; }
         });
         
         const results = await Promise.all(promises);
         return results.filter(r => r !== null && r !== undefined) as string[];
    }
    
    // Mock
    await simulateDelay(null, 2000);
    return [
        "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzjDgBdQBJoGQRgFQAyiKKQAH54X0h8I3nAAAAAASUVORK5CYII=",
        "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzjDgBdQBJoGQRgFQAyiKKQAH54X0h8I3nAAAAAASUVORK5CYII=",
        "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzjDgBdQBJoGQRgFQAyiKKQAH54X0h8I3nAAAAAASUVORK5CYII=",
        "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzjDgBdQBJoGQRgFQAyiKKQAH54X0h8I3nAAAAAASUVORK5CYII="
    ];
};

// NEW: Generate a single sticker based on reference with Pose support
export const generateSingleSticker = async (base64Reference: string, emotion: string, style: string, pose?: string): Promise<string | null> => {
    if (process.env.API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Enhanced prompt for better likeness preservation + Pose
        const prompt = `
        STRICT REQUIREMENT: PRESERVE CHARACTER IDENTITY.
        
        Input: A reference image of a character.
        Task: Draw THIS EXACT CHARACTER in a new pose/emotion.
        
        Target Emotion: ${emotion}
        Target Action/Pose: ${pose || 'Dynamic pose matching the emotion'}
        Target Style: ${style}
        
        Guidelines:
        1. FACE & HAIR: You MUST keep the exact same hair color, hair style, eye shape, and skin tone as the reference.
        2. OUTFIT: Keep the same clothing design and colors.
        3. POSE: The character must be full body or 3/4 body. Ensure dynamic body language that matches "${pose}".
        4. STICKER FORMAT: The result must be a die-cut sticker with a thick white border on a pure white background.
        5. QUALITY: Clean lines, high contrast.
        
        Do not change the character's species, gender, or main features. Only change the expression and body language.
        `;
            
        try {
            const parts: any[] = [
                { inlineData: { data: base64Reference, mimeType: 'image/png' } },
                { text: prompt }
            ];

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts },
                config: { responseModalities: [Modality.IMAGE] },
            });

            return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
        } catch (e) {
            console.error(e);
            return null;
        }
    }
    await simulateDelay(null, 1000);
    return base64Reference; // Mock return original
};


export const generateStickerPackInStyle = async (base64Image: string, style: string, theme: string, count: number): Promise<string[]> => {
    // This function is kept for backward compatibility or bulk generation if needed,
    // but the UI now largely uses generateSingleSticker in a loop.
    const generatedImages: string[] = [];
    const iterations = Math.ceil(count / 2);
    
    if (process.env.API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const allEmotions = ["Happy", "Sad", "Angry", "Surprised", "Thinking", "Tired", "Laughing", "Confused", "Cool", "In Love", "Scared", "Determined"];
        
        for (let i = 0; i < iterations; i++) {
            try {
                const emotion1 = allEmotions[(i * 2) % allEmotions.length];
                const emotion2 = allEmotions[(i * 2 + 1) % allEmotions.length];
                
                const prompt = `
                    Create a digital sticker sheet with exactly 2 stickers based on the character in the input image.
                    Style: ${style}.
                    Theme: ${theme}.
                    Sticker 1 Emotion/Action: ${emotion1}.
                    Sticker 2 Emotion/Action: ${emotion2}.
                    Requirements: White background, Distinct thick outlines.
                `;

                const parts: any[] = [
                    { inlineData: { data: base64Image, mimeType: 'image/png' } },
                    { text: prompt }
                ];

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts },
                    config: { responseModalities: [Modality.IMAGE] },
                });

                const newImage = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                if (newImage) {
                    generatedImages.push(newImage);
                }
            } catch (error) {
                console.error(`Error generating sticker batch ${i+1}:`, error);
            }
        }
    } else {
        await simulateDelay(null, 2000);
        for(let i=0; i<iterations; i++) {
             generatedImages.push(base64Image); 
        }
    }
    return generatedImages;
};

export const runAgentCouncil = async (userPrompt: string): Promise<CouncilMessage[]> => {
    try {
        if (process.env.API_KEY) {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
                Simulate a discussion between 3 AI agents (Architect, Critic, Coder) solving this task: "${userPrompt}".
                Return a JSON array of objects. Each object must have: 'id' (string), 'agentName' (string), 'role' (Architect|Critic|Coder|Lead), 'content' (string), 'codeSnippet' (optional string), 'isFinal' (boolean).
                The conversation should have 3-5 turns and result in a solution.
            `;
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });
            
            const text = response.text;
            if (text) {
                return JSON.parse(text);
            }
        }
    } catch(e) { console.error(e); }

    // Mock implementation for the Council if no API key
    const messages: CouncilMessage[] = [
        { id: '1', agentName: 'Architect', role: 'Architect', content: 'Analyzing request: "' + userPrompt + '". We need a scalable solution.', isFinal: false },
        { id: '2', agentName: 'Critic', role: 'Critic', content: 'Potential performance bottleneck identified in module A.', isFinal: false },
        { id: '3', agentName: 'Coder', role: 'Coder', content: 'Here is a Python draft:\n\ndef solve():\n    print("Solved")', codeSnippet: 'def solve():\n    print("Solved")', isFinal: false },
        { id: '4', agentName: 'Lead', role: 'Lead', content: 'Approved. Deploying solution.', isFinal: true }
    ];
    return simulateDelay(messages, 1000);
};

// --- SSH MOCK ---
export const connectToSSH = async (host: string, user: string): Promise<boolean> => {
    await simulateDelay(null, 2000); 
    return true;
}

export const sendSSHCommand = async (command: string, context: string[] = []): Promise<string> => {
    await simulateDelay(null, 1000);
    return `mock-output: ${command} executed successfully on remote host.`;
}

// --- STUDIO ASSISTANT WITH SEARCH ---
export const askStudioAssistant = async (prompt: string, useSearch: boolean): Promise<{text: string, sources?: {uri: string, title: string}[]}> => {
    try {
        if (process.env.API_KEY) {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    tools: useSearch ? [{googleSearch: {}}] : undefined,
                },
            });
            
            const text = response.text || "I couldn't generate a response.";
            const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
                ?.map((chunk: any) => chunk.web ? { uri: chunk.web.uri, title: chunk.web.title } : null)
                .filter((s: any) => s !== null) as {uri: string, title: string}[];
                
            return { text, sources };
        }
    } catch (e) { console.error(e); }

    await simulateDelay(null, 2000);
    
    if (useSearch) {
       return {
           text: `I found some information on the web regarding "${prompt}". Here are some design ideas... [Simulated Search Result]`,
           sources: [
               { uri: 'https://example.com/design-trends', title: '2025 Design Trends' },
               { uri: 'https://pinterest.com/stickers', title: 'Sticker Ideas on Pinterest' }
           ]
       };
    }
    
    return {
        text: `As your Studio Assistant, I suggest: "${prompt}" is a great concept. Try using high contrast colors.`
    };
}