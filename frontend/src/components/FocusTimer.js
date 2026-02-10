import React, { useState, useEffect, useContext, useCallback } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';

// Standardized constants
const FOCUS_TIME = 25 * 60;

function FocusTimer() {
    const { user } = useContext(AuthContext);
    const [timeLeft, setTimeLeft] = useState(FOCUS_TIME);
    const [isRunning, setIsRunning] = useState(false);
    const [sessions, setSessions] = useState([]);

    const fetchSessions = useCallback(async () => {
        try {
            const response = await api.get('/tasks/focus-sessions/');
            setSessions(response.data);
        } catch (error) {
            console.error('Error fetching sessions');
        }
    }, []);

    useEffect(() => {
        if (user?.is_premium) {
            fetchSessions();
        }
    }, [user, fetchSessions]);

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

    const handleSessionComplete = async () => {
        setIsRunning(false);
        // Using a notification or custom modal is better than alert for polish
        // But keeping functional logic for brevity
        try {
            await api.post('/tasks/focus-session/', {
                duration_minutes: 25,
                completed: true
            });
            fetchSessions();
        } catch (error) {
            console.error('Error saving session');
        }
        setTimeLeft(FOCUS_TIME);
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

    // UI Calculation for progress ring
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (timeLeft / FOCUS_TIME) * circumference;

    if (!user?.is_premium) {
        return (
            <div className="premium-upsell">
                <div className="upsell-icon">🔒</div>
                <h3>Focus Timer</h3>
                <p>Unlock the science-backed Pomodoro technique to double your productivity.</p>
                <a href="/pricing" className="btn-premium">Upgrade to Premium</a>
                <style>{`
                    .premium-upsell {
                        background: rgba(255, 255, 255, 0.05);
                        backdrop-filter: blur(10px);
                        border: 1px dashed rgba(255,255,255,0.2);
                        border-radius: 20px;
                        padding: 40px;
                        text-align: center;
                        color: #fff;
                        margin-top: 20px;
                    }
                    .upsell-icon { font-size: 3rem; margin-bottom: 10px; }
                    .btn-premium {
                        display: inline-block;
                        background: linear-gradient(135deg, #6e8efb, #a777e3);
                        color: white;
                        padding: 12px 24px;
                        border-radius: 30px;
                        text-decoration: none;
                        font-weight: bold;
                        transition: transform 0.2s;
                    }
                    .btn-premium:hover { transform: scale(1.05); }
                `}</style>
            </div>
        );
    }

    return (
        <div className="focus-card">
            <h3 className="card-title">🎯 Focus Session</h3>
            
            <div className="timer-container">
                <svg className="timer-svg" viewBox="0 0 160 160">
                    <circle className="timer-bg" cx="80" cy="80" r={radius} />
                    <circle 
                        className="timer-progress" 
                        cx="80" cy="80" r={radius} 
                        style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
                    />
                </svg>
                <div className="timer-text">{formatTime(timeLeft)}</div>
            </div>
            
            <div className="controls">
                <button 
                    className={`btn-main ${isRunning ? 'pause' : 'start'}`}
                    onClick={() => setIsRunning(!isRunning)}
                >
                    {isRunning ? 'Pause' : 'Start Focus'}
                </button>
                
                <button className="btn-reset" onClick={() => { setTimeLeft(FOCUS_TIME); setIsRunning(false); }}>
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                        <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                        <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                    </svg>
                </button>
            </div>
            
            <div className="stats-footer">
                <span className="label">Today's Focus</span>
                <span className="value">{getTodayFocusTime()} mins</span>
            </div>

            <style>{`
                .focus-card {
                    background: #1e1e2f;
                    border-radius: 24px;
                    padding: 30px;
                    color: white;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    max-width: 400px;
                    margin: 20px auto;
                    text-align: center;
                }
                .card-title { margin-bottom: 25px; font-weight: 300; letter-spacing: 1px; }
                
                .timer-container { position: relative; width: 200px; height: 200px; margin: 0 auto; }
                .timer-svg { transform: rotate(-90deg); width: 100%; height: 100%; }
                .timer-bg { fill: none; stroke: rgba(255,255,255,0.1); stroke-width: 8; }
                .timer-progress { 
                    fill: none; stroke: #00d2ff; stroke-width: 8; 
                    stroke-linecap: round; transition: stroke-dashoffset 0.5s linear;
                }
                .timer-text {
                    position: absolute; top: 50%; left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 3rem; font-weight: bold; font-family: 'Courier New', monospace;
                }

                .controls { display: flex; align-items: center; justify-content: center; gap: 15px; margin-top: 30px; }
                .btn-main {
                    padding: 12px 40px; border-radius: 50px; border: none;
                    font-size: 1.1rem; font-weight: bold; cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    color: white; box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                }
                .btn-main.start { background: #00c853; }
                .btn-main.pause { background: #ff3d00; }
                .btn-main:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.3); }

                .btn-reset {
                    background: rgba(255,255,255,0.1); color: white;
                    border: none; width: 50px; height: 50px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; transition: background 0.2s;
                }
                .btn-reset:hover { background: rgba(255,255,255,0.2); }

                .stats-footer {
                    margin-top: 30px; padding-top: 20px;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    display: flex; justify-content: space-between;
                }
                .label { color: #888; font-size: 0.9rem; }
                .value { color: #00d2ff; font-weight: bold; }
            `}</style>
        </div>
    );
}

export default FocusTimer;