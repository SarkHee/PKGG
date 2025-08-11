// utils/cacheManager.js
// 메모리 캐싱 및 Redis 대안 시스템

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.expiry = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5분
  }

  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, value);
    this.expiry.set(key, Date.now() + ttl);
  }

  get(key) {
    if (this.expiry.get(key) < Date.now()) {
      this.cache.delete(key);
      this.expiry.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  delete(key) {
    this.cache.delete(key);
    this.expiry.delete(key);
  }

  clear() {
    this.cache.clear();
    this.expiry.clear();
  }

  // 플레이어 캐싱 (30분)
  setPlayer(nickname, data) {
    this.set(`player:${nickname.toLowerCase()}`, data, 30 * 60 * 1000);
  }

  getPlayer(nickname) {
    return this.get(`player:${nickname.toLowerCase()}`);
  }

  // 클랜 캐싱 (10분)
  setClan(clanId, data) {
    this.set(`clan:${clanId}`, data, 10 * 60 * 1000);
  }

  getClan(clanId) {
    return this.get(`clan:${clanId}`);
  }

  // 클랜 멤버 리스트 캐싱 (15분)
  setClanMembers(clanId, members) {
    this.set(`clan_members:${clanId}`, members, 15 * 60 * 1000);
  }

  getClanMembers(clanId) {
    return this.get(`clan_members:${clanId}`);
  }
}

// 전역 캐시 인스턴스
export const cache = new CacheManager();
