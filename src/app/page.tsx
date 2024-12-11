import VariableHero from "./components/VariableHero";

export default function Home() {
  return (
    <>
      <VariableHero
        backgroundImage={`/city-images/palm-desert.jpg`}
        heroContext="Joseph Sardella"
        description="You're Coachella Valley Local Real Estate Expert"
        alignment="left"
      />
      <div className="min-h-screen flex items-center justify-center bg-neutral-light dark:bg-neutral-dark text-foreground-light dark:text-foreground-dark font-sans">
        <h1 className="text-4xl">Hello World</h1>
      </div>
    </>
  );
}
