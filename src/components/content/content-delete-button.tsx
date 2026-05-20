"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface Props {
  id: string;
}

export function ContentDeleteButton({ id }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Êtes-vous sûr de vouloir supprimer ce contenu ?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/content/drafts/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      } else {
        alert("Erreur lors de la suppression.");
      }
    } catch {
      alert("Erreur lors de la suppression.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
      onClick={handleDelete}
      loading={deleting}
    >
      <Trash2 className="size-4" />
      <span className="sr-only">Supprimer</span>
    </Button>
  );
}
