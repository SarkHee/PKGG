// PK.GG/components/TeamMatchDetail.js

import React from 'react';
import Link from 'next/link';
import Tooltip from './Tooltip'; // Tooltip 컴포넌트 경로 확인

const TeamMatchDetail = ({ teammatesDetail, nickname, server }) => {
  if (!teammatesDetail || teammatesDetail.length === 0) {
    return <p style={styles.noData}>상세 팀원 데이터가 없습니다.</p>;
  }

  // 현재 플레이어의 데이터를 찾고, 그 플레이어의 teamId (또는 squadId)를 얻습니다.
  const currentPlayer = teammatesDetail.find(p => p.name.toLowerCase() === nickname.toLowerCase());

  let playersInMyTeam = [];
  let myTeamRank = 'N/A'; // 우리 팀 순위
  let myTeamTotalPlayers = 0; // 우리 팀 총 인원

  if (currentPlayer && (currentPlayer.teamId || currentPlayer.squadId)) {
    const myTeamIdentifier = currentPlayer.teamId || currentPlayer.squadId;

    // 나의 teamId와 일치하는 플레이어들만 필터링하여 '우리 팀'으로 간주
    playersInMyTeam = teammatesDetail.filter(tm => {
      return (tm.teamId || tm.squadId) === myTeamIdentifier;
    });

    // 우리 팀의 랭크와 총 인원 수 업데이트
    myTeamRank = currentPlayer.rank || 'N/A';
    myTeamTotalPlayers = playersInMyTeam.length;

  } else {
    // 만약 currentPlayer가 없거나 teamId/squadId가 없다면,
    // 이 매치에서 '내 팀'을 명확히 구분할 수 없다는 의미입니다.
    // 이 경우, 모든 플레이어를 보여주는 대신, 경고 메시지를 표시할 수 있습니다.
    return (
      <div style={styles.container}>
        <p style={styles.noTeamIdWarning}>
          ⚠️ 해당 경기에서 우리 팀을 정확히 구분할 수 없습니다. (팀 ID 누락)
        </p>
        {/* 디버깅을 위해 모든 유저를 보여주고 싶다면 아래 주석을 해제하세요 */}
        {/* <p>모든 유저 데이터:</p>
        <div style={styles.tableContainer}>
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>닉네임</th><th style={styles.th}>킬</th><th style={styles.th}>데미지</th>
                        <th style={styles.th}>어시스트</th><th style={styles.th}>기절시킴</th>
                        <th style={styles.th}>생존 시간</th><th style={styles.th}>OP스코어</th>
                    </tr>
                </thead>
                <tbody>
                    {teammatesDetail.map((player, idx) => {
                        const survivalMinutes = Math.floor(player.survivalTime / 60);
                        const survivalSeconds = Math.round(player.survivalTime % 60);
                        return (
                            <tr key={idx} style={player.name.toLowerCase() === nickname.toLowerCase() ? styles.myRow : styles.tr}>
                                <td style={styles.td}>
                                    <Link href={`/player/${server}/${player.name}`} passHref legacyBehavior>
                                        <a style={styles.playerLink}>
                                            {player.name.toLowerCase() === nickname.toLowerCase() ? `${player.name} (나)` : player.name}
                                        </a>
                                    </Link>
                                </td>
                                <td style={styles.td}>{player.kills || 0}</td>
                                <td style={styles.td}>{player.damage?.toFixed(0) || 0}</td>
                                <td style={styles.td}>{player.assists || 0}</td>
                                <td style={styles.td}>{player.dbnos || 0}</td>
                                <td style={styles.td}>{survivalMinutes}분 {survivalSeconds}초}</td>
                                <td style={styles.td}>{player.opGrade || 'N/A'}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div> */}
      </div>
    );
  }

  // 우리 팀 딜량 순으로 정렬
  playersInMyTeam.sort((a, b) => b.damage - a.damage);

  // 우리 팀의 총 킬, 총 데미지 계산
  const totalTeamKills = playersInMyTeam.reduce((sum, p) => sum + (p.kills || 0), 0);
  const totalTeamDamage = playersInMyTeam.reduce((sum, p) => sum + (p.damage || 0), 0);

  return (
    <div style={styles.container}>
      <h4 style={styles.title}>우리 팀 상세 스탯</h4>
      <div style={styles.teamSummary}>
        <p>
          <Tooltip content="우리 팀의 최종 순위">최종 순위</Tooltip>: <strong style={styles.rankColor}>{myTeamRank}위</strong> /
          <Tooltip content="우리 팀의 총 인원">총 인원</Tooltip>: {myTeamTotalPlayers}명
        </p>
        <p>
          <Tooltip content="우리 팀의 총 킬">총 킬</Tooltip>: <strong style={styles.statHighlight}>{totalTeamKills}</strong> /
          <Tooltip content="우리 팀의 총 데미지">총 데미지</Tooltip>: <strong style={styles.statHighlight}>{totalTeamDamage.toFixed(0)}</strong>
        </p>
      </div>
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>닉네임</th>
              <th style={styles.th}>킬</th>
              <th style={styles.th}>데미지</th>
              <th style={styles.th}>어시스트</th>
              <th style={styles.th}>기절시킴</th>
              <th style={styles.th}>생존 시간</th>
              <th style={styles.th}>OP스코어</th>
            </tr>
          </thead>
          <tbody>
            {playersInMyTeam.map((player, idx) => {
              const survivalMinutes = Math.floor(player.survivalTime / 60);
              const survivalSeconds = Math.round(player.survivalTime % 60);
              return (
                <tr key={idx} style={player.name.toLowerCase() === nickname.toLowerCase() ? styles.myRow : styles.tr}>
                  <td style={styles.td}>
                    <Link href={`/player/${server}/${player.name}`} passHref legacyBehavior>
                      <a style={styles.playerLink}>
                          {player.name.toLowerCase() === nickname.toLowerCase() ? `${player.name} (나)` : player.name}
                      </a>
                    </Link>
                  </td>
                  <td style={styles.td}>{player.kills || 0}</td>
                  <td style={styles.td}>{player.damage?.toFixed(0) || 0}</td>
                  <td style={styles.td}>{player.assists || 0}</td>
                  <td style={styles.td}>{player.dbnos || 0}</td>
                  <td style={styles.td}>{survivalMinutes}분 {survivalSeconds}초</td>
                  <td style={styles.td}>{player.opGrade || 'N/A'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#f8f8f8',
    padding: '15px',
    borderRadius: '8px',
    marginTop: '15px',
    border: '1px solid #eee',
  },
  title: {
    fontSize: '1.1em',
    color: '#0056b3',
    marginBottom: '10px',
    borderBottom: '1px dashed #ddd',
    paddingBottom: '5px',
  },
  noTeamIdWarning: {
    color: '#d9534f', // Red color for warning
    fontWeight: 'bold',
    textAlign: 'center',
    padding: '10px',
    backgroundColor: '#ffe0e0',
    borderRadius: '5px',
  },
  teamSummary: {
    marginBottom: '15px',
    backgroundColor: '#e6f2ff',
    padding: '10px',
    borderRadius: '5px',
    textAlign: 'center',
    fontSize: '0.95em',
    border: '1px solid #cce0ff',
  },
  tableContainer: {
    overflowX: 'auto', // 테이블이 넘칠 경우 스크롤
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#fff',
  },
  th: {
    borderBottom: '2px solid #ddd',
    padding: '10px',
    textAlign: 'center',
    backgroundColor: '#e6f2ff', // 헤더 배경색
    color: '#333',
    fontWeight: 'bold',
    whiteSpace: 'nowrap', // 텍스트 줄바꿈 방지
  },
  td: {
    borderBottom: '1px solid #eee',
    padding: '8px 10px',
    textAlign: 'center',
    whiteSpace: 'nowrap',
  },
  tr: {
    transition: 'background-color 0.2s ease',
  },
  myRow: {
    backgroundColor: '#e0f0ff', // 나의 행 강조 색상
    fontWeight: 'bold',
  },
  playerLink: {
    cursor: 'pointer',
    color: '#007bff',
    textDecoration: 'underline',
    fontWeight: 'bold',
  },
  statHighlight: { // 테이블 내에서 숫자 강조
    fontWeight: 'bold',
    color: '#007bff',
  },
  rankColor: { // 순위 강조 색상 (팀 요약에 추가)
    color: '#d9534f',
    fontWeight: 'bold',
  },
  noData: {
    color: '#888',
    fontStyle: 'italic',
  }
};

export default TeamMatchDetail;