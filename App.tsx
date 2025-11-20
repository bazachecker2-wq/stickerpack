
import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import MainLayout from './components/MainLayout';
import { Session } from './types';

const App: React.FC = () => {
  // Change default to 'user' to bypass auth
  const [session, setSession] = useState<Session>({ type: 'user', username: 'Designer' });
  const [loading, setLoading] = useState(true);
  // Default language: Russian
  const [language, setLanguage] = useState<'ru' | 'en'>('ru');

  useEffect(() => {
    // Simulate checking session but faster/immediate for UX
    setTimeout(() => {
      const adminAuth = sessionStorage.getItem('isAuthenticated');
      // const userAuth = sessionStorage.getItem('currentUser'); // Not needed for auto-login
      
      if (adminAuth === 'true') {
        setSession({ type: 'admin' });
      } 
      // Default is already user, so no else needed unless we want to restore specific username
      
      setLoading(false);
    }, 100); // Reduced delay
  }, []);

  const handleAdminLoginSuccess = () => {
    sessionStorage.setItem('isAuthenticated', 'true');
    setSession({ type: 'admin' });
  };
  
  const handleUserLoginSuccess = (username: string) => {
    sessionStorage.setItem('currentUser', username);
    setSession({ type: 'user', username });
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('currentUser');
    // On logout, we can go back to guest (Login screen) or just reset user
    setSession({ type: 'guest' }); 
  };
  
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: '#fff', color: '#000', fontFamily: "'Space Grotesk', sans-serif" }}>
        <h1 className="text-4xl font-black mb-4">SYSTEM INIT</h1>
        <div style={{width: '200px', height: '10px', border: '2px solid black', padding: '1px'}}>
             <div style={{height: '100%', backgroundColor: 'black', width: '100%', animation: 'progress-scan 1s infinite'}}></div>
        </div>
      </div>
    );
  }

  if (session.type === 'guest') {
    return (
      <Login 
        onAdminLoginSuccess={handleAdminLoginSuccess} 
        onUserLoginSuccess={handleUserLoginSuccess} 
        language={language}
        setLanguage={setLanguage}
      />
    );
  }
  
  return (
    <MainLayout 
      session={session} 
      onLogout={handleLogout} 
      language={language}
      setLanguage={setLanguage}
    />
  );
};

export default App;
