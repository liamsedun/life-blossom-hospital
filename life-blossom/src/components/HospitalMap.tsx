"use client";

export default function HospitalMap() {
  return (
    <div className="relative w-full h-[300px] sm:h-[350px] rounded-2xl overflow-hidden shadow-2xl shadow-blue-900/20 border border-slate-200/60 dark:border-slate-800/60">
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
      {/* Bottom gradient for text readability */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/20 to-transparent z-10 pointer-events-none" />
    </div>
  );
}
