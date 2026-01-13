import React, { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import CompanyLogo from '../../assets/company-logo.png';
import { useLoginViewModel } from '../../model/Login';

export function Login() {
  const {
    email, setEmail,
    password, setPassword,
    error,
    loading,
    handleLogin
  } = useLoginViewModel();

  const canvasRef = useRef(null);

  // --- Network Background Effect ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const nodes = [];
    const nodeCount = 60;

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: 1.5 + Math.random() * 1.5
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#4f46e5"; // node color
      ctx.strokeStyle = "rgba(79, 70, 229, 0.2)"; // line color

      // Move nodes and draw lines
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();

        // Connect nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n.x - n2.x;
          const dy = n.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-900">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full"></canvas>

      {/* Login Card */}
      <div className="relative z-10 p-10 rounded-3xl w-full max-w-sm 
                     bg-gray-800/90 backdrop-blur-md 
                     border-4 border-blue-300/90
                     shadow-2xl shadow-blue-700/50
                     hover:scale-105 transition-transform duration-500 ease-in-out">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src={CompanyLogo}
            alt="Company Logo"
            className="h-24 w-auto"
          />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-center mb-8 text-blue-100 drop-shadow-lg">
          Login 🔑
        </h1>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 text-red-200 p-3 rounded-lg text-sm text-center mb-4 border border-red-500/50">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <input
            type="email"
            placeholder="Email"
            className="w-full border border-gray-600 bg-gray-900 text-blue-100 placeholder-blue-300 focus:ring-blue-500 focus:border-blue-500 rounded-xl px-4 py-2 transition duration-300 ease-in-out"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full border border-gray-600 bg-gray-900 text-blue-100 placeholder-blue-300 focus:ring-blue-500 focus:border-blue-500 rounded-xl px-4 py-2 transition duration-300 ease-in-out"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300 hover:underline">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white font-semibold py-2.5 rounded-xl transition duration-300 ease-in-out shadow-lg 
                ${loading ? "bg-gray-600 cursor-not-allowed" : "bg-blue-700 hover:bg-blue-800 hover:shadow-2xl"}`}
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="text-sm text-center text-blue-200 mt-6">
          Don’t have an account?{" "}
          <Link
            to="/register"
            className="text-blue-400 font-medium hover:text-blue-300 hover:underline transition duration-150 ease-in-out"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
