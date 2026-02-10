import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';

function Pricing() {
    const { user } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);

    const handleUpgrade = async () => {
        setLoading(true);
        try {
            const response = await api.post('/payments/create-checkout/');
            window.location.href = response.data.checkout_url;
        } catch (error) {
            alert('Error creating checkout session');
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
            <h1>Choose Your Plan</h1>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginTop: '40px' }}>
                {/* Free Plan */}
                <div style={{ 
                    border: '2px solid #ddd', 
                    padding: '30px', 
                    borderRadius: '10px',
                    width: '300px'
                }}>
                    <h2>Free</h2>
                    <h3>$0/month</h3>
                    <ul style={{ textAlign: 'left', lineHeight: '2' }}>
                        <li>✅ Up to 10 tasks</li>
                        <li>✅ Basic task management</li>
                        <li>❌ No focus timer</li>
                        <li>❌ No analytics</li>
                    </ul>
                    <button disabled style={{ padding: '10px 20px', marginTop: '20px' }}>
                        Current Plan
                    </button>
                </div>

                {/* Premium Plan */}
                <div style={{ 
                    border: '3px solid #007bff', 
                    padding: '30px', 
                    borderRadius: '10px',
                    width: '300px',
                    background: '#f0f8ff'
                }}>
                    <h2>Premium 🔥</h2>
                    <h3>$9.99/month</h3>
                    <ul style={{ textAlign: 'left', lineHeight: '2' }}>
                        <li>✅ Unlimited tasks</li>
                        <li>✅ Advanced task management</li>
                        <li>✅ Focus timer (Pomodoro)</li>
                        <li>✅ Productivity analytics</li>
                    </ul>
                    {user?.is_premium ? (
                        <button disabled style={{ padding: '10px 20px', marginTop: '20px' }}>
                            Current Plan ✓
                        </button>
                    ) : (
                        <button 
                            onClick={handleUpgrade} 
                            disabled={loading}
                            style={{ 
                                padding: '10px 20px', 
                                marginTop: '20px',
                                background: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer'
                            }}
                        >
                            {loading ? 'Processing...' : 'Upgrade Now'}
                        </button>
                    )}
                </div>
            </div>

            <p style={{ marginTop: '30px' }}>
                <a href="/dashboard">← Back to Dashboard</a>
            </p>
        </div>
    );
}

export default Pricing;