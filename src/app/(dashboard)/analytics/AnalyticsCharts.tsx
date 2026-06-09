'use client';

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, Legend, Cell,
} from 'recharts';
import { Card, CardBody } from '@/components/ui';
import type { Summary } from '@/lib/data/analytics';

const AXIS = { fontSize: 12, fill: '#64748b' };

export function IntakeByCategoryChart({ data }: { data: Summary['intakeByCategory'] }) {
  return (
    <Card>
      <CardBody>
        <h3 className="mb-3 text-sm font-bold text-slate-700">収容ルート別の構成</h3>
        {data.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={Math.max(160, data.length * 38)}>
            <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
              <CartesianGrid horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={AXIS} />
              <YAxis type="category" dataKey="name" width={140} tick={AXIS} />
              <Tooltip />
              <Bar dataKey="count" name="頭数" fill="#0ea5e9" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardBody>
    </Card>
  );
}

export function OutcomeByCategoryChart({ data, liveCodes }: { data: Summary['outcomeByCategory']; liveCodes: string[] }) {
  return (
    <Card>
      <CardBody>
        <h3 className="mb-3 text-sm font-bold text-slate-700">転帰別の構成（緑=生存 / 赤=非生存）</h3>
        {data.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={Math.max(160, data.length * 38)}>
            <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
              <CartesianGrid horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={AXIS} />
              <YAxis type="category" dataKey="name" width={140} tick={AXIS} />
              <Tooltip />
              <Bar dataKey="count" name="頭数" radius={[0, 6, 6, 0]}>
                {data.map((d) => (
                  <Cell key={d.code} fill={liveCodes.includes(d.code) ? '#10b981' : '#f87171'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardBody>
    </Card>
  );
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
