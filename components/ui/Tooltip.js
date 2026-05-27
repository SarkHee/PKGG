import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Tooltip({ children, content }) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const wrapRef = useRef(null);

  const handleMouseEnter = () => {
    if (wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      const tooltipWidth = 280;
      let left = rect.left + rect.width / 2 - tooltipWidth / 2;

      // 왼쪽 뷰포트 벗어남 방지
      if (left < 8) left = 8;
      // 오른쪽 뷰포트 벗어남 방지
      if (left + tooltipWidth > window.innerWidth - 8) left = window.innerWidth - tooltipWidth - 8;

      setCoords({ top: rect.bottom + 8, left });
    }
    setShow(true);
  };

  const tooltip = show ? createPortal(
    <span style={{ ...styles.tooltip, top: coords.top, left: coords.left }}>
      {content}
    </span>,
    document.body
  ) : null;

  return (
    <span
      ref={wrapRef}
      style={styles.wrapper}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {tooltip}
    </span>
  );
}

const styles = {
  wrapper: {
    position: 'relative',
    display: 'inline-block',
    cursor: 'help',
  },
  tooltip: {
    position: 'fixed',
    backgroundColor: 'rgba(15, 15, 20, 0.95)',
    color: '#e5e7eb',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '0.75rem',
    lineHeight: '1.6',
    whiteSpace: 'pre-line',
    wordBreak: 'keep-all',
    width: '280px',
    zIndex: 9999,
    pointerEvents: 'none',
    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
};
