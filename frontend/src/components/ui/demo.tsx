import { Example } from "@/components/ui/dashboard-with-collapsible-sidebar";
import Hero from "@/components/ui/block-hero";
import { Footerdemo } from "@/components/ui/footer-section";

export default function DemoOne() {
  return <Example />;
}

export function BlockHeroDemo() {
  return <Hero />;
}

export function Footer() {
  return (
    <div className="block">
      <Footerdemo />
    </div>
  );
}
