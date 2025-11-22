
import React from 'react';
import { View, UserView, Session } from '../types';
import { translations } from '../utils/translations';
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
import CouncilIcon from './icons/CouncilIcon';
import SSHIcon from './icons/SSHIcon';

interface SidebarProps {
    sessionType: Session['type'];
    activeView: View | UserView;
    onNavigate: (view: View | UserView) => void;
    onLogout: () => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    language: 'ru' | 'en';
}

const Sidebar: React.FC<SidebarProps> = ({ sessionType, activeView, onNavigate, onLogout, isOpen, setIsOpen, language }) => {
    const t = translations[language].nav;
    
    const navItems = [
        { id: 'dashboard', label: t.dashboard, icon: DashboardIcon },
        { id: 'sticker-creator', label: 'ФОТО СТУДИЯ', icon: StickerIcon },
        { id: 'ssh-terminal', label: 'SSH TERMINAL', icon: SSHIcon },
        { id: 'agent-council', label: 'СОВЕТ ИИ', icon: CouncilIcon },
        { id: 'creator-studio', label: 'IDE КОД', icon: CreatorStudioIcon },
        { id: 'plugins', label: t.plugins, icon: PluginIcon },
        { id: 'terminal', label: t.terminal, icon: TerminalIcon },
        { id: 'chats', label: t.chats, icon: ChatIcon },
        { id: 'commands', label: t.commands, icon: CommandsIcon },
        { id: 'logs', label: t.logs, icon: LogsIcon },
        { id: 'settings', label: t.settings, icon: SettingsIcon },
    ];

    if (sessionType === 'user') {
         navItems.push({ id: 'chat', label: t.chat_bot, icon: ChatIcon });
    }

    return (
        <>
            {/* Overlay for Mobile */}
            <div 
                onClick={() => setIsOpen(false)}
                className={`fixed inset-0 bg-black/50 z-[60] md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            />

            <div 
                className={`
                    fixed md:relative top-0 left-0 h-full z-[70]
                    bg-[#F0F0F0] border-r-2 border-black
                    transition-transform duration-300 ease-out font-mono
                    ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    w-[280px] md:w-auto flex flex-col
                    shadow-hard md:shadow-none
                `}
            >
                
                {/* Header */}
                <div className="p-6 border-b-2 border-black bg-white flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-black tracking-tighter leading-none italic">TELE.OS</h2>
                        <div className="flex items-center gap-2 mt-1">
                             <div className="w-2 h-2 bg-green-500 border border-black"></div>
                             <p className="text-[10px] font-bold uppercase">v2.5.0 PRO</p>
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="md:hidden font-bold text-xl w-8 h-8 border-2 border-black flex items-center justify-center bg-black text-white">✕</button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-4 no-scrollbar bg-[#F0F0F0] pb-safe">
                    <ul className="space-y-2">
                        {navItems.map(item => {
                            const isActive = activeView === item.id;
                            const Icon = item.icon;
                            return (
                                <li key={item.id}>
                                    <button
                                        onClick={() => onNavigate(item.id as View | UserView)}
                                        className={`
                                            w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-wide border-2 transition-all duration-150 flex items-center gap-3 group
                                            ${isActive 
                                                ? 'bg-black text-white border-black shadow-hard-sm translate-x-[-2px] translate-y-[-2px]' 
                                                : 'bg-white text-gray-500 border-black hover:bg-yellow-100 hover:text-black hover:shadow-hard-sm'
                                            }
                                        `}
                                    >
                                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-black'}`} />
                                        <span className="flex-1">{item.label}</span>
                                        {isActive && <span className="text-yellow-400">●</span>}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Footer */}
                <div className="p-4 border-t-2 border-black bg-white pb-safe">
                    <div className="bg-gray-100 border-2 border-black p-2 mb-4 text-center">
                         <p className="text-[10px] text-gray-500 uppercase font-bold">SESSION ID</p>
                         <p className="text-xs font-mono font-bold">{sessionType === 'admin' ? 'ROOT_8492' : 'USER_1123'}</p>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center py-2 text-xs font-bold uppercase text-black border-2 border-black hover:bg-red-500 hover:text-white transition-colors gap-2 shadow-hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                    >
                        <LogoutIcon className="w-4 h-4" />
                        {t.logout}
                    </button>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
