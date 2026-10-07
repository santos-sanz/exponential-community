"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { XPreview } from "@/lib/x-preview";
import { AtSign, Github, Linkedin, Globe, ArrowUpRight } from "lucide-react";
import {
  normalizeProfile,
  directoryKinds,
  type DirectoryKind,
} from "@/lib/profiles";
const previewRequests = new Map<
  string,
  { expires: number; request: Promise<XPreview | null> }
>();
function loadXPreview(username: string): Promise<XPreview | null> {
  const cached = previewRequests.get(username);
  if (cached && cached.expires > Date.now()) return cached.request;
  const request = fetch(
    `/api/x-profile?username=${encodeURIComponent(username)}`,
  )
    .then(async (response) => {
      if (!response.ok) return null;
      const result = await response.json();
      return result.available ? (result.profile as XPreview) : null;
    })
    .catch(() => null);
  if (previewRequests.size >= 100)
    previewRequests.delete(previewRequests.keys().next().value!);
  previewRequests.set(username, { expires: Date.now() + 300_000, request });
  return request;
}
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
  const [loaded, setLoaded] = useState<{
    username: string;
    profile: XPreview | null;
  } | null>(null);
  useEffect(() => {
    if (kind !== "x") return;
    let cancelled = false;
    const timer = setTimeout(
      () => {
        void loadXPreview(p.value).then((profile) => {
          if (!cancelled) setLoaded({ username: p.value, profile });
        });
      },
      preview ? 600 : 0,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [kind, p.value, preview]);
  const xProfile =
    kind === "x" && loaded?.username === p.value ? loaded.profile : null;
  const xFinished = kind === "x" && loaded?.username === p.value;
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
          {xProfile?.imageUrl ? (
            <Image
              src={xProfile.imageUrl}
              alt={xProfile.name}
              width={56}
              height={56}
              className="x-real-avatar"
            />
          ) : (
            <Icon size={25} />
          )}
        </span>
        <span className="x-profile-platform">
          {preview ? "VISTA PREVIA" : name.toUpperCase()}
        </span>
      </div>
      {xProfile && <span className="x-profile-name">{xProfile.name}</span>}
      <strong>{p.label}</strong>
      {xProfile?.bio && <p className="x-profile-bio">{xProfile.bio}</p>}
      {kind === "x" && !xProfile && (
        <span className="x-preview-status">
          {xFinished
            ? "X no ofrece una vista previa ahora. Puedes abrir el perfil."
            : "Cargando foto y biografía…"}
        </span>
      )}
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
