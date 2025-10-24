// components/SynergyDisplay.js
import React from 'react';

export default function SynergyDisplay({ synergyStatusList }) {
  if (!synergyStatusList || synergyStatusList.length === 0) {
    return <p>클랜원과의 매치 기록이 없습니다.</p>;
  }

  const goodCount = synergyStatusList.filter((s) => s === '좋음').length;
  const totalCount = synergyStatusList.length;
  const ratio = totalCount > 0 ? goodCount / totalCount : 0;

  let synergyMessage = '';
  let barColor = ''; // 막대 색상
  let textColor = ''; // 텍스트 색상

  if (ratio >= 0.9) {
    synergyMessage = '🏆 압도적 시너지';
    barColor = '#4CAF50'; // 진한 초록
    textColor = '#2E7D32';
  } else if (ratio >= 0.7) {
    synergyMessage = '🔥 매우 좋음';
    barColor = '#8BC34A'; // 연두색
    textColor = '#558B2F';
  } else if (ratio >= 0.5) {
    synergyMessage = '😎 보통';
    barColor = '#FFEB3B'; // 노랑
    textColor = '#F9A825';
  } else {
    synergyMessage = '⚠️ 낮은 시너지';
    barColor = '#FF5722'; // 주황
    textColor = '#BF360C';
  }

  const barWidth = `${(ratio * 100).toFixed(0)}%`;

  return (
    <div style={synergyStyles.container}>
      <h4 style={synergyStyles.title}>
        클랜원과의 매치 시너지 상태:{' '}
        <span style={{ color: textColor }}>{synergyMessage}</span>
      </h4>
      <div style={synergyStyles.progressBarBackground}>
        <div
          style={{
            ...synergyStyles.progressBarFill,
            width: barWidth,
            backgroundColor: barColor,
          }}
        >
          <span style={synergyStyles.progressBarText}>{barWidth} 좋음</span>
        </div>
      </div>
      <p style={synergyStyles.infoText}>
        ({goodCount} / {totalCount} 경기 좋음)
      </p>
    </div>
  );
}

const synergyStyles = {
  container: {
    marginTop: '15px',
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#f8f8f8',
    borderRadius: '8px',
    border: '1px solid #eee',
  },
  title: {
    fontSize: '1.1em',
    marginBottom: '10px',
    color: '#333',
  },
  progressBarBackground: {
    width: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: '5px',
    overflow: 'hidden',
    height: '25px',
  },
  progressBarFill: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    transition: 'width 0.5s ease-in-out',
  },
  progressBarText: {
    fontSize: '0.9em',
    textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
  },
  infoText: {
    fontSize: '0.85em',
    color: '#666',
    marginTop: '5px',
    textAlign: 'right',
  },
};
