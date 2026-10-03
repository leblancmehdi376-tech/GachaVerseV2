// Halo pulsé des cartes ultra rares une fois révélées : deux calques d'ombre
// fixes (min / max) en fondu croisé d'opacité (.gv-ultra-glow, globals.css),
// animés par le compositeur au lieu d'interpoler un box-shadow géant à chaque
// frame. À placer après la FACE, dans le conteneur 3D retourné : même rotation
// et même face cachée que la carte.
export function UltraGlow({ color, glow, radius }: { color: string; glow: string; radius: number }) {
  return (
    <>
      <div className="gv-ultra-glow" style={{ borderRadius: radius, boxShadow: `0 0 0 2px ${color}, 0 0 50px ${glow}, 0 0 100px ${glow}44` }} />
      <div className="gv-ultra-glow gv-ultra-glow--max" style={{ borderRadius: radius, boxShadow: `0 0 0 3px ${color}, 0 0 80px ${glow}, 0 0 160px ${glow}44` }} />
    </>
  );
}
