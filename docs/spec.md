# どうぶつ保護データプロジェクト — SaaS 詳細仕様書

**バージョン**: 1.0 / **作成日**: 2026年6月9日 / **関連**: [requirements.md](requirements.md)

> 「どう作るか」の正本。技術スタック・DBスキーマ・API・画面・バリデーション・ロードマップを定義する。
> 本リポジトリの実装はこの仕様書に従う。要約は [CLAUDE.md](../CLAUDE.md) を参照。

---

## 1. 技術スタック
TypeScript / Next.js 15 (App Router) / Tailwind + shadcn/ui / Recharts /
PostgreSQL(Supabase) / **Prisma**(ORM) / Supabase Auth(メール・マジックリンク) /
Supabase RLS / SheetJS(xlsx) + @react-pdf/renderer / Vercel + Supabase /
Vitest(単体) + Playwright(E2E)。

### 1.1 ディレクトリ構成
```
prisma/schema.prisma, prisma/seed.ts
src/app/(auth)/login, (dashboard)/{reports,organizations,analytics,masters,settings/users}, api/
src/components, src/lib/{auth.ts,validation/,db.ts}, src/types, tests/
```

---

## 2. ドメインモデル
記録の最小単位 = **MonthlyReport（団体 × 種別(犬/猫) × 年月）**。
1レポートが 収容明細(IntakeEntry[]) / 転帰明細(OutcomeEntry[]) / 月初・月末管理頭数 /（猫なら）TNR明細(TnrEntry) を持つ。
カテゴリー・年齢区分・地域区分・都道府県はマスタ化し後調整可能に。

```
Organization
  └─ MonthlyReport (org × species × year × month) — status, beginningCount, endingCount
        ├─ IntakeEntry[]  (intakeCategory × ageGroup × region → count)
        ├─ OutcomeEntry[] (outcomeCategory × ageGroup × region → count)
        └─ TnrEntry       (soloCount, collaborativeCount) ※猫のみ
```

---

## 3. DBスキーマ（Prisma） — 正本は prisma/schema.prisma

列挙: `Role{ADMIN,ORG_USER,VIEWER}` / `Species{DOG,CAT}` /
`Region{IN_PREF,ADJACENT,DISTANT}`（+ 実装センチネル `NONE`）/ `ReportStatus{DRAFT,SUBMITTED,CONFIRMED}`。

モデル: Profile, Organization, MonthlyReport, IntakeEntry, OutcomeEntry, TnrEntry,
IntakeCategory, OutcomeCategory, AgeGroup, Prefecture, AuditLog。
（全フィールド定義は prisma/schema.prisma を参照）

**MonthlyReport の管理頭数**: beginningCount / beginningFosterCount(内数) / endingCount / endingFosterCount(内数)。
`@@unique([organizationId, species, year, month])`。

**null区分のユニーク制約**: PostgreSQLはユニークindex内のNULLを互いに異なる値として扱うため、
region=null の明細では `@@unique([..., region])` が重複を防げない。対策として region に
非nullセンチネル `NONE` を持たせる（本実装の採用方針）。

### 3.1 初期マスタ（seed）

**IntakeCategory**（記載順）
| code | name | requiresRegion | species |
|------|------|----------------|---------|
| STRAY | 所有者不明 | true | 共通 |
| OWNER_SURRENDER | 飼い主からの引き取り | true | 共通 |
| FROM_GOV | 行政施設からの引き取り | true | 共通 |
| TRANSFER_IN | 他の民間団体からの移動 | true | 共通 |
| NEGLECT | 不適切飼養環境からの収容 | true | 共通 |
| FROM_TNR | TNR経由からの収容 | false | CAT |
| OTHER | その他 | false | 共通 |

**OutcomeCategory**（記載順）
| code | name | isLiveOutcome | requiresRegion | species |
|------|------|---------------|----------------|---------|
| DIED | 死亡 | false | false | 共通 |
| LOST | 行方不明・失踪 | false | false | 共通 |
| EUTHANASIA | 安楽死 | false | false | 共通 |
| ADOPTION | 一般譲渡 | true | true | 共通 |
| RTO | 飼い主への返還 | true | false | 共通 |
| TRANSFER_OUT | 他の民間団体への引渡し | true | false | 共通 |
| OUTDOOR_RELEASE | 屋外へのリリース | true | false | CAT |
| OTHER_LIVE | その他（生存転帰） | true | false | 共通 |

**AgeGroup**: UNDER_5M(〜5ヶ月齢) / M5_TO_Y10(5ヶ月〜10歳) / OVER_10Y(10歳〜)。
**Prefecture**: JISコード47件 + 地方ブロック。

---

## 4. 画面設計
| 画面 | パス | ロール |
|------|------|--------|
| ログイン | `/login` | 全員 |
| ダッシュボードTOP | `/` | 全員 |
| 月次レポート一覧 | `/reports` | Admin/Org |
| 月次レポート入力 | `/reports/new`, `/reports/[id]` | Admin/Org |
| 団体マスタ一覧 | `/organizations` | Admin |
| 集計ダッシュボード | `/analytics` | 全員 |
| マスタ管理 | `/masters` | Admin |
| ユーザー管理 | `/settings/users` | Admin |
| データ還元レポート | `/reports/export` | Admin |

