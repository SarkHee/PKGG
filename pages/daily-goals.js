// pages/daily-goals.js — /mypage로 리다이렉트
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function DailyGoals() {
  const router = useRouter();
  useEffect(() => { router.replace('/mypage'); }, [router]);
  return null;
}
