import React from 'react';
import { useNavigate } from 'react-router-dom';

function Landing() {
    const navigate = useNavigate();

    return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
            <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>
                🎯 Smart Task & Focus Manager
            </h1>
            <p style={{ fontSize: '20px', color: '#666', marginBottom: '40px' }}>
                Boost your productivity with smart task management and focus tracking
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '60px' }}>
                <button 
                    onClick={() => navigate('/register')}
                    style={{ 
                        padding: '15px 40px', 
                        fontSize: '18px', 
                        background: '#007bff', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '5px',
                        cursor: 'pointer'
                    }}
                >
                    Get Started Free
                </button>
                <button 
                    onClick={() => navigate('/login')}
                    style={{ 
                        padding: '15px 40px', 
                        fontSize: '18px', 
                        background: 'white', 
                        color: '#007bff', 
                        border: '2px solid #007bff', 
                        borderRadius: '5px',
                        cursor: 'pointer'
                    }}
                >
                    Login
                </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap', maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ flex: 1, minWidth: '250px', padding: '20px' }}>
                    <h3>✅ Task Management</h3>
                    <p>Organize tasks with priorities and due dates</p>
                </div>
                <div style={{ flex: 1, minWidth: '250px', padding: '20px' }}>
                    <h3>⏱️ Focus Timer</h3>
                    <p>Pomodoro sessions to boost concentration</p>
                </div>
                <div style={{ flex: 1, minWidth: '250px', padding: '20px' }}>
                    <h3>📊 Analytics</h3>
                    <p>Track productivity with beautiful charts</p>
                </div>
            </div>
        </div>
    );
}

export default Landing;