### 4.1 月次レポート入力フォーム（中核）
- ヘッダー: 団体(Admin選択可/Org固定)・種別・対象年月・記録期間(開始〜終了)・ステータス
- §1 記録開始時の管理頭数: 合計 + うち一時預かり先(内数)
- §2 新規収容: 収容カテゴリー × 年齢区分3列のマトリクス。requiresRegion=true は県内/県外隣接/県外遠隔の3行。猫のみ FROM_TNR 行。各カテゴリーに合計列(自動)
- §3 転帰: 非生存(死亡/行方不明/安楽死)と生存(一般譲渡/返還/他団体引渡し/その他, 猫のみ屋外リリース)を視覚グループ化。ADOPTION/TRANSFER_OUTは地域区分列。全て年齢区分3列
- §4 記録終了時の管理頭数: 合計 + 内数
- §5 TNR頭数: 猫のみ表示。対象期間 + 単独/協力の頭数
- **収支整合パネル(常時固定)**: `記録開始 + 収容合計 − 転帰合計` と `記録終了` の差分をリアルタイム。一致=緑/不一致=黄警告。内数は参考(式に含めない)
- 補助: 前月の記録終了時頭数を今月の開始時候補に自動引継ぎ、入力途中の自動下書き保存

### 4.2 集計ダッシュボード
- フィルタ: 期間(年月レンジ)/都道府県・地方ブロック/種別
- 表示: 収容ルート別構成 / 転帰別構成(生存転帰率含む) / 月次推移の折れ線 / 団体間連携(移動IN/OUT)
- 匿名性: 団体個別値はAdminのみ。Org/Viewerは集計値のみ(団体名ランキング等は出さない)

---

## 5. API設計（Next.js Route Handlers / REST）
`/api` 配下。認証=Supabaseセッション、認可=ロール+所属団体。

| メソッド | エンドポイント | 権限 |
|---------|---------------|------|
| GET/POST | `/api/organizations` | Admin(全) / Org(自) ・ 作成=Admin |
| PATCH | `/api/organizations/:id` | Admin |
| GET/POST | `/api/reports`（year,month,species,orgId,status でフィルタ / 一括作成） | Admin/Org |
| GET/PUT | `/api/reports/:id`（詳細 / 明細置換更新） | Admin/Org(自) |
| POST | `/api/reports/:id/submit`（DRAFT→SUBMITTED） | Admin/Org(自) |
| POST | `/api/reports/:id/confirm`（SUBMITTED→CONFIRMED） | Admin |
| DELETE | `/api/reports/:id`（論理削除） | Admin |
| GET | `/api/analytics/summary`（period,prefecture,species） | 全員(Org/Viewerは匿名) |
| POST | `/api/imports/reports` | Admin |
| GET | `/api/exports/reports` | Admin |
| GET/PATCH | `/api/masters/:type[/:id]` | 取得=全員 / 更新=Admin |
| GET/POST | `/api/users` | Admin |

レスポンスにはサーバ再計算した収支差分 `balanceDelta` と警告フラグを含める。
リクエスト例は原本仕様書 §5.1 参照（region を持たない明細は null → 実装上 `NONE` に正規化）。

---

## 6. バリデーション（src/lib/validation/ — フロント即時表示とAPI保存前で共用）
| ID | 内容 | 挙動 |
|----|------|------|
| V-01 | 件数・頭数は 0以上の整数 | エラー |
| V-02 | year妥当範囲, month 1–12, periodStart ≤ periodEnd | エラー |
| V-03 | org × species × year × month 重複不可 | エラー |
| V-04 | **収支整合** `beginningCount + Σintake − Σoutcome == endingCount` | **警告**(既定保存可・needsReviewフラグ。設定で必須エラー化可) |
| V-05 | species=CAT のみ TNR入力・FROM_TNR収容・OUTDOOR_RELEASE転帰を許可。犬は拒否 | エラー |
| V-06 | requiresRegion=true は region必須, false は region=NONE | エラー |
| V-07 | 内数 ≤ 合計（beginningFosterCount ≤ beginningCount 等） | エラー |
| V-08 | 明細カテゴリー × 種別の整合（V-05の一般化） | エラー |
| V-09 | CONFIRMED は Admin 以外編集不可 | エラー |

`balanceDelta = beginningCount + intakeTotal − outcomeTotal − endingCount`。0以外で警告 + needsReview。

---

## 7. セキュリティ / RLS方針
Supabase Auth。Profile.role と organizationId で認可。
RLS: MonthlyReport は ADMIN全行 / ORG_USER は自団体行のみ / VIEWER は集計ビューのみ。
集計APIは団体名を含まない匿名集計ビューを参照。HTTPS。AuditLog に CREATE/UPDATE/DELETE/SUBMIT を記録。論理削除を基本。

---

## 8. インポート / エクスポート
- インポート(F-08): 犬・猫Excelテンプレ → SheetJS解析 → バリデーション → プレビュー → 確定。将来の補助機能(M4)。
- エクスポート(F-09): 生データCSV(明細フラット化) / 集計CSV・Excel(期間×都道府県×カテゴリー)。
- 還元レポート(F-10, P2): 団体別 年次/四半期サマリーをグラフ付きPDF。「振り返り」視点で構成。

---

## 9. 開発ロードマップ（実装順）
- **M1 基盤**: 初期化 / Prismaスキーマ+migrate / seed / Supabase Auth+Profile+ログイン+ルートガード
- **M2 中核入力**: 団体CRUD / 入力フォーム+収支パネル / 一覧+ステータス遷移 / バリデーション+Vitest
- **M3 可視化**: 集計ダッシュボード(Recharts) / エクスポート
- **M4 拡張(P2)**: 団体自己入力+RLS厳格化 / 還元PDF / 監査ログ画面 / Playwright

### 受け入れ基準(MVP)
事務局が犬・猫の月次レポートを手入力で入力・保存・提出でき、収支不一致が警告され、
団体別の月次・年次データを閲覧でき、全国/都道府県/期間でフィルタした集計をダッシュボードで確認できる。

---

*パイロット年度(2026/4–2027/3)のMVP構築が主眼。比較・評価を目的としない方針を UI・帳票・公開設計のすべてで尊重する。*
