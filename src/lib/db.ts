// Prisma クライアント（シングルトン）。本番DB（Supabase Postgres）接続時に使う。
// DATABASE_URL 未設定のデモ環境では参照されない（src/lib/data/repo.ts が切替）。
import { PrismaClient } from '@prisma/client';

const g = globalThis as unknown as { __prisma?: PrismaClient };

export const prisma: PrismaClient = g.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') g.__prisma = prisma;

/** 本番DBが設定されているか（DATABASE_URL の有無で判定） */
export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}
