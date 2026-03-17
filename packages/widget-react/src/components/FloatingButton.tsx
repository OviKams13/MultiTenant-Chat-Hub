import React from "react";

interface FloatingButtonProps {
  isOpen: boolean;
  onClick: () => void;
  label?: string;
  primaryColor?: string;
}

export const FloatingButton: React.FC<FloatingButtonProps> = ({
  isOpen,
  onClick,
  label = "Chat",
  primaryColor = "#2563eb",
}) => (
  <button
    aria-label={isOpen ? "Toggle chat (open)" : "Toggle chat (closed)"}
    type="button"
    onClick={onClick}
    style={{
      width: 56,
      height: 56,
      borderRadius: "50%",
      border: "none",
      color: "#fff",
      backgroundColor: primaryColor,
      cursor: "pointer",
      fontWeight: 600,
      boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
    }}
  >
    {isOpen ? "×" : label}
  </button>
);
