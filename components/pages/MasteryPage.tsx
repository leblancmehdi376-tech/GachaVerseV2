'use client';
import { PageScroll, SectionHeader } from '@/components/ui/Page';
import { MasteryPanel } from './achievements/MasteryPanel';

// Page Maîtrise : progression propre à chaque personnage (niveau, combats,
// boss vaincus) et bonus de DPS personnel qui en découle.
export function MasteryPage() {
  return (
    <PageScroll>
      <SectionHeader
        eyebrow="PROGRESSION PAR PERSONNAGE"
        title="MAÎTRISE"
        accent="#f472b6"
      />
      <div style={{ fontFamily:'var(--f-ui)', fontSize:15, color:'var(--text-sub)', lineHeight:1.5 }}>
        Chaque personnage progresse en montant de niveau, en combattant dans ton équipe et en vainquant des boss.
        Sa maîtrise lui donne un <strong style={{ color:'#f9a8d4' }}>bonus de DPS personnel</strong>, qui ne s&apos;applique qu&apos;à lui.
        La maîtrise est conservée après un Prestige.
      </div>
      <MasteryPanel />
    </PageScroll>
  );
}
