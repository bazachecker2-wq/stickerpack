
import React, { useState, useEffect, useCallback } from 'react';
import DraggableWindow from './DraggableWindow';
import Taskbar from './Taskbar';
import { getDesktopIcons } from '../services/mockApi';
import ChatView from './ChatView';
import Dashboard from './Dashboard';
import StickerCreator from './StickerCreator';
import StartMenu from './StartMenu';
import Plugins from './Plugins';
import CreatorStudio from './CreatorStudio';
import AgentCouncil from './AgentCouncil';
import SSHTerminal from './SSHTerminal';
import Terminal from './Terminal';
import Commands from './Commands';
import Logs from './Logs';
import { Plugin } from '../types';
import 'aframe'; // Ensure A-Frame is loaded

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'a-scene': any;
      'a-assets': any;
      'a-asset-item': any;
      'a-sky': any;
      'a-plane': any;
      'a-entity': any;
      'a-camera': any;
      'a-cursor': any;
      'a-gltf-model': any;
      'a-animation': any;
      'a-text': any;
      'a-light': any;
      'a-box': any;
      'a-sphere': any;
    }
  }
}

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

interface UserDesktopProps {
    username: string;
    onLogout: () => void;
}

const componentMap: { [key: string]: (props: any) => React.ReactNode } = {
    'chat': (props) => <ChatView {...props} />,
    'dashboard': (props) => <Dashboard {...props} isUserView />,
    'sticker-creator': (props) => <StickerCreator {...props} />,
    'plugins': (props) => <Plugins {...props} />,
    'creator-studio': (props) => <CreatorStudio {...props} />,
    'agent-council': (props) => <AgentCouncil {...props} />,
    'ssh-terminal': (props) => <SSHTerminal {...props} />,
    'terminal': (props) => <Terminal {...props} />,
    'commands': (props) => <Commands {...props} />,
    'logs': (props) => <Logs {...props} />,
};

const defaultSizes: { [key: string]: { width: number, height: number } } = {
    'chat': { width: 500, height: 600 },
    'dashboard': { width: 700, height: 450 },
    'sticker-creator': { width: 600, height: 500 },
    'agent-council': { width: 850, height: 600 },
    'ssh-terminal': { width: 800, height: 500 },
    'creator-studio': { width: 900, height: 650 },
    'plugins': { width: 700, height: 500 },
    'default': { width: 640, height: 480 },
};

