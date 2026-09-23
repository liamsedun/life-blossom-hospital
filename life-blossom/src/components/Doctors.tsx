"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface LandingDoctor {
  id: string;
  name: string;
  specialty: string | null;
  bio: string | null;
  photo_url: string | null;
}

export default function Doctors() {
  const [doctors, setDoctors] = useState<LandingDoctor[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("landing_doctors")
      .select("id, name, specialty, bio, photo_url")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data) setDoctors(data);
      });
  }, []);

  if (doctors.length === 0) return null;

  return (
    <section className="py-20 bg-white dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold mb-4">
            Our Team
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white">
            Meet Our Doctors
          </h2>
          <p className="mt-4 text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
            Our experienced medical professionals are dedicated to providing you with the best care.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {doctors.map((doc) => (
            <div key={doc.id} className="bg-gray-50 dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition">
              <div className="aspect-[3/4] bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center overflow-hidden">
                {doc.photo_url ? (
                  <img src={doc.photo_url} alt={doc.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {doc.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                )}
              </div>
              <div className="p-3 text-center">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{doc.name}</h3>
                {doc.specialty && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">{doc.specialty}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
