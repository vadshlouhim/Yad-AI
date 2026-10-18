"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { PublicTool } from "@/lib/public-tools";
import { homeVideoSource } from "./home-media";
import { useLocale } from "next-intl";

export default function HomeVideoDialog({ item, media, trigger, comingSoon = false, onClose }: {
  item: PublicTool;
  media: string;
  trigger: HTMLElement;
  comingSoon?: boolean;
  onClose: () => void;
}) {
  const he = useLocale() === "he";
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const player = video.current;
    // Restart after React's development mount/cleanup cycle as well as mount.
    void player?.play().catch(() => {});
    return () => { player?.pause(); };
  }, []);
  return <Dialog.Root open onOpenChange={open => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="home-video-overlay" />
      <Dialog.Content className="home-video-dialog" aria-describedby={undefined} onCloseAutoFocus={event => {
        event.preventDefault();
        trigger.focus();
      }}>
        <Dialog.Title className="sr-only">{he ? "הצגה" : "Présentation"} : {item.name}</Dialog.Title>
        <Dialog.Close className="home-video-close" aria-label={he ? "סגירת הסרטון" : "Fermer la vidéo"}><X size={20} aria-hidden="true" /></Dialog.Close>
        {he ? (
          <div className="home-video-hebrew-summary">
            <strong>{item.name}</strong>
            <p>{item.description}</p>
            <ul>{item.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul>
          </div>
        ) : (
          <video ref={video} src={homeVideoSource(media)} poster={comingSoon ? undefined : `/media/home/${media}.webp`} autoPlay muted controls playsInline preload="metadata" aria-label={`Présentation de ${item.name}`} />
        )}
        {!comingSoon ? <>
          <Link className="home-video-use" prefetch={false} href={`/auth/register?callbackUrl=${encodeURIComponent(item.destination)}`}>{he ? "שימוש בכלי" : "Utilisez cet outil"}</Link>
          <Link className="home-video-login" prefetch={false} href={`/auth/login?callbackUrl=${encodeURIComponent(item.destination)}`}>{he ? "התחברות" : "Se connecter"}</Link>
        </> : null}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
