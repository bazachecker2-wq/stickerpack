
import React, { useState, Suspense } from 'react';
import { Session, View, UserView } from '../types';
import Sidebar from './Sidebar';
import MenuIcon from './icons/MenuIcon';
import CloseIcon from './icons/CloseIcon';
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
    'agent-council': 'СОВЕТ ИИ',
    'ssh-terminal': 'SSH TERMINAL',
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
    setSidebarOpen(false);
  };

  const handleCreatorStudioSave = () => {
    setCreatorStudioPlugin(null);
    setActiveView('plugins');
  }

  const ActiveComponent = componentMap[activeView];
  const componentProps: any = {
      isUserView: session.type === 'user',
      username: session.username,
      onOpenIDE: handleOpenIDE,
      onSaveSuccess: handleCreatorStudioSave,
      pluginToEdit: creatorStudioPlugin,
      language: language 
  };

  return (
    <div className="flex h-screen bg-[#F8F8F8] text-black overflow-hidden flex-col md:flex-row">
      <Sidebar
        sessionType={session.type}
        activeView={activeView}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        isOpen={isSidebarOpen}
        setIsOpen={setSidebarOpen}
        language={language}
      />
      <main className="flex-1 flex flex-col overflow-hidden relative w-full">
        <header className="flex items-center justify-between p-3 md:p-6 bg-white border-b-[3px] border-black z-10 shrink-0">
             <div className="flex items-center">
                <button 
                    onClick={() => setSidebarOpen(!isSidebarOpen)} 
                    className="button md:hidden mr-4 p-0 min-w-[40px] h-10 flex items-center justify-center rounded-none"
                >
                    {isSidebarOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
                </button>
                <h1 className="text-xl md:text-3xl font-black m-0 tracking-tighter truncate">
                     {viewTitles[activeView]}
                </h1>
            </div>
            <div className="flex gap-2 md:gap-5 items-center">
                 <div className="flex border-2 border-black rounded-none overflow-hidden shrink-0">
                    <button 
                        onClick={() => setLanguage('ru')} 
                        className={`px-2 py-1 md:px-3 md:py-1 font-bold font-heading cursor-pointer text-xs md:text-sm ${language === 'ru' ? 'bg-black text-white' : 'bg-white text-black'}`}
                    >RU</button>
                    <button 
                        onClick={() => setLanguage('en')} 
                        className={`px-2 py-1 md:px-3 md:py-1 font-bold font-heading cursor-pointer text-xs md:text-sm ${language === 'en' ? 'bg-black text-white' : 'bg-white text-black'}`}
                    >EN</button>
                 </div>
                <div className="hidden md:flex items-center font-bold text-xs border-2 border-black px-3 py-1 uppercase bg-green-400 text-black shadow-[2px_2px_0px_black]">
                    {t.status_online}
                </div>
            </div>
        </header>
        <div className="flex-1 overflow-y-auto p-2 md:p-6 w-full">
          <Suspense fallback={
            <div className="h-full w-full flex flex-col items-center justify-center text-black">
                <div className="text-2xl md:text-4xl font-black animate-bounce">LOADING...</div>
                <div className="mt-4 border-2 border-black w-48 h-4 p-0.5"><div className="h-full bg-black animate-pulse w-full"></div></div>
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
