"use client";

import Image from "next/image";
import { useState } from "react";

const original =
  "https://images.unsplash.com/photo-1767249629217-536a5ef26cc2?auto=format&fit=crop&w=1600&q=88";
const styled =
  "https://images.unsplash.com/photo-1776790376541-233f911d90b4?auto=format&fit=crop&w=1600&q=88";

export function TryOnDemo() {
  const [value, setValue] = useState(52);

  return (
    <div className="tryon-demo" aria-label="Démonstration visuelle du Try-On">
      <div className="tryon-stage">
        <Image src={original} alt="Portrait mode d’une femme noire dans un look contemporain" fill priority sizes="(max-width: 768px) 92vw, 48vw" className="tryon-image" />
        <div className="tryon-after" style={{ clipPath: `inset(0 0 0 ${value}%)` }}>
          <Image src={styled} alt="Portrait éditorial coloré d’une femme noire" fill priority sizes="(max-width: 768px) 92vw, 48vw" className="tryon-image" />
        </div>
        <div className="tryon-line" style={{ left: `${value}%` }} aria-hidden="true"><span>↔</span></div>
        <div className="tryon-label tryon-label-left">MOI</div>
        <div className="tryon-label tryon-label-right">MON LOOK</div>
        <input className="tryon-range" type="range" min="8" max="92" value={value} onChange={(event) => setValue(Number(event.target.value))} aria-label="Comparer les deux inspirations visuelles" />
      </div>
      <p className="demo-note">Démonstration éditoriale de l’expérience. Le moteur Try-On réel sera raccordé au backend produit.</p>
    </div>
  );
}
