import React from 'react';
import StickerCreator from './StickerCreator';

const TelegramApp: React.FC = () => {
    return (
        <div className="h-full w-full bg-[var(--tg-theme-bg-color)] text-[var(--tg-theme-text-color)] overflow-hidden">
            <StickerCreator />
        </div>
    );
};

export default TelegramApp;