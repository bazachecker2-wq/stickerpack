
import React, { useState, useRef, useEffect } from 'react';
import { removeBackgroundImage, generateCharacterCandidates, generateSingleSticker, stylizeImage, askStudioAssistant } from '../services/mockApi';
import PackIcon from './icons/PackIcon';
import StickerEditorModal from './StickerEditorModal';
import PaintStyleEditorModal from './PaintStyleEditorModal';
import StickerPreviewModal from './StickerPreviewModal';
import UndoIcon from './icons/UndoIcon';
import SettingsIcon from './icons/SettingsIcon';
import DownloadIcon from './icons/DownloadIcon';
import EditIcon from './icons/EditIcon';
import SendIcon from './icons/SendIcon';
import { translations } from '../utils/translations';

// Types
type WorkflowStep = 'init' | 'candidates' | 'selection' | 'pack';
type ChatContext = 'idle' | 'confirm_bg_removal' | 'choose_style' | 'confirm_pack';

interface StickerItem {
    id: string;
    url: string;
    status: 'empty' | 'pending' | 'loading' | 'done' | 'error';
    emotion: string;
    pose: string;
}

interface ChatMessage {
    sender: 'ai' | 'user' | 'system';
    text: string;
    actions?: { label: string; action: string }[];
}

interface StickerCreatorProps {
    onToggleMainSidebar?: () => void;
    language: 'ru' | 'en';
}

