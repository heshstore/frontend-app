import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    // TEMP LOGIN (replace later with backend)
    if (email === "admin@test.com" && password === "1234") {
      localStorage.setItem("token", "loggedin");
      localStorage.setItem("isLoggedIn", "true"); // persist login
      navigate("/dashboard");
    } else {
      alert("Invalid credentials");
    }
  };

  return (
    <div style={{ maxWidth: 300, margin: "100px auto", textAlign: "center" }}>
      <h2>Login</h2>

      <form onSubmit={handleLogin}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <br /><br />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <br /><br />

        <button type="submit">Login</button>
      </form>
    </div>
  );
}