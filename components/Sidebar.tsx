
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
        { id: 'agent-council', label: 'СОВЕТ ИИ', icon: CouncilIcon },
        { id: 'creator-studio', label: 'IDE КОД', icon: CreatorStudioIcon },
        { id: 'plugins', label: t.plugins, icon: PluginIcon },
        { id: 'ssh-terminal', label: 'SSH TERMINAL', icon: SSHIcon },
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
            {isOpen && (
                <div 
                    onClick={() => setIsOpen(false)}
                    style={{
                        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 998,
                    }}
                />
            )}

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                width: '260px',
                backgroundColor: '#FFFFFF',
                borderRight: '3px solid #000000',
                position: 'fixed',
                top: 0,
                left: 0,
                zIndex: 1000,
                transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isOpen ? '10px 0 0px rgba(0,0,0,1)' : 'none'
            }} className="md:translate-x-0 md:relative">
                
                {/* Header */}
                <div style={{ 
                    padding: '24px', 
                    borderBottom: '3px solid #000000', 
                    backgroundColor: '#000', 
                    color: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                }}>
                    <div className="flex justify-between items-center">
                        <h2 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-2px', margin: 0, lineHeight: 1 }}>TELE.OS</h2>
                        <button onClick={() => setIsOpen(false)} className="md:hidden font-bold text-white border border-white px-2">X</button>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono bg-white text-black px-1 font-bold">V 2.5.0</span>
                        <span className="text-[10px] font-mono text-gray-400">PRO</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav style={{ flex: 1, overflowY: 'auto', padding: '0' }} className="no-scrollbar">
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {navItems.map(item => {
                            const isActive = activeView === item.id;
                            return (
                                <li key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <button
                                        onClick={() => onNavigate(item.id as View | UserView)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            width: '100%',
                                            padding: '16px 24px',
                                            textDecoration: 'none',
                                            fontWeight: isActive ? 800 : 500,
                                            color: isActive ? '#FFFFFF' : '#000000',
                                            backgroundColor: isActive ? '#000000' : '#FFFFFF',
                                            textTransform: 'uppercase',
                                            fontSize: '13px',
                                            fontFamily: "'Space Grotesk', sans-serif",
                                            transition: 'all 0.1s',
                                            border: 'none',
                                            cursor: 'pointer',
                                            letterSpacing: '0.5px'
                                        }}
                                        className="hover:bg-gray-100 group"
                                    >
                                        <div style={{ 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                            width: '24px', height: '24px', marginRight: '16px',
                                            opacity: isActive ? 1 : 0.5 
                                        }}>
                                            <item.icon />
                                        </div>
                                        {item.label}
                                        {isActive && <span className="ml-auto font-mono text-xs">&lt;</span>}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Footer / Logout */}
                <div style={{ padding: '20px', borderTop: '3px solid #000000', backgroundColor: '#fff' }}>
                    <div className="mb-4 px-2">
                         <p className="text-xs font-bold text-gray-400 uppercase">Session ID</p>
                         <p className="text-xs font-mono truncate">{sessionType === 'admin' ? 'ROOT_ADMIN_SESSION' : 'USER_GUEST_SESSION'}</p>
                    </div>
                    <button
                        onClick={onLogout}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            padding: '14px',
                            fontWeight: 900,
                            color: '#000000',
                            backgroundColor: '#FFFFFF',
                            textTransform: 'uppercase',
                            border: '2px solid #000000',
                            boxShadow: '4px 4px 0px #000000',
                            transition: 'all 0.1s',
                            cursor: 'pointer'
                        }}
                        className="hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
                    >
                        <LogoutIcon style={{ height: '16px', width: '16px', marginRight: '10px' }}/>
                        {t.logout}
                    </button>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
