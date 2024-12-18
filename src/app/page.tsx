import AboutCta from "./components/AboutCta";
import BlogCta from "./components/BlogCta";
import Contact from "./components/contact/Contact";
import VariableHero from "./components/VariableHero";

export default function Home() {
  return (
    <>
      <VariableHero
        backgroundImage={`/joey/home.png`}
        heroContext=" "
        description=""
        alignment="right"
      />
      <AboutCta />
      <BlogCta />
      <Contact />
    </>
  );
}
