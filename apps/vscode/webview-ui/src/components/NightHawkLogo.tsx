import { useExtensionImageUrl } from "./hooks/useExtensionImageUrl";

export function NightHawkLogo({ className }: { className?: string }) {
  const logoUrl = useExtensionImageUrl("nighthawk-logo.png");

  if (!logoUrl) {
    return null;
  }

  return <img src={logoUrl} alt="NIGHTHAWK" className={className} aria-label="NIGHTHAWK" />;
}
