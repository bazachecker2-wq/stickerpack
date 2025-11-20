import React from 'react';

interface StatusBarProps {
    children: React.ReactNode;
}

const StatusBar: React.FC<StatusBarProps> = ({ children }) => {
    return (
        <div className="status-bar">
            {children}
        </div>
    );
};

export default StatusBar;
