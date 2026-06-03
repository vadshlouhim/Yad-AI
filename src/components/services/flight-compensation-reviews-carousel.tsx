"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { BadgeCheck, ChevronLeft, ChevronRight, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Review = {
  author: string;
  text: string;
};

const reviews: Review[] = [
  {
    author: "Sarah M.",
    text: "“Nous étions sur un vol Norse très retardé. Grâce à l’accompagnement proposé, les démarches ont été suivies jusqu’au bout et nous avons finalement obtenu 600 € d’indemnisation par passager.”",
  },
  {
    author: "David R.",
    text: "“J’étais sur le vol Norse avec mon fils. Après les démarches, nous avons reçu 600 € chacun, soit 1 200 € au total. Un vrai soulagement.”",
  },
  {
    author: "Myriam L.",
    text: "“La procédure avec Norse a pris du temps, presque deux ans, mais le dossier n’a jamais été abandonné. Au final, nous avons réussi à obtenir les indemnités prévues.”",
  },
  {
    author: "Jonathan B.",
    text: "“Je voyageais avec un groupe de jeunes et plusieurs passagers étaient concernés par le retard. L’équipe nous a aidés à monter les dossiers et plusieurs indemnités ont pu être obtenues.”",
  },
  {
    author: "Rachel T.",
    text: "“Je ne savais pas par où commencer ni quels documents envoyer à la compagnie. Ils m’ont guidé dans les démarches et m’ont aidé à obtenir une réponse concrète.”",
  },
  {
    author: "Benjamin A.",
    text: "“Très bon accompagnement. Le dossier a été suivi sérieusement, avec des relances et des explications claires. Je recommande à ceux qui ont eu un vol retardé ou annulé.”",
  },
];

export function FlightCompensationReviewsCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  const goToNextFromEffect = useEffectEvent(() => {
    setActiveIndex((current) => (current + 1) % reviews.length);
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      goToNextFromEffect();
    }, 4800);

    return () => window.clearInterval(interval);
  }, []);

  const goToNext = () => {
    setActiveIndex((current) => (current + 1) % reviews.length);
  };

  const goToPrevious = () => {
    setActiveIndex((current) => (current - 1 + reviews.length) % reviews.length);
  };

  const goToIndex = (index: number) => {
    setActiveIndex(index);
  };

  return (
    <section className="rounded-[2rem] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-8 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.28)] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50/80 px-3 py-1 text-xs font-semibold text-sky-700">
              <BadgeCheck className="size-3.5" />
              Avis vérifiés
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Ils ont obtenu leurs indemnités
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Découvrez les retours de voyageurs que nous avons accompagnés dans leurs démarches auprès des compagnies aériennes.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={goToPrevious}
              aria-label="Voir l'avis précédent"
              className="size-10 rounded-full border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={goToNext}
              aria-label="Voir l'avis suivant"
              className="size-10 rounded-full border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="relative mt-8 overflow-hidden">
          <div
            className="flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {reviews.map((review, index) => (
              <article key={`${review.author}-${index}`} className="w-full shrink-0 px-1">
                <div className="mx-auto flex min-h-[320px] max-w-3xl flex-col rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_22px_45px_-34px_rgba(15,23,42,0.3)] sm:p-8">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 via-white to-slate-100 text-lg font-bold text-sky-800 shadow-inner ring-1 ring-sky-100">
                        {review.author.charAt(0)}
                      </div>
                      <div>
                        <div className="text-base font-semibold text-slate-900">{review.author}</div>
                        <div className="mt-1 inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                          <ShieldCheck className="size-3.5 text-emerald-500" />
                          Voyageur accompagné
                        </div>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-amber-600 shadow-inner ring-1 ring-amber-100">
                      {Array.from({ length: 5 }).map((_, starIndex) => (
                        <Star key={starIndex} className="size-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>

                  <blockquote className="mt-6 flex-1 text-base leading-8 text-slate-700 sm:text-[1.05rem]">
                    {review.text}
                  </blockquote>

                  <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-100 pt-5">
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      Dossier suivi jusqu&apos;à indemnisation
                    </div>
                    <div className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
                      Avis {String(index + 1).padStart(2, "0")}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {reviews.map((review, index) => (
            <button
              key={`${review.author}-dot`}
              type="button"
              onClick={() => goToIndex(index)}
              aria-label={`Afficher l'avis ${index + 1}`}
              className={cn(
                "h-2.5 rounded-full transition-all duration-300",
                index === activeIndex ? "w-8 bg-sky-700" : "w-2.5 bg-slate-300 hover:bg-slate-400",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
