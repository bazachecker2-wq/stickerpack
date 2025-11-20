import React, { useState, useEffect } from 'react';

interface WindowInfo {
    id: string;
    title: string;
    iconUrl: string;
    isMinimized: boolean;
}

interface TaskbarProps {
    openWindows: WindowInfo[];
    onRestore: (id: string) => void;
    onMinimize: (id: string) => void;
    onFocus: (id: string) => void;
    activeWindowId: string | null;
    startMenu: React.ReactNode;
}

const Taskbar: React.FC<TaskbarProps> = ({ openWindows, onRestore, onMinimize, activeWindowId, startMenu }) => {
    const [time, setTime] = useState(new Date());
    const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000 * 30); // Update every 30s
        return () => clearInterval(timer);
    }, []);

    const handleTaskbarClick = (id: string) => {
        if (id === activeWindowId && !openWindows.find(w => w.id === id)?.isMinimized) {
           onMinimize(id);
        } else {
            onRestore(id);
        }
    };
    
    const handleOutsideClick = (event: MouseEvent) => {
        const startButton = document.querySelector('.start-button');
        const startMenuEl = document.querySelector('.start-menu');
        if (
            isStartMenuOpen &&
            startButton && !startButton.contains(event.target as Node) &&
            startMenuEl && !startMenuEl.contains(event.target as Node)
        ) {
            setIsStartMenuOpen(false);
        }
    };
    
    useEffect(() => {
        document.addEventListener('mousedown', handleOutsideClick);
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isStartMenuOpen]);


    return (
        <>
            <div className="taskbar">
                <button
                    className={`start-button ${isStartMenuOpen ? 'active' : ''}`}
                    onClick={() => setIsStartMenuOpen(!isStartMenuOpen)}
                >
                    <img src="https://i.imgur.com/mC2t4qs.png" alt="Start" style={{width: 16, height: 16}} />
                    <b>Пуск</b>
                </button>
                <div className="taskbar-buttons">
                    {openWindows.map(win => (
                         <button
                            key={win.id}
                            className={`taskbar-button ${win.id === activeWindowId && !win.isMinimized ? 'active' : ''}`}
                            onClick={() => handleTaskbarClick(win.id)}
                        >
                            <img src={win.iconUrl} alt={win.title} className="w-4 h-4 mr-1 inline-block" />
                            {win.title}
                        </button>
                    ))}
                </div>
                <div className="taskbar-clock">
                    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
            {isStartMenuOpen && (
                React.cloneElement(startMenu as React.ReactElement<any>, { 
                    onClose: () => setIsStartMenuOpen(false) 
                })
            )}
        </>
    );
};

export default Taskbar;