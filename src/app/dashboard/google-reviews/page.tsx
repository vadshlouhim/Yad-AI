import type { Metadata } from "next";
import { ReviewsClient } from "@/components/reviews/reviews-client";

export const metadata: Metadata = { title: "Avis Google — Easycom AI" };

export default async function GoogleReviewsPage() {
  return <ReviewsClient />;
}
