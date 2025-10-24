// 주기적 자동 발견 시스템
const { runAutoDiscovery } = require('./auto-discovery-monitor');

console.log('🤖 PKGG 자동 발견 시스템 시작');
console.log('   - 30분마다 새로운 플레이어 검색');
console.log('   - 자동으로 클랜과 멤버 DB 업데이트');
console.log('   - Ctrl+C로 중지\n');

let runCount = 0;

// 30분마다 실행 (1800000ms)
const intervalTime = 30 * 60 * 1000;

// 즉시 첫 실행
runDiscoveryRound();

// 주기적 실행 설정
const interval = setInterval(runDiscoveryRound, intervalTime);

async function runDiscoveryRound() {
  runCount++;
  const now = new Date().toLocaleString('ko-KR');

  console.log(`\n🔄 [${runCount}회차] 자동 발견 시작 - ${now}`);

  try {
    await runAutoDiscovery();
    console.log(
      `✅ [${runCount}회차] 완료 - 다음 실행: ${new Date(Date.now() + intervalTime).toLocaleString('ko-KR')}\n`
    );
  } catch (error) {
    console.error(`🔥 [${runCount}회차] 오류:`, error.message);
  }
}

// 종료 처리
process.on('SIGINT', () => {
  console.log('\n🛑 자동 발견 시스템 종료');
  clearInterval(interval);
  process.exit(0);
});
