
import React, { useState, useEffect, Suspense } from 'react';
import ReactDOM from 'react-dom';
import 'aframe';
import { Session, VRView } from '../types';

import Login from './Login';
import UserDesktop from './UserDesktop';
import Dashboard from './Dashboard';
import Plugins from './Plugins';
import CreatorStudio from './CreatorStudio';
import StickerCreator from './StickerCreator';
import Commands from './Commands';
import AdminChatsView from './AdminChatsView';
import Logs from './Logs';
import Settings from './Settings';
import Terminal from './Terminal';
import VREntity from './VREntity';
import DashboardIcon from './icons/DashboardIcon';
import PluginIcon from './icons/PluginIcon';
import CreatorStudioIcon from './icons/CreatorStudioIcon';
import StickerIcon from './icons/StickerIcon';
import CommandsIcon from './icons/CommandsIcon';
import ChatIcon from './icons/ChatIcon';
import LogsIcon from './icons/LogsIcon';
import SettingsIcon from './icons/SettingsIcon';
import TerminalIcon from './icons/TerminalIcon';
import LogoutIcon from './icons/LogoutIcon';

// Declare A-Frame elements to fix TypeScript errors
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

interface VRAppProps {
  onToggleMode: () => void;
}

const VRApp: React.FC<VRAppProps> = ({ onToggleMode }) => {
    const [session, setSession] = useState<Session>({ type: 'guest' });
    const [activeView, setActiveView] = useState<VRView>('login');
    const [isClient, setIsClient] = useState(false);
    const [modelColor, setModelColor] = useState('#00aaff');
    const [language, setLanguage] = useState<'ru' | 'en'>('ru');

    useEffect(() => {
        setIsClient(true); // Ensure A-Frame components only render on the client
        const adminAuth = sessionStorage.getItem('isAuthenticated');
        const userAuth = sessionStorage.getItem('currentUser');
        if (adminAuth === 'true') {
            setSession({ type: 'admin' });
            setActiveView('main-menu');
        } else if (userAuth) {
            setSession({ type: 'user', username: userAuth });
             setActiveView('user-login'); // Special view for logged-in user
        }
    }, []);

    const handleAdminLoginSuccess = () => {
        sessionStorage.setItem('isAuthenticated', 'true');
        setSession({ type: 'admin' });
        setActiveView('main-menu');
    };
    
    const handleUserLoginSuccess = (username: string) => {
        sessionStorage.setItem('currentUser', username);
        setSession({ type: 'user', username });
        setActiveView('user-login');
    };

    const handleLogout = () => {
        sessionStorage.removeItem('isAuthenticated');
        sessionStorage.removeItem('currentUser');
        setSession({ type: 'guest' });
        setActiveView('login');
    };
    
    const handleModelClick = () => {
        const colors = ['#00aaff', '#ff00ff', '#00ff00', '#ffff00'];
        const currentIndex = colors.indexOf(modelColor);
        const nextIndex = (currentIndex + 1) % colors.length;
        setModelColor(colors[nextIndex]);
    };

    const menuItems = [
      { id: 'dashboard', label: 'Панель', icon: DashboardIcon },
      { id: 'plugins', label: 'Плагины', icon: PluginIcon },
      { id: 'creator-studio', label: 'IDE Студия', icon: CreatorStudioIcon },
      { id: 'sticker-creator', label: 'Стикеры', icon: StickerIcon },
      { id: 'commands', label: 'Команды', icon: CommandsIcon },
      { id: 'chats', label: 'Чаты', icon: ChatIcon },
      { id: 'logs', label: 'Журналы', icon: LogsIcon },
      { id: 'settings', label: 'Настройки', icon: SettingsIcon },
      { id: 'terminal', label: 'Терминал', icon: TerminalIcon },
    ];
    
    const renderActiveView = () => {
      switch(activeView) {
        case 'login': return <VREntity position="0 1.6 -2.5" scale="1.5 1.5 1.5"><Login onAdminLoginSuccess={handleAdminLoginSuccess} onUserLoginSuccess={handleUserLoginSuccess} language={language} setLanguage={setLanguage} /></VREntity>
        case 'user-login': return <VREntity position="0 1.6 -3" scale="3 3 3"><UserDesktop username={session.username!} onLogout={handleLogout} /></VREntity>
        case 'dashboard': return <VREntity position="0 1.6 -4" scale="4 4 4"><Dashboard /></VREntity>
        case 'plugins': return <VREntity position="0 1.6 -4" scale="4 4 4"><Plugins onOpenIDE={() => setActiveView('creator-studio')} /></VREntity>
        case 'creator-studio': return <VREntity position="0 1.6 -4" scale="5 5 5"><CreatorStudio onSaveSuccess={() => setActiveView('main-menu')} /></VREntity>
        case 'sticker-creator': return <VREntity position="0 1.6 -4" scale="4 4 4"><StickerCreator /></VREntity>
        case 'commands': return <VREntity position="0 1.6 -4" scale="3 3 3"><Commands /></VREntity>
        case 'chats': return <VREntity position="0 1.6 -4" scale="4 4 4"><AdminChatsView /></VREntity>
        case 'logs': return <VREntity position="0 1.6 -4" scale="4 4 4"><Logs /></VREntity>
        case 'settings': return <VREntity position="0 1.6 -4" scale="3 3 3"><Settings /></VREntity>
        case 'terminal': return <VREntity position="0 1.6 -4" scale="4 4 4"><Terminal /></VREntity>
        default: return null;
      }
    }

    if (!isClient) {
        return null;
    }

    return (
      <a-scene cursor="rayOrigin: mouse; fuse: false">
        <a-assets>
            <a-asset-item id="core-model" src="https://cdn.glitch.global/e75643f2-a05b-4384-9591-39527a892a40/atom_model.glb?v=1717351610487"></a-asset-item>
            <img id="sky-texture" src="https://cdn.glitch.global/e75643f2-a05b-4384-9591-39527a892a40/space-sky.jpg?v=1717357930369" crossOrigin="anonymous" />
        </a-assets>

        <a-sky src="#sky-texture" rotation="0 -90 0"></a-sky>
        
        <a-plane material="color: #222; metalness: 0.8; roughness: 0.4; shader: standard" rotation="-90 0 0" scale="50 50 1"></a-plane>


        <a-entity light="type: ambient; color: #BBB; intensity: 0.5"></a-entity>
        <a-entity light="type: directional; color: #FFF; intensity: 0.8" position="-1 1 2"></a-entity>
        <a-entity light={`type: point; color: ${modelColor}; intensity: 2; distance: 10`} position="0 1.6 0"></a-entity>


        <a-entity id="cameraRig" position="0 0 2">
            <a-camera id="camera" look-controls wasd-controls="enabled: false">
                <a-cursor color="#00aaff" scale="0.5 0.5 0.5"></a-cursor>
            </a-camera>
        </a-entity>
        
        {/* Telegent Core Model */}
        <a-gltf-model 
            src="#core-model" 
            position="0 1.6 0" 
            scale="0.2 0.2 0.2"
            onClick={handleModelClick}
            material={`color: ${modelColor}; metalness: 0.8; roughness: 0.2`}
            >
            <a-animation attribute="rotation" dur="10000" fill="forwards" to="0 360 0" repeat="indefinite" easing="linear"></a-animation>
            <a-animation attribute="position" dur="3000" direction="alternate" from="0 1.55 0" to="0 1.65 0" repeat="indefinite" easing="easeInOutSine"></a-animation>
        </a-gltf-model>


        {/* UI Panels */}
        {activeView !== 'main-menu' && activeView !== 'login' && activeView !== 'user-login' && (
             <a-plane 
                onClick={() => setActiveView(session.type === 'admin' ? 'main-menu' : 'user-login')}
                position="-2.5 3 -3.5" rotation="0 20 0" width="1" height="0.3" color="#1e1e1e" material="shader: flat" opacity="0.8">
                <a-text value="< Назад в меню" align="center" color="white" width="2"></a-text>
            </a-plane>
        )}
        
        <VREntity position="2.5 3 -3.5" rotation="0 -20 0" scale="0.5 0.15 1">
            <button onClick={onToggleMode} className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded w-full h-full text-lg">
                Классический вид
            </button>
        </VREntity>
        
        {renderActiveView()}

        {activeView === 'main-menu' && (
            <a-entity position="0 1.6 0">
                {menuItems.map((item, index) => {
                    const angle = (index / menuItems.length) * Math.PI * 2;
                    const x = -Math.sin(angle) * 3;
                    const z = -Math.cos(angle) * 3;
                    const angleDeg = -angle * (180/Math.PI);
                    return (
                        <VREntity key={item.id} position={`${x} 0 ${z}`} rotation={`0 ${angleDeg} 0`} scale="1 1 1">
                             <div onClick={() => setActiveView(item.id as VRView)} className="w-[200px] h-[200px] bg-gray-800 bg-opacity-80 border-2 border-primary rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-primary hover:text-white transition-colors text-gray-200">
                                <item.icon className="h-16 w-16" />
                                <p className="mt-4 text-lg font-bold">{item.label}</p>
                            </div>
                        </VREntity>
                    )
                })}
                <VREntity position="0 -1.5 -3" scale="0.5 0.25 1" rotation="0 0 0">
                    <button onClick={handleLogout} className="bg-red-800/80 hover:bg-red-700/80 text-white font-bold py-2 px-4 rounded w-full h-full text-lg flex items-center justify-center">
                       <LogoutIcon className="h-6 w-6 mr-2" /> Выйти
                    </button>
                </VREntity>
            </a-entity>
        )}

      </a-scene>
    );
};

export default VRApp;
