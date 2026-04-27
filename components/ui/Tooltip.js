import React, { useState, useRef } from 'react';

export default function Tooltip({ children, content }) {
  const [pos, setPos] = useState(null);
  const ref = useRef(null);

  const show = () => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({ x: r.left + r.width / 2, y: r.top });
  };

  return (
    <span ref={ref} style={{ display: 'inline-block' }} onMouseEnter={show} onMouseLeave={() => setPos(null)}>
      {children}
      {pos && (
        <span
          style={{
            position: 'fixed',
            left: pos.x,
            top: pos.y - 8,
            transform: 'translateX(-50%) translateY(-100%)',
            backgroundColor: 'rgba(17,24,39,0.97)',
            color: '#e5e7eb',
            padding: '8px 12px',
            borderRadius: '10px',
            fontSize: '0.75rem',
            whiteSpace: 'pre-line',
            maxWidth: '280px',
            zIndex: 9999,
            pointerEvents: 'none',
            lineHeight: '1.6',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            textAlign: 'left',
          }}
        >
          {content}
        </span>
      )}
    </span>
  );
}
