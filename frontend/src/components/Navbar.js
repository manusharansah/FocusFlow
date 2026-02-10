import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Navbar() {
    const { user, logout } = useContext(AuthContext);

    return (
        <nav style={{ 
            background: '#007bff', 
            padding: '15px 30px', 
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        }}>
            <Link to="/" style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', textDecoration: 'none' }}>
                🎯 Smart Focus Manager
            </Link>
            
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                {user ? (
                    <>
                        <Link to="/dashboard" style={{ color: 'white' }}>Dashboard</Link>
                        <Link to="/pricing" style={{ color: 'white' }}>Pricing</Link>
                        <span style={{ color: '#ffd700' }}>{user.email}</span>
                        <button onClick={logout} style={{ background: 'white', color: '#007bff', border: 'none', padding: '5px 15px', borderRadius: '5px' }}>
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <Link to="/login" style={{ color: 'white' }}>Login</Link>
                        <Link to="/register" style={{ color: 'white' }}>Sign Up</Link>
                    </>
                )}
            </div>
        </nav>
    );
}

export default Navbar;