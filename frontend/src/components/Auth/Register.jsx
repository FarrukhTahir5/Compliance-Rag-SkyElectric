import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, Loader2, ShieldCheck, Layout } from 'lucide-react';
import { motion } from 'framer-motion';

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (password.length < 8) {
            setError('Code must be at least 8 segments long.');
            setLoading(false);
            return;
        }

        try {
            await register(email, password);
        } catch (err) {
            setError('Database synchronization failed. ID might already exist.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at 100% 100%, #f0f9ff 0%, #ffffff 50%, #f5f3ff 100%)',
            padding: '20px'
        }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card"
                style={{
                    width: '100%',
                    maxWidth: '440px',
                    padding: '48px',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Decorative Elements */}
                <div style={{ position: 'absolute', bottom: '-100px', left: '-100px', width: '200px', height: '200px', background: 'rgba(14, 165, 233, 0.15)', filter: 'blur(80px)', borderRadius: '50%' }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            background: 'linear-gradient(135deg, var(--secondary), var(--primary))',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px',
                            boxShadow: '0 8px 16px rgba(14, 165, 233, 0.2)'
                        }}>
                            <Layout color="white" size={32} />
                        </div>
                        <h2 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>Operative Setup</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Register with the neural network</p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ x: -10 }}
                            animate={{ x: 0 }}
                            style={{
                                background: 'rgba(239, 68, 68, 0.05)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                color: '#dc2626',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                marginBottom: '24px',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}
                        >
                            <ShieldCheck size={16} /> {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="email"
                                placeholder="Primary Operative Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="glass-input"
                                style={{ width: '100%', paddingLeft: '48px' }}
                                required
                            />
                        </div>

                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="password"
                                placeholder="Secure Neural Code (min 8 characters)"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="glass-input"
                                style={{ width: '100%', paddingLeft: '48px' }}
                                required
                                minLength={8}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary"
                            style={{ width: '100%', padding: '16px', marginTop: '12px' }}
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <><UserPlus size={20} /> Create Operative ID</>}
                        </button>
                    </form>

                    <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)' }}>
                        Already have access? {' '}
                        <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
                            Log In
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Register;
