
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { removeBackgroundImage, generateSingleSticker, editImageWithAI, generateEmojiVariants, animateEmoji } from '../services/mockApi';
import PackIcon from './icons/PackIcon';
import StickerEditorModal from './StickerEditorModal';
import PaintStyleEditorModal from './PaintStyleEditorModal';
import UndoIcon from './icons/UndoIcon';
import DownloadIcon from './icons/DownloadIcon';
import CameraIcon from './icons/CameraIcon';
import AnimationIcon from './icons/AnimationIcon';
import { translations } from '../utils/translations';

// Types
type WorkflowStep = 'init' | 'candidates' | 'selection' | 'style_preview' | 'pack';

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
    imgElement: HTMLImageElement | null;
}

interface TargetProfile {
    id: string;
    name: string;
    threatLevel: string;
    species: string;
    notes: string;
    signature: number;
}

interface TrackedObject {
    id: number;
    x: number;
    y: number;
    w: number;
    h: number;
    z: number; // Depth estimation
    label: string;
    life: number;
    profileId?: string; // Linked known profile
    smoothX: number; // For stabilization
    smoothY: number; 
    smoothW: number;
    smoothH: number;
    firstSeen: number; // For typewriter effect
    rotation: number; // For reticle animation
}

interface StickerCreatorProps {
    onToggleMainSidebar?: () => void;
    language: 'ru' | 'en';
}

// --- UTILS FOR VISION ---
const calculateMotion = (prevFrame: Uint8ClampedArray, currFrame: Uint8ClampedArray, width: number, height: number) => {
    const regions: {x: number, y: number, w: number, h: number, score: number}[] = [];
    const gridSize = 30; // Smaller grid for better precision
    const threshold = 25; 

    for (let y = 0; y < height; y += gridSize) {
        for (let x = 0; x < width; x += gridSize) {
            let diff = 0;
            const i = (y * width + x) * 4;
            if (prevFrame[i]) {
                const rD = Math.abs(currFrame[i] - prevFrame[i]);
                const gD = Math.abs(currFrame[i+1] - prevFrame[i+1]);
                const bD = Math.abs(currFrame[i+2] - prevFrame[i+2]);
                diff = (rD + gD + bD) / 3;
            }
            
            if (diff > threshold) {
                regions.push({x, y, w: gridSize, h: gridSize, score: diff});
            }
        }
    }
    return regions;
};

const lerp = (start: number, end: number, t: number) => {
    return start * (1 - t) + end * t;
};

