
import React, { useState } from 'react';
import { supabase } from '../../api/supabaseClient';
import { Link } from 'react-router-dom';

export function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const handleReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        setError(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;

            setMessage('Check your email for the password reset link.');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6">
            <div className="bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-sm border border-gray-600">
                <h2 className="text-2xl font-bold text-blue-100 mb-6 text-center">Reset Password</h2>

                {message && <div className="bg-green-500/20 text-green-200 p-3 rounded mb-4 text-center">{message}</div>}
                {error && <div className="bg-red-500/20 text-red-200 p-3 rounded mb-4 text-center">{error}</div>}

                <form onSubmit={handleReset} className="space-y-6">
                    <div>
                        <label className="block text-gray-300 mb-2">Enter your email address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-2 rounded font-semibold text-white transition ${loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <Link to="/" className="text-blue-400 hover:underline">Back to Login</Link>
                </div>
            </div>
        </div>
    );
}
