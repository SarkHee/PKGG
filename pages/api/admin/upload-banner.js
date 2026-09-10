// pages/api/admin/upload-banner.js — 배너 광고 이미지 업로드 (관리자 전용)
// pages/api/forum/upload.js와 동일한 Supabase Storage 버킷 재사용
import crypto from 'crypto';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth].js';
import supabaseAdmin, { FORUM_IMAGES_BUCKET } from '../../../utils/supabaseAdmin.js';

const ADMIN_EMAIL = 'sssyck123@gmail.com';

async function checkAdmin(req, res) {
  const pw = req.headers['x-admin-token'] || req.query.pw;
  if (pw && pw === process.env.ADMIN_PASSWORD) return true;
  const session = await getServerSession(req, res, authOptions);
  return session?.user?.email === ADMIN_EMAIL;
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const isAdmin = await checkAdmin(req, res);
  if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' });

  if (!supabaseAdmin) {
    console.error('[upload-banner] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY 미설정');
    return res.status(500).json({ error: '이미지 업로드 서비스가 설정되지 않았습니다.' });
  }

  try {
    const { base64, mimeType } = req.body || {};
    if (!base64 || !mimeType) return res.status(400).json({ error: '파일 데이터가 필요합니다.' });
    if (!ALLOWED_TYPES.includes(mimeType)) return res.status(400).json({ error: `지원하지 않는 형식입니다: ${mimeType}` });

    const base64Data = base64.replace(/^data:[^;]+;base64,/, '');
    if (!base64Data) return res.status(400).json({ error: '이미지 데이터가 비어 있습니다.' });

    const sizeBytes = Math.ceil(base64Data.length * 0.75);
    if (sizeBytes > MAX_SIZE_BYTES) {
      return res.status(400).json({ error: `이미지 크기는 5MB 이하여야 합니다. (현재: ${(sizeBytes / 1024 / 1024).toFixed(1)}MB)` });
    }

    const extMap = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };
    const ext = extMap[mimeType] || 'jpg';
    const uniqueName = `banners/${crypto.randomBytes(16).toString('hex')}.${ext}`;

    const buffer = Buffer.from(base64Data, 'base64');

    const { error: uploadError } = await supabaseAdmin.storage
      .from(FORUM_IMAGES_BUCKET)
      .upload(uniqueName, buffer, {
        contentType: mimeType,
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) {
      console.error('[upload-banner] Supabase Storage 업로드 실패:', uploadError.message);
      return res.status(500).json({ error: `이미지 저장 실패: ${uploadError.message}` });
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from(FORUM_IMAGES_BUCKET).getPublicUrl(uniqueName);
    return res.status(200).json({ url: publicUrlData.publicUrl });
  } catch (error) {
    console.error('[upload-banner] 오류:', error.message);
    return res.status(500).json({ error: `이미지 저장 실패: ${error.message}` });
  }
}
