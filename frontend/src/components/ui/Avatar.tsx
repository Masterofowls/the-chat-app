type AvatarProps = {
  name: string;
  image?: string | null;
  online?: boolean | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizes = {
  sm: 36,
  md: 44,
  lg: 64,
  xl: 112,
};

export function Avatar({ name, image, online, size = "md", className = "" }: AvatarProps) {
  const px = sizes[size];
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span
      className={`avatar ${className}`}
      data-online={online == null ? "unknown" : String(online)}
      style={{ width: px, height: px, fontSize: Math.round(px * 0.34) }}
      aria-hidden={!image}
    >
      {image ? <img src={image} alt="" /> : <span className="avatar-initials">{initials || "?"}</span>}
    </span>
  );
}
