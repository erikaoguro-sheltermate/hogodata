// 共有パスワードゲート（Supabase 導入前の暫定運用）
// cookie にはパスワードそのものではなく、パスワードから作った署名だけを入れる。
// Web Crypto を使うので middleware（Edge）と Server Action（Node）の両方で動く。

export const GATE_COOKIE = 'jasa_gate';
const SALT = 'jasa-data-hub-gate-v1';

export async function gateToken(password: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(SALT));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** 長さを揃えてから比較（タイミング差を小さくする） */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
