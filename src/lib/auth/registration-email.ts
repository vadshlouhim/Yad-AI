export type RegistrationEmailLocale = "fr" | "he";

type RegistrationEmail = {
  subject: string;
  html: string;
};

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

export function buildRegistrationEmail(
  actionLink: string,
  locale: RegistrationEmailLocale,
): RegistrationEmail {
  const safeLink = escapeAttribute(actionLink);
  const hebrew = locale === "he";
  const copy = hebrew
    ? {
        subject: "אשרו את חשבון EasyCom IA שלכם",
        heading: "אשרו את כתובת האימייל שלכם",
        intro:
          "לחצו על הכפתור למטה כדי להפעיל את חשבון EasyCom IA ולהתחיל.",
        button: "אישור החשבון",
        disclaimer:
          "אם לא ביקשתם ליצור חשבון, אפשר להתעלם מהאימייל הזה.",
      }
    : {
        subject: "Confirmez votre compte EasyCom IA",
        heading: "Confirmez votre adresse email",
        intro:
          "Cliquez sur le bouton ci-dessous pour activer votre compte EasyCom IA et commencer.",
        button: "Confirmer mon compte",
        disclaimer:
          "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.",
      };
  const direction = hebrew ? "rtl" : "ltr";
  const alignment = hebrew ? "right" : "left";

  return {
    subject: copy.subject,
    html: `<!doctype html>
<html lang="${locale}" dir="${direction}">
  <body dir="${direction}" style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#172033;text-align:${alignment}">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px">
        <h1 style="margin:0 0 16px;font-size:24px">${copy.heading}</h1>
        <p style="margin:0 0 24px;line-height:1.6">${copy.intro}</p>
        <a href="${safeLink}" style="display:inline-block;background:#421388;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:10px">${copy.button}</a>
        <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#64748b">${copy.disclaimer}</p>
      </div>
    </div>
  </body>
</html>`,
  };
}
