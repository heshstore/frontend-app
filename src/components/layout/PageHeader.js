import { useNavigate } from "react-router-dom";
import { theme } from "../../theme";

export default function PageHeader({
  title,
  onSearch,
  showCreate,
  onCreate
}) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 20,
        flexWrap: "wrap"
      }}
    >
      <button
        onClick={() => navigate(-1)}
        style={{
          background: theme.colors.primary,
          color: "#fff",
          border: "none",
          padding: "6px 10px",
          borderRadius: 6,
          cursor: "pointer"
        }}
      >
        ← Back
      </button>

      <h2 style={{ margin: 0 }}>{title}</h2>

      <input
        placeholder="Search..."
        onChange={(e) => onSearch && onSearch(e.target.value)}
        style={{
          marginLeft: "auto",
          padding: "8px",
          border: `1px solid ${theme.colors.border}`,
          borderRadius: 6
        }}
      />

      {showCreate && (
        <button
          onClick={onCreate}
          style={{
            background: theme.colors.primary,
            color: "#fff",
            border: "none",
            padding: "8px 14px",
            borderRadius: 6,
            cursor: "pointer"
          }}
        >
          + Create
        </button>
      )}
    </div>
  );
}