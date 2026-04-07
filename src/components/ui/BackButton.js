import { useNavigate } from "react-router-dom";
import { theme } from "../../theme";

export default function BackButton() {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(-1)}
      style={{
        marginBottom: 10,
        padding: "4px 0",
        cursor: "pointer",
        color: theme.text,
        fontSize: 14,
        fontWeight: 500
      }}
    >
      ← Back
    </div>
  );
}