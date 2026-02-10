import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';

function PaymentSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [verifying, setVerifying] = useState(true);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        verifyPayment();
    }, []);

    const verifyPayment = async () => {
        const sessionId = searchParams.get('session_id');
        
        if (!sessionId) {
            navigate('/pricing');
            return;
        }

        try {
            const response = await api.post('/payments/verify-payment/', {
                session_id: sessionId
            });
            
            if (response.data.success) {
                setSuccess(true);
                // Refresh user data
                window.location.href = '/dashboard';
            }
        } catch (error) {
            alert('Payment verification failed');
            navigate('/pricing');
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div style={{ textAlign: 'center', padding: '100px' }}>
            {verifying ? (
                <div>
                    <h2>Verifying your payment...</h2>
                    <p>Please wait...</p>
                </div>
            ) : success ? (
                <div>
                    <h1>🎉 Payment Successful!</h1>
                    <p>Welcome to Premium! Redirecting...</p>
                </div>
            ) : (
                <div>
                    <h2>Payment verification failed</h2>
                    <a href="/pricing">Try again</a>
                </div>
            )}
        </div>
    );
}

export default PaymentSuccess;