
import React from 'react';
import DownloadIcon from './icons/DownloadIcon';
import PackIcon from './icons/PackIcon';

interface StickerPackModalProps {
    pack: { emotion: string; url: string }[];
    onClose: () => void;
    onAddToCanvas: (url: string) => void;
}

const StickerPackModal: React.FC<StickerPackModalProps> = ({ pack, onClose, onAddToCanvas }) => {
    return (
        <div 
            className="fixed inset-0 bg-white/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                className="bg-white border-4 border-black shadow-[10px_10px_0px_#000] w-full max-w-4xl h-[90vh] flex flex-col animate-slide-up"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <header className="p-4 bg-black text-white flex justify-between items-center border-b-4 border-white">
                    <div className="flex items-center gap-3">
                        <PackIcon className="w-6 h-6 text-[#FFD700]" />
                        <h2 className="text-xl font-black uppercase tracking-widest font-heading">GENERATED PACK</h2>
                    </div>
                    <button onClick={onClose} className="text-2xl font-mono hover:text-[#FFD700] transition-colors">✕</button>
                </header>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#f0f0f0]">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
                        {pack.map((item, index) => (
                            <div key={index} className="bg-white border-2 border-black p-2 flex flex-col shadow-hard hover:shadow-hard-hover transition-transform hover:-translate-y-1">
                                <div className="bg-gray-100 flex-1 flex items-center justify-center min-h-[150px] relative overflow-hidden bg-checkerboard">
                                    <img src={item.url} alt={item.emotion} className="max-w-full max-h-[150px] object-contain drop-shadow-md" />
                                </div>
                                <div className="p-2 border-t-2 border-black">
                                    <div className="font-bold uppercase text-xs mb-2 text-center bg-yellow-100 border border-black py-1">{item.emotion}</div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => onAddToCanvas(item.url)}
                                            className="flex-1 bg-black text-white text-[10px] py-2 font-bold uppercase hover:bg-gray-800"
                                        >
                                            ADD +
                                        </button>
                                        <a 
                                            href={item.url} 
                                            download={`sticker-${item.emotion}.png`}
                                            className="flex items-center justify-center px-2 border-2 border-black hover:bg-gray-200"
                                        >
                                            <DownloadIcon className="w-4 h-4" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <footer className="p-4 border-t-4 border-black bg-white flex justify-end">
                    <button 
                        onClick={onClose}
                        className="win95-button bg-white text-black px-8 py-3 font-bold uppercase border-2 border-black shadow-hard hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                    >
                        DONE
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default StickerPackModal;
