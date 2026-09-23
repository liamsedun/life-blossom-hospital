import Image from "next/image";
import Reveal from "@/components/Reveal";

const photos = [
  {
    src: "/facility-1.jpg",
    caption: "Hospital Reception Area",
    span: "sm:col-span-2 sm:row-span-2",
  },
  {
    src: "/facility-2.jpg",
    caption: "State-of-the-Art Equipment",
    span: "",
  },
  {
    src: "/facility-3.jpg",
    caption: "Private Ward Room",
    span: "",
  },
  {
    src: "/facility-4.jpg",
    caption: "Modern Diagnostics",
    span: "",
  },
  {
    src: "/facility-5.jpg",
    caption: "Comfortable Patient Care",
    span: "",
  },
  {
    src: "/facility-6.jpg",
    caption: "Calm Recovery Spaces",
    span: "",
  },
  {
    src: "/facility-7.jpg",
    caption: "Reception & Waiting Lounge",
    span: "",
  },
  {
    src: "/facility-8.jpg",
    caption: "Hospital Exterior",
    span: "",
  },
  {
    src: "/facility-9.jpg",
    caption: "Entrance & Driveway",
    span: "",
  },
];

export default function OurFacility() {
  return (
    <section
      id="our-facility"
      className="relative w-full overflow-hidden bg-white py-16 sm:py-24 dark:bg-slate-950"
    >
      {/* Soft ambient blobs for depth */}
      <div
        aria-hidden="true"
        className="animate-blob absolute -left-24 top-24 h-80 w-80 rounded-full bg-blue-100/60 blur-3xl dark:bg-blue-500/10"
      />
      <div
        aria-hidden="true"
        className="animate-blob absolute -right-24 bottom-24 h-80 w-80 rounded-full bg-cyan-100/60 blur-3xl [animation-delay:4s] dark:bg-cyan-500/10"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300">
            Our Facility
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-blue-50">
            Take a Look Inside
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
            Modern, clean, and equipped with cutting-edge technology — our
            facility is designed for your comfort and care.
          </p>
        </Reveal>

        {/* Masonry-style gallery */}
        <div className="mt-14 grid auto-rows-[220px] grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {photos.map((photo, i) => (
            <Reveal
              key={photo.src}
              delay={(i % 4) * 100}
              className={`h-full ${photo.span}`}
            >
              <figure className="group relative h-full w-full overflow-hidden rounded-2xl shadow-md shadow-blue-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-900/15">
                <div className="relative h-full w-full overflow-hidden">
                  <Image
                    src={photo.src}
                    alt={photo.caption}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="animate-slow-zoom object-cover transition duration-700 group-hover:scale-110"
                  />
                  {/* Shine sweep on hover */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 -left-3/4 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-all duration-700 ease-out group-hover:left-[125%]"
                  />
                  {/* Hover tint */}
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-950/80 via-blue-950/10 to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-95" />
                  <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-5">
                    <span className="text-base font-bold text-white drop-shadow sm:text-lg">
                      {photo.caption}
                    </span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/15 text-white opacity-0 backdrop-blur transition-all duration-500 group-hover:opacity-100">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M5 12h14" />
                        <path d="m13 6 6 6-6 6" />
                      </svg>
                    </span>
                  </figcaption>
                </div>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}