import * as SharedTypes from '../src/types';
import { cn } from '../src/utils';

const typeNames = Object.keys(SharedTypes).filter(k => k !== 'default');

export function App() {
  const cnTest = cn('base-class', true && 'conditional-true', false && 'conditional-false', 'another-class');

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      {/* Header */}
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #34d399, #818cf8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '4px',
        }}>
          @ctac/shared
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b' }}>
          Package Health Check — Port 8084
        </p>
      </header>

      {/* Status Banner */}
      <div style={{
        padding: '16px 20px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #064e3b40, #1e1b4b40)',
        border: '1px solid #065f46',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <span style={{ fontSize: '24px' }}>✅</span>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#34d399' }}>Package loaded successfully</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>All exports are accessible and functional</div>
        </div>
      </div>

      {/* cn() Utility Test */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#818cf8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Utility: cn()
        </h2>
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          background: '#0f172a',
          border: '1px solid #1e293b',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '12px',
        }}>
          <div style={{ color: '#64748b', marginBottom: '6px' }}>// Test: cn('base-class', true && 'conditional-true', false && 'conditional-false', 'another-class')</div>
          <div>
            <span style={{ color: '#64748b' }}>Result: </span>
            <span style={{ color: '#34d399', fontWeight: 600 }}>"{cnTest}"</span>
          </div>
        </div>
      </section>

      {/* Exported Types */}
      <section>
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#818cf8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Exported Types & Enums ({typeNames.length})
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
          {typeNames.map(name => {
            const val = (SharedTypes as Record<string, unknown>)[name];
            const isEnum = typeof val === 'object' && val !== null;

            return (
              <div key={name} style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#0f172a',
                border: '1px solid #1e293b',
                fontSize: '12px',
              }}>
                <div style={{ fontWeight: 600, color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace" }}>{name}</div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                  {isEnum ? `enum (${Object.keys(val as object).length / 2} values)` : 'interface / type'}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* TokenType Enum Detail */}
      <section style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#818cf8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          TokenType Enum Values
        </h2>
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          background: '#0f172a',
          border: '1px solid #1e293b',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          lineHeight: 1.8,
          maxHeight: '300px',
          overflow: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '2px 16px',
        }}>
          {Object.entries(SharedTypes.TokenType)
            .filter(([key]) => isNaN(Number(key)))
            .map(([key, val]) => (
              <div key={key}>
                <span style={{ color: '#818cf8' }}>{key}</span>
                <span style={{ color: '#334155' }}> = </span>
                <span style={{ color: '#f59e0b' }}>'{String(val)}'</span>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
