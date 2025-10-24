import React from 'react';

/**
 * 경기별 맵 위치 시각화(맵 위에 이동경로, 교전 위치 등)
 * @param {Object} props
 * @param {string} props.mapName - 맵 이름
 * @param {Array} props.movePathCoords - 이동 경로 좌표 배열 [{x, y}]
 * @param {Array} props.combatCoords - 교전 위치 좌표 배열 [{x, y}]
 */
export default function MatchMapView({
  mapName,
  movePathCoords,
  combatCoords,
}) {
  // 맵 이미지 매핑 (예시)
  const mapImages = {
    ERANGEL: '/maps/erangel.jpg',
    MIRAMAR: '/maps/miramar.jpg',
    SANHOK: '/maps/sanhok.jpg',
    VIKENDI: '/maps/vikendi.jpg',
    TAEGO: '/maps/taego.jpg',
    DESTON: '/maps/deston.jpg',
  };
  const mapImg = mapImages[mapName?.toUpperCase()] || mapImages['ERANGEL'];

  // 맵 크기 (예시)
  const mapSize = 400;

  return (
    <div className="match-map-view bg-gray-100 dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700 mt-2 flex flex-col items-center">
      <div className="font-bold text-base mb-2 text-blue-700 dark:text-blue-300">
        맵 이동/교전 위치
      </div>
      <div style={{ position: 'relative', width: mapSize, height: mapSize }}>
        <img
          src={mapImg}
          alt={mapName}
          style={{
            width: mapSize,
            height: mapSize,
            borderRadius: 8,
            opacity: 0.95,
          }}
        />
        {/* 이동 경로 라인 */}
        {Array.isArray(movePathCoords) && movePathCoords.length > 1 && (
          <svg
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              pointerEvents: 'none',
            }}
            width={mapSize}
            height={mapSize}
          >
            <polyline
              points={movePathCoords
                .map((p) => `${p.x * mapSize},${p.y * mapSize}`)
                .join(' ')}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="3"
              opacity="0.7"
            />
          </svg>
        )}
        {/* 교전 위치 점 */}
        {Array.isArray(combatCoords) &&
          combatCoords.map((p, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: p.x * mapSize - 6,
                top: p.y * mapSize - 6,
                width: 12,
                height: 12,
                background: '#f87171',
                borderRadius: 6,
                border: '2px solid #fff',
                boxShadow: '0 0 4px #0008',
              }}
            />
          ))}
      </div>
    </div>
  );
}
