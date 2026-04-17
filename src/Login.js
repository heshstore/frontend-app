import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "./config";
import { theme, buttonStyle, inputStyle } from "./theme";
import { useAuth } from "./context/AuthContext";

export default function Login() {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const loginUrl = API_URL ? `${API_URL}/auth/login` : "/auth/login";

    try {
      const res = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: mobile.replace(/\s/g, "").trim(), password }),
      });

      if (res.ok) {
        const data = await res.json();
        login(data.access_token, data.user, data.permissions || []);
        navigate("/dashboard");
      } else {
        let errMsg = `Sign in failed (${res.status})`;
        try {
          const err = await res.json();
          errMsg = err.message || errMsg;
        } catch {
          const text = await res.text();
          if (text) errMsg = text.slice(0, 180);
        }
        setError(errMsg);
      }
    } catch (err) {
      // Fallback for development: allow local login if backend is unreachable
      if (mobile === "9876543210" && password === "1234") {
        localStorage.setItem("isLoggedIn", "true");
        navigate("/dashboard");
      } else {
        const hint =
          API_URL === ""
            ? " Start the Nest API on port 3000 (same machine). CRA proxy forwards /auth/login there."
            : ` Could not reach ${loginUrl}. If the UI is not on port 3000, set REACT_APP_API_URL or use an empty API base in dev with package.json "proxy".`;
        setError(
          (err && err.message ? err.message : "Network error") +
            hint
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: theme.surface,
        fontFamily: theme.fontFamily,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
          padding: 36,
          width: "100%",
          maxWidth: 360,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ color: theme.primary, margin: 0, fontSize: 28, fontWeight: 700 }}>
            Saachu
          </h1>
          <p style={{ color: theme.textMuted, margin: "6px 0 0", fontSize: 14 }}>
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 500, color: theme.text }}>
              Mobile (or email if you have one)
            </label>
            <input
              type="text"
              inputMode="tel"
              autoComplete="username"
              placeholder="e.g. 9000000001 or +91 9000000001"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 4, fontSize: 13, fontWeight: 500, color: theme.text }}>
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{ color: "#dc3545", fontSize: 13, marginBottom: 14, padding: "8px 12px", background: "#fff5f5", borderRadius: 4, border: "1px solid #f5c6cb" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ ...buttonStyle, width: "100%", padding: "10px", fontSize: 15, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
