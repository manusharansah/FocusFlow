import React, { useState, useEffect, useContext } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';

function Analytics() {
    const { user } = useContext(AuthContext);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const response = await api.get('/analytics/stats/');
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    // 1. THE GUARD: This prevents the "Cannot read properties of null" error
    if (loading || !stats) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p>Analyzing your productivity...</p>
            </div>
        );
    }

    // 2. SAFE DATA MAPPING: Now that we know stats exists, we define our chart data
    const COLORS = ['#ff6384', '#36a2eb', '#ffce56'];
    
    // We use .toLowerCase() or bracket notation to handle case sensitivity from the API
    const priorityData = [
        { name: 'High', value: stats.tasks_by_priority?.high || stats.tasks_by_priority?.High || 0 },
        { name: 'Medium', value: stats.tasks_by_priority?.medium || stats.tasks_by_priority?.Medium || 0 },
        { name: 'Low', value: stats.tasks_by_priority?.low || stats.tasks_by_priority?.Low || 0 },
    ];

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h2 style={styles.title}>📊 Analytics Dashboard</h2>
                <p style={styles.subtitle}>Insights into your workflow and focus</p>
            </header>

            {/* Stats Cards */}
            <div style={styles.statsGrid}>
                <StatCard title="Total Tasks" value={stats.total_tasks} color="#28a745" />
                <StatCard title="Completed" value={stats.completed_tasks} color="#007bff" />
                <StatCard title="Pending" value={stats.pending_tasks} color="#ffc107" />
                {user?.is_premium && (
                    <StatCard 
                        title="Focus Time" 
                        value={`${stats.focus_data?.total_focus_time || 0} min`} 
                        color="#6f42c1" 
                    />
                )}
            </div>

            {/* Charts Section */}
            <div style={styles.chartGrid}>
                {/* Daily Completion Chart */}
                <div style={styles.chartCard}>
                    <h3 style={styles.chartTitle}>Daily Task Completion</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={stats.daily_completion}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip cursor={{fill: '#f5f5f5'}} />
                            <Legend />
                            <Bar dataKey="completed" fill="#007bff" radius={[4, 4, 0, 0]} name="Completed Tasks" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Priority Distribution */}
                <div style={styles.chartCard}>
                    <h3 style={styles.chartTitle}>Priority Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={priorityData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {priorityData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Focus Time Chart (Premium Only) */}
            {user?.is_premium && stats.focus_data?.daily_focus && (
                <div style={{ ...styles.chartCard, marginTop: '20px' }}>
                    <h3 style={styles.chartTitle}>Daily Focus Time (Last 7 Days)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={stats.focus_data.daily_focus}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="minutes" fill="#6f42c1" radius={[4, 4, 0, 0]} name="Focus Minutes" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {!user?.is_premium && (
                <div style={styles.upgradeCard}>
                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔒</div>
                    <h3>Unlock Focus Analytics</h3>
                    <p>Upgrade to Premium to track your deep work sessions.</p>
                    <button 
                        onClick={() => window.location.href = '/pricing'}
                        style={styles.upgradeButton}
                    >
                        View Pricing
                    </button>
                </div>
            )}
        </div>
    );
}

// Reusable Stat Card Component
const StatCard = ({ title, value, color }) => (
    <div style={{ ...styles.statCard, borderTop: `4px solid ${color}` }}>
        <h3 style={{ ...styles.statValue, color: color }}>{value}</h3>
        <p style={styles.statLabel}>{title}</p>
    </div>
);

const styles = {
    container: {
        padding: '30px',
        maxWidth: '1200px',
        margin: '0 auto',
        fontFamily: "'Inter', sans-serif",
    },
    header: {
        marginBottom: '30px',
    },
    title: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#1a1a1a',
        margin: 0,
    },
    subtitle: {
        color: '#666',
        marginTop: '5px',
    },
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        color: '#666',
    },
    statsGrid: {
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap',
        marginBottom: '40px',
    },
    statCard: {
        flex: 1,
        minWidth: '200px',
        backgroundColor: '#fff',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        textAlign: 'center',
    },
    statValue: {
        fontSize: '32px',
        margin: 0,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: '14px',
        color: '#888',
        margin: '5px 0 0 0',
        fontWeight: '500',
        textTransform: 'uppercase',
    },
    chartGrid: {
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap',
    },
    chartCard: {
        flex: 1,
        minWidth: '400px',
        backgroundColor: '#fff',
        padding: '25px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        border: '1px solid #f0f0f0',
    },
    chartTitle: {
        fontSize: '18px',
        marginBottom: '20px',
        color: '#333',
    },
    upgradeCard: {
        marginTop: '30px',
        backgroundColor: '#f8f9fa',
        border: '2px dashed #dee2e6',
        padding: '40px',
        borderRadius: '16px',
        textAlign: 'center',
    },
    upgradeButton: {
        backgroundColor: '#6f42c1',
        color: 'white',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '8px',
        fontWeight: '600',
        cursor: 'pointer',
        marginTop: '15px',
    },
};

export default Analytics;