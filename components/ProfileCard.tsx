import { AtSign, Github, Linkedin, Globe, ArrowUpRight } from "lucide-react";
import {
  normalizeProfile,
  directoryKinds,
  type DirectoryKind,
} from "@/lib/profiles";
export function ProfileCard({
  kind,
  value,
  preview = false,
}: {
  kind: DirectoryKind;
  value: string;
  preview?: boolean;
}) {
  const p = normalizeProfile(kind, value),
    name = directoryKinds.find((item) => item.kind === kind)!.label;
  const Icon = {
    x: AtSign,
    github: Github,
    linkedin: Linkedin,
    website: Globe,
  }[kind];
  return (
    <a
      className={`x-profile-card${preview ? " x-profile-preview" : ""}`}
      href={p.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={
        kind === "website" ? `Visitar ${p.label}` : `Ver ${p.label} en ${name}`
      }
    >
      <div className="x-profile-card-top">
        <span className="x-profile-avatar" aria-hidden="true">
          <Icon size={25} />
        </span>
        <span className="x-profile-platform">
          {preview ? "VISTA PREVIA" : name.toUpperCase()}
        </span>
      </div>
      <strong>{p.label}</strong>
      <span className="x-profile-address">
        {p.url.replace(/^https:\/\//, "")}
      </span>
      <span className="x-profile-cta">
        {kind === "website" ? "Visitar web" : `Ver perfil en ${name}`}
        <ArrowUpRight size={16} aria-hidden="true" />
      </span>
    </a>
  );
}
