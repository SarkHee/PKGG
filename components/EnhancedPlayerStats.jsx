import React, { useState } from 'react';

const PUBG_SEASONS = [
  { id: 'division.bro.official.pc-2018-01', name: '2018 시즌 1' },
  { id: 'division.bro.official.pc-2018-03', name: '2018 시즌 2' },
  { id: 'division.bro.official.pc-2018-05', name: '2018 시즌 3' },
  { id: 'division.bro.official.pc-2018-08', name: '2018 시즌 4' },
  { id: 'division.bro.official.pc-2019-01', name: '2019 시즌 1' },
  { id: 'division.bro.official.pc-2019-02', name: '2019 시즌 2' },
  { id: 'division.bro.official.pc-2019-03', name: '2019 시즌 3' },
  { id: 'division.bro.official.pc-2019-04', name: '2019 시즌 4' },
  { id: 'division.bro.official.pc-2019-05', name: '2019 시즌 5' },
  { id: 'division.bro.official.pc-2019-06', name: '2019 시즌 6' },
  { id: 'division.bro.official.pc-2020-01', name: '2020 시즌 1' },
  { id: 'division.bro.official.pc-2020-02', name: '2020 시즌 2' },
  { id: 'division.bro.official.pc-2020-03', name: '2020 시즌 3' },
  { id: 'division.bro.official.pc-2021-01', name: '2021 시즌 1' },
  { id: 'division.bro.official.pc-2021-02', name: '2021 시즌 2' },
  { id: 'division.bro.official.pc-2021-03', name: '2021 시즌 3' },
  { id: 'division.bro.official.pc-2022-01', name: '2022 시즌 1' },
  { id: 'division.bro.official.pc-2022-02', name: '2022 시즌 2' },
  { id: 'division.bro.official.pc-2022-03', name: '2022 시즌 3' },
  { id: 'division.bro.official.pc-2023-01', name: '2023 시즌 1' },
  { id: 'division.bro.official.pc-2023-02', name: '2023 시즌 2' },
  { id: 'division.bro.official.pc-2023-03', name: '2023 시즌 3' },
  { id: 'division.bro.official.pc-2024-01', name: '2024 시즌 1' },
  { id: 'division.bro.official.pc-2024-02', name: '2024 시즌 2' },
  { id: 'division.bro.official.pc-2024-03', name: '2024 시즌 3' },
  { id: 'division.bro.official.pc-2025-01', name: '2025 시즌 1' },
];

const EnhancedPlayerStats = ({ enhancedStats, player, currentSeason, onSeasonChange }) => {
  const [selectedSeason, setSelectedSeason] = useState(currentSeason || PUBG_SEASONS[PUBG_SEASONS.length - 1]?.id || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSeasonChange = async (seasonId) => {
    setSelectedSeason(seasonId);
    setIsLoading(true);
    
    try {
      // 부모 컴포넌트의 onSeasonChange 호출
      if (onSeasonChange) {
        await onSeasonChange(seasonId);
      }
      // 시즌별 데이터 로딩 로직은 향후 구현 예정
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('시즌 데이터 로딩 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="enhanced-player-stats">
      <div className="season-selector">
        <label htmlFor="season-select" className="season-label">
          시즌 선택:
        </label>
        <select
          id="season-select"
          value={selectedSeason}
          onChange={(e) => handleSeasonChange(e.target.value)}
          className="season-dropdown"
          disabled={isLoading}
        >
          {PUBG_SEASONS.map((season) => (
            <option key={season.id} value={season.id}>
              {season.name}
            </option>
          ))}
        </select>
        {isLoading && <span className="loading-indicator">로딩 중...</span>}
      </div>

      <div className="stats-content">
        <p className="development-notice">
          시즌별 상세 통계는 개발 중입니다.
        </p>
      </div>

      <style jsx>{`
        .enhanced-player-stats {
          background: white;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .season-selector {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #eee;
        }

        .season-label {
          font-weight: 600;
          color: #333;
          font-size: 14px;
        }

        .season-dropdown {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
          font-size: 14px;
          min-width: 150px;
          cursor: pointer;
        }

        .season-dropdown:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading-indicator {
          color: #666;
          font-size: 12px;
          font-style: italic;
        }

        .stats-content {
          text-align: center;
          padding: 40px 20px;
        }

        .development-notice {
          color: #666;
          font-size: 16px;
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default EnhancedPlayerStats;
