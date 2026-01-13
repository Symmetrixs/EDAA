import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export function useLoginViewModel() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await api.post('/auth/login', {
                email: email,
                password: password
            });

            console.log("Login Success:", response.data);

            // Update Global State
            // Fix: Merge access_token so AuthContext saves it correctly
            const authData = {
                ...response.data.user,
                access_token: response.data.access_token
            };
            login(authData);

            // Redirect based on role
            const userRole = response.data.user.role;
            if (userRole === "admin") {
                navigate("/admin");
            } else {
                navigate("/dashboard");
            }

        } catch (err) {
            console.error("Login Failed:", err);
            setError(err.response?.data?.detail || "Login failed. Check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return {
        email, setEmail,
        password, setPassword,
        error,
        loading,
        handleLogin
    };
}
