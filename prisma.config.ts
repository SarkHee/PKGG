import { defineConfig } from 'prisma/config';
import * as dotenv from 'dotenv';

// CLI 실행 시 .env를 자동 로드 (prisma.config.ts 사용 시 Prisma가 .env를 스킵하기 때문)
dotenv.config();

export default defineConfig({
  datasourceUrl: process.env.DATABASE_URL,
});
