
import React, { useState, useEffect, useCallback } from 'react';
import DraggableWindow from './DraggableWindow';
import Taskbar from './Taskbar';
import { getDesktopIcons } from '../services/mockApi';

import Dashboard from './Dashboard';
import Plugins from './Plugins';
import CreatorStudio from './CreatorStudio';
import StickerCreator from './StickerCreator';
import Commands from './Commands';
import AdminChatsView from './AdminChatsView';
import Logs from './Logs';
import Settings from './Settings';
import Terminal from './Terminal';
import { Plugin } from '../types';
import StartMenu from './StartMenu';


interface WindowState {
    id: string;
    title: string;
    iconUrl: string;
    component: React.ReactNode;
    pos: { x: number, y: number };
    size: { width: number, height: number };
    zIndex: number;
    isMinimized: boolean;
    isMaximized: boolean;
}

interface DesktopIcon {
    id: string;
    label: string;
    iconUrl: string;
}

interface DesktopProps {
    onLogout: () => void;
}

const componentMap: { [key: string]: (props: any) => React.ReactNode } = {
    'dashboard': (props) => <Dashboard {...props} />,
    'plugins': (props) => <Plugins {...props} />,
    'creator-studio': (props) => <CreatorStudio {...props} />,
    'sticker-creator': (props) => <StickerCreator {...props} />,
    'commands': (props) => <Commands {...props} />,
    'chats': (props) => <AdminChatsView {...props} />,
    'logs': (props) => <Logs {...props} />,
    'settings': (props) => <Settings {...props} />,
    'terminal': (props) => <Terminal {...props} />,
};

const defaultSizes: { [key: string]: { width: number, height: number } } = {
    'dashboard': { width: 800, height: 600 },
    'plugins': { width: 700, height: 500 },
    'creator-studio': { width: 900, height: 650 },
    'sticker-creator': { width: 600, height: 500 },
    'chats': { width: 750, height: 550 },
    'default': { width: 640, height: 480 },
};

const Desktop: React.FC<DesktopProps> = ({ onLogout }) => {
    const [windows, setWindows] = useState<WindowState[]>([]);
    const [desktopIcons, setDesktopIcons] = useState<DesktopIcon[]>([]);
    const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
    const zIndexCounter = React.useRef(100);
    const [pluginToEdit, setPluginToEdit] = useState<Plugin | null>(null);

    useEffect(() => {
        const fetchIcons = async () => {
            const icons = await getDesktopIcons('admin');
            setDesktopIcons(icons);
        };
        fetchIcons();
    }, []);
    
    const openWindow = useCallback((id: string, title: string, iconUrl: string, existingPlugin?: Plugin | null) => {
        setWindows(prev => {
            const existingWindow = prev.find(w => w.id === id);
            if (existingWindow) {
                // If window exists, restore if minimized and focus
                setActiveWindowId(id);
                return prev.map(w => w.id === id ? { ...w, zIndex: zIndexCounter.current++, isMinimized: false } : w);
            }
            
            zIndexCounter.current++;
            const size = defaultSizes[id] || defaultSizes['default'];
            const newPos = { x: 50 + (prev.length % 10) * 20, y: 50 + (prev.length % 10) * 20 };

            if (id === 'creator-studio') {
                setPluginToEdit(existingPlugin || null);
            }
            
            const componentProps = {
                onOpenIDE: (plugin: Plugin | null) => openWindow('creator-studio', 'IDE Студия', 'https://i.imgur.com/k9jB2Q1.png', plugin),
                onSaveSuccess: () => closeWindow('creator-studio'),
                pluginToEdit: id === 'creator-studio' ? existingPlugin : undefined
            };

            const newWindow: WindowState = {
                id,
                title,
                iconUrl,
                component: componentMap[id] ? componentMap[id](componentProps) : <div>Not implemented</div>,
                pos: newPos,
                size: size,
                zIndex: zIndexCounter.current,
                isMinimized: false,
                isMaximized: false,
            };
            setActiveWindowId(id);
            return [...prev, newWindow];
        });
    }, []);
    
     const handleOpenIDE = (plugin: Plugin | null) => {
        openWindow('creator-studio', 'IDE Студия', 'https://i.imgur.com/k9jB2Q1.png', plugin);
    };

    const closeWindow = (id: string) => {
        setWindows(prev => prev.filter(w => w.id !== id));
        if (activeWindowId === id) {
            setActiveWindowId(null);
        }
    };

    const focusWindow = (id: string) => {
        if (activeWindowId === id) return;
        zIndexCounter.current++;
        setWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: zIndexCounter.current } : w));
        setActiveWindowId(id);
    };

    const minimizeWindow = (id: string) => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: true } : w));
        if (activeWindowId === id) {
            setActiveWindowId(null);
        }
    };
    
    const maximizeWindow = (id: string) => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w));
        focusWindow(id);
    };

    const restoreWindow = (id: string) => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: false, zIndex: zIndexCounter.current++ } : w));
        setActiveWindowId(id);
    };

    return (
        <div className="h-full w-full relative">
            <div className="desktop">
                <div className="desktop-icon-grid">
                    {desktopIcons.map(icon => (
                        <div key={icon.id} className="desktop-icon" onDoubleClick={() => openWindow(icon.id, icon.label, icon.iconUrl)} tabIndex={0}>
                            <img src={icon.iconUrl} alt={icon.label} />
                            <span>{icon.label}</span>
                        </div>
                    ))}
                </div>

                {windows.map(win => (
                    <DraggableWindow
                        key={win.id}
                        id={win.id}
                        title={win.title}
                        iconUrl={win.iconUrl}
                        initialPos={win.pos}
                        initialSize={win.size}
                        zIndex={win.zIndex}
                        isMinimized={win.isMinimized}
                        isMaximized={win.isMaximized}
                        isActive={win.id === activeWindowId}
                        onClose={closeWindow}
                        onFocus={focusWindow}
                        onMinimize={minimizeWindow}
                        onMaximize={maximizeWindow}
                    >
                        {React.cloneElement(win.component as React.ReactElement<any>, { 
                           onOpenIDE: handleOpenIDE,
                           onSaveSuccess: () => closeWindow('creator-studio'),
                           pluginToEdit: win.id === 'creator-studio' ? pluginToEdit : undefined
                        })}
                    </DraggableWindow>
                ))}
            </div>
            <Taskbar
                openWindows={windows}
                onRestore={restoreWindow}
                onMinimize={minimizeWindow}
                onFocus={focusWindow}
                activeWindowId={activeWindowId}
                startMenu={
                    <StartMenu 
                        apps={desktopIcons}
                        onAppClick={(id, label, iconUrl) => openWindow(id, label, iconUrl)}
                        onLogout={onLogout}
                        onClose={() => {}}
                    />
                }
            />
        </div>
    );
};

export default Desktop;
