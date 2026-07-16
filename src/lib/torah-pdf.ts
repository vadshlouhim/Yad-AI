import { jsPDF } from "jspdf";

export interface TorahPdfCourse {
  title: string;
  introduction: string;
  outline: string[];
  body: string;
  conclusion: string;
  sources: string[];
  note?: string;
}

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const TEAL = [6, 60, 55] as const;
const PETROL = [14, 86, 88] as const;
const GOLD = [187, 151, 82] as const;

function safeFileName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "cours-de-torah";
}

export function downloadTorahCoursePdf(course: TorahPdfCourse) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  let y = 66;
  let pageNumber = 1;

  const footer = () => {
    pdf.setDrawColor(210, 222, 219);
    pdf.line(MARGIN, PAGE_HEIGHT - 15, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 15);
    pdf.setTextColor(90, 111, 108);
    pdf.setFontSize(8);
    pdf.text("EasyCom IA · Cours de Torah", MARGIN, PAGE_HEIGHT - 9);
    pdf.text(String(pageNumber), PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 9, { align: "right" });
  };

  const newPage = () => {
    footer();
    pdf.addPage();
    pageNumber += 1;
    y = MARGIN;
  };

  const ensureSpace = (height: number) => {
    if (y + height > PAGE_HEIGHT - 22) newPage();
  };

  const paragraph = (text: string, options?: { color?: readonly [number, number, number]; size?: number; bold?: boolean; indent?: number }) => {
    if (!text.trim()) return;
    const size = options?.size ?? 10.5;
    const indent = options?.indent ?? 0;
    pdf.setFont("helvetica", options?.bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(...(options?.color ?? [47, 65, 62]));
    const lines = pdf.splitTextToSize(text.trim(), CONTENT_WIDTH - indent);
    const height = lines.length * (size * 0.46) + 4;
    ensureSpace(height);
    pdf.text(lines, MARGIN + indent, y, { lineHeightFactor: 1.45 });
    y += height;
  };

  const sectionTitle = (number: number, title: string) => {
    ensureSpace(18);
    pdf.setFillColor(...PETROL);
    pdf.roundedRect(MARGIN, y - 5, 9, 9, 2, 2, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text(String(number), MARGIN + 4.5, y + 1, { align: "center" });
    pdf.setTextColor(...TEAL);
    pdf.setFontSize(13);
    pdf.text(title, MARGIN + 13, y + 1);
    y += 13;
  };

  const callout = (title: string, text: string) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(text.trim(), CONTENT_WIDTH - 16);
    const height = Math.max(22, lines.length * 4.8 + 15);
    ensureSpace(height + 4);
    pdf.setFillColor(242, 247, 245);
    pdf.setDrawColor(196, 213, 207);
    pdf.roundedRect(MARGIN, y, CONTENT_WIDTH, height, 3, 3, "FD");
    pdf.setFillColor(...GOLD);
    pdf.roundedRect(MARGIN + 4, y + 4, 3, height - 8, 1, 1, "F");
    pdf.setTextColor(...PETROL);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text(title, MARGIN + 11, y + 9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(47, 65, 62);
    pdf.setFontSize(10);
    pdf.text(lines, MARGIN + 11, y + 16, { lineHeightFactor: 1.45 });
    y += height + 6;
  };

  pdf.setFillColor(...TEAL);
  pdf.rect(0, 0, PAGE_WIDTH, 48, "F");
  pdf.setFillColor(...GOLD);
  pdf.rect(0, 46, PAGE_WIDTH, 2, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("B'H", PAGE_WIDTH - MARGIN, 13, { align: "right" });
  pdf.setFontSize(20);
  pdf.text(course.title, MARGIN, 25, { maxWidth: CONTENT_WIDTH - 8 });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(226, 242, 239);
  pdf.text(`Cours généré le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date())}`, MARGIN, 40);

  callout("Introduction", course.introduction);
  if (course.outline.length > 0) {
    sectionTitle(1, "Plan du cours");
    course.outline.forEach((item, index) => paragraph(`${index + 1}. ${item}`, { size: 10, color: PETROL, bold: true, indent: 3 }));
    y += 3;
  }

  const sections = course.body.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  sections.forEach((item, index) => {
    sectionTitle(index + 2, `Développement ${index + 1}`);
    if (/(verset|guemara|midrash|michna|rambam|halakha|zohar|choul'han aroukh|à retenir|point essentiel)/i.test(item)) callout("Repère du cours", item);
    else paragraph(item);
    y += 2;
  });

  sectionTitle(sections.length + 2, "Conclusion");
  callout("À retenir", course.conclusion);
  if (course.sources.length > 0) {
    sectionTitle(sections.length + 3, "Références");
    course.sources.forEach((source) => paragraph(`• ${source}`, { size: 9, color: [90, 111, 108], indent: 3 }));
  }
  if (course.note) callout("Note", course.note);
  footer();
  pdf.save(`${safeFileName(course.title)}.pdf`);
}
