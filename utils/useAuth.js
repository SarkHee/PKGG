// utils/useAuth.js — next-auth 기반 인증 훅
import { createContext, useContext } from 'react';
import { useSession, signOut } from 'next-auth/react';

const AuthContext = createContext(null);

// _app.js 호환성을 위해 유지 (SessionProvider가 실제 역할)
export function AuthProvider({ children }) {
  return <AuthContext.Provider value={null}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const { data: session, status } = useSession();
  const user = status === 'loading' ? undefined : (session?.user || null);
  const logout = () => signOut({ callbackUrl: '/' });
  return { user, logout, status };
}
