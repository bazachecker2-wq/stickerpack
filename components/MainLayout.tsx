
import React, { useState, Suspense } from 'react';
import { Session, View, UserView } from '../types';
import Sidebar from './Sidebar';
import MenuIcon from './icons/MenuIcon';
import { Plugin } from '../types';
import { translations } from '../utils/translations';

const Dashboard = React.lazy(() => import('./Dashboard'));
const Plugins = React.lazy(() => import('./Plugins'));
const CreatorStudio = React.lazy(() => import('./CreatorStudio'));
const StickerCreator = React.lazy(() => import('./StickerCreator'));
const Commands = React.lazy(() => import('./Commands'));
const AdminChatsView = React.lazy(() => import('./AdminChatsView'));
const Logs = React.lazy(() => import('./Logs'));
const Settings = React.lazy(() => import('./Settings'));
const Terminal = React.lazy(() => import('./Terminal'));
const ChatView = React.lazy(() => import('./ChatView'));
const AgentCouncil = React.lazy(() => import('./AgentCouncil'));
const SSHTerminal = React.lazy(() => import('./SSHTerminal'));

const componentMap: { [key in View | UserView]: React.LazyExoticComponent<any> } = {
  'dashboard': Dashboard,
  'plugins': Plugins,
  'creator-studio': CreatorStudio,
  'sticker-creator': StickerCreator,
  'agent-council': AgentCouncil,
  'ssh-terminal': SSHTerminal,
  'commands': Commands,
  'chats': AdminChatsView,
  'logs': Logs,
  'settings': Settings,
  'terminal': Terminal,
  'chat': ChatView,
};

interface MainLayoutProps {
  session: Session;
  onLogout: () => void;
  language: 'ru' | 'en';
  setLanguage: (lang: 'ru' | 'en') => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ session, onLogout, language, setLanguage }) => {
  const initialView = session.type === 'admin' ? 'dashboard' : 'sticker-creator';
  const [activeView, setActiveView] = useState<View | UserView>(initialView);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [creatorStudioPlugin, setCreatorStudioPlugin] = useState<Plugin | null>(null);
  
  const t = translations[language].nav;

  const viewTitles: { [key in View | UserView]: string } = {
    'dashboard': t.dashboard,
    'plugins': t.plugins,
    'creator-studio': t.creator_studio,
    'sticker-creator': t.sticker_creator,
    'agent-council': t.agent_council,
    'ssh-terminal': t.ssh_terminal,
    'commands': t.commands,
    'chats': t.chats,
    'logs': t.logs,
    'settings': t.settings,
    'terminal': t.terminal,
    'chat': t.chat_bot,
  };

  const handleNavigate = (view: View | UserView) => {
    setActiveView(view);
    setSidebarOpen(false);
  };
  
  const handleOpenIDE = (plugin: Plugin | null) => {
    setCreatorStudioPlugin(plugin);
    setActiveView('creator-studio');
  };

  const handleCreatorStudioSave = () => {
    setCreatorStudioPlugin(null);
    setActiveView('plugins');
  }

  const componentProps: any = {
      isUserView: session.type === 'user',
      username: session.username,
      onOpenIDE: handleOpenIDE,
      onSaveSuccess: handleCreatorStudioSave,
      pluginToEdit: creatorStudioPlugin,
      language: language,
      onToggleMainSidebar: () => setSidebarOpen(prev => !prev) 
  };

  const ActiveComponent = componentMap[activeView];
  const isFullScreenApp = activeView === 'sticker-creator' || activeView === 'ssh-terminal';
  
  return (
    <div className="flex h-full bg-gray-100 text-black overflow-hidden flex-col md:flex-row font-mono">
      <Sidebar
        sessionType={session.type}
        activeView={activeView}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        isOpen={isSidebarOpen}
        setIsOpen={setSidebarOpen}
        language={language}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden relative w-full h-full border-l-0 md:border-l-2 border-black">
        {/* Brutalist Header */}
        <header className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 bg-white border-b-2 border-black z-20 shrink-0 shadow-sm">
             <div className="flex items-center gap-4">
                <button 
                    onClick={() => setSidebarOpen(!isSidebarOpen)} 
                    className="md:hidden p-2 bg-black text-white border-2 border-black hover:bg-gray-800 active:translate-y-1"
                >
                    <MenuIcon className="h-5 w-5" />
                </button>

                <div className="truncate max-w-[200px] md:max-w-none">
                    <h1 className="text-lg md:text-2xl font-black tracking-tight uppercase leading-none flex items-center gap-2 truncate">
                         <span className="text-yellow-500 text-xl md:text-2xl">■</span> {viewTitles[activeView]}
                    </h1>
                    {activeView === 'creator-studio' && creatorStudioPlugin && (
                         <span className="text-[9px] md:text-[10px] bg-yellow-200 border border-black px-1 font-bold uppercase truncate block mt-1">EDITING: {creatorStudioPlugin.name}</span>
                    )}
                </div>
            </div>

            <div className="flex gap-4 items-center">
                 <div className="flex border-2 border-black bg-white shadow-hard-sm">
                    <button 
                        onClick={() => setLanguage('ru')} 
                        className={`px-2 md:px-3 py-1 text-[10px] md:text-xs font-bold transition-all ${language === 'ru' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                    >RU</button>
                    <div className="w-[2px] bg-black"></div>
                    <button 
                        onClick={() => setLanguage('en')} 
                        className={`px-2 md:px-3 py-1 text-[10px] md:text-xs font-bold transition-all ${language === 'en' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                    >EN</button>
                 </div>
            </div>
        </header>

        {/* Content Area */}
        <div className={`flex-1 overflow-hidden w-full relative flex flex-col ${isFullScreenApp ? 'p-0' : 'p-3 md:p-8 bg-[#F0F0F0]'}`}>
          <Suspense fallback={
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
                <div className="flex flex-col items-center gap-4 border-2 border-black p-8 bg-white shadow-hard">
                    <div className="w-8 h-8 bg-black animate-spin"></div>
                    <span className="text-xs font-bold uppercase tracking-widest">LOADING MODULE...</span>
                </div>
            </div>
          }>
            <ActiveComponent {...componentProps} />
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
