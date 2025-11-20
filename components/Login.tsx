
import React, { useState } from 'react';
import { startUserSession } from '../services/mockApi';
import { translations } from '../utils/translations';

interface LoginProps {
    onAdminLoginSuccess: () => void;
    onUserLoginSuccess: (username: string) => void;
    language: 'ru' | 'en';
    setLanguage: (lang: 'ru' | 'en') => void;
}

const Login: React.FC<LoginProps> = ({ onAdminLoginSuccess, onUserLoginSuccess, language, setLanguage }) => {
    const [mode, setMode] = useState<'admin' | 'user'>('admin');
    const [userLogin, setUserLogin] = useState('');
    const [userError, setUserError] = useState('');

    const [adminLogin, setAdminLogin] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [adminError, setAdminError] = useState('');
    
    const t = translations[language].login;

    const handleAdminSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (adminLogin === 'admin' && adminPassword === 'admin') {
            onAdminLoginSuccess();
        } else {
            setAdminError(t.access_denied);
        }
    };

    const handleUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUserError('');
        if (!userLogin.trim()) {
            setUserError(t.identity_required);
            return;
        }
        await startUserSession(userLogin.trim());
        onUserLoginSuccess(userLogin.trim());
    };

    return (
        <div style={{
            backgroundColor: '#F0F0F0',
            backgroundImage: "radial-gradient(#000 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '480px',
                backgroundColor: '#FFFFFF',
                border: '4px solid #000000',
                boxShadow: '12px 12px 0px #000000',
                padding: '40px',
                position: 'relative'
            }}>
                {/* Language Switcher */}
                <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', border: '2px solid black' }}>
                    <button 
                        onClick={() => setLanguage('ru')} 
                        style={{
                            padding: '5px 10px', 
                            background: language === 'ru' ? 'black' : 'white',
                            color: language === 'ru' ? 'white' : 'black',
                            border: 'none',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >RU</button>
                    <button 
                         onClick={() => setLanguage('en')} 
                         style={{
                            padding: '5px 10px', 
                            background: language === 'en' ? 'black' : 'white',
                            color: language === 'en' ? 'white' : 'black',
                            border: 'none',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >EN</button>
                </div>

                <h1 style={{ fontSize: '42px', fontWeight: 900, marginBottom: '30px', lineHeight: 1 }}>
                    TELE.OS
                    <span style={{ fontSize: '14px', display: 'block', fontWeight: 400, fontFamily: 'var(--font-body)', marginTop: '5px' }}>SECURE GATEWAY v2.1</span>
                </h1>

                <div style={{ display: 'flex', marginBottom: '30px', gap: '10px' }}>
                    <button 
                        onClick={() => setMode('admin')}
                        style={{
                            flex: 1,
                            padding: '15px',
                            border: '2px solid black',
                            background: mode === 'admin' ? 'black' : 'transparent',
                            color: mode === 'admin' ? 'white' : 'black',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-heading)',
                            textTransform: 'uppercase'
                        }}
                    >
                        {t.root_access}
                    </button>
                    <button 
                         onClick={() => setMode('user')}
                         style={{
                            flex: 1,
                            padding: '15px',
                            border: '2px solid black',
                            background: mode === 'user' ? 'black' : 'transparent',
                            color: mode === 'user' ? 'white' : 'black',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-heading)',
                            textTransform: 'uppercase'
                        }}
                    >
                        {t.guest_user}
                    </button>
                </div>

                {mode === 'admin' ? (
                    <form onSubmit={handleAdminSubmit} style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                        <div>
                            <label style={{display: 'block', fontWeight: 700, marginBottom: '5px', textTransform: 'uppercase'}}>{t.root_id}</label>
                            <input 
                                type="text" 
                                className="input-field"
                                value={adminLogin}
                                onChange={e => setAdminLogin(e.target.value)}
                                autoFocus
                                style={{borderWidth: '2px'}}
                            />
                        </div>
                        <div>
                            <label style={{display: 'block', fontWeight: 700, marginBottom: '5px', textTransform: 'uppercase'}}>{t.pass_key}</label>
                            <input 
                                type="password" 
                                className="input-field"
                                value={adminPassword}
                                onChange={e => setAdminPassword(e.target.value)}
                                style={{borderWidth: '2px'}}
                            />
                             <div style={{fontSize: '12px', color: '#555', marginTop: '5px', textAlign: 'right', fontStyle: 'italic'}}>
                                {t.hint}
                             </div>
                        </div>
                        
                        {adminError && <div style={{background: '#000', color: '#fff', padding: '10px', fontWeight: 'bold'}}>{adminError}</div>}

                        <button type="submit" className="button" style={{width: '100%', marginTop: '10px', borderWidth: '2px'}}>
                            {t.execute}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleUserSubmit} style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                         <div style={{padding: '15px', border: '2px dashed #000', backgroundColor: '#f8f8f8', fontSize: '14px'}}>
                            {t.warning}
                         </div>
                        <div>
                            <label style={{display: 'block', fontWeight: 700, marginBottom: '5px', textTransform: 'uppercase'}}>{t.identity_string}</label>
                            <input 
                                type="text" 
                                className="input-field"
                                value={userLogin}
                                onChange={e => setUserLogin(e.target.value)}
                                placeholder={t.enter_name}
                                autoFocus
                                style={{borderWidth: '2px'}}
                            />
                        </div>

                        {userError && <div style={{background: '#000', color: '#fff', padding: '10px', fontWeight: 'bold'}}>{userError}</div>}

                        <button type="submit" className="button" style={{width: '100%', marginTop: '10px', borderWidth: '2px'}}>
                            {t.connect}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Login;
