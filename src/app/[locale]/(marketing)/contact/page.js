import { NextIntlClientProvider, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { alternatesFor } from "@/i18n/metadata";
import { pickMessages } from "@/i18n/messages";
import ContactForm from "@/components/contact-form";

export async function generateMetadata() {
  const t = await getTranslations("Contact");
  return { title: t("metaTitle"), description: t("lead"), alternates: await alternatesFor("/contact") };
}

export default async function ContactPage() {
  const messages = await pickMessages(["Contact", "Form"]);
  return (
    <ContactFrame>
      <NextIntlClientProvider messages={messages}>
        <ContactForm />
      </NextIntlClientProvider>
    </ContactFrame>
  );
}

function ContactFrame({ children }) {
  const t = useTranslations("Contact");
  return (
    <section className="flex-1 bg-surface-tint">
      <div className="mx-auto grid max-w-5xl gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-h1 font-extrabold">{t("title")}</h1>
          <p className="text-lg text-muted-foreground">{t("lead")}</p>
          <p className="text-muted-foreground">{t("bookingNote")}</p>
        </div>
        <div className="relative rounded-lg border border-border bg-surface p-6">{children}</div>
      </div>
    </section>
  );
}
