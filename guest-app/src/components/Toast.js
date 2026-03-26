import React from 'react';

const colors = {
  success: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', text: '#6ee7b7' },
  error:   { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.3)',  text: '#fca5a5' },
  info:    { bg: 'rgba(39,39,42,0.9)',    border: '#3f3f46',              text: '#e4e4e7' },
};

export default function Toast({ message, type = 'info' }) {
  const c = colors[type] || colors.info;
  return (
    <div style={{
      position: 'fixed',
      bottom: 32,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 999,
      padding: '12px 24px',
      borderRadius: 16,
      background: c.bg,
      border: `1px solid ${c.border}`,
      color: c.text,
      fontSize: 14,
      fontWeight: 600,
      backdropFilter: 'blur(12px)',
      whiteSpace: 'nowrap',
      maxWidth: 'calc(100vw - 32px)',
      textAlign: 'center',
    }}>
      {message}
    </div>
  );
}
