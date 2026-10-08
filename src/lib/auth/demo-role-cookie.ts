import type { Role } from '@/lib/types';

/** デモモードの表示ロールを Cookie に保存する（ブラウザ専用。名前は session.ts の ROLE_COOKIE と一致させる） */
export function setDemoRoleCookie(role: Role) {
  document.cookie = `jasa_role=${role}; path=/; max-age=31536000`;
}
