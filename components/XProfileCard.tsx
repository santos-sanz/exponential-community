import { AtSign, ArrowUpRight } from "lucide-react";
import { normalizeXUsername } from "@/lib/x";
export function XProfileCard({
  username,
  preview = false,
}: {
  username: string;
  preview?: boolean;
}) {
  const normalized = normalizeXUsername(username);
  return (
    <a
      className={`x-profile-card${preview ? " x-profile-preview" : ""}`}
      href={`https://x.com/${normalized}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Ver perfil de @${normalized} en X`}
    >
      <div className="x-profile-card-top">
        <span className="x-profile-avatar" aria-hidden="true">
          <AtSign size={25} />
        </span>
        <span className="x-profile-platform">
          {preview ? "VISTA PREVIA" : "CUENTA DE X"}
        </span>
      </div>
      <strong>@{normalized}</strong>
      <span className="x-profile-address">x.com/{normalized}</span>
      <span className="x-profile-cta">
        Ver perfil en X <ArrowUpRight size={16} aria-hidden="true" />
      </span>
    </a>
  );
}
