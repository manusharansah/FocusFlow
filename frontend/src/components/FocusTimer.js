import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';

function FocusTimer() {
    const { user } = useContext(AuthContext);
    const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
    const [isRunning, setIsRunning] = useState(false);
    const [sessions, setSessions] = useState([]);

    useEffect(() => {
        if (user?.is_premium) {
            fetchSessions();
        }
    }, [user]);

    useEffect(() => {
        let interval = null;
        
        if (isRunning && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(time => time - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            handleSessionComplete();
        }
        
        return () => clearInterval(interval);
    }, [isRunning, timeLeft]);

    const fetchSessions = async () => {
        try {
            const response = await api.get('/tasks/focus-sessions/');
            setSessions(response.data);
        } catch (error) {
            console.error('Error fetching sessions');
        }
    };

    const handleSessionComplete = async () => {
        setIsRunning(false);
        alert('🎉 Focus session completed!');
        
        try {
            await api.post('/tasks/focus-session/', {
                duration_minutes: 25,
                completed: true
            });
            fetchSessions();
        } catch (error) {
            console.error('Error saving session');
        }
        
        setTimeLeft(25 * 60);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getTodayFocusTime = () => {
        const today = new Date().toDateString();
        return sessions
            .filter(s => new Date(s.started_at).toDateString() === today)
            .reduce((total, s) => total + s.duration_minutes, 0);
    };

    if (!user?.is_premium) {
        return (
            <div style={{ border: '2px dashed #ddd', padding: '20px', textAlign: 'center', marginTop: '20px' }}>
                <h3>🔒 Focus Timer (Premium Only)</h3>
                <p>Upgrade to premium to unlock Pomodoro timer!</p>
                <a href="/pricing"><button>Upgrade Now</button></a>
            </div>
        );
    }

    return (
        <div style={{ border: '2px solid #007bff', padding: '20px', marginTop: '20px', borderRadius: '10px' }}>
            <h3>🎯 Focus Timer</h3>
            
            <div style={{ textAlign: 'center', fontSize: '48px', margin: '20px 0' }}>
                {formatTime(timeLeft)}
            </div>
            
            <div style={{ textAlign: 'center' }}>
                {!isRunning ? (
                    <button 
                        onClick={() => setIsRunning(true)}
                        style={{ padding: '15px 30px', fontSize: '18px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    >
                        Start Focus
                    </button>
                ) : (
                    <button 
                        onClick={() => setIsRunning(false)}
                        style={{ padding: '15px 30px', fontSize: '18px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    >
                        Pause
                    </button>
                )}
                
                <button 
                    onClick={() => { setTimeLeft(25 * 60); setIsRunning(false); }}
                    style={{ padding: '15px 30px', fontSize: '18px', marginLeft: '10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                >
                    Reset
                </button>
            </div>
            
            <div style={{ marginTop: '20px', padding: '10px', background: '#f8f9fa', borderRadius: '5px' }}>
                <strong>Today's Focus Time:</strong> {getTodayFocusTime()} minutes
            </div>
        </div>
    );
}

export default FocusTimer;