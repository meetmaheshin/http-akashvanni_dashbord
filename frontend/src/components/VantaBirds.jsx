import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import BIRDS from 'vanta/dist/vanta.birds.min';

export default function VantaBirds() {
  const vantaRef = useRef(null);
  const [effect, setEffect] = useState(null);

  useEffect(() => {
    if (!effect) {
      setEffect(
        BIRDS({
          el: vantaRef.current,
          THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          backgroundAlpha: 0,
          color1: 0x6366f1,
          color2: 0xa855f7,
          birdSize: 1.2,
          speedLimit: 4,
          separation: 60,
          alignment: 40,
          cohesion: 50,
        })
      );
    }

    return () => {
      if (effect) effect.destroy();
    };
  }, [effect]);

  return <div ref={vantaRef} className="absolute inset-0 z-0" />;
}
