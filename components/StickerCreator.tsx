
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { removeBackgroundImage, generateStickerPackFromImage, editImageWithAI, animateEmoji, stylizeImage, describeObjectInImage } from '../services/mockApi';
import { loadDetectionModel, detectObjects, DetectionResult } from '../services/detectionService';
import PackIcon from './icons/PackIcon';
import StickerEditorModal from './StickerEditorModal';
import PaintStyleEditorModal from './PaintStyleEditorModal';
import StickerPackModal from './StickerPackModal';
import UndoIcon from './icons/UndoIcon';
import DownloadIcon from './icons/DownloadIcon';
import CameraIcon from './icons/CameraIcon';
import AnimationIcon from './icons/AnimationIcon';
import { translations } from '../utils/translations';

// Types
interface StickerItem {
    id: string;
    url: string;
    status: 'empty' | 'pending' | 'loading' | 'done' | 'error';
    emotion: string;
    pose: string;
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
    class: string; // Raw class name
    score: number;
    type: 'HUMAN' | 'OBJECT' | 'WEAPON';
    life: number;
    profileId?: string; // Linked known profile
    smoothX: number; // For stabilization
    smoothY: number; 
    smoothW: number;
    smoothH: number;
    firstSeen: number; // For typewriter effect
    rotation: number; // For reticle animation
    threatScore: number; // Security mode threat level
    description?: string; // AI Generated description
    lastDescTime?: number; // Timestamp of last AI description
    isAnalyzing?: boolean; // Flag to prevent concurrent API calls
    vx: number; // Velocity X
    vy: number; // Velocity Y
    isMoving: boolean; // Motion status
}

type VisionMode = 'TERMINATOR' | 'NIGHT_VISION' | 'THERMAL' | 'MATRIX' | 'SECURITY' | 'LIDAR';

interface StickerCreatorProps {
    onToggleMainSidebar?: () => void;
    language: 'ru' | 'en';
}

const lerp = (start: number, end: number, t: number) => {
    return start * (1 - t) + end * t;
};

