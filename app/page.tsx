import { ContentGate } from '@/components/system/ContentGate';
import { MaintenanceScreen } from '@/components/layout/MaintenanceScreen';
import { MAINTENANCE_MODE } from '@/lib/maintenance';

export default function Home() {
  if (MAINTENANCE_MODE) return <MaintenanceScreen />;
  // Le jeu est chargé par ContentGate, après le contenu en ligne du configurateur.
  return <ContentGate />;
}
