
import React, { useState, useEffect, useRef } from 'react';
import { editImageWithAI } from '../services/mockApi';
import DownloadIcon from './icons/DownloadIcon';
import UndoIcon from './icons/UndoIcon';
import EyeIcon from './icons/EyeIcon';
import { translations } from '../utils/translations';

interface StickerEditorModalProps {
    stickerData: { id: string; url: string; emotion: string };
    onClose: () => void;
    onSave: (id: string, newUrl: string) => void;
    language: 'ru' | 'en';
}

const StickerEditorModal: React.FC<StickerEditorModalProps> = ({ stickerData, onClose, onSave, language }) => {
    const t = translations[language].editor;
    const comm = translations[language].common;
    
    const [currentImage, setCurrentImage] = useState(stickerData.url);
    const [history, setHistory] = useState<string[]>([]);
    const [originalImage] = useState(stickerData.url);
    const [isComparing, setIsComparing] = useState(false);

    const [chatHistory, setChatHistory] = useState<{ sender: 'ai' | 'user', text: string }[]>([
        { sender: 'ai', text: `${t.title}: ${stickerData.emotion}.` }
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
        setHistory(prev => [...prev, currentImage]);

        try {
            const base64 = currentImage.includes(',') ? currentImage.split(',')[1] : currentImage;
            const result = await editImageWithAI(base64, `Sticker refinement: ${prompt}. Keep white background.`);
            setCurrentImage(`data:image/png;base64,${result.image}`);
            setChatHistory(prev => [...prev, { sender: 'ai', text: comm.success }]);
        } catch (err) {
            setHistory(prev => prev.slice(0, -1));
            setChatHistory(prev => [...prev, { sender: 'ai', text: comm.error }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const previous = history[history.length - 1];
        setCurrentImage(previous);
        setHistory(prev => prev.slice(0, -1));
        setChatHistory(prev => [...prev, { sender: 'ai', text: comm.undo }]);
    };

    const handleSave = () => {
        onSave(stickerData.id, currentImage);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[2000] bg-white flex flex-col md:flex-row font-heading animate-fade-in">
            {/* Mobile Header */}
            <div className="md:hidden p-3 bg-black text-white font-bold uppercase flex justify-between items-center text-sm shrink-0">
                 <button onClick={onClose} className="text-white px-2 text-xl font-mono">✕</button>
                 <span>{t.title}</span>
                 <button onClick={handleSave} className="text-[#FFD700] px-2 font-bold">{comm.ok}</button>
            </div>

            {/* Image Area */}
            <div className="flex-1 flex flex-col bg-gray-100 relative">
                <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden bg-checkerboard">
                    <img 
                        src={isComparing ? originalImage : currentImage} 
                        className="max-w-full max-h-full object-contain drop-shadow-[10px_10px_0px_rgba(0,0,0,0.1)] transition-all duration-200" 
                        alt="Sticker Edit"
                        style={isComparing ? { filter: 'sepia(1) hue-rotate(-50deg) contrast(1.2)' } : {}}
                    />
                    {isComparing && (
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-1 font-bold uppercase text-xs border-2 border-white shadow-lg pointer-events-none z-10">
                            {t.original}
                        </div>
                    )}
                    {isLoading && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-20">
                            <div className="bg-white border-4 border-black p-6 font-black uppercase animate-pulse text-sm shadow-[8px_8px_0px_#FFD700]">
                                {t.ai_thinking}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Toolbar */}
                <div className="p-3 bg-white border-t-2 md:border-2 md:border-l-0 border-black flex justify-between items-center shrink-0 z-10">
                    <div className="font-bold uppercase text-xs md:text-sm flex items-center gap-2">
                         <span className="bg-black text-white px-3 py-1 font-mono border border-black">{stickerData.emotion}</span>
                    </div>
                    <div className="flex gap-3">
                         <button onClick={handleUndo} disabled={history.length === 0 || isLoading} className={`button secondary py-2 px-3 border-2 ${history.length === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100'}`}>
                             <UndoIcon className="w-4 h-4" />
                         </button>
                         <button 
                            onMouseDown={() => setIsComparing(true)} onMouseUp={() => setIsComparing(false)} onMouseLeave={() => setIsComparing(false)}
                            onTouchStart={() => setIsComparing(true)} onTouchEnd={() => setIsComparing(false)}
                            className="button secondary py-2 px-3 border-2 active:bg-[#FFD700] active:text-black active:border-black transition-colors">
                             <EyeIcon className="w-4 h-4" />
                         </button>
                         <a href={currentImage} download={`sticker-${stickerData.emotion}.png`} className="button secondary py-2 px-3 border-2 hover:bg-gray-100">
                            <DownloadIcon className="w-4 h-4"/>
                         </a>
                    </div>
                </div>
            </div>

            {/* Chat/Controls Area */}
            <div className="w-full md:w-[400px] flex flex-col border-l-0 md:border-l-4 border-black bg-white h-[45vh] md:h-auto shrink-0 z-20 shadow-[-10px_0_20px_rgba(0,0,0,0.05)]">
                <div className="hidden md:flex p-4 bg-black text-white font-bold uppercase justify-between items-center text-sm tracking-wide">
                    <span>{t.title}</span>
                    <button onClick={onClose} className="text-white hover:text-[#FFD700] px-2 font-mono text-xl transition-colors">✕</button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {chatHistory.map((msg, i) => (
                        <div key={i} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-slide-up`}>
                            <div className={`max-w-[90%] p-3 border-2 border-black text-xs font-bold shadow-hard-sm ${msg.sender === 'user' ? 'bg-black text-white rounded-br-none' : 'bg-white text-black rounded-bl-none'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>
                
                <div className="p-4 border-t-2 border-black bg-white shrink-0">
                    <form onSubmit={handleSend} className="flex gap-2 mb-4">
                        <input 
                            type="text" 
                            className="input-field flex-1 text-sm p-3 border-2 border-black focus:border-black focus:bg-yellow-50 transition-all" 
                            placeholder={t.prompt_placeholder} 
                            value={userInput} 
                            onChange={e => setUserInput(e.target.value)} 
                            disabled={isLoading}
                        />
                        <button type="submit" className="button bg-black text-white w-12 flex items-center justify-center text-xl hover:bg-[#FFD700] hover:text-black transition-colors" disabled={isLoading}>→</button>
                    </form>
                    <button onClick={handleSave} className="button w-full bg-[#FFD700] text-black border-2 border-black hover:bg-[#FFC000] text-sm py-4 font-black uppercase shadow-hard hover:shadow-hard-hover active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
                        {t.save_changes}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StickerEditorModal;
