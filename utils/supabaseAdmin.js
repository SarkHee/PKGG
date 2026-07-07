// utils/supabaseAdmin.js — Supabase Storage 서버 전용 클라이언트 싱글톤
// 환경변수 미설정 시 null 반환 → 호출부에서 graceful fallback 처리
import { createClient } from '@supabase/supabase-js';

let supabaseAdmin = null;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export default supabaseAdmin;

export const FORUM_IMAGES_BUCKET = 'forum-images';
