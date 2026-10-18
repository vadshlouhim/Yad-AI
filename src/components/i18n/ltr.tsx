import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@/lib/utils";

type LtrProps<T extends ElementType> = {
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "dir">;

export function Ltr<T extends ElementType = "span">({
  as,
  className,
  ...props
}: LtrProps<T>) {
  const Component = as ?? "span";
  return <Component dir="ltr" className={cn("text-left", className)} {...props} />;
}
