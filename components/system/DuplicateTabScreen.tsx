'use client';

import { useEffect, useState } from 'react';

interface DuplicateTabScreenProps {
  onTakeover: () => void;
  isTakingOver: boolean;
}

export function DuplicateTabScreen({ onTakeover, isTakingOver }: DuplicateTabScreenProps) {
  const [dots, setDots] = useState('');

  // Animation des points de chargement pendant le takeover
  useEffect(() => {
    if (!isTakingOver) return;
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 400);
    return () => clearInterval(interval);
  }, [isTakingOver]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#06040f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Press Start 2P', monospace",
      zIndex: 9999,
      padding: '24px',
    }}>
      {/* Icône d'avertissement pixel-art */}
      <div style={{
        width: 80,
        height: 80,
        marginBottom: 32,
        position: 'relative',
      }}>
        <svg viewBox="0 0 80 80" width="80" height="80">
          {/* Triangle */}
          <polygon
            points="40,8 74,68 6,68"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          {/* ! */}
          <rect x="37" y="26" width="6" height="22" rx="2" fill="#f59e0b"/>
          <rect x="37" y="54" width="6" height="6" rx="2" fill="#f59e0b"/>
        </svg>
      </div>

      {/* Titre */}
      <h1 style={{
        color: '#f59e0b',
        fontSize: '14.4px',
        marginBottom: 16,
        textAlign: 'center',
        lineHeight: 1.6,
      }}>
        JEUX DÉJÀ OUVERT
      </h1>

      {/* Sous-titre */}
      <p style={{
        color: '#6b7280',
        fontSize: '8.2px',
        marginBottom: 48,
        textAlign: 'center',
        lineHeight: 2,
        maxWidth: 400,
      }}>
        {isTakingOver
          ? `Reprise en cours${dots}`
          : 'GachaVerse tourne déjà dans un autre onglet.\nUne seule instance est autorisée à la fois.'}
      </p>

      {/* Boutons */}
      {!isTakingOver && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          {/* Reprendre ici */}
          <button
            onClick={onTakeover}
            style={{
              background: 'transparent',
              border: '2px solid #7c3aed',
              color: '#a78bfa',
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '8.2px',
              padding: '14px 24px',
              cursor: 'pointer',
              letterSpacing: '0.05em',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = '#7c3aed';
              (e.target as HTMLButtonElement).style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = 'transparent';
              (e.target as HTMLButtonElement).style.color = '#a78bfa';
            }}
          >
            ▶ REPRENDRE ICI
          </button>

          {/* Fermer cet onglet */}
          <button
            onClick={() => window.close()}
            style={{
              background: 'transparent',
              border: '2px solid #374151',
              color: '#6b7280',
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '8.2px',
              padding: '14px 24px',
              cursor: 'pointer',
              letterSpacing: '0.05em',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = '#6b7280';
              (e.target as HTMLButtonElement).style.color = '#9ca3af';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = '#374151';
              (e.target as HTMLButtonElement).style.color = '#6b7280';
            }}
          >
            ✕ FERMER
          </button>
        </div>
      )}

      {/* Badge de version en bas */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        color: '#1f2937',
        fontSize: '7.2px',
      }}>
        GACHAVERSE — INSTANCE GUARD v1.0
      </div>
    </div>
  );
}