const StickerCreator: React.FC<StickerCreatorProps> = ({ onToggleMainSidebar, language }) => {
    const t = translations[language];
    const tc = t.sticker_creator;
    const comm = t.common;

    // --- STATE: STUDIO ---
    const [creatorMode, setCreatorMode] = useState<'sticker' | 'emoji'>('sticker');
    const [layers, setLayers] = useState<CanvasLayer[]>([]);
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    
    // Studio Controls State
    const [stickerPrompt, setStickerPrompt] = useState('');
    const [stickerStyle, setStickerStyle] = useState('anime');
    const [creativity, setCreativity] = useState(50);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStatus, setProcessingStatus] = useState('');
    
    // Modals
    const [showPaintEditor, setShowPaintEditor] = useState(false);
    const [paintImageSrc, setPaintImageSrc] = useState<string>('');
    const [generatedPack, setGeneratedPack] = useState<{ emotion: string; url: string }[]>([]);
    const [showPackModal, setShowPackModal] = useState(false);

    // --- STATE: VISION/CAMERA ---
    const [showCamera, setShowCamera] = useState(false);
    const [cameraLoading, setCameraLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState('');
    const [visionMode, setVisionMode] = useState<VisionMode>('TERMINATOR');
    const [lidarAvailable, setLidarAvailable] = useState(false);
    
    const [knownTargets, setKnownTargets] = useState<TargetProfile[]>([
        { id: 'sarah', name: 'САРА КОННОР', threatLevel: 'ВЫСОКАЯ', species: 'ЧЕЛОВЕК', notes: 'ПРИОРИТЕТНАЯ ЦЕЛЬ', signature: 0 }
    ]);
    const [isScanning, setIsScanning] = useState(false);
    const [newTargetName, setNewTargetName] = useState('');
    
    // Refs
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasOverlayRef = useRef<HTMLCanvasElement>(null); 
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number | null>(null);
    const detectionIntervalRef = useRef<any>(null);
    const trackedObjectsRef = useRef<TrackedObject[]>([]);
    
    const matrixDropsRef = useRef<number[]>([]);
    const knownTargetsRef = useRef(knownTargets);
    const visionModeRef = useRef(visionMode);
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- EFFECTS ---
    
    useEffect(() => {
        knownTargetsRef.current = knownTargets;
        visionModeRef.current = visionMode;
    }, [knownTargets, visionMode]);

    useEffect(() => {
        // Simple heuristic for "mobile" or environments that *might* have LiDAR (iPhone Pro models etc)
        // Web APIs don't expose raw LiDAR data easily yet, but we enable the mode for mobile.
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        setLidarAvailable(isMobile);
    }, []);

    // --- OBJECT DESCRIPTION LOOP ---
    useEffect(() => {
        const descInterval = setInterval(() => {
            if (!showCamera || !videoRef.current || !streamRef.current) return;
            
            const now = Date.now();
            // Iterate safely over the current ref
            trackedObjectsRef.current.forEach(async (obj) => {
                // Check if object is stable (life > 20) to avoid flickering analysis
                // Check if it's been > 60s since last update
                // Check if not already analyzing
                if (obj.life > 20 && (!obj.lastDescTime || now - obj.lastDescTime > 60000) && !obj.isAnalyzing) {
                    obj.isAnalyzing = true; 
                    
                    try {
                        const video = videoRef.current;
                        if (!video) return;
                        
                        // Create crop
                        const cvs = document.createElement('canvas');
                        // Add some padding to context
                        const padding = 50; // Give AI more context
                        const sx = Math.max(0, obj.x - padding);
                        const sy = Math.max(0, obj.y - padding);
                        const sw = Math.min(video.videoWidth - sx, obj.w + padding * 2);
                        const sh = Math.min(video.videoHeight - sy, obj.h + padding * 2);
                        
                        if (sw > 0 && sh > 0) {
                            cvs.width = sw;
                            cvs.height = sh;
                            const ctx = cvs.getContext('2d');
                            if (ctx) {
                                ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
                                const base64 = cvs.toDataURL('image/jpeg', 0.8).split(',')[1];
                                
                                // Call API
                                const desc = await describeObjectInImage(base64, obj.label);
                                if (desc) {
                                    obj.description = desc;
                                    obj.lastDescTime = Date.now();
                                }
                            }
                        }
                    } catch (e) {
                        console.error("Desc failed", e);
                    } finally {
                        obj.isAnalyzing = false;
                    }
                }
            });
        }, 1000); // Check candidates every second

        return () => clearInterval(descInterval);
    }, [showCamera]);


    // --- STUDIO FUNCTIONS ---

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    addLayer(ev.target.result as string, true); // true = auto remove bg
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const addLayer = (src: string, autoRemoveBg: boolean = false) => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
            const canvas = canvasRef.current;
            const baseW = canvas ? canvas.width : 1024;
            const baseH = canvas ? canvas.height : 1024;
            // Fit image within 50% of canvas (smaller for packs)
            const scale = Math.min((baseW * 0.5) / img.width, (baseH * 0.5) / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            
            // Random position for "scattered" look to avoid perfect stacking
            const randX = (Math.random() * 0.4 - 0.2) * baseW; 
            const randY = (Math.random() * 0.4 - 0.2) * baseH;
            
            const newLayerId = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
            const newLayer: CanvasLayer = {
                id: newLayerId, 
                src, 
                x: baseW/2 - w/2 + randX, 
                y: baseH/2 - h/2 + randY, 
                width: w, 
                height: h, 
                rotation: (Math.random() - 0.5) * 30, // Random rotation
                zIndex: 0, // Will be set correctly in setLayers
                imgElement: img
            };

            setLayers(prev => {
                const zIndex = prev.length + 1;
                return [...prev, { ...newLayer, zIndex }];
            });
            setSelectedLayerId(newLayerId);

            if (autoRemoveBg) {
                // Trigger auto background removal
                handleRemoveBgForLayer(newLayer, true);
            }
        };
    };

    const handleLayerSelect = (id: string | null) => {
        setSelectedLayerId(id);
    };

    const removeLayer = () => {
        if (selectedLayerId) {
            setLayers(prev => prev.filter(l => l.id !== selectedLayerId));
            setSelectedLayerId(null);
        }
    };

    const handleRemoveBgForLayer = async (layer: CanvasLayer, isAuto: boolean = false) => {
        setIsProcessing(true);
        setProcessingStatus(isAuto ? 'АВТО-УДАЛЕНИЕ ФОНА...' : 'УДАЛЕНИЕ ФОНА...');
        try {
            const base64 = layer.src.split(',')[1];
            const noBg = await removeBackgroundImage(base64);
            
            // Update layer source
            const newSrc = `data:image/png;base64,${noBg}`;
            const img = new Image();
            img.src = newSrc;
            img.onload = () => {
                setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, src: newSrc, imgElement: img } : l));
                setIsProcessing(false);
                setProcessingStatus('');
            };
        } catch (e) {
            console.error(e);
            setIsProcessing(false);
            setProcessingStatus('');
            if(!isAuto) alert("Ошибка удаления фона");
        }
    };

    const handleRemoveBg = async () => {
        const layer = layers.find(l => l.id === selectedLayerId);
        if (layer) handleRemoveBgForLayer(layer);
    };

    const handleStylize = async () => {
         const layer = layers.find(l => l.id === selectedLayerId);
        if (!layer) return;

        setIsProcessing(true);
        setProcessingStatus('СТИЛИЗАЦИЯ...');
        try {
            const base64 = layer.src.split(',')[1];
            const result = await stylizeImage(base64, stickerStyle, stickerPrompt || "Keep original pose", creativity);
            
             if (result) {
                const newSrc = `data:image/png;base64,${result}`;
                const img = new Image();
                img.src = newSrc;
                img.onload = () => {
                    setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, src: newSrc, imgElement: img } : l));
                    setIsProcessing(false);
                    setProcessingStatus('');
                };
             }
        } catch (e) {
             setIsProcessing(false);
             setProcessingStatus('');
        }
    };

    const openPaintEditor = () => {
        const layer = layers.find(l => l.id === selectedLayerId);
        if (!layer) return;
        let src = layer.src;
        if(src.startsWith('data:image/png;base64,data:image/png;base64,')) {
            src = src.replace('data:image/png;base64,', '');
        } else if (src.startsWith('data:image/png;base64,')) {
             src = src.replace('data:image/png;base64,', '');
        }
        setPaintImageSrc(src);
        setShowPaintEditor(true);
    };
    
    const handlePaintSave = (newImageBase64: string) => {
        if (!selectedLayerId) return;
        const newSrc = `data:image/png;base64,${newImageBase64}`;
        const img = new Image();
        img.src = newSrc;
        img.onload = () => {
            setLayers(prev => prev.map(l => l.id === selectedLayerId ? { ...l, src: newSrc, imgElement: img } : l));
            setShowPaintEditor(false);
        };
    };

    const handleCreatePack = async () => {
        const layer = layers.find(l => l.id === selectedLayerId);
        if (!layer) {
             // Fallback: Use the last layer if nothing selected
             if (layers.length > 0) {
                 // proceed with last layer
             } else {
                 return alert("Загрузите или выберите персонажа для создания пака!");
             }
        }
        
        const referenceLayer = layer || layers[layers.length - 1];
        
        setIsProcessing(true);
        setProcessingStatus('ГЕНЕРАЦИЯ ПАКА (6 ВАРИАНТОВ)...');
        try {
            // Use image-to-image generation
            const base64 = referenceLayer.src.includes(',') ? referenceLayer.src.split(',')[1] : referenceLayer.src;
            const pack = await generateStickerPackFromImage(base64, stickerStyle);
            
            if (pack && pack.length > 0) {
                setGeneratedPack(pack);
                setShowPackModal(true);
            } else {
                alert("Не удалось сгенерировать варианты.");
            }
        } catch(e) {
            console.error(e);
            alert("Ошибка при создании пака.");
        } finally {
            setIsProcessing(false);
            setProcessingStatus('');
        }
    };

    // CSS Filter based on style for Live Preview
    const getPreviewStyle = () => {
        switch(stickerStyle) {
            case 'anime': return { filter: 'saturate(1.5) contrast(1.1) brightness(1.05)' };
            case 'cyberpunk': return { filter: 'hue-rotate(-10deg) saturate(2) contrast(1.2)' };
            case 'noir': return { filter: 'grayscale(100%) contrast(1.5) brightness(0.9)' };
            case 'pixel_art': return { imageRendering: 'pixelated', filter: 'contrast(1.3)' };
            case '3d_render': return { filter: 'brightness(1.1) contrast(1.1) drop-shadow(2px 4px 6px black)' };
            default: return {};
        }
    };

    // Render Canvas
    useEffect(() => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        
        // Draw Checkerboard background
        const w = canvasRef.current.width;
        const h = canvasRef.current.height;
        ctx.clearRect(0,0,w,h);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#EEEEEE';
        for(let r=0; r<h; r+=20) {
            for(let c=0; c<w; c+=20) {
                if ((r/20 + c/20) % 2 === 0) ctx.fillRect(c, r, 20, 20);
            }
        }

        // Draw Layers
        [...layers].sort((a, b) => a.zIndex - b.zIndex).forEach(layer => {
            if (layer.imgElement) {
                ctx.save();
                ctx.translate(layer.x + layer.width/2, layer.y + layer.height/2);
                ctx.rotate(layer.rotation * Math.PI / 180);
                
                // Selection Highlight
                if (layer.id === selectedLayerId) {
                    ctx.shadowColor = '#FFD700';
                    ctx.shadowBlur = 15;
                    ctx.strokeStyle = '#FFD700';
                    ctx.lineWidth = 4;
                    ctx.strokeRect(-layer.width/2, -layer.height/2, layer.width, layer.height);
                }

                ctx.drawImage(layer.imgElement, -layer.width/2, -layer.height/2, layer.width, layer.height);
                ctx.restore();
            }
        });
    }, [layers, selectedLayerId]);


    // --- VISION / DETECTION LOGIC ---
    
    const startDetectionLoop = () => {
        if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) return;
            const predictions = await detectObjects(videoRef.current);
            const now = Date.now();
            const newTrackedObjects: TrackedObject[] = [];
            
            predictions.forEach((pred, idx) => {
                // FILTER: ONLY TRACK PEOPLE (removes static objects like furniture)
                if (pred.class !== 'person') return;

                const [x, y, w, h] = pred.bbox;
                const centerX = x + w/2;
                const centerY = y + h/2;
                
                // Track object across frames
                let matchedObj = trackedObjectsRef.current.find(existing => {
                    const exCenter = existing.smoothX + existing.smoothW/2;
                    const eyCenter = existing.smoothY + existing.smoothH/2;
                    const dist = Math.sqrt(Math.pow(centerX - exCenter, 2) + Math.pow(centerY - eyCenter, 2));
                    // Simple tracking by distance and class
                    return dist < 100 && existing.class === pred.class && existing.life > 0;
                });

                const type = 'HUMAN';
                let threatScore = 0;
                if (!matchedObj?.profileId) threatScore = 1;
                
                if (!matchedObj) {
                    matchedObj = { 
                        id: now + idx, 
                        x, y, w, h, 
                        smoothX: x, smoothY: y, smoothW: w, smoothH: h, 
                        z: 1000 / w, 
                        label: pred.label, 
                        class: pred.class, 
                        score: pred.score, 
                        type: type, 
                        life: 10, 
                        firstSeen: now, 
                        rotation: 0, 
                        threatScore,
                        vx: 0,
                        vy: 0,
                        isMoving: true
                    };
                    // Simulate identification
                    if (knownTargetsRef.current.length > 0 && Math.random() > 0.8) {
                        const profile = knownTargetsRef.current[knownTargetsRef.current.length-1];
                        matchedObj.profileId = profile.id; matchedObj.label = profile.name; matchedObj.threatScore = profile.threatLevel === 'ВЫСОКАЯ' ? 2 : 0;
                    }
                } else { 
                    // Calculate velocity
                    const dx = x - matchedObj.x;
                    const dy = y - matchedObj.y;
                    
                    matchedObj.vx = dx;
                    matchedObj.vy = dy;
                    
                    // Update movement status (simple threshold)
                    const speed = Math.sqrt(dx*dx + dy*dy);
                    matchedObj.isMoving = speed > 2;

                    matchedObj.x = x; matchedObj.y = y; matchedObj.w = w; matchedObj.h = h; 
                    matchedObj.life = Math.min(matchedObj.life + 2, 30); // Recover life
                    matchedObj.score = pred.score; 
                }
                newTrackedObjects.push(matchedObj);
            });
            
            // Degrade life of lost objects
            trackedObjectsRef.current.forEach(existing => { 
                if (!newTrackedObjects.find(n => n.id === existing.id)) { 
                    existing.life--; 
                    if (existing.life > 0) newTrackedObjects.push(existing); 
                } 
            });
            
            trackedObjectsRef.current = newTrackedObjects;
        }, 100);
    };
    
    const renderLoop = useCallback(() => {
        if (!canvasOverlayRef.current || !videoRef.current) { rafRef.current = requestAnimationFrame(renderLoop); return; }
        const overlayCtx = canvasOverlayRef.current.getContext('2d');
        const video = videoRef.current;
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (width === 0 || height === 0) { rafRef.current = requestAnimationFrame(renderLoop); return; }
        
        // Ensure overlay matches container/video size
        if (canvasOverlayRef.current.width !== width || canvasOverlayRef.current.height !== height) {
            canvasOverlayRef.current.width = width; 
            canvasOverlayRef.current.height = height;
            const columns = Math.floor(width / 20); 
            matrixDropsRef.current = Array(columns).fill(1);
        }
        
        overlayCtx?.clearRect(0, 0, width, height);
        if (!overlayCtx) return;
        const mode = visionModeRef.current;
        
        let HUD_COLOR = '#FF0000';
        let HUD_TEXT_COLOR = '#FFFFFF';
        if (mode === 'NIGHT_VISION') { HUD_COLOR = '#00FF00'; HUD_TEXT_COLOR = '#AAFFAA'; }
        if (mode === 'THERMAL') { HUD_COLOR = '#FFFF00'; HUD_TEXT_COLOR = '#FFFFFF'; }
        if (mode === 'MATRIX') { HUD_COLOR = '#00FF00'; HUD_TEXT_COLOR = '#000000'; }
        if (mode === 'SECURITY') { HUD_COLOR = '#00FFFF'; HUD_TEXT_COLOR = '#FFFFFF'; }
        if (mode === 'LIDAR') { HUD_COLOR = '#FF00FF'; HUD_TEXT_COLOR = '#FFFFFF'; }

        // --- VISION MODES EFFECTS ---

        if (mode === 'MATRIX') {
            overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            overlayCtx.fillRect(0, 0, width, height);
            overlayCtx.fillStyle = '#0F0';
            overlayCtx.font = '15px monospace';
            for (let i = 0; i < matrixDropsRef.current.length; i++) {
                const text = String.fromCharCode(0x30A0 + Math.random() * 96);
                overlayCtx.fillText(text, i * 20, matrixDropsRef.current[i] * 20);
                if (matrixDropsRef.current[i] * 20 > height && Math.random() > 0.975) {
                    matrixDropsRef.current[i] = 0;
                }
                matrixDropsRef.current[i]++;
            }
        }
        
        if (mode === 'LIDAR') {
            // Simulated LiDAR mesh logic
            overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.2)'; 
            overlayCtx.fillRect(0, 0, width, height);
            
            const gridSize = 25; // Dense grid
            const time = Date.now() / 1000;
            
            // Draw a dot grid
            for (let r = 0; r < height; r += gridSize) {
                for (let c = 0; c < width; c += gridSize) {
                    // Check if dot is inside a tracked object bounding box
                    let insideObject = false;
                    for(const obj of trackedObjectsRef.current) {
                        if (c >= obj.smoothX && c <= obj.smoothX + obj.smoothW && r >= obj.smoothY && r <= obj.smoothY + obj.smoothH) {
                            insideObject = true;
                            break;
                        }
                    }
                    
                    // Scanning wave effect
                    const dist = Math.sqrt(Math.pow(c - width/2, 2) + Math.pow(r - height/2, 2));
                    const wave = Math.sin(dist * 0.02 - time * 3);
                    
                    if (insideObject || wave > 0.8) {
                        overlayCtx.fillStyle = insideObject ? '#FF0055' : 'rgba(100, 200, 255, 0.5)';
                        const size = insideObject ? 3 : 1.5;
                        overlayCtx.beginPath();
                        overlayCtx.arc(c, r, size, 0, Math.PI * 2);
                        overlayCtx.fill();
                        
                        // Connect lines for structure illusion if inside object
                        if (insideObject && Math.random() > 0.7) {
                             overlayCtx.strokeStyle = 'rgba(255, 0, 85, 0.3)';
                             overlayCtx.lineWidth = 1;
                             overlayCtx.beginPath();
                             overlayCtx.moveTo(c, r);
                             overlayCtx.lineTo(c + gridSize, r + gridSize);
                             overlayCtx.stroke();
                        }
                    }
                }
            }
        }

        // --- OBJECT DRAWING ---

        trackedObjectsRef.current.forEach((obj) => {
            obj.rotation += 0.02;
            obj.smoothX = lerp(obj.smoothX, obj.x, 0.2);
            obj.smoothY = lerp(obj.smoothY, obj.y, 0.2);
            obj.smoothW = lerp(obj.smoothW, obj.w, 0.2);
            obj.smoothH = lerp(obj.smoothH, obj.h, 0.2);
            const distance = Math.max(0.5, 500 / obj.smoothW);
            let boxColor = HUD_COLOR;
            if (mode === 'SECURITY') { if (obj.threatScore >= 2) boxColor = '#FF0000'; else if (obj.threatScore === 1) boxColor = '#FFFF00'; else boxColor = '#00FF00'; }
            overlayCtx.strokeStyle = boxColor; overlayCtx.fillStyle = boxColor; overlayCtx.lineWidth = 2;
            const x = obj.smoothX; const y = obj.smoothY; const w = obj.smoothW; const h = obj.smoothH;
            
            if (mode !== 'MATRIX' && mode !== 'LIDAR') {
                const bracketLen = w / 4;
                overlayCtx.beginPath();
                overlayCtx.moveTo(x, y + bracketLen); overlayCtx.lineTo(x, y); overlayCtx.lineTo(x + bracketLen, y);
                overlayCtx.moveTo(x + w - bracketLen, y); overlayCtx.lineTo(x + w, y); overlayCtx.lineTo(x + w, y + bracketLen);
                overlayCtx.moveTo(x + w, y + h - bracketLen); overlayCtx.lineTo(x + w, y + h); overlayCtx.lineTo(x + w - bracketLen, y + h);
                overlayCtx.moveTo(x + bracketLen, y + h); overlayCtx.lineTo(x, y + h); overlayCtx.lineTo(x, y + h - bracketLen);
                overlayCtx.stroke();
                
                // Draw Label & Description
                overlayCtx.save();
                overlayCtx.font = "bold 14px 'Space Mono', monospace";
                overlayCtx.shadowColor = '#000'; overlayCtx.shadowBlur = 4;
                
                if (mode === 'SECURITY') {
                     const threatText = obj.threatScore >= 2 ? "HIGH" : (obj.threatScore === 1 ? "MED" : "LOW");
                     overlayCtx.fillStyle = boxColor; 
                     overlayCtx.fillText(`${obj.label} [${threatText}]`, x, y - 10);
                     
                     // Draw description if available
                     if (obj.isAnalyzing) {
                         overlayCtx.font = "bold 10px monospace";
                         overlayCtx.fillStyle = '#00FFFF';
                         overlayCtx.fillText("ANALYZING...", x, y + h + 15);
                     } else if (obj.description) {
                         overlayCtx.font = "bold 10px monospace";
                         overlayCtx.fillStyle = '#FFFFFF';
                         // Wrap text simple logic (max 20 chars per line roughly)
                         const words = obj.description.split(' ');
                         let line = '';
                         let lineY = y + h + 15;
                         for (let word of words) {
                             if ((line + word).length > 25) {
                                 overlayCtx.fillText(line, x, lineY);
                                 line = word + ' ';
                                 lineY += 12;
                             } else {
                                 line += word + ' ';
                             }
                         }
                         overlayCtx.fillText(line, x, lineY);
                     }
                } else {
                    overlayCtx.translate(x + w + 20, y);
                    overlayCtx.beginPath(); overlayCtx.moveTo(-20, 10); overlayCtx.lineTo(0,0); overlayCtx.lineTo(100,0); overlayCtx.stroke();
                    let lineY = 15;
                    const drawLine = (txt: string, color?: string) => { 
                        if(color) overlayCtx.fillStyle = color;
                        overlayCtx.fillText(txt, 0, lineY); 
                        lineY += 15; 
                    };
                    overlayCtx.fillStyle = HUD_TEXT_COLOR; 
                    drawLine(`${obj.label} [${obj.type}]`);
                    
                    // Display Motion Status
                    if (obj.isMoving) {
                        drawLine('STATUS: MOVING', '#00FF00');
                    } else {
                        drawLine('STATUS: STATIC', '#FFFF00');
                    }
                    
                    drawLine(`DIST: ${distance.toFixed(1)}m`);
                    
                    if (obj.isAnalyzing) {
                        drawLine("SCANNING...", '#00FFFF');
                    } else if (obj.description) {
                        // Draw multi-line description
                        overlayCtx.font = "10px monospace";
                        overlayCtx.fillStyle = '#FFFFFF';
                        const words = obj.description.split(' ');
                        let line = '';
                        for (let word of words) {
                            if ((line + word).length > 20) {
                                drawLine(line);
                                line = word + ' ';
                            } else {
                                line += word + ' ';
                            }
                        }
                        drawLine(line);
                    }
                }
                overlayCtx.restore();
            } else if (mode === 'LIDAR') {
                 // In LiDAR mode, just draw a bounding 3D box wireframe effect
                 overlayCtx.strokeStyle = 'rgba(255, 0, 85, 0.8)';
                 overlayCtx.lineWidth = 2;
                 overlayCtx.strokeRect(x, y, w, h);
                 overlayCtx.font = "bold 12px monospace";
                 overlayCtx.fillStyle = '#FFFFFF';
                 overlayCtx.fillText(`${(distance).toFixed(2)}m`, x, y - 5);
            }
        });
        rafRef.current = requestAnimationFrame(renderLoop);
    }, []);

    const startCamera = async () => {
        try {
            stopCamera();
            setCameraLoading(true);
            setLoadingStep('ЗАГРУЗКА МОДЕЛИ YOLO 11...');
            await loadDetectionModel();
            setLoadingStep('ИНИЦИАЛИЗАЦИЯ ОПТИКИ...');
            await new Promise(r => setTimeout(r, 500));
            // Use ideal constraints, browser handles aspect ratio
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment', 
                    width: { ideal: 1920 }, 
                    height: { ideal: 1080 } 
                } 
            });
            streamRef.current = stream;
            setShowCamera(true);
            setCameraLoading(false);
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().then(() => { if (!rafRef.current) renderLoop(); startDetectionLoop(); });
                }
            }, 100);
        } catch (err) { console.error(err); setShowCamera(false); setCameraLoading(false); alert("Ошибка доступа к камере."); }
    };

    const stopCamera = () => {
        if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
        if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        setShowCamera(false);
        setIsScanning(false);
    };

    const handleStartLearning = () => {
        if (!newTargetName.trim()) return alert("ВВЕДИТЕ ИМЯ ЦЕЛИ");
        setIsScanning(true);
        setTimeout(() => {
            const newProfile: TargetProfile = { id: Date.now().toString(), name: newTargetName.toUpperCase(), threatLevel: 'НИЗКАЯ', species: 'ЧЕЛОВЕК', notes: 'НОВАЯ ЗАПИСЬ', signature: Math.random() };
            setKnownTargets(prev => [...prev, newProfile]);
            setIsScanning(false);
            setNewTargetName('');
        }, 2000);
    };
    
    const capturePhoto = () => {
        const video = videoRef.current;
        if (video && video.videoWidth > 0) {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                if (visionMode === 'NIGHT_VISION') ctx.filter = 'sepia(1) hue-rotate(90deg) contrast(1.2)';
                if (visionMode === 'THERMAL') ctx.filter = 'invert(1) contrast(1.5) hue-rotate(180deg)';
                ctx.drawImage(video, 0, 0);
                addLayer(canvas.toDataURL('image/png'), true); // Auto BG removal on capture
                stopCamera();
            }
        }
    };
    
    const getVideoFilter = () => {
        switch(visionMode) {
            case 'NIGHT_VISION': return 'sepia(1) hue-rotate(90deg) contrast(1.5) brightness(1.2) saturate(0.8)';
            case 'THERMAL': return 'invert(1) contrast(1.5) hue-rotate(180deg)';
            case 'TERMINATOR': return 'grayscale(100%) contrast(1.2)';
            case 'SECURITY': return 'grayscale(20%) contrast(1.1)';
            default: return 'none';
        }
    };

    // --- RENDER ---

    return (
        <div className="h-full w-full flex flex-col bg-gray-100 relative overflow-hidden font-mono">
            {/* Top Toolbar */}
            <div className="h-14 bg-[#c0c0c0] flex items-center px-2 md:px-4 gap-3 shrink-0 z-20 border-b-2 border-white shadow-[0px_2px_0px_0px_#808080] justify-between">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    <button onClick={() => setCreatorMode('sticker')} className={`win95-button px-2 md:px-4 flex-shrink-0 ${creatorMode === 'sticker' ? 'bg-black text-white' : ''}`}>
                        <PackIcon className="w-4 h-4"/> <span className="hidden md:inline ml-2">ФОТО СТУДИЯ</span>
                    </button>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                    <button onClick={startCamera} className="win95-button px-2 bg-red-100 text-red-600 font-bold flex items-center gap-2">
                        <CameraIcon className="w-4 h-4"/> AR СКАНЕР
                    </button>
                </div>
            </div>

            {/* Main Content Area - Adjusted for Mobile */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                 
                 {/* CAMERA OVERLAY MODE */}
                 {cameraLoading && (
                    <div className="fixed inset-0 z-[10000] bg-black flex flex-col items-center justify-center font-mono text-red-500">
                        <div className="w-64 border border-red-500 p-1 mb-4"><div className="h-4 bg-red-500 animate-pulse" style={{width: '100%'}}></div></div>
                        <div className="text-xl font-black animate-pulse mb-2">СИСТЕМА ЗАГРУЗКИ</div>
                        <div className="text-sm font-mono text-white">{loadingStep}</div>
                    </div>
                 )}
                 
                 {showCamera && (
                    <div className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden`}>
                        {/* Video Container - uses object-cover to show full field of view without cropping issues */}
                        <div className="relative w-full h-full flex items-center justify-center">
                            <video 
                                ref={el => { videoRef.current = el }} 
                                autoPlay 
                                playsInline 
                                muted 
                                className="absolute w-full h-full object-cover" 
                                style={{ zIndex: 0, filter: getVideoFilter() }} 
                            />
                            <canvas 
                                ref={canvasOverlayRef} 
                                className="absolute w-full h-full object-cover pointer-events-none" 
                                style={{ zIndex: 10 }} 
                            />
                        </div>
                        
                        {/* Vision Effects Overlays (CSS Based) */}
                        {visionMode === 'NIGHT_VISION' && <div className="absolute inset-0 pointer-events-none z-[5] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,255,0,0.1)_50%),linear-gradient(90deg,rgba(0,255,0,0.06),rgba(0,0,0,0.02),rgba(0,255,0,0.06))] bg-[length:100%_4px,3px_100%]"></div>}
                        {visionMode === 'TERMINATOR' && <div className="absolute inset-0 pointer-events-none z-[5] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(255,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,0,0,0.02),rgba(255,0,0,0.06))] bg-[length:100%_4px,3px_100%]"></div>}

                        {/* HUD UI */}
                        <div className="absolute inset-0 pointer-events-auto z-50 p-4 flex flex-col justify-between font-mono">
                            <div className="flex justify-between items-start">
                                <div className={`p-2 border backdrop-blur-sm shadow-lg ${visionMode === 'SECURITY' ? 'bg-blue-900/50 border-cyan-400 text-cyan-400' : visionMode === 'NIGHT_VISION' ? 'bg-green-900/20 border-green-500 text-green-500' : 'bg-red-900/20 border-red-600 text-red-500'}`}>
                                    <div className="font-black text-lg">YOLO 11 VISION</div>
                                    <div className="text-xs">MODE: {visionMode}</div>
                                </div>
                                <div className="flex flex-col gap-2 items-end">
                                    <button onClick={stopCamera} className="bg-white text-black font-black px-6 py-2 border-4 border-black hover:bg-gray-200 uppercase tracking-wider shadow-[4px_4px_0px_white]">EXIT</button>
                                    <div className="flex flex-col bg-black/80 border border-white/30 p-1 gap-1 mt-2">
                                        {['TERMINATOR', 'NIGHT_VISION', 'THERMAL', 'MATRIX', 'SECURITY'].map(m => (
                                            <button key={m} onClick={() => setVisionMode(m as VisionMode)} className={`text-xs px-2 py-1 text-left ${visionMode === m ? 'bg-white text-black' : 'text-white hover:bg-white/20'}`}>{m}</button>
                                        ))}
                                        {lidarAvailable && (
                                            <button onClick={() => setVisionMode('LIDAR')} className={`text-xs px-2 py-1 text-left ${visionMode === 'LIDAR' ? 'bg-[#FF00FF] text-white font-bold' : 'text-[#FF00FF] hover:bg-white/20'}`}>LIDAR</button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-center gap-4 mb-8 w-full max-w-md self-center pointer-events-auto">
                                {visionMode === 'SECURITY' && (
                                    <div className="flex gap-2 w-full bg-black/80 p-2 border border-cyan-400 text-white mb-2">
                                        <input type="text" value={newTargetName} onChange={e => setNewTargetName(e.target.value)} placeholder="ENTER PERSON NAME..." className="flex-1 bg-transparent border-b border-cyan-500 text-white font-mono focus:outline-none uppercase" />
                                        <button onClick={handleStartLearning} className="bg-cyan-600 text-white px-4 font-bold hover:bg-cyan-500 uppercase text-xs">SAVE FACE</button>
                                    </div>
                                )}
                                {isScanning && <div className="text-red-500 font-black animate-pulse bg-black px-4 py-2 border-2 border-red-500">ANALYZING BIOMETRICS...</div>}
                                <button onClick={capturePhoto} className="w-20 h-20 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 transition-all shadow-lg flex items-center justify-center text-xs font-bold text-white">
                                    CAPTURE
                                </button>
                            </div>
                        </div>
                    </div>
                 )}

                 {/* STUDIO MODE */}
                 {!showCamera && (
                    <>
                        {/* Main Canvas Area - Flex 1 to take max space */}
                        <div className="flex-1 bg-[#808080] p-2 md:p-8 flex items-center justify-center relative overflow-hidden order-1">
                             <div className="relative w-full h-full md:w-[600px] md:h-[600px] max-w-full max-h-full border-2 border-white shadow-[inset_1px_1px_0px_0px_#000000] bg-white">
                                <canvas ref={canvasRef} width={1024} height={1024} className="w-full h-full object-contain" onMouseDown={() => setSelectedLayerId(null)}/>
                                
                                {/* Live Style Preview PIP */}
                                {selectedLayerId && (
                                    <div className="absolute top-2 right-2 w-24 h-24 md:w-32 md:h-32 bg-white border-2 border-black shadow-hard z-20 pointer-events-none flex flex-col">
                                        <div className="bg-black text-white text-[9px] font-bold px-1 uppercase">LIVE PREVIEW</div>
                                        <div className="flex-1 overflow-hidden flex items-center justify-center bg-gray-100">
                                            <img 
                                                src={layers.find(l => l.id === selectedLayerId)?.src} 
                                                className="max-w-full max-h-full object-contain" 
                                                style={getPreviewStyle() as any} 
                                                alt="preview"
                                            />
                                        </div>
                                        <div className="bg-yellow-300 text-black text-[9px] font-bold px-1 text-center uppercase">{stickerStyle}</div>
                                    </div>
                                )}

                                {/* Floating Toolbar for Selected Layer */}
                                {selectedLayerId && (
                                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white border-2 border-black shadow-hard flex gap-2 p-2 z-10 w-max max-w-[95%] overflow-x-auto">
                                        <button onClick={handleRemoveBg} disabled={isProcessing} className="win95-button bg-pink-100 hover:bg-pink-200 text-[10px] md:text-xs whitespace-nowrap">
                                            {isProcessing ? '...' : 'УДАЛИТЬ ФОН'}
                                        </button>
                                        <button onClick={openPaintEditor} className="win95-button hover:bg-yellow-100 text-[10px] md:text-xs whitespace-nowrap">
                                            EDIT
                                        </button>
                                        <button onClick={handleStylize} disabled={isProcessing} className="win95-button hover:bg-blue-100 text-[10px] md:text-xs whitespace-nowrap">
                                            СТИЛЬ
                                        </button>
                                        <button onClick={removeLayer} className="win95-button bg-red-100 text-red-600 hover:bg-red-200 text-[10px] md:text-xs">
                                            X
                                        </button>
                                    </div>
                                )}
                                {isProcessing && (
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-30">
                                        <div className="bg-white p-4 border-2 border-black shadow-hard text-center">
                                            <div className="text-xl animate-spin mb-2">⚙️</div>
                                            <div className="font-bold text-xs uppercase">{processingStatus}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Sidebar - Controls (Bottom on Mobile, Right on Desktop) */}
                        <div className="w-full md:w-80 h-1/3 md:h-auto bg-[#F0F0F0] border-t-2 md:border-t-0 md:border-l-2 border-white flex flex-col shadow-hard overflow-y-auto shrink-0 order-2">
                            <div className="p-1 bg-[#000080] text-white font-bold text-sm flex justify-between px-2 items-center shrink-0 sticky top-0 z-10">
                                <span>ПАНЕЛЬ УПРАВЛЕНИЯ</span>
                            </div>
                            
                            <div className="p-4 space-y-4 md:space-y-6 pb-20">
                                {/* Upload */}
                                <div className="card bg-white p-2">
                                    <label className="block font-bold text-xs mb-2 uppercase">1. Загрузка (Auto BG)</label>
                                    <input 
                                        type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*"
                                        className="hidden"
                                    />
                                    <button onClick={() => fileInputRef.current?.click()} className="w-full mt-2 win95-button text-center justify-center py-2">
                                        ВЫБРАТЬ ФАЙЛ
                                    </button>
                                </div>

                                {/* Prompt */}
                                <div className="card bg-white p-2">
                                    <label className="block font-bold text-xs mb-2 uppercase">2. Персонаж</label>
                                    <textarea 
                                        value={stickerPrompt} onChange={e => setStickerPrompt(e.target.value)}
                                        className="win95-text-field w-full h-16 md:h-20 text-sm resize-none"
                                        placeholder="Опишите персонажа..."
                                    />
                                </div>

                                {/* Style */}
                                <div className="card bg-white p-2">
                                    <label className="block font-bold text-xs mb-2 uppercase">3. Стиль</label>
                                    <select value={stickerStyle} onChange={e => setStickerStyle(e.target.value)} className="win95-text-field w-full text-sm">
                                        <option value="anime">Anime</option>
                                        <option value="cyberpunk">Cyberpunk</option>
                                        <option value="pixel_art">Pixel Art</option>
                                        <option value="3d_render">3D Render</option>
                                        <option value="sticker_flat">Flat Sticker</option>
                                        <option value="noir">Noir</option>
                                    </select>
                                    
                                    <div className="mt-3">
                                        <label className="flex justify-between text-xs font-bold mb-1">
                                            <span>КРЕАТИВНОСТЬ</span>
                                            <span>{creativity}%</span>
                                        </label>
                                        <input 
                                            type="range" min="0" max="100" value={creativity} onChange={e => setCreativity(Number(e.target.value))}
                                            className="w-full accent-black"
                                        />
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="space-y-2">
                                    <button onClick={handleCreatePack} disabled={isProcessing} className="w-full win95-button bg-black text-white justify-center py-3 font-bold text-sm shadow-hard hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
                                        {isProcessing ? 'ГЕНЕРАЦИЯ...' : 'СОЗДАТЬ ПАК СТИКЕРОВ'}
                                    </button>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => setLayers([])} className="win95-button justify-center">ОЧИСТИТЬ</button>
                                        <button className="win95-button justify-center">СОХРАНИТЬ</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                 )}
                 
                 {showPaintEditor && (
                    <PaintStyleEditorModal 
                        imageSrc={paintImageSrc}
                        onClose={() => setShowPaintEditor(false)}
                        onSave={handlePaintSave}
                    />
                 )}
                 {showPackModal && (
                    <StickerPackModal 
                        pack={generatedPack}
                        onClose={() => setShowPackModal(false)}
                        onAddToCanvas={(url) => { addLayer(url); setShowPackModal(false); }}
                    />
                 )}
            </div>
        </div>
    );
};

export default StickerCreator;
