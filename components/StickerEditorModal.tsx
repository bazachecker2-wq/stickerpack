
import React, { useState, useEffect, useRef } from 'react';
import { editImageWithAI } from '../services/mockApi';
import DownloadIcon from './icons/DownloadIcon';
import UndoIcon from './icons/UndoIcon';
import EyeIcon from './icons/EyeIcon';

interface StickerEditorModalProps {
    stickerData: { id: string; url: string; emotion: string };
    onClose: () => void;
    onSave: (id: string, newUrl: string) => void;
}

const StickerEditorModal: React.FC<StickerEditorModalProps> = ({ stickerData, onClose, onSave }) => {
    const [currentImage, setCurrentImage] = useState(stickerData.url);
    const [history, setHistory] = useState<string[]>([]);
    const [originalImage] = useState(stickerData.url); // State for "Hold to Compare"
    const [isComparing, setIsComparing] = useState(false);

    const [chatHistory, setChatHistory] = useState<{ sender: 'ai' | 'user', text: string }[]>([
        { sender: 'ai', text: `Редактирование стикера: ${stickerData.emotion}. Напишите, что изменить.` }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading) return;

        const prompt = userInput;
        setChatHistory(prev => [...prev, { sender: 'user', text: prompt }]);
        setUserInput('');
        setIsLoading(true);

        // Save current state to history before updating
        setHistory(prev => [...prev, currentImage]);

        try {
            // Remove data prefix for API if present
            const base64 = currentImage.includes(',') ? currentImage.split(',')[1] : currentImage;
            
            // Use edit function
            const result = await editImageWithAI(base64, `Sticker refinement: ${prompt}. Keep white background. Style consistent.`);
            
            setCurrentImage(`data:image/png;base64,${result.image}`);
            setChatHistory(prev => [...prev, { sender: 'ai', text: 'Готово. Как вам результат?' }]);
        } catch (err) {
            // Revert history on error since update failed
            setHistory(prev => prev.slice(0, -1));
            setChatHistory(prev => [...prev, { sender: 'ai', text: 'Ошибка при обработке.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const previous = history[history.length - 1];
        setCurrentImage(previous);
        setHistory(prev => prev.slice(0, -1));
        setChatHistory(prev => [...prev, { sender: 'system', text: 'Возврат к предыдущей версии.' }]);
    };

    const handleSave = () => {
        onSave(stickerData.id, currentImage);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[2000] bg-white/95 flex flex-col md:flex-row p-0 md:p-4 gap-0 md:gap-4 overflow-hidden">
            {/* Mobile Header */}
            <div className="md:hidden p-3 bg-black text-white font-bold uppercase flex justify-between items-center text-sm shrink-0">
                 <span>AI Редактор</span>
                 <button onClick={onClose} className="text-white px-2 font-mono text-lg">✕</button>
            </div>

            {/* Image Preview Area */}
            <div className="flex-1 flex flex-col bg-white border-b-2 md:border-2 border-black shadow-none md:shadow-[8px_8px_0px_black] min-h-0">
                <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzjDgBdQBJoGQRgFQAyiKKQAH54X0h8I3nAAAAAASUVORK5CYII=')]">
                    {/* Image Display */}
                    <img 
                        src={isComparing ? originalImage : currentImage} 
                        className="max-w-full max-h-full object-contain drop-shadow-xl transition-all duration-100" 
                        alt="Sticker Edit"
                        style={isComparing ? { filter: 'sepia(0.5) hue-rotate(-50deg)' } : {}}
                    />
                    
                    {/* Compare Indicator */}
                    {isComparing && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-3 py-1 font-bold uppercase text-xs border-2 border-white shadow-lg pointer-events-none">
                            Оригинал
                        </div>
                    )}

                    {isLoading && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <div className="bg-white border-2 border-black p-4 font-bold uppercase animate-pulse text-xs md:text-sm">
                                AI Думает...
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-2 md:p-4 bg-white border-t-2 border-black flex justify-between items-center shrink-0">
                    <div className="font-bold uppercase text-xs md:text-sm flex items-center gap-2">
                        <span className="hidden md:inline">Эмоция:</span>
                        <span className="bg-black text-white px-2 py-1">{stickerData.emotion}</span>
                    </div>
                    <div className="flex gap-2">
                         {/* Undo Button */}
                         <button 
                            onClick={handleUndo} 
                            disabled={history.length === 0 || isLoading}
                            className={`button secondary py-1 px-2 ${history.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Отменить последнее действие"
                         >
                             <UndoIcon className="w-4 h-4" />
                         </button>

                         {/* Hold to Compare Button */}
                         <button 
                            onMouseDown={() => setIsComparing(true)}
                            onMouseUp={() => setIsComparing(false)}
                            onMouseLeave={() => setIsComparing(false)}
                            onTouchStart={() => setIsComparing(true)}
                            onTouchEnd={() => setIsComparing(false)}
                            className="button secondary py-1 px-2 active:bg-yellow-200"
                            title="Удерживайте для сравнения с начальной версией"
                         >
                             <EyeIcon className="w-4 h-4" />
                         </button>

                         <a href={currentImage} download={`sticker-${stickerData.emotion}.png`} className="button secondary py-1 px-2">
                            <DownloadIcon className="w-4 h-4"/>
                         </a>
                    </div>
                </div>
            </div>

            {/* Chat / Controls Area */}
            <div className="w-full md:w-96 flex flex-col border-t-2 md:border-2 border-black bg-white shadow-none md:shadow-[8px_8px_0px_black] h-[45vh] md:h-auto shrink-0">
                <div className="hidden md:flex p-3 bg-black text-white font-bold uppercase justify-between items-center text-sm">
                    <span>AI Редактор</span>
                    <button onClick={onClose} className="text-white hover:text-gray-300 px-2 font-mono text-lg">✕</button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 bg-gray-50">
                    {chatHistory.map((msg, i) => (
                        <div key={i} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[90%] p-2 border-2 border-black text-xs font-mono ${msg.sender === 'user' ? 'bg-black text-white' : 'bg-white'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSend} className="p-3 border-t-2 border-black bg-white flex gap-2 shrink-0">
                    <input 
                        type="text" 
                        className="input-field flex-1 text-sm" 
                        placeholder="Исправить нос, цвет..."
                        value={userInput}
                        onChange={e => setUserInput(e.target.value)}
                        disabled={isLoading}
                    />
                    <button type="submit" className="button px-3 bg-black text-white" disabled={isLoading}>→</button>
                </form>

                <div className="p-3 border-t-2 border-black bg-gray-100 shrink-0 safe-area-bottom">
                    <button onClick={handleSave} className="button w-full bg-green-500 text-white border-black hover:bg-green-600 text-xs md:text-sm py-3 font-bold">
                        СОХРАНИТЬ ИЗМЕНЕНИЯ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StickerEditorModal;
