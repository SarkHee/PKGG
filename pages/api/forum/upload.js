import crypto from 'crypto';
import supabaseAdmin, { FORUM_IMAGES_BUCKET } from '../../../utils/supabaseAdmin.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB (원본 기준)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  if (!supabaseAdmin) {
    console.error('[upload] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY 미설정');
    return res.status(500).json({ error: '이미지 업로드 서비스가 설정되지 않았습니다.' });
  }

  try {
    const { base64, mimeType } = req.body || {};

    if (!base64 || !mimeType) {
      return res.status(400).json({ error: '파일 데이터가 필요합니다.' });
    }

    if (!ALLOWED_TYPES.includes(mimeType)) {
      return res.status(400).json({ error: `지원하지 않는 형식입니다: ${mimeType}` });
    }

    // data:image/...;base64, 헤더 제거
    const base64Data = base64.replace(/^data:[^;]+;base64,/, '');
    if (!base64Data) {
      return res.status(400).json({ error: '이미지 데이터가 비어 있습니다.' });
    }

    // 원본 파일 크기 추정
    const sizeBytes = Math.ceil(base64Data.length * 0.75);
    if (sizeBytes > MAX_SIZE_BYTES) {
      return res.status(400).json({
        error: `이미지 크기는 5MB 이하여야 합니다. (현재: ${(sizeBytes / 1024 / 1024).toFixed(1)}MB)`,
      });
    }

    const extMap = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };
    const ext = extMap[mimeType] || 'jpg';
    const uniqueName = `${crypto.randomBytes(16).toString('hex')}.${ext}`;

    const buffer = Buffer.from(base64Data, 'base64');

    const { error: uploadError } = await supabaseAdmin.storage
      .from(FORUM_IMAGES_BUCKET)
      .upload(uniqueName, buffer, {
        contentType: mimeType,
        cacheControl: '31536000', // 1년 (파일명이 랜덤이라 불변 데이터)
        upsert: false,
      });

    if (uploadError) {
      console.error('[upload] Supabase Storage 업로드 실패:', uploadError.message);
      return res.status(500).json({ error: `이미지 저장 실패: ${uploadError.message}` });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(FORUM_IMAGES_BUCKET)
      .getPublicUrl(uniqueName);

    return res.status(200).json({ url: publicUrlData.publicUrl });
  } catch (error) {
    console.error('[upload] 오류:', error.message);
    return res.status(500).json({ error: `이미지 저장 실패: ${error.message}` });
  }
}
