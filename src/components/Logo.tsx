import Image from "next/image";

/** Logo La Tanière (fichiers provisoires dans public/logo, à remplacer par ceux du kit). */
export function LogoMark({ size = 28 }: { size?: number }) {
  return <Image src="/logo/taniere-mark-dark.svg" alt="" width={size} height={size} priority unoptimized />;
}

export function LogoWordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-[18px] font-bold tracking-[-0.02em]">La Tanière</span>
    </span>
  );
}
