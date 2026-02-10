import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import FocusTimer from '../components/FocusTimer';
import Analytics from '../components/Analytics';

function Dashboard() {
    const [tasks, setTasks] = useState([]);
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState('medium');
    const [loading, setLoading] = useState(true);
    const { user, logout } = useContext(AuthContext);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            const response = await api.get('/tasks/');
            setTasks(response.data);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const createTask = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        try {
            await api.post('/tasks/', { title, priority });
            setTitle('');
            fetchTasks(true);
        } catch (error) {
            alert(error.response?.data?.detail || 'Error creating task');
        }
    };

    const toggleComplete = async (id, completed) => {
        try {
            await api.patch(`/tasks/${id}/`, { completed: !completed });
            fetchTasks(true);
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    const deleteTask = async (id) => {
        if (window.confirm('Delete this task?')) {
            try {
                await api.delete(`/tasks/${id}/`);
                fetchTasks(true);
            } catch (error) {
                console.error('Error deleting task:', error);
            }
        }
    };

    const getPriorityColor = (priority) => {
        const colors = {
            high: '#ff4757',
            medium: '#ffa502',
            low: '#2ed573'
        };
        return colors[priority] || '#666';
    };

    const getPriorityBadge = (priority) => {
        const badges = {
            high: '🔴',
            medium: '🟡',
            low: '🟢'
        };
        return badges[priority] || '⚪';
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <h3 style={{ marginTop: '20px', color: '#666' }}>Loading FocusFlow...</h3>
            </div>
        );
    }

    const completedCount = tasks.filter(t => t.completed).length;
    const pendingCount = tasks.length - completedCount;

    return (
        <div style={styles.container}>
            {/* Header with Gradient */}
            <div style={styles.header}>
                <div style={styles.headerContent}>
                    <div>
                        <h1 style={styles.title}>FocusFlow Dashboard</h1>
                        <p style={styles.subtitle}>
                            👋 Welcome back, <strong>{user?.email}</strong>
                        </p>
                        {user?.is_premium && (
                            <span style={styles.premiumBadge}>
                                ⭐ PREMIUM MEMBER
                            </span>
                        )}
                    </div>
                    <button onClick={logout} style={styles.logoutBtn}>
                        🚪 Logout
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={styles.statsGrid}>
                <div style={{ ...styles.statCard, borderLeft: '4px solid #007bff' }}>
                    <div style={styles.statIcon}>📋</div>
                    <div>
                        <div style={styles.statNumber}>{tasks.length}</div>
                        <div style={styles.statLabel}>Total Tasks</div>
                    </div>
                </div>
                <div style={{ ...styles.statCard, borderLeft: '4px solid #28a745' }}>
                    <div style={styles.statIcon}>✅</div>
                    <div>
                        <div style={styles.statNumber}>{completedCount}</div>
                        <div style={styles.statLabel}>Completed</div>
                    </div>
                </div>
                <div style={{ ...styles.statCard, borderLeft: '4px solid #ffc107' }}>
                    <div style={styles.statIcon}>⏳</div>
                    <div>
                        <div style={styles.statNumber}>{pendingCount}</div>
                        <div style={styles.statLabel}>Pending</div>
                    </div>
                </div>
                <div style={{ ...styles.statCard, borderLeft: '4px solid #6f42c1' }}>
                    <div style={styles.statIcon}>🎯</div>
                    <div>
                        <div style={styles.statNumber}>{tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0}%</div>
                        <div style={styles.statLabel}>Completion</div>
                    </div>
                </div>
            </div>

            {/* Free User Warning */}
            {!user?.is_premium && (
                <div style={styles.upgradeCard}>
                    <div style={styles.upgradeIcon}>⚡</div>
                    <div style={{ flex: 1 }}>
                        <strong>Free Plan Active</strong>
                        <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
                            {tasks.length}/10 tasks used. Upgrade to unlock unlimited tasks & premium features!
                        </p>
                    </div>
                    <a href="/pricing" style={styles.upgradeBtn}>
                        Upgrade Now →
                    </a>
                </div>
            )}

            {/* Task Creation Card */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>➕ Create New Task</h3>
                <form onSubmit={createTask} style={styles.taskForm}>
                    <input
                        type="text"
                        placeholder="What needs to be done?"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        style={styles.input}
                    />
                    <select 
                        value={priority} 
                        onChange={(e) => setPriority(e.target.value)} 
                        style={styles.select}
                    >
                        <option value="low">🟢 Low</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="high">🔴 High</option>
                    </select>
                    <button type="submit" style={styles.addBtn}>
                        Add Task
                    </button>
                </form>
            </div>

            {/* Focus Timer */}
            <FocusTimer />

            {/* Task List */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>📝 Your Tasks</h3>
                {tasks.length === 0 ? (
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIcon}>📭</div>
                        <p style={styles.emptyText}>No tasks yet. Create your first task above!</p>
                    </div>
                ) : (
                    <div style={styles.taskList}>
                        {tasks.map(task => (
                            <div key={task.id} style={{
                                ...styles.taskItem,
                                background: task.completed ? '#f8f9fa' : 'white',
                                borderLeft: `4px solid ${getPriorityColor(task.priority)}`
                            }}>
                                <div style={styles.taskLeft}>
                                    <input
                                        type="checkbox"
                                        checked={task.completed}
                                        onChange={() => toggleComplete(task.id, task.completed)}
                                        style={styles.checkbox}
                                    />
                                    <div>
                                        <div style={{
                                            ...styles.taskTitle,
                                            textDecoration: task.completed ? 'line-through' : 'none',
                                            color: task.completed ? '#999' : '#333'
                                        }}>
                                            {task.title}
                                        </div>
                                        <div style={styles.taskMeta}>
                                            <span style={{
                                                ...styles.priorityBadge,
                                                background: getPriorityColor(task.priority) + '20',
                                                color: getPriorityColor(task.priority)
                                            }}>
                                                {getPriorityBadge(task.priority)} {task.priority}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => deleteTask(task.id)} 
                                    style={styles.deleteBtn}
                                    title="Delete task"
                                >
                                    🗑️
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Analytics */}
            <Analytics />
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    spinner: {
        width: '50px',
        height: '50px',
        border: '5px solid rgba(255,255,255,0.3)',
        borderTop: '5px solid white',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },
    header: {
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '16px',
        padding: '30px',
        marginBottom: '20px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
    },
    headerContent: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
    },
    title: {
        margin: 0,
        fontSize: '32px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        fontWeight: '700'
    },
    subtitle: {
        margin: '8px 0',
        color: '#666',
        fontSize: '16px'
    },
    premiumBadge: {
        display: 'inline-block',
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        color: 'white',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 'bold',
        marginTop: '8px'
    },
    logoutBtn: {
        background: '#ff4757',
        color: 'white',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        transition: 'all 0.3s',
        boxShadow: '0 4px 15px rgba(255,71,87,0.3)'
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '20px'
    },
    statCard: {
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
        transition: 'transform 0.2s',
        cursor: 'pointer'
    },
    statIcon: {
        fontSize: '32px'
    },
    statNumber: {
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#333'
    },
    statLabel: {
        fontSize: '12px',
        color: '#999',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginTop: '4px'
    },
    upgradeCard: {
        background: 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)',
        padding: '20px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        marginBottom: '20px',
        boxShadow: '0 4px 15px rgba(253,203,110,0.3)'
    },
    upgradeIcon: {
        fontSize: '32px'
    },
    upgradeBtn: {
        background: 'white',
        color: '#e17055',
        padding: '10px 20px',
        borderRadius: '8px',
        textDecoration: 'none',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        transition: 'transform 0.2s',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    },
    card: {
        background: 'white',
        borderRadius: '16px',
        padding: '25px',
        marginBottom: '20px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
    },
    cardTitle: {
        margin: '0 0 20px 0',
        fontSize: '20px',
        color: '#333',
        fontWeight: '600'
    },
    taskForm: {
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap'
    },
    input: {
        flex: '2',
        minWidth: '200px',
        padding: '14px',
        border: '2px solid #e0e0e0',
        borderRadius: '8px',
        fontSize: '15px',
        transition: 'border 0.3s',
        outline: 'none'
    },
    select: {
        flex: '0.6',
        minWidth: '130px',
        padding: '14px',
        border: '2px solid #e0e0e0',
        borderRadius: '8px',
        fontSize: '15px',
        cursor: 'pointer',
        outline: 'none'
    },
    addBtn: {
        flex: '0.6',
        minWidth: '120px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        padding: '14px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '15px',
        fontWeight: '600',
        transition: 'transform 0.2s',
        boxShadow: '0 4px 15px rgba(102,126,234,0.4)'
    },
    taskList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    taskItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '18px',
        border: '1px solid #f0f0f0',
        borderRadius: '10px',
        transition: 'all 0.3s',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
    },
    taskLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        flex: 1
    },
    checkbox: {
        width: '20px',
        height: '20px',
        cursor: 'pointer',
        accentColor: '#667eea'
    },
    taskTitle: {
        fontSize: '16px',
        fontWeight: '500',
        marginBottom: '5px'
    },
    taskMeta: {
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
    },
    priorityBadge: {
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        textTransform: 'capitalize'
    },
    deleteBtn: {
        background: 'transparent',
        border: 'none',
        fontSize: '20px',
        cursor: 'pointer',
        padding: '8px',
        borderRadius: '6px',
        transition: 'background 0.2s',
        opacity: 0.6
    },
    emptyState: {
        textAlign: 'center',
        padding: '60px 20px',
        color: '#999'
    },
    emptyIcon: {
        fontSize: '64px',
        marginBottom: '15px'
    },
    emptyText: {
        fontSize: '16px',
        margin: 0
    }
};

// Add CSS animation
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`, styleSheet.cssRules.length);

// Hover effects
if (typeof document !== 'undefined') {
    const addHoverEffect = (selector, hoverStyle) => {
        styleSheet.insertRule(`
            ${selector}:hover {
                ${Object.entries(hoverStyle).map(([k, v]) => 
                    `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`
                ).join('; ')}
            }
        `, styleSheet.cssRules.length);
    };
}

export default Dashboard;