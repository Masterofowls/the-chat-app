type AvatarProps = {
  name: string;
  image?: string | null;
  online?: boolean | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showStatus?: boolean;
};

const sizes = {
  sm: 36,
  md: 44,
  lg: 64,
  xl: 120,
};

export function Avatar({
  name,
  image,
  online,
  size = "md",
  className = "",
  showStatus = true,
}: AvatarProps) {
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
      data-online={online == null ? "unknown" : String(Boolean(online))}
      aria-hidden="true"
      style={{ width: px, height: px, fontSize: Math.round(px * 0.34) }}
    >
      {image ? <img src={image} alt="" /> : <span className="avatar-initials">{initials || "?"}</span>}
      {showStatus && online != null ? (
        <span className="avatar-status" data-on={String(Boolean(online))} aria-hidden="true" />
      ) : null}
    </span>
  );
}
