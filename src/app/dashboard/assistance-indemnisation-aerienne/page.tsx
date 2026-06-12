import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Plane } from "lucide-react";
import { FlightCompensationReviewsCarousel } from "@/components/services/flight-compensation-reviews-carousel";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Assistance Indemnisations - EasyCom IA" };

const whatsappUrl =
  "https://wa.me/33668508898?text=Bonjour%2C%20je%20souhaite%20%C3%AAtre%20accompagn%C3%A9%20pour%20mes%20d%C3%A9marches%20en%20cas%20de%20vol%20retard%C3%A9%20ou%20annul%C3%A9.";

export default function AssistanceIndemnisationAeriennePage() {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-sky-200 bg-gradient-to-br from-[#12335f] via-[#184779] to-[#2563a8] p-6 shadow-[0_20px_44px_-28px_rgba(17,24,39,0.4)]">
        <div className="max-w-4xl">
          <div className="mb-4 inline-flex size-11 items-center justify-center rounded-2xl bg-white/12 text-sky-100 shadow-inner ring-1 ring-white/15">
            <Plane className="size-5" />
          </div>
          <div className="mb-3 h-1.5 w-10 rounded-full bg-sky-200/90" />
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Vol retardé ou annulé ? Soyez indemnisé jusqu’à 600 €
          </h1>
          <p className="mt-3 text-sm leading-6 text-sky-50/90">
            Nous proposons un service d’accompagnement pour les demandes d’indemnisation liées aux vols retardés ou annulés.
            Vous nous transmettez les informations nécessaires, et notre équipe s’occupe des démarches auprès de la compagnie aérienne.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 shadow-sm">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <div className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 shadow-inner">
            <Plane className="size-7" />
          </div>
          <div className="mb-4 h-1.5 w-10 rounded-full bg-sky-500" />
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Partagez-nous les détails de votre vol, les justificatifs utiles et les informations nécessaires. Nous
            préparons ensuite votre dossier et assurons le suivi des démarches pour vous faire gagner du temps.
          </p>

          <div className="mt-8 flex w-full flex-col items-center gap-4">
            <Link href={whatsappUrl} target="_blank" rel="noreferrer" className="w-full sm:w-auto">
              <Button className="h-12 w-full rounded-2xl bg-sky-700 px-6 text-white shadow-[0_12px_28px_rgba(2,132,199,0.22)] transition-transform duration-200 hover:bg-sky-800 hover:shadow-[0_16px_34px_rgba(2,132,199,0.28)] active:scale-[0.98] sm:w-auto">
                <MessageCircle className="size-4" />
                Envoyer ma demande
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <FlightCompensationReviewsCarousel />
    </div>
  );
}
