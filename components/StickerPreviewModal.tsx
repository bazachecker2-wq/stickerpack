import React from 'react';
import DownloadIcon from './icons/DownloadIcon';

interface StickerPreviewModalProps {
    stickerSrc: string; // full data URL
    onClose: () => void;
}

const StickerPreviewModal: React.FC<StickerPreviewModalProps> = ({ stickerSrc, onClose }) => {
    return (
        <div 
            className="fixed inset-0 bg-white/90 flex items-center justify-center z-[9999] p-4 font-mono backdrop-blur-none" 
            onClick={onClose}
        >
            <div 
                className="bg-white border-2 border-black shadow-[8px_8px_0px_#000] w-full max-w-md flex flex-col relative" 
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-4 flex justify-between items-center border-b-2 border-black bg-white">
                    <h2 className="text-lg font-bold uppercase tracking-tighter">ПРЕДПРОСМОТР</h2>
                    <button onClick={onClose} className="text-black hover:bg-black hover:text-white w-8 h-8 flex items-center justify-center border-2 border-transparent hover:border-black transition-colors font-bold text-lg">
                        X
                    </button>
                </header>
                
                <main className="p-8 flex items-center justify-center bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzjDgBdQBJoGQRgFQAyiKKQAH54X0h8I3nAAAAAASUVORK5CYII=')] min-h-[250px]">
                    <img 
                        src={stickerSrc} 
                        alt="Sticker Preview" 
                        className="max-w-full max-h-[40vh] object-contain drop-shadow-[4px_4px_0px_rgba(0,0,0,0.2)]" 
                    />
                </main>

                <footer className="p-4 flex gap-3 border-t-2 border-black bg-white">
                     <button 
                        onClick={onClose} 
                        className="flex-1 py-3 border-2 border-black font-bold uppercase hover:bg-[#f0f0f0] transition-all text-sm"
                    >
                        ЗАКРЫТЬ
                    </button>
                    <a 
                        href={stickerSrc} 
                        download="sticker.png" 
                        className="flex-1 flex items-center justify-center py-3 border-2 border-black bg-black text-white font-bold uppercase hover:bg-white hover:text-black transition-all text-sm"
                    >
                       <DownloadIcon className="w-4 h-4 mr-2" /> СОХРАНИТЬ
                    </a>
                </footer>
            </div>
        </div>
    );
};

export default StickerPreviewModal;