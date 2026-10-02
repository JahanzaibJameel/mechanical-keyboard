import { SiteShell } from "@/components/layout/SiteShell";
import { Colors } from "@/components/sections/Colors";
import { Configurator } from "@/components/sections/Configurator";
import { Construction } from "@/components/sections/Construction";
import { Finale } from "@/components/sections/Finale";
import { FinalProduct } from "@/components/sections/FinalProduct";
import { Intro } from "@/components/sections/Intro";
import { Keycaps } from "@/components/sections/Keycaps";
import { Materials } from "@/components/sections/Materials";
import { Performance } from "@/components/sections/Performance";
import { ProductReveal } from "@/components/sections/ProductReveal";
import { Switches } from "@/components/sections/Switches";
import { ExperienceCanvas } from "@/components/three/ExperienceCanvas";

export default function Home() {
  return (
    <SiteShell canvas={<ExperienceCanvas />}>
      <Intro />
      <section
        id="hero"
        data-progress-boundary
        aria-label="02 / HERO"
        className="relative min-h-dvh"
      >
        {/* 3D canvas is now a fixed sibling of <main> via the SiteShell `canvas` prop */}
      </section>
      <ProductReveal />
      <Materials />
      <Colors />
      <Construction />
      <Switches />
      <Keycaps />
      <Performance />
      <Configurator />
      <FinalProduct />
      <Finale />
    </SiteShell>
  );
}
