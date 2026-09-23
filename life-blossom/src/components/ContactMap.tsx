"use client";

export default function ContactMap() {
  return (
    <div className="relative w-full h-[400px] sm:h-[500px] rounded-2xl overflow-hidden shadow-2xl border border-slate-200/60 dark:border-slate-800/60">
      <iframe
        src="https://www.google.com/maps?q=Life+Blossom+Cares+Cure+Hospital+134+John+Isaac+Street+Ikeja+Lagos+Nigeria&hl=en&z=16&output=embed"
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Life Blossom Cares & Cure Hospital Location"
        className="absolute inset-0"
      />
    </div>
  );
}
