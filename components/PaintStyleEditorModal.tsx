
import React, { useState, useEffect, useRef } from 'react';
import { editImageWithAI, removeBackgroundImage } from '../services/mockApi';

interface PaintStyleEditorModalProps {
    imageSrc: string; // base64 without prefix
    onClose: () => void;
    onSave: (newImage: string) => void;
}

type Message = { sender: 'user' | 'ai' | 'system'; text: string; };

const PaintStyleEditorModal: React.FC<PaintStyleEditorModalProps> = ({ imageSrc, onClose, onSave }) => {
    const [currentImage, setCurrentImage] = useState(imageSrc);
    const [chatHistory, setChatHistory] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Canvas/Masking State
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushSize, setBrushSize] = useState(20);
    const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
    
    const chatHistoryRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        setChatHistory([{ sender: 'system', text: 'Выделите область маркером и опишите, что изменить.' }]);
    }, []);

    useEffect(() => {
        chatHistoryRef.current?.scrollTo({ top: chatHistoryRef.current.scrollHeight, behavior: 'smooth' });
    }, [chatHistory, isLoading]);

    // Initialize Canvas Size to match Image
    useEffect(() => {
        if (imageRef.current && canvasRef.current) {
             const updateCanvasSize = () => {
                if (imageRef.current && canvasRef.current) {
                    canvasRef.current.width = imageRef.current.width;
                    canvasRef.current.height = imageRef.current.height;
                }
             };
             setTimeout(updateCanvasSize, 100);
             window.addEventListener('resize', updateCanvasSize);
             return () => window.removeEventListener('resize', updateCanvasSize);
        }
    }, [currentImage]);

    const getMaskBase64 = (): string | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        const ctx = maskCanvas.getContext('2d');
        if (!ctx) return null;
        
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        
        ctx.drawImage(canvas, 0, 0);
        
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        
        return maskCanvas.toDataURL('image/png').split(',')[1];
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading) return;

        const newHistory: Message[] = [...chatHistory, { sender: 'user', text: userInput }];
        setChatHistory(newHistory);
        const prompt = userInput;
        setUserInput('');
        setIsLoading(true);

        const mask = getMaskBase64();
        const hasMask = mask && isCanvasDirty();

        try {
            const result = await editImageWithAI(currentImage, prompt, hasMask ? mask : undefined);
            setCurrentImage(result.image);
            setChatHistory([...newHistory, { sender: 'ai', text: 'Готово. Вы можете продолжить редактирование.' }]);
            clearCanvas();
        } catch (error: any) {
            setChatHistory([...newHistory, { sender: 'system', text: `Ошибка: ${error.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveBg = async () => {
        setIsLoading(true);
        setChatHistory(prev => [...prev, {sender: 'system', text: 'Чистка фона...'}]);
        try {
            const result = await removeBackgroundImage(currentImage, 'image/png');
            setCurrentImage(result);
            setChatHistory(prev => [...prev, {sender: 'ai', text: 'Фон удален.'}]);
        } catch (error: any) {
             setChatHistory(prev => [...prev, { sender: 'system', text: `Ошибка: ${error.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (isLoading) return;
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) ctx.beginPath();
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        const x = (clientX - rect.left) * (canvas.width / rect.width);
        const y = (clientY - rect.top) * (canvas.height / rect.height);

        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)'; // Yellowish selection
        }

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
    };
    
    const isCanvasDirty = () => {
         const canvas = canvasRef.current;
         if(!canvas) return false;
         const ctx = canvas.getContext('2d');
         if(!ctx) return false;
         const p = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
         for(let i=0; i<p.length; i+=4) {
             if(p[i+3] !== 0) return true;
         }
         return false;
    }

    const handleSave = () => onSave(currentImage);

    return (
        <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '10px'
        }} onClick={onClose}>
            <div className="bg-white border-4 border-black shadow-[10px_10px_0px_#FFD700]" style={{
                 width: '100%', maxWidth: '800px', height: '100%', maxHeight: '90vh',
                 display: 'flex', flexDirection: 'column', padding: 0, margin: 0,
                 overflow: 'hidden'
            }} onClick={(e) => e.stopPropagation()}>
                
                <header style={{padding: '10px', borderBottom: '2px solid black', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#000'}}>
                    <div className="flex items-center gap-4 text-white">
                        <h2 className="text-lg font-black uppercase tracking-widest">AI EDITOR</h2>
                        <div className="flex gap-1">
                            <button 
                                className={`px-2 py-1 text-xs border border-white font-bold ${tool === 'brush' ? 'bg-white text-black' : 'text-white hover:bg-white/20'}`}
                                onClick={() => setTool('brush')}
                            >
                                MARKER
                            </button>
                             <button 
                                className={`px-2 py-1 text-xs border border-white font-bold ${tool === 'eraser' ? 'bg-white text-black' : 'text-white hover:bg-white/20'}`}
                                onClick={() => setTool('eraser')}
                            >
                                ERASER
                            </button>
                             <button className="px-2 py-1 text-xs border border-white text-white font-bold hover:bg-red-600 hover:border-red-600 transition-colors" onClick={clearCanvas}>
                                RESET
                            </button>
                        </div>
                         <input 
                            type="range" min="5" max="50" 
                            value={brushSize} 
                            onChange={(e) => setBrushSize(Number(e.target.value))}
                            className="w-24 accent-[#FFD700]"
                        />
                    </div>
                    <button className="text-xs border border-[#FFD700] px-2 py-1 text-[#FFD700] font-bold hover:bg-[#FFD700] hover:text-black transition-colors" onClick={handleRemoveBg} disabled={isLoading}>[ AUTO BG ]</button>
                </header>

                <main style={{flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative'}}>
                    <div 
                        ref={containerRef}
                        style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            backgroundColor: '#222', 
                            backgroundImage: "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzjDgBdQBJoGQRgFQAyiKKQAH54X0h8I3nAAAAAASUVORK5CYII=')", 
                            padding: '10px',
                            position: 'relative',
                            overflow: 'hidden',
                            touchAction: 'none'
                        }}
                    >
                        <div style={{position: 'relative', display: 'inline-block', boxShadow: '0 0 20px rgba(0,0,0,0.5)'}}>
                            <img 
                                ref={imageRef}
                                src={`data:image/png;base64,${currentImage}`} 
                                alt="Edit Target" 
                                style={{maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', display: 'block', pointerEvents: 'none'}} 
                                onLoad={() => {
                                    if(canvasRef.current && imageRef.current) {
                                        canvasRef.current.width = imageRef.current.width;
                                        canvasRef.current.height = imageRef.current.height;
                                    }
                                }}
                            />
                            <canvas 
                                ref={canvasRef}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                                style={{
                                    position: 'absolute', 
                                    top: 0, left: 0, 
                                    width: '100%', height: '100%', 
                                    cursor: 'crosshair'
                                }}
                            />
                        </div>
                    </div>
                    
                    <div style={{height: '30%', minHeight: '150px', display: 'flex', flexDirection: 'column', borderTop: '4px solid black', backgroundColor: '#FFF', padding: '0'}}>
                        <div ref={chatHistoryRef} style={{flex: 1, overflowY: 'auto', padding: '10px', fontSize: '12px', backgroundColor: '#F3F4F6'}}>
                            {chatHistory.map((msg, index) => (
                                <div key={index} className={`mb-2 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`p-2 border border-black shadow-[2px_2px_0px_rgba(0,0,0,0.1)] font-mono ${msg.sender === 'user' ? 'bg-black text-white' : 'bg-white text-black'}`}>
                                        <span className="font-bold">{msg.sender === 'user' ? '>' : '#'} </span>
                                        <span>{msg.text}</span>
                                    </div>
                                </div>
                            ))}
                            {isLoading && <div className="blink text-black font-bold p-2">PROCESSING...</div>}
                        </div>
                        
                        <form onSubmit={handleSubmit} style={{display: 'flex', padding: '10px', backgroundColor: 'white', borderTop: '2px solid black'}}>
                            <input 
                                type="text" 
                                value={userInput} 
                                onChange={e => setUserInput(e.target.value)} 
                                className="input-field" 
                                style={{flex: 1, marginRight: '10px'}}
                                disabled={isLoading} 
                                placeholder="Опишите изменения..."
                            />
                            <button type="submit" className="button bg-black text-white hover:bg-[#FFD700] hover:text-black" style={{width: 'auto', padding: '0 20px'}} disabled={!userInput.trim() || isLoading}>SEND</button>
                        </form>
                    </div>
                </main>
                
                <footer style={{display: 'flex', gap: '10px', padding: '10px', borderTop: '2px solid black', backgroundColor: '#f8f8f8'}}>
                    <button className="button secondary border-2 border-black flex-1 hover:bg-red-100 hover:border-red-600 hover:text-red-600" onClick={onClose}>CANCEL</button>
                    <button className="button bg-[#FFD700] text-black border-2 border-black flex-1 font-black hover:bg-yellow-400 shadow-hard hover:shadow-hard-hover active:shadow-none active:translate-y-[2px]" onClick={handleSave}>SAVE RESULT</button>
                </footer>
            </div>
        </div>
    );
};

export default PaintStyleEditorModal;