// 3D Background Component using A-Frame
const RobotBackground: React.FC = () => {
    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
            <a-scene embedded vr-mode-ui="enabled: false" loading-screen="dotsColor: black; backgroundColor: #f0f0f0">
                <a-assets>
                    {/* Placeholder for robot_playground.glb. Using RobotExpressive as a high-quality stand-in that ensures it works. */}
                    <a-asset-item id="robot-model" src="https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/RobotExpressive/glTF-Binary/RobotExpressive.glb"></a-asset-item>
                    <img id="sky-gradient" src="https://cdn.glitch.global/e75643f2-a05b-4384-9591-39527a892a40/space-sky.jpg?v=1717357930369" crossOrigin="anonymous" />
                </a-assets>

                {/* Background Environment */}
                <a-sky color="#e0e0e0"></a-sky>
                
                {/* Floor Grid */}
                <a-plane 
                    position="0 0 0" 
                    rotation="-90 0 0" 
                    width="100" 
                    height="100" 
                    color="#ffffff"
                    material="shader: flat; opacity: 0.5; transparent: true"
                >
                </a-plane>
                
                {/* Grid Helper - manually drawing lines for style */}
                <a-entity position="0 0.01 0" rotation="-90 0 0">
                     <a-entity line="start: -10 0 0; end: 10 0 0; color: #000; opacity: 0.2"></a-entity>
                     <a-entity line="start: 0 -10 0; end: 0 10 0; color: #000; opacity: 0.2"></a-entity>
                     {/* Add more grid lines if needed, simplified for now */}
                </a-entity>

                {/* Lighting */}
                <a-light type="ambient" color="#ffffff" intensity="0.8"></a-light>
                <a-light type="directional" color="#ffffff" intensity="1" position="-2 4 4" cast-shadow="true"></a-light>
                <a-light type="spot" color="#00aaff" intensity="2" position="0 4 0" target="#robot" angle="45"></a-light>

                {/* The Robot */}
                {/* Positioned to be visible behind windows, slightly to the right */}
                <a-entity 
                    id="robot"
                    gltf-model="#robot-model" 
                    position="1.5 -1.5 -3" 
                    scale="0.4 0.4 0.4" 
                    rotation="0 -30 0"
                    animation-mixer="clip: Idle; loop: repeat"
                    shadow="cast: true; receive: true"
                >
                     <a-animation attribute="rotation" dur="20000" fill="forwards" to="0 330 0" repeat="indefinite" easing="linear"></a-animation>
                </a-entity>
                
                {/* Decorative Floating Elements */}
                <a-box position="-2 1 -4" rotation="10 20 0" color="#000" scale="0.2 0.2 0.2" animation="property: rotation; to: 360 380 0; dur: 5000; easing: linear; loop: true"></a-box>
                <a-sphere position="3 2 -5" radius="0.2" color="#000" wireframe="true" animation="property: position; to: 3 2.5 -5; dur: 2000; dir: alternate; loop: true"></a-sphere>

                <a-camera position="0 1.6 0" look-controls-enabled="false" wasd-controls-enabled="false"></a-camera>
            </a-scene>
            {/* Overlay to prevent capturing mouse interactions too aggressively, allowing desktop clicks */}
            <div style={{position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none'}}></div>
        </div>
    );
};

const UserDesktop: React.FC<UserDesktopProps> = ({ username, onLogout }) => {
    const [windows, setWindows] = useState<WindowState[]>([]);
    const [desktopIcons, setDesktopIcons] = useState<DesktopIcon[]>([]);
    const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
    const zIndexCounter = React.useRef(100);
    const [pluginToEdit, setPluginToEdit] = useState<Plugin | null>(null);

    useEffect(() => {
        const fetchIcons = async () => {
            const icons = await getDesktopIcons('user');
            setDesktopIcons(icons);
        };
        fetchIcons();
        
        // Auto open windows arranged nicely around the robot
        setTimeout(() => {
            // Chat to the left
            openWindow('chat', 'Чат с Ботом', 'https://i.imgur.com/jV8o3aC.png');
            setWindows(prev => prev.map(w => w.id === 'chat' ? { ...w, pos: { x: 50, y: 50 }, size: { width: 400, height: 500 } } : w));
            
            // Council to the right (bottom)
            openWindow('agent-council', 'Совет ИИ', 'https://i.imgur.com/o2Y8haP.png');
             setWindows(prev => prev.map(w => w.id === 'agent-council' ? { ...w, pos: { x: window.innerWidth - 500, y: 100 }, size: { width: 450, height: 400 } } : w));

        }, 500);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    const openWindow = useCallback((id: string, title: string, iconUrl: string, existingPlugin?: Plugin | null) => {
        setWindows(prev => {
            const existingWindow = prev.find(w => w.id === id);
            if (existingWindow) {
                setActiveWindowId(id);
                return prev.map(w => w.id === id ? { ...w, zIndex: zIndexCounter.current++, isMinimized: false } : w);
            }
            
            zIndexCounter.current++;
            const size = defaultSizes[id] || defaultSizes['default'];
            // Cascade positions
            const newPos = { x: 50 + (prev.length % 10) * 30, y: 50 + (prev.length % 10) * 30 };

            if (id === 'creator-studio') {
                setPluginToEdit(existingPlugin || null);
            }

            const componentProps = {
                username,
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
    }, [username]);
    
    const handleOpenIDE = (plugin: Plugin | null) => {
        openWindow('creator-studio', 'IDE Студия', 'https://i.imgur.com/k9jB2Q1.png', plugin);
    };

    const closeWindow = (id: string) => {
        setWindows(prev => prev.filter(w => w.id !== id));
        if (activeWindowId === id) setActiveWindowId(null);
    };

    const focusWindow = (id: string) => {
        if (activeWindowId === id) return;
        zIndexCounter.current++;
        setWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: zIndexCounter.current } : w));
        setActiveWindowId(id);
    };

    const minimizeWindow = (id: string) => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: true } : w));
        if (activeWindowId === id) setActiveWindowId(null);
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
        <div className="h-full w-full relative overflow-hidden">
            {/* 3D Robot Background */}
            <RobotBackground />

            {/* UI Layer - Transparent background to show robot */}
            <div className="desktop" style={{ zIndex: 10, position: 'relative', height: 'calc(100% - 40px)', background: 'transparent' }}>
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
            <div style={{ zIndex: 99999, position: 'fixed', bottom: 0, left: 0, width: '100%' }}>
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
        </div>
    );
};

export default UserDesktop;
