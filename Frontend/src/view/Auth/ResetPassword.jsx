
import React, { useState, useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useNavigate } from 'react-router-dom';

export function ResetPassword() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        // Check if we have a session (handled by Supabase auto-detecting the hash)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                // If no session, maybe link expired or direct access
                setError("Invalid or expired reset link. Please try again.");
            }
        });

        // Listen for auth state changes (RECOVERY event)
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === "PASSWORD_RECOVERY") {
                // Valid recovery flow
                setError(null);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({ password });

            if (error) throw error;

            setMessage("Password updated successfully! Redirecting to login...");
            setTimeout(() => {
                navigate("/");
            }, 3000);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6">
            <div className="bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-sm border border-gray-600">
                <h2 className="text-2xl font-bold text-blue-100 mb-6 text-center">Set New Password</h2>

                {message && <div className="bg-green-500/20 text-green-200 p-3 rounded mb-4 text-center">{message}</div>}
                {error && <div className="bg-red-500/20 text-red-200 p-3 rounded mb-4 text-center">{error}</div>}

                <form onSubmit={handleUpdate} className="space-y-6">
                    <div>
                        <label className="block text-gray-300 mb-2">New Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                            placeholder="Enter new password"
                            required
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || error === "Invalid or expired reset link. Please try again."}
                        className={`w-full py-2 rounded font-semibold text-white transition ${loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
