
import React from 'react';

interface AppInfo {
    id: string;
    label: string;
    iconUrl: string;
}

interface StartMenuProps {
    apps: AppInfo[];
    onAppClick: (id: string, label: string, iconUrl: string) => void;
    onLogout: () => void;
    onClose: () => void;
}

const StartMenu: React.FC<StartMenuProps> = ({ apps, onAppClick, onLogout, onClose }) => {
    const handleAppClick = (app: AppInfo) => {
        onAppClick(app.id, app.label, app.iconUrl);
        onClose();
    }
    
    const handleLogoutClick = () => {
        onLogout();
        onClose();
    }
    
    return (
        <div className="start-menu" style={{ zIndex: 2147483647 }}>
            <div className="start-menu-sidebar">
                <span><b>Telegent</b>OS 98</span>
            </div>
            <ul className="start-menu-items">
                {apps.map(app => (
                    <li key={app.id} className="start-menu-item" onClick={() => handleAppClick(app)}>
                        <img src={app.iconUrl} alt={app.label} style={{width: 24, height: 24}} />
                        <span><u>П</u>рограммы</span>
                        <span style={{marginLeft: 'auto'}}>&gt;</span>
                    </li>
                ))}
                <li className="start-menu-separator"></li>
                <li className="start-menu-item" onClick={handleLogoutClick}>
                     <img src="https://i.imgur.com/gK2Z01p.png" alt="Logout" style={{width: 24, height: 24}} />
                    <span><u>З</u>авершение работы...</span>
                </li>
            </ul>
        </div>
    );
};

export default StartMenu;
