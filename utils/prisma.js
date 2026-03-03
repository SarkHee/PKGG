// utils/prisma.js — PrismaClient 글로벌 싱글톤
// Next.js 개발 환경(핫리로드)에서 매번 새 인스턴스 생성을 막아 DB 연결 고갈 방지

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
