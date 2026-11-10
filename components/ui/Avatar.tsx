export function initials(name: string): string {
  return name
    .replace(/[^a-zA-Z\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export interface AvatarProps {
  name: string;
  variant?: "default" | "onCourt";
  className?: string;
}

export function Avatar({ name, variant = "default", className }: AvatarProps) {
  const base =
    "grid flex-none place-items-center rounded-xl border text-[11px] font-extrabold";
  const styles =
    variant === "onCourt"
      ? "size-[30px] border-transparent bg-white text-[#4b8fc8]"
      : "size-[33px] border-[#e3f0fb] bg-[linear-gradient(145deg,#e3f2ff,#f0f8ff)] text-[#4b8fc8]";

  return (
    <span className={[base, styles, className].filter(Boolean).join(" ")}>
      {initials(name)}
    </span>
  );
}

