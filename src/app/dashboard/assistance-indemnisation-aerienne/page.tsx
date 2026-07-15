import type { Metadata } from "next";
import Link from "next/link";
import { FileCheck2, MessageCircle, Plane, ShieldCheck } from "lucide-react";
import { AgentPageBanner } from "@/components/dashboard/agent-page-banner";
import { FlightCompensationReviewsCarousel } from "@/components/services/flight-compensation-reviews-carousel";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Assistance Indemnisations - EasyCom IA" };

const whatsappUrl =
  "https://wa.me/33668508898?text=Bonjour%2C%20je%20suis%20int%C3%A9ress%C3%A9%20par%20vos%20services%20d%E2%80%99indemnisation%20pour%20un%20vol%20retard%C3%A9.%20Pourriez-vous%20m%E2%80%99en%20dire%20plus%2C%20s%E2%80%99il%20vous%20pla%C3%AEt%20%3F";

export default function AssistanceIndemnisationAeriennePage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 sm:px-6">
      <AgentPageBanner
        eyebrow="Service pratique"
        title="Vol retardé ou annulé ? Soyez indemnisé jusqu’à 600 €"
        description="Nous vous accompagnons dans les demandes d’indemnisation liées aux vols retardés ou annulés : collecte des informations, préparation du dossier et suivi des démarches."
        icon={Plane}
        tone="amber"
      />

      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
        <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
          {[
            { icon: FileCheck2, title: "Dossier préparé", text: "Vous transmettez les informations utiles, nous organisons la demande." },
            { icon: ShieldCheck, title: "Suivi clair", text: "Votre démarche est accompagnée pour éviter les oublis et gagner du temps." },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-amber-100 bg-amber-50/40 p-5">
              <item.icon className="mx-auto size-7 text-amber-700" />
              <h2 className="mt-3 text-base font-black text-slate-950">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex w-full flex-col items-center gap-4">
          <Link href={whatsappUrl} target="_blank" rel="noreferrer" className="w-full sm:w-auto">
            <Button className="h-12 w-full rounded-2xl bg-amber-700 px-6 text-white shadow-[0_14px_30px_rgba(180,83,9,0.20)] transition hover:-translate-y-0.5 hover:bg-amber-800 sm:w-auto">
              <MessageCircle className="size-4" />
              Envoyer ma demande
            </Button>
          </Link>
        </div>
      </div>

      <FlightCompensationReviewsCarousel />
    </div>
  );
}
