"use client";

import { Loader2, Pause, Play } from "lucide-react";
import { FloatButton } from "antd";
import type { ComponentProps } from "react";

type AntFloatButtonProps = ComponentProps<typeof FloatButton>;

interface AutomationFloatButtonProps {
  active: boolean;
  loading?: boolean;
  onClick: () => void;
  className?: string;
  title?: string;
}

export function AutomationFloatButton({
  active,
  loading = false,
  onClick,
  className,
  title,
}: AutomationFloatButtonProps) {
  const Icon = loading ? Loader2 : active ? Pause : Play;
  const label = title ?? (active ? "Desactiver l'automatisation" : "Activer l'automatisation");

  const style: AntFloatButtonProps["style"] = {
    position: "static",
    insetInlineEnd: "auto",
    backgroundColor: active ? "#16a34a" : "#dc2626",
    color: "#ffffff",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.14)",
  };

  return (
    <FloatButton
      aria-label={label}
      className={className}
      description={active ? "ON" : "OFF"}
      icon={<Icon className={`size-4 ${loading ? "animate-spin" : ""}`} />}
      onClick={loading ? undefined : onClick}
      shape="square"
      style={style}
      tooltip={label}
      type="primary"
    />
  );
}

export default AutomationFloatButton;
