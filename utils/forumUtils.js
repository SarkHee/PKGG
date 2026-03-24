// utils/forumUtils.js - 포럼 공용 유틸리티
import crypto from 'crypto'

export function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

// 비속어 필터
const PROFANITY_WORDS = [
  '시발', '씨발', '개새끼', '병신', '죽어', '꺼져', '미친', '또라이', '씨팔', '시팔',
  '개놈', '창녀', '걸레', '등신', '개지랄', '지랄', '좆', '엿먹어', '닥쳐', '빙신',
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'retard', 'nigger', 'whore', 'cunt', 'motherfucker',
]

export function checkProfanity(text) {
  const lowerText = text.toLowerCase()
  return PROFANITY_WORDS.some((word) => lowerText.includes(word.toLowerCase()))
}

// 입력 길이 제한
export const LIMITS = {
  TITLE: 200,
  CONTENT: 10000,
  AUTHOR: 50,
  REPLY_CONTENT: 3000,
  PASSWORD_MIN: 4,
}
