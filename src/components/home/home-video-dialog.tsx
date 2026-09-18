"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { PublicTool } from "@/lib/public-tools";
import { homeVideoSource } from "./home-media";

export default function HomeVideoDialog({ item, media, trigger, onClose }: {
  item: PublicTool;
  media: string;
  trigger: HTMLElement;
  onClose: () => void;
}) {
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
        <Dialog.Title className="sr-only">Présentation : {item.name}</Dialog.Title>
        <Dialog.Close className="home-video-close" aria-label="Fermer la vidéo"><X size={20} aria-hidden="true" /></Dialog.Close>
        <video ref={video} src={homeVideoSource(media)} poster={`/media/home/${media}.webp`} autoPlay muted controls playsInline preload="metadata" aria-label={`Présentation de ${item.name}`} />
        <Link className="home-video-use" prefetch={false} href={`/auth/register?callbackUrl=${encodeURIComponent(item.destination)}`}>Utilisez cet outil</Link>
        <Link className="home-video-login" prefetch={false} href={`/auth/login?callbackUrl=${encodeURIComponent(item.destination)}`}>Se connecter</Link>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
