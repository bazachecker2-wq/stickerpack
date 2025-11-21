
import React, { useState, useRef, useEffect } from 'react';
import { removeBackgroundImage, generateCharacterCandidates, generateSingleSticker, stylizeImage } from '../services/mockApi';
import PackIcon from './icons/PackIcon';
import StickerEditorModal from './StickerEditorModal';
import UndoIcon from './icons/UndoIcon';
import EyeIcon from './icons/EyeIcon';

type Tool = 'move' | 'brush' | 'eraser';
type WorkflowStep = 'init' | 'candidates' | 'selection' | 'pack';

interface StickerItem {
    id: string;
    url: string;
    status: 'empty' | 'pending' | 'loading' | 'done' | 'error';
    emotion: string;
    pose: string;
}

const StickerCreator: React.FC = () => {
    // Canvas State
    const [processedImage, setProcessedImage] = useState<string | null>(null); 
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
    const [isComparing, setIsComparing] = useState(false);
    
    // Workflow State
    const [step, setStep] = useState<WorkflowStep>('init');
    const [characterPrompt, setCharacterPrompt] = useState('');
    const [candidateImages, setCandidateImages] = useState<string[]>([]);
    
    // Sticker Pack State
    const [stickers, setStickers] = useState<StickerItem[]>([]);
    const [stickerStyle, setStickerStyle] = useState('anime');
    const [stickerCount, setStickerCount] = useState(6);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [editingStickerId, setEditingStickerId] = useState<string | null>(null);

    // Fine Tuning State
    const [showSettings, setShowSettings] = useState(false);
    const [creativityLevel, setCreativityLevel] = useState(40); // 0-100
    const [styleDetails, setStyleDetails] = useState('');
    
    // AI Chat State
    const [chatMessages, setChatMessages] = useState<{sender: 'ai'|'user'|'system', text: string}[]>([]);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    
    // Mobile UI State
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(true);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Map Emotion -> Pose description for dynamic stickers
    const emotionPoseMap: {[key: string]: {en: string, pose: string}} = {
        "Счастье": { en: "Happy", pose: "Jumping with joy, arms open wide, energetic" },
        "Грусть": { en: "Sad", pose: "Sitting hugging knees, head down, looking small" },
        "Злость": { en: "Angry", pose: "Stomping foot, fists clenched, aggressive stance" },
        "Удивление": { en: "Surprised", pose: "Leaning back, hands near face, shocked posture" },
        "Задумчивость": { en: "Thinking", pose: "Hand on chin, looking up, standing still" },
        "Усталость": { en: "Tired", pose: "Slumping shoulders, dragging feet, zombie-like" },
        "Смех": { en: "Laughing", pose: "Holding stomach, leaning forward, hysterical" },
        "Смущение": { en: "Confused", pose: "Scratching head, tilting head sideways, uncertain" },
        "Крутость": { en: "Cool", pose: "Leaning against a wall, arms crossed, sunglasses gesture" },
        "Влюбленность": { en: "In Love", pose: "Floating, holding hands to heart, dreamy" },
        "Испуг": { en: "Scared", pose: "Running away, looking back, trembling" },
        "Решимость": { en: "Determined", pose: "Fist pumped in air, superhero landing or stance" }
    };

    const allEmotionsRu = Object.keys(emotionPoseMap);

    useEffect(() => {
        setChatMessages([{ sender: 'ai', text: 'Привет! Загрузите фото, примените стиль для создания базы, затем генерируйте пак.' }]);
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // Redraw canvas
    useEffect(() => {
        const imageToShow = isComparing ? originalImage : processedImage;
        
        if (imageToShow && canvasRef.current && step !== 'candidates') {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#ffffff'; // Always white bg for canvas view
                ctx.fillRect(0,0, canvas.width, canvas.height);
                const scale = Math.min(canvas.width/img.width, canvas.height/img.height);
                const w = img.width * scale;
                const h = img.height * scale;
                ctx.drawImage(img, (canvas.width-w)/2, (canvas.height-h)/2, w, h);
                
                if (isComparing) {
                     ctx.strokeStyle = 'red';
                     ctx.lineWidth = 10;
                     ctx.strokeRect(0,0, canvas.width, canvas.height);
                     ctx.font = 'bold 48px monospace';
                     ctx.fillStyle = 'red';
                     ctx.fillText('ORIGINAL', 20, 60);
                }
            };
            img.src = imageToShow;
        }
    }, [processedImage, originalImage, step, isComparing]);

    // --- History Handling ---
    const addToHistory = () => {
        if (processedImage) {
            setCanvasHistory(prev => [...prev, processedImage]);
        }
    };

    const handleUndoCanvas = () => {
        if (canvasHistory.length === 0) return;
        const previous = canvasHistory[canvasHistory.length - 1];
        setProcessedImage(previous);
        setCanvasHistory(prev => prev.slice(0, -1));
        setChatMessages(prev => [...prev, { sender: 'system', text: 'Отмена последнего действия.' }]);
    };

    // --- File Handling ---
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const result = ev.target?.result as string;
                setProcessedImage(result);
                setOriginalImage(result); // Keep original safe
                setCanvasHistory([]); // Reset history on new file
                setStep('selection');
                setChatMessages(prev => [...prev, { sender: 'system', text: 'Изображение загружено. Рекомендую сначала нажать "СТИЛИЗАЦИЯ".' }]);
                // On mobile, auto open menu to show next steps
                if (window.innerWidth < 768) setIsMobileMenuOpen(true);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleNewCanvas = () => {
         setProcessedImage(null);
         setOriginalImage(null);
         setCanvasHistory([]);
         setStep('init');
         setStickers([]);
         setCandidateImages([]);
         setChatMessages(prev => [...prev, { sender: 'system', text: 'Новый проект начат.' }]);
    }

    // --- STYLIZE STEP (New) ---
    const handleStylize = async () => {
        if (!processedImage) return;
        addToHistory(); // Save state before stylizing
        
        setIsAiProcessing(true);
        setChatMessages(prev => [...prev, { sender: 'ai', text: `Применяю стиль "${stickerStyle}" (Сила: ${creativityLevel}%)...` }]);
        
        // Close mobile menu to show result
        if (window.innerWidth < 768) setIsMobileMenuOpen(false);

        try {
            const base64Data = processedImage.split(',')[1];
            const stylizedBase64 = await stylizeImage(base64Data, stickerStyle, characterPrompt || "Character portrait", creativityLevel, styleDetails);
            
            if (stylizedBase64) {
                setProcessedImage(`data:image/png;base64,${stylizedBase64}`);
                setChatMessages(prev => [...prev, { sender: 'ai', text: 'Стиль применен! Теперь база для стикеров готова.' }]);
            }
        } catch (e) {
             setChatMessages(prev => [...prev, { sender: 'system', text: 'Ошибка стилизации.' }]);
        } finally {
            setIsAiProcessing(false);
        }
    };

    // --- STEP 1: GENERATE CANDIDATES ---
    const handleGenerateCandidates = async () => {
        if (!characterPrompt.trim()) {
             setChatMessages(prev => [...prev, { sender: 'ai', text: 'Пожалуйста, опишите персонажа!' }]);
             return;
        }
        setIsAiProcessing(true);
        setChatMessages(prev => [...prev, { sender: 'ai', text: `Генерирую варианты персонажа...` }]);
        if (window.innerWidth < 768) setIsMobileMenuOpen(false);
        
        try {
            const results = await generateCharacterCandidates(characterPrompt, stickerStyle);
            if (results.length > 0) {
                setCandidateImages(results.map(r => `data:image/png;base64,${r}`));
                setStep('candidates');
                setChatMessages(prev => [...prev, { sender: 'ai', text: 'Выберите понравившийся вариант.' }]);
            }
        } catch (e) { console.error(e); } 
        finally { setIsAiProcessing(false); }
    }

    // --- STEP 2: SELECT CANDIDATE ---
    const handleSelectCandidate = (src: string) => {
        addToHistory();
        setProcessedImage(src);
        setStep('selection');
        setChatMessages(prev => [...prev, { sender: 'ai', text: 'Отлично! Теперь выберите количество стикеров и нажмите "Создать Пак".' }]);
        if (window.innerWidth < 768) setIsMobileMenuOpen(true);
    };

    // --- STEP 3: PREPARE & GENERATE PACK ---
    const handleStartPackGeneration = async () => {
        if (!processedImage) return;
        
        setStep('pack');
        setIsAiProcessing(true);
        setGenerationProgress(0);
        if (window.innerWidth < 768) setIsMobileMenuOpen(false);

        // 1. Initialize placeholders with "Pending" status
        const initialStickers: StickerItem[] = Array.from({ length: stickerCount }, (_, i) => {
            const emotionKey = allEmotionsRu[i % allEmotionsRu.length];
            return {
                id: `sticker-${Date.now()}-${i}`,
                url: '',
                status: 'pending',
                emotion: emotionKey,
                pose: emotionPoseMap[emotionKey].pose
            };
        });
        setStickers(initialStickers);
        
        const base64Data = processedImage.split(',')[1];

        // 2. Process sequentially
        for (let i = 0; i < initialStickers.length; i++) {
            const item = initialStickers[i];
            
            // Update current to loading
            setStickers(prev => prev.map(s => s.id === item.id ? { ...s, status: 'loading' } : s));
            
            try {
                // Use the English prompt for the emotion AND POSE
                const emotionPrompt = emotionPoseMap[item.emotion].en;
                const posePrompt = item.pose;

                const res = await generateSingleSticker(base64Data, emotionPrompt, stickerStyle, posePrompt);
                
                setStickers(prev => prev.map(s => s.id === item.id ? { 
                    ...s, 
                    status: res ? 'done' : 'error',
                    url: res ? `data:image/png;base64,${res}` : ''
                } : s));
            } catch (e) {
                 setStickers(prev => prev.map(s => s.id === item.id ? { ...s, status: 'error' } : s));
            }

            // Update Progress
            setGenerationProgress(Math.round(((i + 1) / initialStickers.length) * 100));
        }
        
        setIsAiProcessing(false);
        setChatMessages(prev => [...prev, { sender: 'ai', text: 'Генерация завершена. Нажмите на стикер для детального редактирования.' }]);
    };

    const handleRegenerateSingle = async (id: string) => {
        const sticker = stickers.find(s => s.id === id);
        if (!sticker || !processedImage) return;

        setStickers(prev => prev.map(s => s.id === id ? { ...s, status: 'loading' } : s));
        
        try {
            const base64Data = processedImage.split(',')[1];
            const emotionPrompt = emotionPoseMap[sticker.emotion]?.en || sticker.emotion;
            const posePrompt = sticker.pose; // Use existing pose or logic from map
            
            const res = await generateSingleSticker(base64Data, emotionPrompt, stickerStyle, posePrompt);
            setStickers(prev => prev.map(s => s.id === id ? { 
                ...s, 
                status: res ? 'done' : 'error',
                url: res ? `data:image/png;base64,${res}` : ''
            } : s));
        } catch (e) {
            setStickers(prev => prev.map(s => s.id === id ? { ...s, status: 'error' } : s));
        }
    }

    const handleEmotionChange = (id: string, newEmotion: string) => {
        // Update both emotion and the corresponding pose
        setStickers(prev => prev.map(s => s.id === id ? { 
            ...s, 
            emotion: newEmotion,
            pose: emotionPoseMap[newEmotion].pose 
        } : s));
    };

    const handleSaveEditedSticker = (id: string, newUrl: string) => {
        setStickers(prev => prev.map(s => s.id === id ? { ...s, url: newUrl } : s));
    };

    // --- Helpers ---
    const handleRemoveBackground = async () => {
         if (!processedImage) return;
         addToHistory();
         setIsAiProcessing(true);
         setChatMessages(prev => [...prev, { sender: 'ai', text: 'Удаляю фон...' }]);
         try {
            const mimeType = 'image/png';
            const base64Data = processedImage.split(',')[1];
            const resultBase64 = await removeBackgroundImage(base64Data, mimeType);
            setProcessedImage(`data:image/png;base64,${resultBase64}`);
            setChatMessages(prev => [...prev, { sender: 'ai', text: 'Фон удален.' }]);
         } catch(e) { console.error(e); }
         setIsAiProcessing(false);
    }

    const TopBarButton: React.FC<{ onClick: () => void, label: string, primary?: boolean }> = ({ onClick, label, primary }) => (
        <button 
            onClick={onClick}
            className={`px-3 py-2 md:py-1 font-bold uppercase text-[10px] md:text-xs border-2 border-black transition-all shadow-[2px_2px_0px_black] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${primary ? 'bg-black text-white hover:bg-gray-800' : 'bg-white text-black hover:bg-gray-100'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="flex flex-col h-full bg-white border-2 border-black shadow-none md:shadow-[8px_8px_0px_black] m-0 md:m-0 overflow-hidden">
            {/* TOP BAR */}
            <div className="h-14 bg-white border-b-2 border-black flex items-center justify-between px-3 shrink-0 z-20 relative">
                <div className="flex gap-2 items-center">
                    <TopBarButton onClick={handleNewCanvas} label="Новый" />
                    <TopBarButton onClick={() => fileInputRef.current?.click()} label="Открыть" />
                    <button 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden px-3 py-2 font-bold uppercase text-[10px] border-2 border-black bg-yellow-300 ml-1 active:translate-y-0.5"
                    >
                        {isMobileMenuOpen ? 'СКРЫТЬ МЕНЮ' : 'НАСТРОЙКИ'}
                    </button>
                </div>
                {step === 'pack' && isAiProcessing && (
                     <div className="flex-1 mx-2 md:mx-8 max-w-md flex flex-col justify-center">
                        <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                            <span className="hidden md:inline">Создание пака...</span>
                            <span className="md:hidden">Генерация...</span>
                            <span>{generationProgress}%</span>
                        </div>
                        <div className="w-full h-2 md:h-3 border-2 border-black p-0.5">
                            <div className="h-full bg-black transition-all duration-300" style={{width: `${generationProgress}%`}}></div>
                        </div>
                     </div>
                )}
                <div className="hidden md:block font-mono text-xs font-bold bg-black text-white px-2 py-1 border-2 border-transparent">
                    ЭТАП: {step === 'init' ? 'НАЧАЛО' : step === 'candidates' ? 'ВЫБОР' : 'ПАК'}
                </div>
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative">
                
                {/* RIGHT SIDEBAR (Control Panel) */}
                <div className={`
                    w-full md:w-72 bg-white border-b-2 md:border-b-0 md:border-l-2 border-black flex flex-col shrink-0 z-30 
                    shadow-lg md:shadow-none order-1 md:order-2 
                    transition-all duration-300 ease-in-out
                    ${isMobileMenuOpen ? 'max-h-[50vh] border-b-2' : 'max-h-0 border-b-0'} 
                    md:max-h-none overflow-hidden md:overflow-y-auto
                `}>
                    <div className="flex flex-col bg-yellow-50 min-h-full overflow-y-auto">
                        <div className="bg-black text-white p-2 font-bold text-xs uppercase border-b-2 border-white tracking-wider flex items-center justify-between sticky top-0 z-10">
                            <div className="flex items-center gap-2">
                                <PackIcon className="w-4 h-4"/>
                                НАСТРОЙКИ
                            </div>
                        </div>
                        <div className="p-3 md:p-4 space-y-4">
                            <div className={step === 'init' ? '' : 'opacity-50 pointer-events-none md:pointer-events-auto md:opacity-100'}>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] font-bold uppercase">1. Стиль</label>
                                    <button onClick={() => setShowSettings(!showSettings)} className="text-[9px] underline font-bold">
                                        {showSettings ? '- СКРЫТЬ' : '+ ТОНКАЯ НАСТРОЙКА'}
                                    </button>
                                </div>
                                
                                <select value={stickerStyle} onChange={(e) => setStickerStyle(e.target.value)} className="input-field text-xs py-1 mb-2">
                                    <option value="anime">Аниме</option>
                                    <option value="pixel_art">Пиксель-арт</option>
                                    <option value="vector_flat">Вектор</option>
                                    <option value="3d_render">3D Рендер</option>
                                    <option value="comic_noir">Нуар</option>
                                </select>

                                {/* FINE TUNING MENU */}
                                {showSettings && (
                                    <div className="mb-4 p-2 border-2 border-black bg-white shadow-[2px_2px_0px_black]">
                                        <div className="mb-2">
                                            <label className="text-[9px] font-bold uppercase flex justify-between">
                                                <span>Сила изменений</span>
                                                <span>{creativityLevel}%</span>
                                            </label>
                                            <input 
                                                type="range" min="0" max="100" step="10"
                                                value={creativityLevel} 
                                                onChange={(e) => setCreativityLevel(Number(e.target.value))}
                                                className="w-full h-1 bg-gray-300 rounded-none accent-black mt-1"
                                            />
                                            <div className="flex justify-between text-[8px] text-gray-500 font-bold">
                                                <span>Строго</span>
                                                <span>Креативно</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-bold uppercase block mb-1">Детали стиля</label>
                                            <input 
                                                type="text" 
                                                value={styleDetails}
                                                onChange={(e) => setStyleDetails(e.target.value)}
                                                placeholder="Напр: киберпанк очки, шрам..."
                                                className="input-field text-[10px] py-1 w-full"
                                            />
                                        </div>
                                    </div>
                                )}

                                <label className="text-[10px] font-bold uppercase block mb-1">2. Описание персонажа</label>
                                <div className="flex flex-col gap-2">
                                    <input 
                                        type="text" 
                                        value={characterPrompt} 
                                        onChange={(e) => setCharacterPrompt(e.target.value)}
                                        className="input-field text-xs py-1 flex-1"
                                        placeholder="напр. Кот в очках"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={handleStylize} disabled={!processedImage || isAiProcessing} className="button flex-1 text-[10px] py-2 font-bold bg-white hover:bg-gray-100 border-black">
                                            СТИЛИЗАЦИЯ
                                        </button>
                                        <button onClick={handleGenerateCandidates} disabled={isAiProcessing} className="button flex-1 text-[10px] py-2 font-bold bg-black text-white hover:bg-gray-800">
                                            ВАРИАНТЫ
                                        </button>
                                    </div>
                                </div>
                            </div>

                             <div className={`pt-2 md:pt-4 md:border-t-2 border-black border-dashed ${step === 'selection' || step === 'pack' ? '' : 'opacity-50 pointer-events-none'}`}>
                                <label className="text-[10px] font-bold uppercase block mb-1">3. Размер Пака ({stickerCount})</label>
                                <input 
                                    type="range" min="1" max="12" step="1"
                                    value={stickerCount} onChange={(e) => setStickerCount(Number(e.target.value))}
                                    className="w-full accent-black h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex gap-2 mt-2">
                                    <button onClick={handleRemoveBackground} className="button flex-1 text-[10px] py-2 px-1 font-bold bg-white border-black hover:bg-gray-100">
                                        ФОН
                                    </button>
                                    <button onClick={handleStartPackGeneration} disabled={isAiProcessing} className="button flex-1 text-[10px] py-2 px-1 font-bold bg-black text-white hover:bg-gray-800 border-black">
                                        СОЗДАТЬ ПАК
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        {/* AI LOG */}
                        <div className="flex-1 flex flex-col bg-white border-t-2 border-black">
                             <div className="bg-black text-white p-2 font-bold text-xs uppercase">ЖУРНАЛ AI</div>
                             <div className="flex-1 p-3 overflow-y-auto space-y-2 font-mono text-[10px] bg-[#f0f0f0] min-h-[100px]">
                                {chatMessages.map((msg, i) => (
                                    <div key={i} className={`p-1 border border-black ${msg.sender === 'ai' ? 'bg-white' : 'bg-yellow-200 ml-auto'}`}>
                                        {msg.text}
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                             </div>
                        </div>
                    </div>
                </div>

                {/* MAIN WORKSPACE */}
                <div className="flex-1 bg-[#e0e0e0] overflow-auto relative flex flex-col items-center p-2 md:p-4 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzjDgBdQBJoGQRgFQAyiKKQAH54X0h8I3nAAAAAASUVORK5CYII=')] order-2 md:order-1">
                    
                    {/* CANDIDATES VIEW */}
                    {step === 'candidates' && (
                         <div className="grid grid-cols-2 gap-2 md:gap-4 max-w-2xl w-full my-auto">
                             {candidateImages.map((src, idx) => (
                                 <div key={idx} onClick={() => handleSelectCandidate(src)} className="border-4 border-black bg-white hover:scale-105 transition-transform cursor-pointer relative group">
                                     <img src={src} className="w-full h-48 md:h-64 object-contain" />
                                     <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center">
                                         <span className="opacity-100 md:opacity-0 group-hover:opacity-100 bg-black text-white px-2 py-1 font-bold text-xs md:text-base">ВЫБРАТЬ</span>
                                     </div>
                                 </div>
                             ))}
                         </div>
                    )}

                    {/* EDITOR / PACK VIEW */}
                    {(step === 'init' || step === 'selection' || step === 'pack') && (
                        <div className="w-full max-w-4xl flex flex-col gap-4 md:gap-8 items-center pb-20 md:pb-10">
                            {/* Reference Canvas */}
                            <div className={`bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)] md:shadow-[8px_8px_0px_rgba(0,0,0,1)] border-2 border-black relative shrink-0 transition-all ${step === 'pack' ? 'w-48 h-48 md:w-64 md:h-64' : 'w-full max-w-[600px] aspect-square'}`}>
                                <div className="absolute top-0 left-0 w-full flex justify-between p-2 pointer-events-none z-10">
                                    <div className="pointer-events-auto flex gap-2">
                                        {/* Undo Button */}
                                        <button 
                                            onClick={handleUndoCanvas} 
                                            disabled={canvasHistory.length === 0}
                                            className={`bg-white border-2 border-black p-1.5 shadow-[2px_2px_0px_black] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${canvasHistory.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                                            title="Назад (Undo)"
                                        >
                                            <UndoIcon className="w-5 h-5" />
                                        </button>
                                        {/* Compare Button */}
                                         <button 
                                            onMouseDown={() => setIsComparing(true)}
                                            onMouseUp={() => setIsComparing(false)}
                                            onMouseLeave={() => setIsComparing(false)}
                                            onTouchStart={() => setIsComparing(true)}
                                            onTouchEnd={() => setIsComparing(false)}
                                            disabled={!originalImage}
                                            className={`bg-white border-2 border-black p-1.5 shadow-[2px_2px_0px_black] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${!originalImage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 active:bg-yellow-200'}`}
                                            title="Удерживайте для сравнения с оригиналом"
                                        >
                                            <EyeIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <canvas 
                                    ref={canvasRef}
                                    width={1024}
                                    height={1024}
                                    className="w-full h-full object-contain block"
                                />
                                {!processedImage && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
                                        <div className="text-center p-4 bg-white/50">
                                            <h3 className="text-sm md:text-lg font-black uppercase">НЕТ ИЗОБРАЖЕНИЯ</h3>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Sticker Grid */}
                            {stickers.length > 0 && (
                                <div className="w-full">
                                    <div className="flex justify-center md:justify-start">
                                        <h3 className="font-bold bg-black text-white inline-block px-2 py-1 mb-2 border-2 border-white shadow-[4px_4px_0px_black] text-xs md:text-sm">ПРЕДПРОСМОТР ПАКА</h3>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                                        {stickers.map((item, idx) => (
                                            <div key={item.id} className="flex flex-col gap-2">
                                                <div 
                                                    className="bg-white border-2 border-black shadow-[4px_4px_0px_black] aspect-square relative group cursor-pointer active:scale-95 transition-transform"
                                                    onClick={() => item.status === 'done' && setEditingStickerId(item.id)}
                                                >
                                                    {item.status === 'loading' ? (
                                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                                                            <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mb-2"></div>
                                                            <span className="font-bold text-[10px] uppercase">Генерация...</span>
                                                        </div>
                                                    ) : item.status === 'pending' ? (
                                                        <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 font-bold text-[10px] uppercase">
                                                            Очередь...
                                                        </div>
                                                    ) : item.status === 'error' ? (
                                                         <div className="w-full h-full flex items-center justify-center bg-red-100 font-bold text-[10px] text-red-600 uppercase">ОШИБКА</div>
                                                    ) : item.status === 'empty' ? (
                                                        <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300 font-bold text-2xl">?</div>
                                                    ) : (
                                                        <img src={item.url} alt={item.emotion} className="w-full h-full object-contain p-2" />
                                                    )}
                                                    
                                                    {/* Overlay Actions */}
                                                    {item.status === 'done' && (
                                                        <div className="absolute top-1 right-1">
                                                             <div className="bg-black text-white text-[8px] px-1 font-bold">РЕД.</div>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Controls under sticker */}
                                                <div className="flex flex-col gap-1">
                                                    <select 
                                                        value={item.emotion}
                                                        onChange={(e) => handleEmotionChange(item.id, e.target.value)}
                                                        className="w-full border-2 border-black text-[10px] font-bold py-1 px-1 bg-white uppercase truncate"
                                                    >
                                                        {allEmotionsRu.map(e => <option key={e} value={e}>{e}</option>)}
                                                    </select>
                                                    <button 
                                                        onClick={() => handleRegenerateSingle(item.id)}
                                                        disabled={isAiProcessing}
                                                        className="w-full bg-yellow-300 border-2 border-black text-[9px] font-bold uppercase hover:bg-yellow-400 py-1"
                                                    >
                                                        ОБНОВИТЬ
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
            
            {editingStickerId && (
                <StickerEditorModal 
                    stickerData={stickers.find(s => s.id === editingStickerId)!}
                    onClose={() => setEditingStickerId(null)}
                    onSave={handleSaveEditedSticker}
                />
            )}
        </div>
    );
};

export default StickerCreator;
