import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinCare · Cancer care equality in Finland",
  description: "Explore regional cancer care indicators, evidence gaps and measurable improvements.",
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
