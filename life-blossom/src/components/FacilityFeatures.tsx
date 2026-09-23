import Image from "next/image";
import Reveal from "@/components/Reveal";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const facilities = [
  {
    title: "Private Wards",
    description:
      "Comfortable private rooms with adjustable beds, bedside monitors, call systems, and en-suite bathrooms for a restful recovery.",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8" />
        <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
        <path d="M12 4v6" />
        <path d="M2 18h20" />
      </svg>
    ),
  },
  {
    title: "Operating Theatre",
    description:
      "State-of-the-art surgical suites with advanced anaesthesia machines, surgical lights, sterilisation units, and patient monitoring systems.",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <path d="m18 2 4 4" />
        <path d="m17 7 3-3" />
        <path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" />
        <path d="m9 11 4 4" />
        <path d="m5 19-3 3" />
        <path d="m14 4 6 6" />
      </svg>
    ),
  },
  {
    title: "Medical Equipment",
    description:
      "Modern diagnostic equipment including ultrasound scanners, ECG machines, digital X-ray, and fully stocked emergency crash carts.",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    title: "General Ward",
    description:
      "Spacious multi-bed wards with nurse call systems, overhead lighting, piped oxygen, suction, and 24/7 nursing coverage.",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <path d="M12 6v4" />
        <path d="M14 14h-4" />
        <path d="M14 18h-4" />
        <path d="M14 8h-4" />
        <path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2" />
        <path d="M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18" />
      </svg>
    ),
  },
  {
    title: "Recovery & ICU",
    description:
      "Intensive care units with ventilators, infusion pumps, multi-parameter monitors, and dedicated critical care specialists.",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    ),
  },
  {
    title: "Consultation Rooms",
    description:
      "Fully equipped examination rooms with treatment beds, diagnostic tools, and private consultation spaces for doctor-patient discussions.",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

const slidingImages = [
  { src: "/facility-2.jpg", alt: "State-of-the-Art Equipment" },
  { src: "/facility-5.jpg", alt: "Comfortable Patient Care" },
  { src: "/facility-8.jpg", alt: "Hospital Exterior" },
];

export default function FacilityFeatures() {
  return (
    <section
      id="facilities"
      className="relative w-full overflow-hidden py-16 sm:py-24"
    >
      {/* ── Sliding image background ── */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="facility-slide-track">
          {[...slidingImages, ...slidingImages, ...slidingImages].map(
            (img, i) => (
              <div key={i} className="facility-slide-item">
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="34vw"
                  className="object-cover"
                />
              </div>
            ),
          )}
        </div>
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/80 via-blue-950/70 to-blue-950/85 dark:from-slate-950/85 dark:via-slate-950/75 dark:to-slate-950/90" />
        <div className="bg-grid-pattern absolute inset-0 opacity-20" />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-blue-300/40 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-200 backdrop-blur-sm">
            Our Facilities
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Hospital Wards &amp;{" "}
            <span className="bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text text-transparent">
              Equipment
            </span>
          </h2>
          <p className="mt-4 text-lg leading-8 text-blue-100/80">
            Modern infrastructure and advanced medical equipment to provide you
            with the highest standard of care.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {facilities.map((facility, i) => (
            <Reveal key={facility.title} delay={(i % 3) * 100} className="h-full">
              <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/10 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-white/20 hover:bg-white/15 hover:shadow-2xl hover:shadow-blue-900/20">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-600/25 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                  {facility.icon}
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">
                  {facility.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-blue-100/70">
                  {facility.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
