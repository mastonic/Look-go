"use client";

import Image from "next/image";
import { useState } from "react";

const original =
  "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1400&q=86";
const styled =
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1400&q=86";

export function TryOnDemo() {
  const [value, setValue] = useState(52);

  return (
    <div className="tryon-demo" aria-label="Démonstration visuelle du Try-On">
      <div className="tryon-stage">
        <Image
          src={original}
          alt="Portrait mode avant essayage virtuel"
          fill
          priority
          sizes="(max-width: 768px) 92vw, 48vw"
          className="tryon-image"
        />
        <div className="tryon-after" style={{ clipPath: `inset(0 0 0 ${value}%)` }}>
          <Image
            src={styled}
            alt="Exemple éditorial après essayage virtuel"
            fill
            priority
            sizes="(max-width: 768px) 92vw, 48vw"
            className="tryon-image"
          />
        </div>
        <div className="tryon-line" style={{ left: `${value}%` }} aria-hidden="true">
          <span>↔</span>
        </div>
        <div className="tryon-label tryon-label-left">MOI</div>
        <div className="tryon-label tryon-label-right">CE LOOK</div>
        <input
          className="tryon-range"
          type="range"
          min="8"
          max="92"
          value={value}
          onChange={(event) => setValue(Number(event.target.value))}
          aria-label="Comparer avant et après"
        />
      </div>
      <p className="demo-note">
        Démonstration visuelle de l’expérience. Le raccordement au moteur Try-On sera effectué lorsque le backend produit sera disponible.
      </p>
    </div>
  );
}