const StickerCreator: React.FC<StickerCreatorProps> = ({ onToggleMainSidebar, language }) => {
    const t = translations[language];
    const tc = t.sticker_creator;
    const comm = t.common;

    // --- STATE ---
    const [creatorMode, setCreatorMode] = useState<'sticker' | 'emoji'>('sticker');

    // Canvas State
    const [layers, setLayers] = useState<CanvasLayer[]>([]);
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    const [history, setHistory] = useState<CanvasLayer[][]>([]);
    
    // Workflow
    const [step, setStep] = useState<WorkflowStep>('init');
    
    // Pack Results
    const [stickers, setStickers] = useState<StickerItem[]>([]);
    const [stickerStyle, setStickerStyle] = useState('anime');
    const [editingStickerId, setEditingStickerId] = useState<string | null>(null);
    
    // Emoji Animator State
    const [emojiPrompt, setEmojiPrompt] = useState('');
    const [emojiAction, setEmojiAction] = useState('');
    const [emojiVariants, setEmojiVariants] = useState<string[]>([]);
    const [selectedEmojiVariant, setSelectedEmojiVariant] = useState<string | null>(null);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

    // UI Toggles
    const [showPaintEditor, setShowPaintEditor] = useState(false);
    
    // YOLO / Camera / Terminator State
    const [showCamera, setShowCamera] = useState(false);
    const [knownTargets, setKnownTargets] = useState<TargetProfile[]>([
        { id: 'sarah', name: 'САРА КОННОР', threatLevel: 'ВЫСОКАЯ', species: 'ЧЕЛОВЕК', notes: 'ПРИОРИТЕТНАЯ ЦЕЛЬ', signature: 0 }
    ]);
    const [isScanning, setIsScanning] = useState(false);
    const [newTargetName, setNewTargetName] = useState('');
    
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasOverlayRef = useRef<HTMLCanvasElement>(null); 
    const processingCanvasRef = useRef<HTMLCanvasElement>(null); 
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number | null>(null);
    const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null);
    const trackedObjectsRef = useRef<TrackedObject[]>([]);
    
    const isScanningRef = useRef(false);
    const knownTargetsRef = useRef(knownTargets);

    // Chat & AI Context
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [loadingState, setLoadingState] = useState({ active: false, text: '', progress: 0 });

    // Interaction State
    const [interactionMode, setInteractionMode] = useState<'none' | 'dragging' | 'resizing'>('none');
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [initialLayerState, setInitialLayerState] = useState<{x: number, y: number, w: number, h: number} | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // --- EFFECTS ---
    useEffect(() => {
        if (chatMessages.length === 0) {
            setChatMessages([{ sender: 'ai', text: 'СИСТЕМА ГОТОВА. ЗАГРУЗИТЕ ДАННЫЕ ИЛИ АКТИВИРУЙТЕ СЕНСОРЫ.' }]);
        }
    }, [chatMessages.length]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, loadingState.active]);
    
    useEffect(() => {
        isScanningRef.current = isScanning;
        knownTargetsRef.current = knownTargets;
    }, [isScanning, knownTargets]);

    // --- VISION LOOP (SIMULATED SLAM & RECOGNITION) ---
    const visionLoop = useCallback(() => {
        if (!videoRef.current || !canvasOverlayRef.current || !processingCanvasRef.current) {
             // Retry if refs aren't ready yet (React state update lag)
             rafRef.current = requestAnimationFrame(visionLoop);
             return;
        }
        
        const video = videoRef.current;
        if (video.readyState < 2 || video.paused) {
            rafRef.current = requestAnimationFrame(visionLoop);
            return;
        }

        const overlayCtx = canvasOverlayRef.current.getContext('2d');
        const procCtx = processingCanvasRef.current.getContext('2d', { willReadFrequently: true });
        
        if (!overlayCtx || !procCtx) return;

        const width = video.videoWidth;
        const height = video.videoHeight;
        
        // Fix: Ensure non-zero dimensions before processing
        if (width === 0 || height === 0) {
             rafRef.current = requestAnimationFrame(visionLoop);
             return;
        }

        // Match canvas sizes to video
        if (canvasOverlayRef.current.width !== width) {
            canvasOverlayRef.current.width = width;
            canvasOverlayRef.current.height = height;
            processingCanvasRef.current.width = width / 6; 
            processingCanvasRef.current.height = height / 6;
        }

        // 1. Motion Detection
        procCtx.drawImage(video, 0, 0, width / 6, height / 6);
        const frameData = procCtx.getImageData(0, 0, width / 6, height / 6).data;
        
        if (prevFrameDataRef.current) {
            const motionRegions = calculateMotion(prevFrameDataRef.current, frameData, width/6, height/6);
            
            if (motionRegions.length > 0) {
                let avgX = 0, avgY = 0, count = 0;
                motionRegions.forEach(r => { avgX += r.x; avgY += r.y; count++; });
                avgX /= count; avgY /= count;

                const targetX = (avgX * 6) - 100; 
                const targetY = (avgY * 6) - 100;
                const targetW = 200 + (count * 5); 
                const targetH = 200 + (count * 5);

                if (trackedObjectsRef.current.length === 0) {
                    trackedObjectsRef.current.push({
                        id: Date.now(),
                        x: targetX, y: targetY, w: targetW, h: targetH,
                        smoothX: targetX, smoothY: targetY, smoothW: targetW, smoothH: targetH,
                        z: 1000 / targetW,
                        label: 'SCANNING...',
                        life: 60,
                        firstSeen: Date.now(),
                        rotation: 0
                    });
                } else {
                    const obj = trackedObjectsRef.current[0];
                    obj.life = 60; 
                    obj.x = targetX;
                    obj.y = targetY;
                    obj.w = targetW;
                    obj.h = targetH;
                }
            }
        }
        prevFrameDataRef.current = frameData;

        // 2. Render HUD
        overlayCtx.clearRect(0, 0, width, height);
        
        // HUD Color Palette (Terminator Red)
        const HUD_COLOR = '#FF0000';
        const HUD_TEXT_COLOR = '#FFFFFF';

        trackedObjectsRef.current.forEach((obj, idx) => {
            obj.life--;
            obj.rotation += 0.02;

            // LERP for smooth tracking
            obj.smoothX = lerp(obj.smoothX, obj.x, 0.15);
            obj.smoothY = lerp(obj.smoothY, obj.y, 0.15);
            obj.smoothW = lerp(obj.smoothW, obj.w, 0.1);
            obj.smoothH = lerp(obj.smoothH, obj.h, 0.1);
            
            const distance = Math.max(0.5, 500 / obj.smoothW);
            
            // Identify
            if (!obj.profileId) {
                if (!isScanningRef.current && Math.random() > 0.98 && knownTargetsRef.current.length > 0) {
                     const match = knownTargetsRef.current[knownTargetsRef.current.length - 1];
                     obj.profileId = match.id;
                     obj.label = match.name;
                     obj.firstSeen = Date.now(); // Reset typewriter
                }
            }

            // Style setup
            overlayCtx.strokeStyle = HUD_COLOR;
            overlayCtx.fillStyle = HUD_COLOR;
            overlayCtx.lineWidth = 2;

            const x = obj.smoothX;
            const y = obj.smoothY;
            const w = obj.smoothW;
            const h = obj.smoothH;

            // --- DRAW RETICLE ---
            const bracketLen = w / 4;
            
            // Animated Corners (Breathing)
            const breath = Math.sin(Date.now() / 200) * 5;
            const bx = x - breath; const by = y - breath;
            const bw = w + (breath*2); const bh = h + (breath*2);

            overlayCtx.beginPath();
            // Top Left
            overlayCtx.moveTo(bx, by + bracketLen); overlayCtx.lineTo(bx, by); overlayCtx.lineTo(bx + bracketLen, by);
            // Top Right
            overlayCtx.moveTo(bx + bw - bracketLen, by); overlayCtx.lineTo(bx + bw, by); overlayCtx.lineTo(bx + bw, by + bracketLen);
            // Bottom Right
            overlayCtx.moveTo(bx + bw, by + bh - bracketLen); overlayCtx.lineTo(bx + bw, by + bh); overlayCtx.lineTo(bx + bw - bracketLen, by + bh);
            // Bottom Left
            overlayCtx.moveTo(bx + bracketLen, by + bh); overlayCtx.lineTo(bx, by + bh); overlayCtx.lineTo(bx, by + bh - bracketLen);
            overlayCtx.stroke();

            // Rotating Segment (The "Eye" scan)
            overlayCtx.save();
            overlayCtx.translate(bx + bw/2, by + bh/2);
            overlayCtx.rotate(obj.rotation);
            overlayCtx.beginPath();
            overlayCtx.arc(0, 0, w/2.5, 0, Math.PI / 2);
            overlayCtx.stroke();
            overlayCtx.beginPath();
            overlayCtx.arc(0, 0, w/2.5, Math.PI, Math.PI * 1.5);
            overlayCtx.stroke();
            overlayCtx.restore();

            // --- 3D TEXT RENDERING ---
            overlayCtx.save();
            overlayCtx.translate(bx + bw + 30, by);
            
            // Scale text based on distance (simulated 3D depth)
            const textScale = Math.min(1.5, Math.max(0.6, 2 / distance));
            overlayCtx.scale(textScale, textScale);

            // Connection Line
            overlayCtx.beginPath();
            overlayCtx.moveTo(-30, 20);
            overlayCtx.lineTo(0, 0);
            overlayCtx.lineTo(150, 0);
            overlayCtx.stroke();

            // Text Setup
            overlayCtx.font = "bold 16px 'Space Mono', monospace";
            overlayCtx.fillStyle = HUD_COLOR;
            overlayCtx.shadowColor = '#000';
            overlayCtx.shadowBlur = 4;

            // Typewriter Effect Helper
            let lineY = 20;
            const drawLine = (txt: string, indent = 0) => {
                // Calculate how much of string to show based on time
                const charSpeed = 30; // ms per char
                const timeSinceStart = Date.now() - obj.firstSeen;
                const charsToShow = Math.floor(timeSinceStart / charSpeed) - (lineY / 20 * 10); // Stagger lines
                
                if (charsToShow > 0) {
                    const safeLen = Math.min(txt.length, charsToShow);
                    const sub = txt.substring(0, safeLen);
                    overlayCtx.fillText(sub, indent, lineY);
                    
                    // Cursor
                    if (safeLen < txt.length) {
                        overlayCtx.fillRect(indent + overlayCtx.measureText(sub).width + 2, lineY - 12, 8, 14);
                    }
                }
                lineY += 20;
            };

            if (obj.profileId) {
                const profile = knownTargetsRef.current.find(p => p.id === obj.profileId);
                if (profile) {
                    overlayCtx.fillStyle = HUD_TEXT_COLOR;
                    drawLine(`СУБЪЕКТ: ${profile.name}`);
                    overlayCtx.fillStyle = HUD_COLOR;
                    drawLine(`УГРОЗА: ${profile.threatLevel}`);
                    drawLine(`ВИД: ${profile.species}`);
                    drawLine(`ПРИМЕЧАНИЕ: ${profile.notes}`);
                    drawLine(`ДИСТАНЦИЯ: ${distance.toFixed(2)} М`);
                    drawLine(`ВЕРОЯТНОСТЬ: ${(90 + Math.random()*9).toFixed(1)}%`);
                }
            } else {
                overlayCtx.fillStyle = HUD_TEXT_COLOR;
                drawLine(`ЦЕЛЬ: НЕИЗВЕСТНО`);
                overlayCtx.fillStyle = HUD_COLOR;
                drawLine(`АНАЛИЗ...`);
                drawLine(`СКАНИРОВАНИЕ СЕТЧАТКИ...`);
                drawLine(`ПОИСК В БАЗЕ ДАННЫХ...`);
                drawLine(`ДИСТАНЦИЯ: ${distance.toFixed(2)} М`);
            }

            overlayCtx.restore();
        });

        trackedObjectsRef.current = trackedObjectsRef.current.filter(o => o.life > 0);
        rafRef.current = requestAnimationFrame(visionLoop);
    }, []);

    // Callback Ref to reliably attach stream
    const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
        videoRef.current = node;
        if (node && streamRef.current) {
            node.srcObject = streamRef.current;
            node.play().catch(e => console.log("Autoplay blocked/handled", e));
        }
    }, []);

    // Canvas Render Loop (Sticker Mode)
    useEffect(() => {
        if (!canvasRef.current || (step !== 'selection' && step !== 'init')) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

        sortedLayers.forEach(layer => {
            if (layer.imgElement) {
                ctx.save();
                ctx.translate(layer.x + layer.width/2, layer.y + layer.height/2);
                ctx.rotate(layer.rotation * Math.PI / 180);
                ctx.drawImage(layer.imgElement, -layer.width/2, -layer.height/2, layer.width, layer.height);
                ctx.restore();

                if (layer.id === selectedLayerId) {
                    ctx.save();
                    ctx.strokeStyle = '#FFD700'; 
                    ctx.lineWidth = 3;
                    ctx.translate(layer.x + layer.width/2, layer.y + layer.height/2);
                    ctx.rotate(layer.rotation * Math.PI / 180);
                    ctx.strokeRect(-layer.width/2, -layer.height/2, layer.width, layer.height);
                    ctx.restore();
                }
            }
        });
    }, [layers, selectedLayerId, step]);

    // --- HELPERS ---
    const saveHistory = () => {
        const snapshot = layers.map(l => ({...l})); 
        setHistory(prev => [...prev, snapshot]);
    };

    const handleUndoCanvas = () => {
        if (history.length === 0) return;
        const previous = history[history.length - 1];
        setLayers(previous);
        setHistory(prev => prev.slice(0, -1));
    };

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

    // --- CAMERA & LEARNING HANDLERS ---
    const startCamera = async () => {
        try {
            // Stop any existing stream first
            stopCamera();
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment', 
                    width: { ideal: 1280 }, 
                    height: { ideal: 720 } 
                } 
            });
            
            streamRef.current = stream;
            setShowCamera(true);
            
            // Force play logic after short delay to ensure DOM element is ready
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().then(() => {
                         if (!rafRef.current) visionLoop();
                    }).catch(e => console.error("Video play error:", e));
                }
            }, 100);

            setChatMessages(prev => [...prev, { sender: 'ai', text: 'HUD: ОНЛАЙН. ВИЗУАЛЬНОЕ СЛЕЖЕНИЕ АКТИВНО.' }]);
        } catch (err) {
            console.error(err);
            setShowCamera(false);
            alert("Ошибка доступа к камере. Проверьте разрешения.");
            setChatMessages(prev => [...prev, { sender: 'system', text: 'ОШИБКА ДОСТУПА К КАМЕРЕ.' }]);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setShowCamera(false);
        setIsScanning(false);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
    };

    const handleStartLearning = () => {
        if (!newTargetName.trim()) {
            alert("ВВЕДИТЕ ОБОЗНАЧЕНИЕ ЦЕЛИ");
            return;
        }
        setIsScanning(true);
        setChatMessages(prev => [...prev, { sender: 'ai', text: `СБОР БИОМЕТРИИ: ${newTargetName}... ДЕРЖИТЕ ОБЪЕКТ В КАДРЕ.` }]);
        
        setTimeout(() => {
            const newProfile: TargetProfile = {
                id: Date.now().toString(),
                name: newTargetName.toUpperCase(),
                threatLevel: 'НИЗКАЯ', 
                species: 'ЧЕЛОВЕК',
                notes: 'НОВАЯ ЗАПИСЬ',
                signature: Math.random()
            };
            setKnownTargets(prev => [...prev, newProfile]);
            setIsScanning(false);
            setNewTargetName('');
            setChatMessages(prev => [...prev, { sender: 'ai', text: 'ПРОФИЛЬ СОХРАНЕН. СЛЕЖЕНИЕ ВКЛЮЧЕНО.' }]);
            
            if (trackedObjectsRef.current.length > 0) {
                trackedObjectsRef.current[0].profileId = newProfile.id;
                trackedObjectsRef.current[0].firstSeen = Date.now();
            }
            
        }, 3000);
    };

    const capturePhoto = () => {
        const video = videoRef.current;
        if (video && video.videoWidth > 0) {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0);
                const dataUrl = canvas.toDataURL('image/png');
                stopCamera();
                addLayer(dataUrl);
                setChatMessages(prev => [...prev, { sender: 'ai', text: 'ИЗОБРАЖЕНИЕ ЗАХВАЧЕНО.' }]);
            }
        }
    };

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
        if (layers.length === 0) return;
        const p = getCanvasPoint(e);
        
        const sorted = [...layers].sort((a, b) => b.zIndex - a.zIndex);
        for (const layer of sorted) {
            if (p.x >= layer.x && p.x <= layer.x + layer.width &&
                p.y >= layer.y && p.y <= layer.y + layer.height) {
                
                setSelectedLayerId(layer.id);
                setInteractionMode('dragging');
                setDragStart(p);
                setInitialLayerState({ x: layer.x, y: layer.y, w: layer.width, h: layer.height });
                return;
            }
        }
        setSelectedLayerId(null);
    };

    const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (interactionMode === 'none' || !selectedLayerId || !initialLayerState) return;
        e.preventDefault();
        
        const p = getCanvasPoint(e);
        const dx = p.x - dragStart.x;
        const dy = p.y - dragStart.y;

        setLayers(prev => prev.map(layer => {
            if (layer.id !== selectedLayerId) return layer;
            return {
                ...layer,
                x: initialLayerState.x + dx,
                y: initialLayerState.y + dy
            };
        }));
    };

    const handlePointerUp = () => {
        setInteractionMode('none');
    };

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
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const addLayer = (src: string) => {
        saveHistory();
        const img = new Image();
        img.src = src;
        img.onload = () => {
            const canvas = canvasRef.current;
            const baseW = canvas ? canvas.width : 1024;
            const baseH = canvas ? canvas.height : 1024;
            const scale = (baseW / 2) / Math.max(img.width, img.height);
            const w = img.width * scale;
            const h = img.height * scale;

            const newLayer: CanvasLayer = {
                id: Date.now().toString(),
                src,
                x: baseW/2 - w/2,
                y: baseH/2 - h/2,
                width: w,
                height: h,
                rotation: 0,
                zIndex: layers.length + 1,
                imgElement: img
            };

            setLayers(prev => [...prev, newLayer]);
            setSelectedLayerId(newLayer.id);
            setStep('selection');
        };
    };

    // --- EMOJI ANIMATOR HANDLERS ---
    const handleGenerateEmojiVariants = async () => {
        if (!emojiPrompt.trim()) return;
        setLoadingState({ active: true, text: "ГЕНЕРАЦИЯ ВАРИАНТОВ...", progress: 0 });
        
        try {
            const variants = await generateEmojiVariants(emojiPrompt, stickerStyle);
            setEmojiVariants(variants.map(b64 => `data:image/png;base64,${b64}`));
            if (variants.length > 0) {
                setChatMessages(prev => [...prev, { sender: 'ai', text: 'Выберите вариант для анимации.' }]);
            }
        } catch (e) {
            console.error(e);
            setChatMessages(prev => [...prev, { sender: 'system', text: comm.error }]);
        } finally {
            setLoadingState({ active: false, text: '', progress: 0 });
        }
    };

    const handleAnimateEmoji = async () => {
        if (!selectedEmojiVariant || !emojiAction.trim()) {
             setChatMessages(prev => [...prev, { sender: 'system', text: 'Выберите изображение и опишите действие.' }]);
             return;
        }
        
        setLoadingState({ active: true, text: "РЕНДЕРИНГ ВИДЕО (VEO)...", progress: 0 });
        
        try {
             const base64 = selectedEmojiVariant.split(',')[1];
             const videoUrl = await animateEmoji(base64, emojiAction);
             setGeneratedVideoUrl(videoUrl);
             setChatMessages(prev => [...prev, { sender: 'ai', text: 'Анимация успешно создана.' }]);
        } catch (e) {
             console.error(e);
             setChatMessages(prev => [...prev, { sender: 'system', text: 'Ошибка генерации видео. Проверьте консоль.' }]);
        } finally {
             setLoadingState({ active: false, text: '', progress: 0 });
        }
    };

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        setChatMessages(prev => [...prev, { sender: 'user', text: chatInput }]);
        setChatInput('');
    };

    const LoaderOverlay = () => (
        <div className="absolute inset-0 z-[500] bg-white/90 flex flex-col items-center justify-center font-mono border-4 border-black">
             <div className="bg-black text-white px-4 py-2 mb-4 text-2xl font-black animate-pulse">{loadingState.progress}%</div>
             <div className="text-lg font-bold uppercase mb-2 text-center px-2 text-blue-600 max-w-[80%] break-words">{loadingState.text}</div>
        </div>
    );

    return (
        <div className="h-full w-full flex flex-col bg-gray-100 relative overflow-hidden font-mono">
            {/* Top Toolbar */}
            <div className="h-14 bg-[#c0c0c0] flex items-center px-2 md:px-4 gap-3 shrink-0 z-20 border-b-2 border-white shadow-[0px_2px_0px_0px_#808080] justify-between">
                <div className="flex gap-2">
                    <button onClick={() => setCreatorMode('sticker')} className={`win95-button px-2 md:px-4 ${creatorMode === 'sticker' ? 'bg-black text-white' : ''}`}>
                        <PackIcon className="w-4 h-4"/> <span className="hidden md:inline ml-2">ФОТО СТУДИЯ</span>
                    </button>
                    <button onClick={() => setCreatorMode('emoji')} className={`win95-button px-2 md:px-4 ${creatorMode === 'emoji' ? 'bg-black text-white' : ''}`}>
                        <AnimationIcon className="w-4 h-4"/> <span className="hidden md:inline ml-2">EMOJI АНИМАТОР</span>
                    </button>
                </div>
                {creatorMode === 'sticker' && (
                    <div className="flex gap-2">
                        <button onClick={() => fileInputRef.current?.click()} className="win95-button px-2"><DownloadIcon className="w-4 h-4 rotate-180"/></button>
                        <button onClick={startCamera} className="win95-button px-2"><CameraIcon className="w-4 h-4"/></button>
                        <button onClick={handleUndoCanvas} disabled={history.length === 0} className="win95-button px-2"><UndoIcon className="w-4 h-4"/></button>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative" ref={containerRef}>
                 {loadingState.active && <LoaderOverlay />}
                 
                 {/* CAMERA OVERLAY (TERMINATOR HUD RUSSIAN) */}
                 {showCamera && (
                    <div className={`absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden`}>
                        {/* Raw Video */}
                        <video ref={setVideoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" style={{ zIndex: 0, opacity: 0.6, filter: 'grayscale(100%) contrast(1.2)' }} />
                        
                        {/* HUD Canvas */}
                        <canvas ref={processingCanvasRef} className="hidden" />
                        <canvas ref={canvasOverlayRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={{ zIndex: 10 }} />
                        
                        {/* Scanline Effect */}
                        <div className="absolute inset-0 pointer-events-none z-[5] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(255,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,0,0,0.02),rgba(255,0,0,0.06))] bg-[length:100%_4px,3px_100%]"></div>

                        {/* UI Controls Layer */}
                        <div className="absolute inset-0 pointer-events-auto z-50 p-4 flex flex-col justify-between font-mono">
                            <div className="flex justify-between items-start">
                                <div className="bg-red-900/20 p-2 border border-red-600 text-red-500 text-xs shadow-[0_0_10px_rgba(255,0,0,0.5)] backdrop-blur-sm">
                                    <div>СИСТЕМА_ЗРЕНИЯ_V9.2</div>
                                    <div>ЦЕЛИ_В_БАЗЕ: {knownTargets.length}</div>
                                    <div className="mt-1 animate-pulse">СКАНИРОВАНИЕ...</div>
                                </div>
                                <button onClick={stopCamera} className="bg-transparent text-red-500 font-bold px-4 py-2 border-2 border-red-500 hover:bg-red-900/50">ПРЕРВАТЬ [X]</button>
                            </div>

                            {/* Learning Interface Styled for Terminator */}
                            <div className="flex flex-col items-center gap-4 mb-8 w-full max-w-md self-center pointer-events-auto">
                                {isScanning ? (
                                    <div className="text-red-500 font-black text-xl animate-pulse bg-black/80 px-4 py-2 border-2 border-red-500 tracking-widest">
                                        СБОР ДАННЫХ... {Math.floor(Math.random()*100)}%
                                    </div>
                                ) : (
                                    <div className="flex gap-2 w-full bg-black/80 p-2 border border-red-600">
                                        <input 
                                            type="text" 
                                            value={newTargetName}
                                            onChange={e => setNewTargetName(e.target.value)}
                                            placeholder="ВВЕСТИ ИМЯ ЦЕЛИ..."
                                            className="flex-1 bg-transparent border-b border-red-800 text-red-500 font-mono focus:outline-none placeholder-red-900 uppercase"
                                        />
                                        <button onClick={handleStartLearning} className="text-black bg-red-600 px-4 font-bold hover:bg-white hover:text-red-600 transition-colors uppercase text-xs tracking-wider">
                                            ОБУЧИТЬ
                                        </button>
                                    </div>
                                )}
                                
                                <button onClick={capturePhoto} className="group relative w-20 h-20 flex items-center justify-center">
                                    <div className="absolute inset-0 border-2 border-red-500 rounded-full opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all"></div>
                                    <div className="absolute inset-2 border border-red-500 rounded-full opacity-30 group-hover:rotate-90 transition-all duration-500"></div>
                                    <div className="w-14 h-14 bg-red-600/20 rounded-full flex items-center justify-center group-hover:bg-red-600/40">
                                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                 )}

                 {/* STICKER STUDIO MODE */}
                 {creatorMode === 'sticker' && (
                    <div className="flex-1 bg-[#808080] p-4 flex items-center justify-center relative">
                        <div 
                             className="relative w-full h-full border-2 border-white shadow-[inset_1px_1px_0px_0px_#000000] flex items-center justify-center overflow-hidden bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzjDgBdQBJoGQRgFQAyiKKQAH54X0h8I3nAAAAAASUVORK5CYII=')]"
                             onMouseDown={handlePointerDown}
                             onMouseMove={handlePointerMove}
                             onMouseUp={handlePointerUp}
                             onTouchStart={handlePointerDown}
                             onTouchMove={handlePointerMove}
                             onTouchEnd={handlePointerUp}
                         >
                            <canvas ref={canvasRef} width={1024} height={1024} className="max-w-full max-h-full object-contain pointer-events-none" />
                            {layers.length === 0 && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto gap-4 bg-white/80">
                                     <h3 className="font-bold text-lg">ХОЛСТ ПУСТ</h3>
                                     <button onClick={startCamera} className="win95-button px-4 py-2 bg-green-100 flex items-center gap-2">
                                         <CameraIcon className="w-4 h-4"/> ИСПОЛЬЗОВАТЬ AR СКАНЕР
                                     </button>
                                </div>
                            )}
                         </div>
                    </div>
                 )}

                 {/* EMOJI ANIMATOR MODE */}
                 {creatorMode === 'emoji' && (
                    <div className="flex-1 bg-[#e0e0e0] p-4 overflow-y-auto">
                        <div className="max-w-4xl mx-auto space-y-4">
                            {/* Generation Controls */}
                            <div className="bg-white border-2 border-black p-4 shadow-hard">
                                <h2 className="text-lg font-black mb-4 uppercase">AI EMOJI ГЕНЕРАТОР</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase block mb-1">Описание Персонажа</label>
                                        <textarea 
                                            value={emojiPrompt} 
                                            onChange={e => setEmojiPrompt(e.target.value)} 
                                            className="win95-text-field w-full h-20 resize-none"
                                            placeholder="напр., Кот в скафандре"
                                        />
                                    </div>
                                    <div>
                                         <label className="text-xs font-bold uppercase block mb-1">Анимация / Действие</label>
                                         <textarea 
                                            value={emojiAction} 
                                            onChange={e => setEmojiAction(e.target.value)} 
                                            className="win95-text-field w-full h-20 resize-none"
                                            placeholder="напр., Машет рукой приветственно"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end mt-4 gap-2">
                                    <button onClick={handleGenerateEmojiVariants} className="win95-button bg-black text-white px-6 py-2 font-bold">
                                        СОЗДАТЬ ВАРИАНТЫ (4)
                                    </button>
                                </div>
                            </div>

                            {/* Variants Grid */}
                            {emojiVariants.length > 0 && (
                                <div className="bg-white border-2 border-black p-4 shadow-hard">
                                    <h3 className="text-xs font-bold uppercase mb-2">Выберите Базовый Вариант</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {emojiVariants.map((src, idx) => (
                                            <div 
                                                key={idx} 
                                                onClick={() => setSelectedEmojiVariant(src)}
                                                className={`border-2 cursor-pointer p-1 transition-all ${selectedEmojiVariant === src ? 'border-blue-600 bg-blue-50 shadow-lg scale-105' : 'border-gray-200 hover:border-black'}`}
                                            >
                                                <img src={src} className="w-full aspect-square object-contain" alt={`Variant ${idx}`} />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-end mt-4">
                                        <button 
                                            onClick={handleAnimateEmoji} 
                                            disabled={!selectedEmojiVariant}
                                            className="win95-button bg-[#000080] text-white px-6 py-3 font-bold disabled:opacity-50"
                                        >
                                            АНИМИРОВАТЬ (VEO)
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Video Result */}
                            {generatedVideoUrl && (
                                <div className="bg-black border-4 border-yellow-400 p-4 shadow-hard flex flex-col items-center">
                                    <h3 className="text-yellow-400 font-mono font-bold mb-2 w-full">РЕНДЕРИНГ ЗАВЕРШЕН</h3>
                                    <video src={generatedVideoUrl} controls autoPlay loop className="max-w-full h-[300px] border border-white/20" />
                                    <a href={generatedVideoUrl} download className="mt-4 win95-button w-full text-center font-bold bg-yellow-400 text-black">СКАЧАТЬ MP4</a>
                                </div>
                            )}
                        </div>
                    </div>
                 )}

                {/* Chat Console (Shared) */}
                <div className="shrink-0 bg-[#c0c0c0] border-t-2 border-white p-2 z-30 flex flex-col gap-2">
                    <div className="flex flex-col gap-1 max-h-[100px] overflow-y-auto px-1 bg-white border-2 border-[#808080] p-2">
                        {chatMessages.slice(-3).map((msg, i) => (
                            <div key={i} className={`text-xs font-mono font-bold ${msg.sender === 'ai' ? 'text-blue-800' : 'text-black'}`}>
                                <span className="mr-1">{msg.sender === 'ai' ? 'SYS:' : '>'}</span>{msg.text}
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <form onSubmit={handleChatSubmit} className="flex gap-1">
                        <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} className="flex-1 win95-text-field text-sm" placeholder="Введите команду..." />
                        <button type="submit" className="win95-button font-bold px-4">ОТПР.</button>
                    </form>
                </div>
            </div>

            {/* Hidden Inputs */}
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
            
            {/* Modals */}
            {editingStickerId && <StickerEditorModal stickerData={stickers.find(s => s.id === editingStickerId)!} onClose={() => setEditingStickerId(null)} onSave={(id, url) => setStickers(prev => prev.map(s => s.id === id ? { ...s, url, status: 'done' } : s))} language={language} />}
            {showPaintEditor && selectedLayerId && <PaintStyleEditorModal imageSrc={layers.find(l => l.id === selectedLayerId)?.src.split(',')[1] || ''} onClose={() => setShowPaintEditor(false)} onSave={(newBase64) => { const newSrc = `data:image/png;base64,${newBase64}`; const img = new Image(); img.src = newSrc; img.onload = () => { setLayers(prev => prev.map(l => l.id === selectedLayerId ? { ...l, src: newSrc, imgElement: img } : l)); saveHistory(); setShowPaintEditor(false); }; }} />}
        </div>
    );
};

export default StickerCreator;
