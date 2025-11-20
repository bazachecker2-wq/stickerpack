
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
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#F8F8F8', color: '#000', overflow: 'hidden' }}>
      <Sidebar
        sessionType={session.type}
        activeView={activeView}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        isOpen={isSidebarOpen}
        setIsOpen={setSidebarOpen}
        language={language}
      />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        <header style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px 24px',
            backgroundColor: '#FFFFFF',
            borderBottom: '3px solid #000000',
            zIndex: 10,
            justifyContent: 'space-between'
        }}>
             <div style={{display: 'flex', alignItems: 'center'}}>
                <button 
                    onClick={() => setSidebarOpen(!isSidebarOpen)} 
                    className="button"
                    style={{ padding: '0', minWidth: '40px', height: '40px', minHeight: '40px', marginRight: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 0 }}
                >
                    {isSidebarOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
                </button>
                <h1 style={{ fontSize: '28px', fontWeight: 900, margin: 0, letterSpacing: '-1px' }}>
                     {viewTitles[activeView]}
                </h1>
            </div>
            <div style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
                 <div style={{display: 'flex', border: '2px solid black', borderRadius: '0px', overflow: 'hidden'}}>
                    <button 
                        onClick={() => setLanguage('ru')} 
                        style={{
                            background: language === 'ru' ? 'black' : 'white', 
                            color: language === 'ru' ? 'white' : 'black',
                            border: 'none', 
                            padding: '5px 10px',
                            cursor: 'pointer', 
                            fontWeight: 'bold',
                            fontFamily: 'var(--font-heading)'
                        }}
                    >RU</button>
                    <button 
                        onClick={() => setLanguage('en')} 
                        style={{
                            background: language === 'en' ? 'black' : 'white', 
                            color: language === 'en' ? 'white' : 'black',
                            border: 'none', 
                            padding: '5px 10px',
                            cursor: 'pointer', 
                            fontWeight: 'bold',
                             fontFamily: 'var(--font-heading)'
                        }}
                    >EN</button>
                 </div>
                <div className="hidden md:flex items-center font-bold text-xs border-2 border-black px-3 py-1 uppercase bg-green-400 text-black shadow-[2px_2px_0px_black]">
                    {t.status_online}
                </div>
            </div>
        </header>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <Suspense fallback={
            <div className="h-full w-full flex flex-col items-center justify-center text-black">
                <div className="text-4xl font-black animate-bounce">LOADING...</div>
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
