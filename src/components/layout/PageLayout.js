import { theme } from "../../theme";
import BackButton from "../ui/BackButton";

export default function PageLayout({ title, subtitle, onSearch, children }) {
  return (
    <div
      style={{
        maxWidth: 420,
        margin: "auto",
        background: theme.background,
        minHeight: "100vh"
      }}
    >
      {/* STICKY HEADER */}
      <div
        style={{
          position: "sticky",
          top: 0,
          background: theme.background,
          padding: 16,
          zIndex: 10,
          borderBottom: `1px solid ${theme.border}`,
          boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
        }}
      >
        {/* BACK BUTTON */}
        <div style={{ marginBottom: 8 }}>
          <BackButton />
        </div>

        {/* TITLE */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 16
          }}
        >
          <h1
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: theme.text,
              margin: 0
            }}
          >
            {title}
          </h1>

          {subtitle && (
            <div
              style={{
                fontSize: 13,
                color: "#6B7280",
                marginTop: 4
              }}
            >
              {subtitle}
            </div>
          )}

          <div
            style={{
              width: 40,
              height: 3,
              background: theme.primary,
              margin: "8px auto 0",
              borderRadius: 2
            }}
          />
        </div>

        {/* SEARCH */}
        {onSearch && (
          <div style={{ marginTop: 8 }}>
            <input
              type="text"
              placeholder="Search anything (name, mobile, city, gst...)"
              onChange={(e) => onSearch(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: `1px solid ${theme.border}`,
                marginBottom: 16,
                fontSize: 14,
                outline: "none"
              }}
              onFocus={(e) => e.target.style.border = `1px solid ${theme.primary}`}
              onBlur={(e) => e.target.style.border = `1px solid ${theme.border}`}
            />
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div style={{ padding: "20px 16px", position: "relative", zIndex: 20 }}>
        {children}
      </div>
    </div>
  );
}