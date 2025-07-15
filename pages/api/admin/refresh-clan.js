// /pages/api/admin/refresh-clan.js
import { exec } from 'child_process';
import path from 'path';

export default function handler(req, res) {
  const scriptPath = path.join(process.cwd(), 'scripts', 'update-clan-data.js');

  exec(`node ${scriptPath}`, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ 실행 오류:', error);
      return res.status(500).json({ success: false, message: '클랜 데이터 갱신 실패', error: error.message });
    }

    console.log('✅ 스크립트 실행 결과:\n', stdout);
    return res.status(200).json({ success: true, message: '클랜 데이터 갱신 완료', output: stdout });
  });
}