import Reveal from "@/components/Reveal";

const testimonials = [
  {
    quote:
      "The care I received at Life Blossom was outstanding. From the warm welcome at reception to the thorough consultation with my doctor, every moment was handled with professionalism and compassion.",
    name: "Grace A.",
    role: "Patient",
  },
  {
    quote:
      "I brought my son in for an emergency late at night and the team was incredibly fast and efficient. They stabilized him within minutes. I will forever be grateful for their swift response.",
    name: "Chuka M.",
    role: "Patient",
  },
  {
    quote:
      "The maternity wing is simply wonderful. The nurses cheered me on through delivery and made sure I was comfortable throughout my stay. It felt like family.",
    name: "Fatima D.",
    role: "Patient",
  },
  {
    quote:
      "After years of searching for answers to my health challenges, the diagnostic team at Life Blossom finally identified the issue. Their advanced equipment and skilled staff made all the difference.",
    name: "Samuel T.",
    role: "Patient",
  },
];

function Stars() {
  return (
    <div className="flex justify-center gap-1 text-amber-400">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path d="M12 2l2.92 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.08-1.01z" />
        </svg>
      ))}
    </div>
  );
}

export default function Testimonials() {
  return (
    <section
      id="testimonials"
      className="relative w-full overflow-hidden bg-white py-16 sm:py-24 dark:bg-slate-950"
    >
      <div
        aria-hidden="true"
        className="animate-blob absolute -right-24 top-1/4 h-80 w-80 rounded-full bg-blue-100/60 blur-3xl dark:bg-blue-500/10"
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300">
            Testimonials
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-blue-50">
            What Our{" "}
            <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500 bg-clip-text text-transparent">
              Patients Say
            </span>
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
            Real stories from the people we are honoured to care for.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
          {testimonials.map((testimonial, i) => (
            <Reveal key={testimonial.name} delay={(i % 2) * 120} className="h-full">
              <figure className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-blue-50/70 to-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-900/10 dark:border-slate-800 dark:from-slate-900 dark:to-slate-900 dark:hover:border-slate-700">
                {/* Top accent line */}
                <span className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500 transition-transform duration-500 group-hover:scale-x-100" />
                {/* Big decorative quote mark */}
                <span
                  aria-hidden="true"
                  className="absolute right-6 top-4 select-none text-7xl font-black leading-none text-blue-100/80 dark:text-blue-500/15"
                >
                  &rdquo;
                </span>
                <Stars />
                <blockquote className="relative mt-4 flex-1 text-base leading-7 text-slate-700 dark:text-slate-200">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <figcaption className="relative mt-6 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-bold text-white">
                    {testimonial.name.charAt(0)}
                  </span>
                  <span>
                    <span className="block font-semibold text-slate-900 dark:text-blue-50">
                      {testimonial.name}
                    </span>
                    <span className="block text-sm text-slate-500 dark:text-slate-400">
                      {testimonial.role}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}