
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

interface CanvasLayer {
    id: string;
    src: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    zIndex: number;
    imgElement: HTMLImageElement | null; // Cache for performance
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
    // Canvas State
    const [layers, setLayers] = useState<CanvasLayer[]>([]);
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    const [history, setHistory] = useState<CanvasLayer[][]>([]); // Undo history for layers
    
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
    const [showPaintEditor, setShowPaintEditor] = useState(false);
    const [creativityLevel, setCreativityLevel] = useState(40); 
    
    // Chat & AI Context
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatContext, setChatContext] = useState<ChatContext>('idle');
    
    // Loading
    const [loadingState, setLoadingState] = useState({ active: false, text: '', progress: 0 });

    // Interaction State
    const [interactionMode, setInteractionMode] = useState<'none' | 'dragging' | 'resizing'>('none');
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [initialLayerState, setInitialLayerState] = useState<{x: number, y: number, w: number, h: number} | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

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
            setChatMessages([{ sender: 'ai', text: language === 'ru' ? 'Привет! Загрузите фото или несколько для коллажа.' : 'Hi! Upload photos to start composing.' }]);
        }
    }, [language, chatMessages.length]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, loadingState.active]);

    // Canvas Render Loop
    useEffect(() => {
        if (!canvasRef.current || step === 'candidates') return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw Checkerboard (if empty or explicitly needed, usually handled by CSS bg)
        // But we rely on CSS background for the transparent look.

        // Sort layers by Z-Index
        const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

        sortedLayers.forEach(layer => {
            if (layer.imgElement) {
                ctx.save();
                ctx.translate(layer.x + layer.width/2, layer.y + layer.height/2);
                ctx.rotate(layer.rotation * Math.PI / 180);
                ctx.drawImage(
                    layer.imgElement, 
                    -layer.width/2, 
                    -layer.height/2, 
                    layer.width, 
                    layer.height
                );
                ctx.restore();

                // Draw Selection Box
                if (layer.id === selectedLayerId) {
                    ctx.save();
                    ctx.strokeStyle = '#FFD700'; // Gold selection
                    ctx.lineWidth = 3;
                    ctx.translate(layer.x + layer.width/2, layer.y + layer.height/2);
                    ctx.rotate(layer.rotation * Math.PI / 180);
                    ctx.strokeRect(-layer.width/2, -layer.height/2, layer.width, layer.height);
                    
                    // Resize Handle (Bottom Right)
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(layer.width/2 - 10, layer.height/2 - 10, 20, 20);
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(layer.width/2 - 8, layer.height/2 - 8, 16, 16);
                    
                    ctx.restore();
                }
            }
        });

        if (layers.length === 0 && step !== 'candidates') {
            // Draw placeholder text
             ctx.save();
             ctx.fillStyle = "rgba(0,0,0,0.2)";
             ctx.font = "bold 40px monospace";
             ctx.textAlign = "center";
             ctx.fillText("DROP IMAGES HERE", canvas.width/2, canvas.height/2);
             ctx.restore();
        }

    }, [layers, selectedLayerId, step]);

    // --- HELPERS ---
    const runHeavyTask = async (taskName: string, task: (updateProgress: (val: number) => void) => Promise<void>) => {
        setLoadingState({ active: true, text: taskName, progress: 0 });
        const interval = setInterval(() => {
             setLoadingState(prev => {
                 if (prev.progress >= 85) return prev;
                 return { ...prev, progress: prev.progress + Math.floor(Math.random() * 3) + 1 };
             });
        }, 300);
        try {
            await task((val) => setLoadingState(prev => ({ ...prev, progress: val })));
            setLoadingState(prev => ({ ...prev, progress: 100 }));
            await new Promise(r => setTimeout(r, 600)); 
        } catch (e) {
            setChatMessages(prev => [...prev, { sender: 'system', text: `${comm.error}: ${taskName}` }]);
        } finally {
            clearInterval(interval);
            setLoadingState({ active: false, text: '', progress: 0 });
        }
    };

    const saveHistory = () => {
        // Clone layers deep enough
        const snapshot = layers.map(l => ({...l})); 
        setHistory(prev => [...prev, snapshot]);
    };

    const handleUndoCanvas = () => {
        if (history.length === 0) return;
        const previous = history[history.length - 1];
        setLayers(previous);
        setHistory(prev => prev.slice(0, -1));
        // Need to re-attach imgElements or rely on src reloading (src is fast for base64)
        // For simplicity, we might need to trigger a reload effect, but let's try direct src usage
        // To fix "image missing" on undo, we need to ensure imgElements are rebuilt. 
        // React effect below handles imgElement creation if missing.
    };

    // Rehydrate Images on Undo/Load
    useEffect(() => {
        layers.forEach(layer => {
            if (!layer.imgElement) {
                const img = new Image();
                img.src = layer.src;
                img.onload = () => {
                    setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, imgElement: img } : l));
                };
            }
        });
    }, [layers]);

    // --- INTERACTION HANDLERS ---
    const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
        const p = getCanvasPoint(e);
        
        // Check resizing handle of selected layer first
        if (selectedLayerId) {
            const layer = layers.find(l => l.id === selectedLayerId);
            if (layer) {
                // Simple handle check: bottom right corner
                const handleSize = 40; // hitbox
                const hx = layer.x + layer.width;
                const hy = layer.y + layer.height;
                if (Math.abs(p.x - hx) < handleSize && Math.abs(p.y - hy) < handleSize) {
                    setInteractionMode('resizing');
                    setDragStart(p);
                    setInitialLayerState({ x: layer.x, y: layer.y, w: layer.width, h: layer.height });
                    saveHistory();
                    return;
                }
            }
        }

        // Check layer hits (topmost first)
        const sorted = [...layers].sort((a, b) => b.zIndex - a.zIndex);
        for (const layer of sorted) {
            if (p.x >= layer.x && p.x <= layer.x + layer.width &&
                p.y >= layer.y && p.y <= layer.y + layer.height) {
                
                setSelectedLayerId(layer.id);
                setInteractionMode('dragging');
                setDragStart(p);
                setInitialLayerState({ x: layer.x, y: layer.y, w: layer.width, h: layer.height });
                
                // Bring to front on click? Optional.
                // setLayers(prev => prev.map(l => l.id === layer.id ? {...l, zIndex: Math.max(...prev.map(z=>z.zIndex)) + 1} : l));
                return;
            }
        }

        // Clicked empty space
        setSelectedLayerId(null);
        setInteractionMode('none');
    };

    const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (interactionMode === 'none' || !selectedLayerId || !initialLayerState) return;
        e.preventDefault(); // Prevent scrolling on mobile
        
        const p = getCanvasPoint(e);
        const dx = p.x - dragStart.x;
        const dy = p.y - dragStart.y;

        setLayers(prev => prev.map(layer => {
            if (layer.id !== selectedLayerId) return layer;

            if (interactionMode === 'dragging') {
                return {
                    ...layer,
                    x: initialLayerState.x + dx,
                    y: initialLayerState.y + dy
                };
            } else if (interactionMode === 'resizing') {
                // Keep aspect ratio? Let's keep it free for now, or use shift key (hard on mobile)
                // Let's lock aspect ratio for stickers usually
                const newW = Math.max(50, initialLayerState.w + dx);
                const ratio = initialLayerState.w / initialLayerState.h;
                return {
                    ...layer,
                    width: newW,
                    height: newW / ratio
                };
            }
            return layer;
        }));
    };

    const handlePointerUp = () => {
        setInteractionMode('none');
    };

    // --- UPLOAD & ADD LAYER ---
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const result = ev.target?.result as string;
                addLayer(result);
            };
            reader.readAsDataURL(file);
        }
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const addLayer = (src: string) => {
        saveHistory();
        const img = new Image();
        img.src = src;
        img.onload = () => {
            const canvas = canvasRef.current;
            // Default size: fit to 1/2 canvas
            const baseSize = canvas ? canvas.width / 2 : 512;
            const scale = baseSize / Math.max(img.width, img.height);
            const w = img.width * scale;
            const h = img.height * scale;

            const newLayer: CanvasLayer = {
                id: Date.now().toString(),
                src,
                x: canvas ? canvas.width/2 - w/2 : 0,
                y: canvas ? canvas.height/2 - h/2 : 0,
                width: w,
                height: h,
                rotation: 0,
                zIndex: layers.length + 1,
                imgElement: img
            };

            setLayers(prev => [...prev, newLayer]);
            setSelectedLayerId(newLayer.id);
            setStep('selection');
            
            // Smart Chat Trigger if it's the first layer
            if (layers.length === 0) {
                setChatContext('confirm_bg_removal');
                setChatMessages(prev => [...prev, {
                    sender: 'ai', 
                    text: language === 'ru' ? 'Удалить фон у этого объекта?' : 'Remove background for this object?',
                    actions: [
                        { label: language === 'ru' ? 'ДА' : 'YES', action: 'remove_bg' },
                        { label: language === 'ru' ? 'НЕТ' : 'NO', action: 'skip_bg' }
                    ]
                }]);
            }
        };
    };

    // --- AI ACTION HANDLERS ---
    const handleAiAction = async (action: string, label: string) => {
        setChatMessages(prev => [...prev, { sender: 'user', text: label }]);

        switch(action) {
            case 'remove_bg':
                await handleRemoveBg();
                break;
            case 'skip_bg':
                setChatContext('idle');
                break;
            case 'set_style_anime':
            case 'set_style_3d':
            case 'set_style_pixel':
                const styleMap: any = { 'set_style_anime': 'anime', 'set_style_3d': '3d_render', 'set_style_pixel': 'pixel_art' };
                setStickerStyle(styleMap[action]);
                setChatContext('idle');
                break;
        }
    };

    // --- CORE FUNCTIONS ---
    const handleRemoveBg = async () => {
        if (!selectedLayerId) {
            setChatMessages(prev => [...prev, { sender: 'system', text: 'Select an image first.' }]);
            return;
        }
        
        const layer = layers.find(l => l.id === selectedLayerId);
        if (!layer) return;

        saveHistory();
        setLoadingState({ active: true, text: "CONNECTING...", progress: 10 });
        setChatMessages(prev => [...prev, { sender: 'system', text: 'Initializing Smart Chroma Key protocol...' }]);

        try {
            // Extract base64 from src
            const base64 = layer.src.split(',')[1];
            
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
            
            const newSrc = `data:image/png;base64,${res}`;
            
            // Update Layer
            const img = new Image();
            img.src = newSrc;
            await new Promise(r => img.onload = r);

            setLayers(prev => prev.map(l => l.id === selectedLayerId ? {
                ...l,
                src: newSrc,
                imgElement: img
            } : l));
            
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
        if (!selectedLayerId) return;
        // Logic for stylizing single layer... omitted for brevity, similar to RemoveBG
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
    
    const getComposedImage = (): string | null => {
         const canvas = canvasRef.current;
         if(!canvas) return null;
         // Deselect before capture to hide handles
         const prevSelection = selectedLayerId;
         setSelectedLayerId(null);
         
         // Wait for render cycle (hacky but necessary if using React state for canvas render)
         // Actually, we can just capture right after set, but since render is in useEffect,
         // we need to manually render for capture or wait.
         // Let's manually render just for capture to be safe.
         const ctx = canvas.getContext('2d');
         if(ctx) {
             ctx.clearRect(0, 0, canvas.width, canvas.height);
             const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex);
             sorted.forEach(l => {
                 if(l.imgElement) {
                    ctx.save();
                    ctx.translate(l.x + l.width/2, l.y + l.height/2);
                    ctx.rotate(l.rotation * Math.PI / 180);
                    ctx.drawImage(l.imgElement, -l.width/2, -l.height/2, l.width, l.height);
                    ctx.restore();
                 }
             });
         }
         
         const data = canvas.toDataURL('image/png');
         setSelectedLayerId(prevSelection);
         return data;
    }

    const handleCreatePack = async () => {
        const composed = getComposedImage();
        if (!composed) return;
        
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
        
        const base64 = composed.split(',')[1];
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
    
    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        const userText = chatInput.trim();
        setChatInput('');
        setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
        
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
                    <button onClick={() => { setLayers([]); setStep('init'); setStickers([]); }} className="win95-button px-2 md:px-4" title={comm.new}>
                        <PackIcon className="w-4 h-4"/> <span className="hidden md:inline ml-2">NEW</span>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="win95-button px-2 md:px-4" title={comm.open}>
                        <DownloadIcon className="w-4 h-4 rotate-180"/> <span className="hidden md:inline ml-2">OPEN</span>
                    </button>
                    <button onClick={handleUndoCanvas} disabled={history.length === 0} className="win95-button px-2 md:px-4 disabled:opacity-50">
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

            {/* Main Flex Container */}
            <div className="flex-1 flex flex-col overflow-hidden relative" ref={containerRef}>
                
                {/* Canvas Area */}
                <div className="flex-1 bg-[#808080] p-2 md:p-4 shadow-[inset_2px_2px_0px_0px_#000000] overflow-hidden flex items-center justify-center relative select-none">
                     
                     {loadingState.active && <LoaderOverlay />}

                    {step === 'candidates' ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl h-full overflow-y-auto content-start p-2">
                            {candidateImages.map((src, i) => (
                                <div key={i} onClick={() => { addLayer(src); setStep('selection'); }} className="bg-white border-2 border-black p-1 cursor-pointer hover:bg-yellow-100 transition-all aspect-square flex items-center justify-center group relative shadow-hard-sm">
                                    <img src={src} className="max-w-full max-h-full object-contain" />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20">
                                        <span className="bg-black text-white px-2 py-1 text-xs font-bold">ADD</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center max-w-4xl relative">
                             <div 
                                 className="relative w-full h-full bg-white border-2 border-white shadow-[inset_1px_1px_0px_0px_#000000] flex items-center justify-center overflow-hidden cursor-crosshair bg-checkerboard"
                                 onMouseDown={handlePointerDown}
                                 onMouseMove={handlePointerMove}
                                 onMouseUp={handlePointerUp}
                                 onMouseLeave={handlePointerUp}
                                 onTouchStart={handlePointerDown}
                                 onTouchMove={handlePointerMove}
                                 onTouchEnd={handlePointerUp}
                             >
                                <canvas 
                                    ref={canvasRef} 
                                    width={1024} 
                                    height={1024} 
                                    className="max-w-full max-h-full object-contain shadow-lg pointer-events-none" // Pointer events handled by parent div mapping
                                />
                                {layers.length === 0 && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-50">
                                         <PackIcon className="w-16 h-16 text-gray-400"/>
                                    </div>
                                )}
                             </div>
                        </div>
                    )}
                </div>

                {/* Sticker Strip */}
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

                {/* Chat Console */}
                <div className="shrink-0 bg-[#c0c0c0] border-t-2 border-white p-2 z-30 flex flex-col gap-2 shadow-[0_-2px_0px_0px_rgba(0,0,0,0.2)]">
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
            
            {/* Settings Modal */}
            {showSettingsModal && (
                <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center backdrop-blur-[1px] p-4">
                    <div className="bg-[#c0c0c0] w-full max-w-md border-2 border-white shadow-[8px_8px_0px_0px_#000000] flex flex-col max-h-[90vh] animate-slide-up">
                        <div className="px-2 py-1 bg-[#000080] text-white flex justify-between items-center select-none shrink-0">
                            <h2 className="text-sm font-bold uppercase tracking-wide font-mono">{comm.settings}</h2>
                            <button onClick={() => setShowSettingsModal(false)} className="w-6 h-6 flex items-center justify-center bg-[#c0c0c0] text-black border border-white font-bold text-sm hover:bg-red-500 hover:text-white">X</button>
                        </div>
                        
                        <div className="p-4 space-y-4 overflow-y-auto">
                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={handleRemoveBg} disabled={!selectedLayerId} className="win95-button font-bold uppercase disabled:text-gray-500 py-3">
                                    {tc.btn_remove_bg} (SEL)
                                </button>
                                <button onClick={() => { setShowSettingsModal(false); setShowPaintEditor(true); }} disabled={!selectedLayerId} className="win95-button font-bold uppercase disabled:text-gray-500 py-3">
                                    AI EDIT (SEL)
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
                            
                            <button onClick={handleCreatePack} disabled={layers.length === 0} className="win95-button w-full py-3 font-black uppercase text-sm mt-2 active:translate-y-1 bg-yellow-300 hover:bg-yellow-400">
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
            
            {showPaintEditor && selectedLayerId && (
                <PaintStyleEditorModal
                    imageSrc={layers.find(l => l.id === selectedLayerId)?.src.split(',')[1] || ''}
                    onClose={() => setShowPaintEditor(false)}
                    onSave={(newBase64) => {
                         const newSrc = `data:image/png;base64,${newBase64}`;
                         // Update layer
                         const img = new Image();
                         img.src = newSrc;
                         img.onload = () => {
                             setLayers(prev => prev.map(l => l.id === selectedLayerId ? { ...l, src: newSrc, imgElement: img } : l));
                             saveHistory();
                             setShowPaintEditor(false);
                         };
                    }}
                />
            )}
        </div>
    );
};

export default StickerCreator;
