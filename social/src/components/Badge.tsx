import React from "react";
import { colors, fonts, SOURCE_COLORS, TRANSACTION_COLORS } from "../tokens/design";

export const SourceBadge: React.FC<{ source: string; size?: number }> = ({
  source,
  size = 14,
}) => {
  const style = SOURCE_COLORS[source] ?? {
    bg: colors.creamDark,
    text: colors.warmGray,
    border: colors.warmGrayLight,
  };

  return (
    <span
      style={{
        fontFamily: fonts.sans,
        fontSize: size,
        fontWeight: 600,
        padding: "4px 12px",
        borderRadius: 20,
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        textTransform: "capitalize",
      }}
    >
      {source}
    </span>
  );
};

export const TransactionBadge: React.FC<{
  type: string;
  size?: number;
}> = ({ type, size = 14 }) => {
  const style = TRANSACTION_COLORS[type] ?? TRANSACTION_COLORS.sale;
  const label = type === "sale" ? "Shitje" : "Qira";

  return (
    <span
      style={{
        fontFamily: fonts.sans,
        fontSize: size,
        fontWeight: 600,
        padding: "4px 14px",
        borderRadius: 20,
        backgroundColor: style.bg,
        color: style.text,
      }}
    >
      {label}
    </span>
  );
};
