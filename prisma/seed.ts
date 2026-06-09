// JASA Data Hub — Prisma seed（マスタ投入）。仕様書 §3.1。
// 本番DB接続後に `npx prisma db seed` で実行する。
// マスタ定義は src/lib/masters.ts と同一（単一の真実источник）。
//
// 注: 本ファイルは @prisma/client（`prisma generate` 後に生成）に依存するため、
// アプリ本体の typecheck からは除外している（tsconfig.exclude: prisma）。

import { PrismaClient } from '@prisma/client';
import {
  AGE_GROUPS, INTAKE_CATEGORIES, OUTCOME_CATEGORIES, PREFECTURES,
} from '../src/lib/masters';

const prisma = new PrismaClient();

async function main() {
  // 年齢区分
  for (const a of AGE_GROUPS) {
    await prisma.ageGroup.upsert({
      where: { code: a.code }, update: { name: a.name, sortOrder: a.sortOrder },
      create: { code: a.code, name: a.name, sortOrder: a.sortOrder },
    });
  }
  // 収容カテゴリー
  for (const c of INTAKE_CATEGORIES) {
    await prisma.intakeCategory.upsert({
      where: { code: c.code },
      update: { name: c.name, requiresRegion: c.requiresRegion, species: c.species, sortOrder: c.sortOrder },
      create: { code: c.code, name: c.name, requiresRegion: c.requiresRegion, species: c.species, sortOrder: c.sortOrder },
    });
  }
  // 転帰カテゴリー
  for (const c of OUTCOME_CATEGORIES) {
    await prisma.outcomeCategory.upsert({
      where: { code: c.code },
      update: { name: c.name, isLiveOutcome: c.isLiveOutcome, requiresRegion: c.requiresRegion, species: c.species, sortOrder: c.sortOrder },
      create: { code: c.code, name: c.name, isLiveOutcome: c.isLiveOutcome, requiresRegion: c.requiresRegion, species: c.species, sortOrder: c.sortOrder },
    });
  }
  // 都道府県
  for (const p of PREFECTURES) {
    await prisma.prefecture.upsert({
      where: { code: p.code }, update: { name: p.name, region: p.region },
      create: { code: p.code, name: p.name, region: p.region },
    });
  }
  console.log('Seed completed.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
