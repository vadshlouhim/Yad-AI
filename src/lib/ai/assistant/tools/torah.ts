import { DEFAULT_TORAH_SOURCES, generateTorahCourse, torahCourseRequestSchema } from "@/lib/torah/generate-course";
import type { AssistantToolDef } from "../types";

export const generateTorahCourseTool: AssistantToolDef = {
  name: "generate_torah_course",
  label: "Générer un cours de Torah",
  summarize: (payload) => `Générer un cours de Torah : ${String(payload.prompt ?? "")}.`,
  availability: (ctx) => ctx.specializedAgentSlug === "shmouel",
  schema: {
    type: "function",
    function: {
      name: "generate_torah_course",
      description: "Génère un cours de Torah structuré pour Shmouel. À appeler uniquement lorsque le sujet, la durée et le public sont connus.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Sujet précis du cours, au moins 10 caractères." },
          duration: { type: "string", enum: ["5 minutes", "10 minutes", "15 minutes", "30 minutes", "Plus de 45 minutes"] },
          theme: { type: "string", enum: ["general", "youth", "children", "event"] },
          eventContext: { type: "string", description: "Obligatoire seulement pour theme=event." },
        },
        required: ["prompt", "duration", "theme"],
      },
    },
  },
  read: async (_ctx, args) => {
    const parsed = torahCourseRequestSchema.safeParse({ ...args, authorizedSources: DEFAULT_TORAH_SOURCES });
    if (!parsed.success) {
      return { llmResult: { error: "Informations incomplètes : demande une seule précision courte." } };
    }
    const course = await generateTorahCourse(parsed.data);
    return {
      llmResult: { ok: true, title: course.title, note: "Le cours est affiché dans le chat avec les actions Copier et Télécharger en PDF." },
      clientEvent: { type: "torah_course", course },
    };
  },
};

export const torahTools: AssistantToolDef[] = [generateTorahCourseTool];
