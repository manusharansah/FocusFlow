import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import FocusTimer from '../components/FocusTimer';

// Add below the task form:

function Dashboard() {
    const [tasks, setTasks] = useState([]);
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState('medium');
    const { user, logout } = useContext(AuthContext);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        const response = await api.get('/tasks/');
        setTasks(response.data);
    };

    const createTask = async (e) => {
        e.preventDefault();
        try {
            await api.post('/tasks/', { title, priority });
            setTitle('');
            fetchTasks();
        } catch (error) {
            alert(error.response?.data?.detail || 'Error creating task');
        }
    };

    const toggleComplete = async (id, completed) => {
        await api.patch(`/tasks/${id}/`, { completed: !completed });
        fetchTasks();
    };

    const deleteTask = async (id) => {
        await api.delete(`/tasks/${id}/`);
        fetchTasks();
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                    <h2>Dashboard - {user?.email}</h2>
                    {user?.is_premium && (
                        <span style={{
                            background: '#ffd700',
                            padding: '5px 10px',
                            borderRadius: '5px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}>
                            ⭐ PREMIUM
                        </span>
                    )}
                </div>
                <button onClick={logout}>Logout</button>
            </div>

            {!user?.is_premium && (
                <div style={{ background: '#fff3cd', padding: '10px', marginBottom: '20px' }}>
                    ⚠️ Free Plan: {tasks.length}/10 tasks used. <a href="/pricing">Upgrade to Premium</a>
                </div>
            )}

            <form onSubmit={createTask} style={{ marginBottom: '20px' }}>
                <input
                    type="text"
                    placeholder="Task title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    style={{ padding: '10px', width: '60%' }}
                />
                <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ padding: '10px', marginLeft: '10px' }}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                </select>
                <button type="submit" style={{ padding: '10px', marginLeft: '10px' }}>Add Task</button>
            </form>
            <FocusTimer />
            {/* <FocusTimer onTimerEnd={(taskId) => toggleComplete(taskId, false)} /> */}
            <div>
                {tasks.map(task => (
                    <div key={task.id} style={{
                        border: '1px solid #ddd',
                        padding: '10px',
                        marginBottom: '10px',
                        background: task.completed ? '#d4edda' : 'white'
                    }}>
                        <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => toggleComplete(task.id, task.completed)}
                        />
                        <span style={{
                            marginLeft: '10px',
                            textDecoration: task.completed ? 'line-through' : 'none'
                        }}>
                            {task.title} - <strong>{task.priority}</strong>
                        </span>
                        <button onClick={() => deleteTask(task.id)} style={{ float: 'right' }}>Delete</button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Dashboard;