const StickerCreator: React.FC<StickerCreatorProps> = ({ onToggleMainSidebar, language }) => {
    const t = translations[language];
    const tc = t.sticker_creator;
    const comm = t.common;

    // --- STATE ---
    const [processedImage, setProcessedImage] = useState<string | null>(null); 
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
    
    // Workflow
    const [step, setStep] = useState<WorkflowStep>('init');
    const [characterPrompt, setCharacterPrompt] = useState('');
    const [candidateImages, setCandidateImages] = useState<string[]>([]);
    
    // Pack
    const [stickers, setStickers] = useState<StickerItem[]>([]);
    const [stickerStyle, setStickerStyle] = useState('anime');
    const [stickerCount, setStickerCount] = useState(6);
    const [editingStickerId, setEditingStickerId] = useState<string | null>(null);
    
    // UI Toggles
    const [showPreview, setShowPreview] = useState(false); 
    const [showSettingsModal, setShowSettingsModal] = useState(false); 
    const [showImageOptions, setShowImageOptions] = useState(false);
    const [showPaintEditor, setShowPaintEditor] = useState(false);
    const [creativityLevel, setCreativityLevel] = useState(40); 
    
    // Chat & AI Context
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatContext, setChatContext] = useState<ChatContext>('idle');
    
    // Loading
    const [loadingState, setLoadingState] = useState({ active: false, text: '', progress: 0 });

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const emotionPoseMap: {[key: string]: {en: string, pose: string}} = {
        "happy": { en: "Happy", pose: "Jumping with joy, arms open wide" },
        "sad": { en: "Sad", pose: "Sitting hugging knees, head down" },
        "angry": { en: "Angry", pose: "Stomping foot, fists clenched" },
        "surprised": { en: "Surprised", pose: "Hands near face, shocked" },
        "thinking": { en: "Thinking", pose: "Hand on chin, looking up" },
        "cool": { en: "Cool", pose: "Arms crossed, sunglasses gesture" },
    };
    const allEmotionKeys = Object.keys(emotionPoseMap);

    // --- EFFECTS ---
    useEffect(() => {
        if (chatMessages.length === 0) {
            setChatMessages([{ sender: 'ai', text: language === 'ru' ? 'Привет! Загрузите фото, чтобы начать.' : 'Hi! Upload a photo to start.' }]);
        }
    }, [language, chatMessages.length]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, loadingState.active]);

    useEffect(() => {
        if ((processedImage || originalImage) && canvasRef.current && step !== 'candidates') {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const scale = Math.min(canvas.width/img.width, canvas.height/img.height);
                const w = img.width * scale;
                const h = img.height * scale;
                ctx.drawImage(img, (canvas.width-w)/2, (canvas.height-h)/2, w, h);
            };
            img.src = processedImage || originalImage || '';
        }
    }, [processedImage, originalImage, step]);

    // --- HELPERS ---
    const runHeavyTask = async (taskName: string, task: (updateProgress: (val: number) => void) => Promise<void>) => {
        setLoadingState({ active: true, text: taskName, progress: 0 });
        
        // Simulating visual progress before real data
        const interval = setInterval(() => {
             setLoadingState(prev => {
                 if (prev.progress >= 85) return prev;
                 return { ...prev, progress: prev.progress + Math.floor(Math.random() * 3) + 1 };
             });
        }, 300);
        
        try {
            await task((val) => setLoadingState(prev => ({ ...prev, progress: val })));
            setLoadingState(prev => ({ ...prev, progress: 100 }));
            await new Promise(r => setTimeout(r, 600)); // Short pause at 100%
        } catch (e) {
            setChatMessages(prev => [...prev, { sender: 'system', text: `${comm.error}: ${taskName}` }]);
        } finally {
            clearInterval(interval);
            setLoadingState({ active: false, text: '', progress: 0 });
        }
    };

    const addToHistory = () => {
        if (processedImage) setCanvasHistory(prev => [...prev, processedImage]);
    };

    const handleUndoCanvas = () => {
        if (canvasHistory.length === 0) return;
        const previous = canvasHistory[canvasHistory.length - 1];
        setProcessedImage(previous);
        setCanvasHistory(prev => prev.slice(0, -1));
    };

    // --- UPLOAD & CONTEXT LOGIC ---
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const result = ev.target?.result as string;
                setProcessedImage(result);
                setOriginalImage(result);
                setCanvasHistory([]);
                setStep('selection');
                setShowImageOptions(false);
                
                // Smart Chat Trigger
                setChatContext('confirm_bg_removal');
                setChatMessages(prev => [...prev, {
                    sender: 'ai', 
                    text: language === 'ru' ? 'Фото загружено. Удалить фон?' : 'Photo uploaded. Remove background?',
                    actions: [
                        { label: language === 'ru' ? 'ДА' : 'YES', action: 'remove_bg' },
                        { label: language === 'ru' ? 'НЕТ' : 'NO', action: 'skip_bg' }
                    ]
                }]);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCanvasClick = () => {
        if (!processedImage) {
            fileInputRef.current?.click();
        } else {
            setShowImageOptions(true);
        }
    };

    // --- AI ACTION HANDLERS ---
    const handleAiAction = async (action: string, label: string) => {
        setChatMessages(prev => [...prev, { sender: 'user', text: label }]);

        switch(action) {
            case 'remove_bg':
                await handleRemoveBg();
                break;
            case 'skip_bg':
                setChatContext('choose_style');
                setChatMessages(prev => [...prev, { 
                    sender: 'ai', 
                    text: language === 'ru' ? 'Ок. Какой стиль используем?' : 'Ok. What style should we use?',
                    actions: [
                        { label: 'Anime', action: 'set_style_anime' },
                        { label: '3D Render', action: 'set_style_3d' },
                        { label: 'Pixel Art', action: 'set_style_pixel' }
                    ]
                }]);
                break;
            case 'set_style_anime':
            case 'set_style_3d':
            case 'set_style_pixel':
                const styleMap: any = { 'set_style_anime': 'anime', 'set_style_3d': '3d_render', 'set_style_pixel': 'pixel_art' };
                setStickerStyle(styleMap[action]);
                setChatContext('idle');
                setChatMessages(prev => [...prev, {
                    sender: 'ai',
                    text: language === 'ru' ? `Стиль: ${styleMap[action]}. Нажмите "Создать Пак" в настройках, когда будете готовы.` : `Style: ${styleMap[action]}. Click "Create Pack" in settings when ready.`
                }]);
                break;
        }
    };

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        const userText = chatInput.trim();
        setChatInput('');
        setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
        
        // Simple Intent Recognition
        const lower = userText.toLowerCase();
        
        if (chatContext === 'confirm_bg_removal') {
            if (['yes', 'da', 'да', 'sure'].some(w => lower.includes(w))) {
                await handleRemoveBg();
                return;
            } else if (['no', 'net', 'нет'].some(w => lower.includes(w))) {
                handleAiAction('skip_bg', 'No');
                return;
            }
        }
        
        if (lower.includes('remove') && lower.includes('bg')) {
             await handleRemoveBg();
             return;
        }

        try {
            const response = await askStudioAssistant(`Context: Sticker App. User: ${userText}`, false);
            setChatMessages(prev => [...prev, { sender: 'ai', text: response.text }]);
        } catch (err) {
            setChatMessages(prev => [...prev, { sender: 'system', text: comm.error }]);
        }
    };

    // --- CORE FUNCTIONS ---
    const handleRemoveBg = async () => {
        if (!processedImage) return;
        setShowImageOptions(false);
        addToHistory();
        setChatContext('idle'); 
        
        setLoadingState({ active: true, text: "CONNECTING...", progress: 10 });
        setChatMessages(prev => [...prev, { sender: 'system', text: 'Initializing Smart Chroma Key protocol...' }]);

        try {
            const base64 = processedImage.split(',')[1];
            
            const res = await removeBackgroundImage(
                base64, 
                'image/png', 
                (status) => {
                    setLoadingState(prev => ({ 
                        ...prev, 
                        text: status, 
                        progress: prev.progress < 90 ? prev.progress + 15 : prev.progress 
                    }));
                }
            );
            
            setProcessedImage(`data:image/png;base64,${res}`);
            setChatMessages(prev => [...prev, { 
                sender: 'ai', 
                text: language === 'ru' ? 'Фон удален (Chroma Key).' : 'Background removed (Chroma Key).'
            }]);
        } catch (e) {
            setChatMessages(prev => [...prev, { sender: 'system', text: comm.error }]);
        } finally {
            setLoadingState({ active: false, text: '', progress: 0 });
        }
    };

    const handleStylize = async () => {
        if (!processedImage) return;
        addToHistory();
        setShowSettingsModal(false); 
        await runHeavyTask(tc.btn_stylize.toUpperCase(), async () => {
            const base64 = processedImage.split(',')[1];
            const res = await stylizeImage(base64, stickerStyle, characterPrompt, creativityLevel);
            if (res) setProcessedImage(`data:image/png;base64,${res}`);
        });
    };

    const handleGenerateCandidates = async () => {
        if (!characterPrompt.trim()) return;
        setShowSettingsModal(false);
        await runHeavyTask(tc.btn_variants.toUpperCase(), async () => {
            const res = await generateCharacterCandidates(characterPrompt, stickerStyle);
            if (res.length > 0) {
                setCandidateImages(res.map(r => `data:image/png;base64,${r}`));
                setStep('candidates');
            }
        });
    };

    const handleCreatePack = async () => {
        if (!processedImage) return;
        setShowSettingsModal(false);
        setStep('pack');
        
        const newStickers: StickerItem[] = Array.from({ length: stickerCount }, (_, i) => {
            const key = allEmotionKeys[i % allEmotionKeys.length];
            return {
                id: `${Date.now()}-${i}`,
                url: '',
                status: 'pending',
                emotion: key,
                pose: emotionPoseMap[key].pose
            };
        });
        setStickers(newStickers);
        
        const base64 = processedImage.split(',')[1];
        await runHeavyTask(tc.btn_create_pack.toUpperCase(), async (updateProgress) => {
            for (let i = 0; i < newStickers.length; i++) {
                const item = newStickers[i];
                setStickers(prev => prev.map(s => s.id === item.id ? { ...s, status: 'loading' } : s));
                try {
                    const res = await generateSingleSticker(base64, emotionPoseMap[item.emotion].en, stickerStyle, item.pose);
                    setStickers(prev => prev.map(s => s.id === item.id ? { 
                        ...s, status: res ? 'done' : 'error', url: res ? `data:image/png;base64,${res}` : '' 
                    } : s));
                } catch(e) {
                    setStickers(prev => prev.map(s => s.id === item.id ? { ...s, status: 'error' } : s));
                }
                updateProgress(Math.floor(((i+1)/newStickers.length)*95));
            }
        });
        
        setChatMessages(prev => [...prev, { sender: 'ai', text: language === 'ru' ? 'Пак готов!' : 'Pack is ready!' }]);
    };
    
    // Retro Industrial Loader
    const LoaderOverlay = () => {
        const bars = 20;
        const filledBars = Math.floor((loadingState.progress / 100) * bars);
        const barString = '█'.repeat(filledBars) + '░'.repeat(bars - filledBars);
        
        return (
            <div className="absolute inset-0 z-[500] bg-white/90 flex flex-col items-center justify-center font-mono border-4 border-black">
                 <div className="bg-black text-white px-4 py-2 mb-4 text-2xl font-black animate-pulse">{loadingState.progress}%</div>
                 <div className="text-lg font-bold uppercase mb-2 text-center px-2 text-blue-600 max-w-[80%] break-words">{loadingState.text}</div>
                 <div className="text-xl font-bold tracking-widest hidden md:block">[{barString}]</div>
                 <div className="mt-4 w-64 h-4 bg-gray-200 border-2 border-black md:hidden">
                      <div className="h-full bg-black transition-all" style={{width: `${loadingState.progress}%`}}></div>
                 </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col bg-gray-100 relative overflow-hidden font-mono">
            
            {/* Top Toolbar - Retro Style */}
            <div className="h-14 bg-[#c0c0c0] flex items-center px-2 md:px-4 gap-3 shrink-0 z-20 border-b-2 border-white shadow-[0px_2px_0px_0px_#808080] justify-between">
                <div className="flex gap-2">
                    <button onClick={() => { setProcessedImage(null); setStep('init'); setStickers([]); }} className="win95-button px-2 md:px-4" title={comm.new}>
                        <PackIcon className="w-4 h-4"/> <span className="hidden md:inline ml-2">NEW</span>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="win95-button px-2 md:px-4" title={comm.open}>
                        <DownloadIcon className="w-4 h-4 rotate-180"/> <span className="hidden md:inline ml-2">OPEN</span>
                    </button>
                    <button onClick={handleUndoCanvas} disabled={canvasHistory.length === 0} className="win95-button px-2 md:px-4 disabled:opacity-50">
                        <UndoIcon className="w-4 h-4"/>
                    </button>
                </div>
                
                <button 
                    onClick={() => setShowSettingsModal(true)} 
                    className="win95-button flex items-center gap-2 font-bold uppercase px-2 md:px-4"
                >
                    <SettingsIcon className="w-4 h-4" />
                    <span className="hidden md:inline">{comm.settings}</span>
                </button>
            </div>

            {/* Main Flex Container - Column Direction Ensures No Overlap */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                
                {/* Canvas Area - Flex Grow to take available space */}
                <div className="flex-1 bg-[#808080] p-2 md:p-4 shadow-[inset_2px_2px_0px_0px_#000000] overflow-hidden flex items-center justify-center relative">
                     
                     {loadingState.active && <LoaderOverlay />}

                    {step === 'candidates' ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl h-full overflow-y-auto content-start p-2">
                            {candidateImages.map((src, i) => (
                                <div key={i} onClick={() => { setProcessedImage(src); addToHistory(); setStep('selection'); }} className="bg-white border-2 border-black p-1 cursor-pointer hover:bg-yellow-100 transition-all aspect-square flex items-center justify-center group relative shadow-hard-sm">
                                    <img src={src} className="max-w-full max-h-full object-contain" />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20">
                                        <span className="bg-black text-white px-2 py-1 text-xs font-bold">SELECT</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center max-w-4xl relative">
                             <div 
                                 onClick={handleCanvasClick}
                                 className="relative w-full h-full bg-white border-2 border-white shadow-[inset_1px_1px_0px_0px_#000000] flex items-center justify-center overflow-hidden cursor-pointer"
                             >
                                {processedImage ? (
                                    <div className="w-full h-full bg-checkerboard relative p-4 flex items-center justify-center">
                                         <canvas ref={canvasRef} width={1024} height={1024} className="max-w-full max-h-full object-contain shadow-lg"/>
                                    </div>
                                ) : (
                                    <div className="text-center flex flex-col items-center gap-4 opacity-60">
                                        <div className="w-16 h-16 border-2 border-dashed border-gray-400 flex items-center justify-center">
                                            <PackIcon className="w-8 h-8 text-gray-400"/>
                                        </div>
                                        <p className="font-bold text-xs uppercase tracking-widest text-gray-500">No Image Loaded</p>
                                        <p className="text-[10px] text-gray-400">Tap to Upload</p>
                                    </div>
                                )}
                             </div>
                        </div>
                    )}
                </div>

                {/* Sticker Strip - Fixed Height (Only if stickers exist) */}
                {stickers.length > 0 && (
                    <div className="h-24 shrink-0 bg-[#c0c0c0] border-t-2 border-white border-b-2 border-[#808080] flex items-center gap-2 px-4 overflow-x-auto z-10 no-scrollbar">
                        {stickers.map(s => (
                            <div 
                                key={s.id} 
                                onClick={() => s.status === 'done' && setEditingStickerId(s.id)}
                                className={`
                                    w-16 h-16 border-2 shrink-0 relative cursor-pointer transition-all flex items-center justify-center bg-white
                                    ${s.status === 'done' ? 'border-black shadow-hard-sm hover:translate-y-[-2px]' : 'border-gray-400 border-dashed opacity-60'}
                                `}
                            >
                                {s.status === 'done' ? (
                                    <img src={s.url} className="w-full h-full object-contain p-1"/>
                                ) : (
                                    s.status === 'loading' ? <div className="w-4 h-4 bg-black animate-spin"></div> : <span className="text-[9px] font-mono text-gray-500 uppercase rotate-45">{s.emotion}</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Chat Console - Fixed Height or Auto */}
                <div className="shrink-0 bg-[#c0c0c0] border-t-2 border-white p-2 z-30 flex flex-col gap-2 shadow-[0_-2px_0px_0px_rgba(0,0,0,0.2)]">
                    {/* Chat History */}
                    <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto px-1 bg-white border-2 border-[#808080] p-2">
                        {chatMessages.slice(-3).map((msg, i) => (
                            <div key={i} className={`flex flex-col ${msg.sender === 'ai' ? 'items-start' : 'items-end'}`}>
                                <div className={`px-2 py-1 text-xs font-mono font-bold ${msg.sender === 'ai' ? 'text-blue-800' : 'text-black'}`}>
                                    <span className="mr-1">{msg.sender === 'ai' ? 'SYS:' : '>'}</span>
                                    {msg.text}
                                </div>
                                {msg.actions && (
                                    <div className="flex gap-2 mt-1 ml-1 flex-wrap">
                                        {msg.actions.map((action, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => handleAiAction(action.action, action.label)}
                                                className="px-2 py-1 bg-yellow-300 text-black text-[10px] font-bold border border-black hover:bg-black hover:text-yellow-300 uppercase"
                                            >
                                                {action.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    
                    {/* Input */}
                    <form onSubmit={handleChatSubmit} className="flex gap-1">
                        <input 
                            type="text" 
                            value={chatInput} 
                            onChange={e => setChatInput(e.target.value)} 
                            className="flex-1 win95-text-field text-sm font-mono" 
                            placeholder={language === 'ru' ? "Введите команду..." : "Enter command..."}
                            disabled={loadingState.active}
                        />
                        <button type="submit" className="win95-button font-bold px-4">
                            SEND
                        </button>
                    </form>
                </div>

            </div>

            {/* Hidden Inputs */}
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
            
            {/* Settings Modal - Retro Style */}
            {showSettingsModal && (
                <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center backdrop-blur-[1px] p-4">
                    <div className="bg-[#c0c0c0] w-full max-w-md border-2 border-white shadow-[8px_8px_0px_0px_#000000] flex flex-col max-h-[90vh] animate-slide-up">
                        <div className="px-2 py-1 bg-[#000080] text-white flex justify-between items-center select-none shrink-0">
                            <h2 className="text-sm font-bold uppercase tracking-wide font-mono">{comm.settings}</h2>
                            <button onClick={() => setShowSettingsModal(false)} className="w-6 h-6 flex items-center justify-center bg-[#c0c0c0] text-black border border-white font-bold text-sm hover:bg-red-500 hover:text-white">X</button>
                        </div>
                        
                        <div className="p-4 space-y-4 overflow-y-auto">
                            {/* Actions First */}
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={handleRemoveBg} disabled={!processedImage} className="win95-button font-bold uppercase disabled:text-gray-500 py-3">
                                    {tc.btn_remove_bg}
                                </button>
                                <button onClick={() => { setShowSettingsModal(false); setShowPaintEditor(true); }} disabled={!processedImage} className="win95-button font-bold uppercase disabled:text-gray-500 py-3">
                                    AI EDIT
                                </button>
                            </div>

                            <fieldset className="border-2 border-white border-l-[#808080] border-t-[#808080] p-2">
                                <legend className="text-xs font-bold px-1">Style Selection</legend>
                                <div className="grid grid-cols-3 gap-1">
                                    {['anime', 'pixel_art', '3d_render', 'vector_flat', 'noir'].map(style => (
                                        <button 
                                            key={style} 
                                            onClick={() => setStickerStyle(style)}
                                            className={`p-2 text-[10px] font-bold uppercase border-2 transition-all ${stickerStyle === style ? 'border-black bg-white translate-x-[1px] translate-y-[1px]' : 'border-transparent hover:border-gray-500'}`}
                                        >
                                            {(tc.styles as any)[style] || style}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>

                            <div>
                                <label className="font-bold text-xs block mb-1 uppercase">{tc.char_desc}</label>
                                <input 
                                    type="text" 
                                    value={characterPrompt} 
                                    onChange={e => setCharacterPrompt(e.target.value)} 
                                    className="win95-text-field w-full p-2"
                                    placeholder={tc.char_placeholder}
                                />
                            </div>
                            
                            <button onClick={handleCreatePack} disabled={!processedImage} className="win95-button w-full py-3 font-black uppercase text-sm mt-2 active:translate-y-1 bg-yellow-300 hover:bg-yellow-400">
                                {tc.btn_create_pack}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            {editingStickerId && (
                <StickerEditorModal 
                    stickerData={stickers.find(s => s.id === editingStickerId)!}
                    onClose={() => setEditingStickerId(null)}
                    onSave={(id, url) => setStickers(prev => prev.map(s => s.id === id ? { ...s, url, status: 'done' } : s))}
                    language={language}
                />
            )}
            
            {showPaintEditor && processedImage && (
                <PaintStyleEditorModal
                    imageSrc={processedImage.split(',')[1]}
                    onClose={() => setShowPaintEditor(false)}
                    onSave={(newBase64) => {
                         setProcessedImage(`data:image/png;base64,${newBase64}`);
                         addToHistory();
                         setShowPaintEditor(false);
                    }}
                />
            )}
        </div>
    );
};

export default StickerCreator;
