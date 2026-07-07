'use client';

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, Legend,
} from 'recharts';
import { Card, CardBody } from '@/components/ui';
import type { Summary } from '@/lib/data/analytics';

const AXIS = { fontSize: 12, fill: '#64748b' };

// 年齢区分の色（収容・転帰で共通）
const AGE = [
  { key: 'u5m', name: '〜5ヶ月齢', color: '#34d399' },
  { key: 'm5_10y', name: '5ヶ月〜10歳', color: '#0ea5e9' },
  { key: 'o10y', name: '10歳〜', color: '#a78bfa' },
] as const;

function StackedByAge({ title, data, note }: { title: string; data: Summary['intakeByCategoryAge']; note?: string }) {
  return (
    <Card>
      <CardBody>
        <h3 className="mb-1 text-sm font-bold text-slate-700">{title}</h3>
        {note && <p className="mb-2 text-xs text-slate-400">{note}</p>}
        {data.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={Math.max(180, data.length * 42)}>
            <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
              <CartesianGrid horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={AXIS} />
              <YAxis type="category" dataKey="name" width={140} tick={AXIS} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {AGE.map((a, i) => (
                <Bar key={a.key} dataKey={a.key} name={a.name} stackId="age" fill={a.color}
                  radius={i === AGE.length - 1 ? [0, 6, 6, 0] : [0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardBody>
    </Card>
  );
}

export function IntakeByCategoryChart({ data }: { data: Summary['intakeByCategoryAge'] }) {
  return <StackedByAge title="収容ルート別の構成（年齢区分の内訳）" data={data} />;
}

export function OutcomeByCategoryChart({ data }: { data: Summary['outcomeByCategoryAge'] }) {
  return <StackedByAge title="転帰別の構成（年齢区分の内訳）" data={data} note="上から順に 死亡・行方不明・安楽死（非生存）→ 譲渡・返還ほか（生存）" />;
}

export function TrendChart({ data }: { data: Summary['trend'] }) {
  return (
    <Card>
      <CardBody>
        <h3 className="mb-3 text-sm font-bold text-slate-700">月次推移（収容 / 転帰）</h3>
        {data.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data} margin={{ left: 8, right: 16, top: 8 }}>
              <CartesianGrid stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={AXIS} />
              <YAxis tick={AXIS} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="intake" name="新規収容" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="outcome" name="転帰" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardBody>
    </Card>
  );
}

function Empty() {
  return <div className="flex h-32 items-center justify-center text-sm text-slate-400">該当データがありません</div>;
}
