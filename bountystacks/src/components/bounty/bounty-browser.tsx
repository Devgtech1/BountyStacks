'use client';
import { useMemo, useState } from 'react';
import { BountyCard, type BountyCardData } from './bounty-card';
const filters = [{ label: 'All', value: 'ALL' }, { label: 'Coding', value: 'CODING' }, { label: 'Design', value: 'DESIGN' }, { label: 'Docs', value: 'DOCS' }, { label: 'Bug fix', value: 'BUG_FIX' }];
export function BountyBrowser({ bounties }: { bounties: BountyCardData[] }) {
  const [category, setCategory] = useState('ALL');
  const filtered = useMemo(() => category === 'ALL' ? bounties : bounties.filter((b) => b.category === category), [bounties, category]);
  return <><div className="flex flex-wrap gap-2 mb-6" aria-label="Filter bounties by category">{filters.map((f) => <button key={f.value} type="button" onClick={() => setCategory(f.value)} aria-pressed={category === f.value} className="rounded-full border px-4 py-2 text-sm" style={{ borderColor: category === f.value ? 'var(--text)' : 'var(--line)', background: category === f.value ? 'var(--text)' : 'var(--surface)', color: category === f.value ? 'var(--bg)' : 'var(--muted)' }}>{f.label}</button>)}</div>{filtered.length ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.map((b) => <BountyCard key={b.id} bounty={b} />)}</div> : <div className="card p-10 text-center"><h3 className="font-bold text-lg">No {category === 'ALL' ? 'open' : category.toLowerCase().replace('_',' ')} bounties yet</h3><p className="muted mt-2 text-sm">Try another category or create the first bounty.</p></div>}</>;
}
