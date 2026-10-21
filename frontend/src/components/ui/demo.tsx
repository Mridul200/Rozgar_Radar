import { Example } from "@/components/ui/dashboard-with-collapsible-sidebar";
import Hero from "@/components/ui/block-hero";
import { Footerdemo } from "@/components/ui/footer-section";
import { Component } from "@/components/ui/authentication-card";

export default function DemoOne() {
  return <Component />;
}

export function SidebarDemo() {
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
