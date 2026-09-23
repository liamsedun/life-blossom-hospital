import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import WhyChooseUs from "@/components/WhyChooseUs";
import OurFacility from "@/components/OurFacility";
import FacilityFeatures from "@/components/FacilityFeatures";
import Doctors from "@/components/Doctors";
import Testimonials from "@/components/Testimonials";
import BookAppointment from "@/components/BookAppointment";
import HealthTips from "@/components/HealthTips";
import Contact from "@/components/Contact";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <Services />
      <WhyChooseUs />
      <OurFacility />
      <FacilityFeatures />
      <Doctors />
      <Testimonials />
      <BookAppointment />
      <HealthTips />
      <Contact />
      <Footer />
    </>
  );
}