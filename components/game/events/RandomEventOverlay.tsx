'use client';
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useRandomEventStore } from '@/store/randomEventStore';
import { ArdeurEvent } from './ArdeurEvent';
import { TempeteEvent } from './TempeteEvent';
import { JackpotEvent } from './JackpotEvent';

export function RandomEventOverlay() {
  const active         = useRandomEventStore(s => s.active);
  const startCheckLoop = useRandomEventStore(s => s.startCheckLoop);
  const endForBoss     = useRandomEventStore(s => s.endForBoss);
  const bossActive     = useGameStore(s => s.bossActive);
  const wave           = useGameStore(s => s.wave);

  const [bossNotice, setBossNotice] = useState(false);
  const prevActive = useRef<string | null>(null);

  // Boucle d'apparition (démarrée une fois).
  useEffect(() => startCheckLoop(), [startCheckLoop]);

  // Fin immédiate si on atteint un boss, avec message.
  useEffect(() => {
    if (bossActive || wave === 10) {
      const cut = endForBoss();
      if (cut || prevActive.current) {
        setBossNotice(true);
        const t = setTimeout(() => setBossNotice(false), 2600);
        //reset DPS mult à 1 si on était en Ardeur
        if (prevActive.current === 'ardeur') useGameStore.getState().setEventDpsMult(1, 0);
        prevActive.current = null;
        return () => clearTimeout(t);
      }
    }
    prevActive.current = active;
  }, [bossActive, wave, active, endForBoss]);

  return (
    <>
      {active === 'ardeur'  && <ArdeurEvent />}
      {active === 'tempete' && <TempeteEvent />}
      {active === 'jackpot' && <JackpotEvent />}

      {bossNotice && (
        <div style={{ position:'absolute', top:'42%', left:0, right:0, zIndex:25, textAlign:'center', pointerEvents:'none' }}>
          <div style={{ display:'inline-block', padding:'12px 22px', borderRadius:12, background:'rgba(3,2,10,0.85)', border:'1px solid rgba(239,68,68,0.5)', boxShadow:'0 0 30px rgba(239,68,68,0.3)' }}>
            <div style={{ fontFamily:'var(--f-title)', fontSize:15.5, fontWeight:900, color:'#f87171', letterSpacing:1.5 }}>⚔ BOSS MAJEUR ATTEINT</div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:11.3, color:'var(--text-sub)', marginTop:3 }}>Fin de l’événement</div>
          </div>
        </div>
      )}
    </>
  );
}
