import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Blocks,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Code2,
  Fingerprint,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from 'lucide-react';
import { BountyCardData } from '@/components/bounty/bounty-card';
import { BountyBrowser } from '@/components/bounty/bounty-browser';
import { db } from '@/lib/db/prisma';

async function getBounties(): Promise<BountyCardData[]> {
  try {
    const rows = await db.bounty.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return rows.map((b) => ({
      id: b.id,
      title: b.title,
      summary: b.summary,
      category: b.category,
      rewardSol: Number(b.rewardLamports) / 1e9,
      deadline: b.deadline.toISOString(),
      submissionCount: b.submissionCount,
    }));
  } catch {
    return [];
  }
}

const principles = [
  {
    icon: ShieldCheck,
    title: 'Escrow before effort',
    description: 'A bounty is funded before work begins. Contributors can see that the reward has been committed.',
  },
  {
    icon: Fingerprint,
    title: 'Proof you can verify',
    description: 'Accepted work is tied to an on-chain completion record, not just a claim on a profile.',
  },
  {
    icon: Wallet,
    title: 'Your wallet, your payout',
    description: 'Rewards are designed to move directly to the winning contributor’s Solana wallet.',
  },
];

const categories = [
  { label: 'Development', icon: Code2, detail: 'Ship code and product features' },
  { label: 'Design', icon: Sparkles, detail: 'Create useful, thoughtful experiences' },
  { label: 'Research', icon: Blocks, detail: 'Investigate ideas and ecosystems' },
  { label: 'Community', icon: Zap, detail: 'Help Web3 projects grow' },
];

export default async function Home() {
  const bounties = await getBounties();

  return (
    <div className="overflow-hidden">
      <section className="shell relative grid gap-12 pb-16 pt-16 md:grid-cols-[1.08fr_.92fr] md:items-center md:pb-24 md:pt-24">
        <div className="pointer-events-none absolute -left-40 top-8 h-80 w-80 rounded-full opacity-30 blur-3xl" style={{ background: 'var(--green-soft)' }} />
        <div className="relative z-10 max-w-2xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold" style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--green)' }}>
            <span className="h-2 w-2 rounded-full" style={{ background: 'var(--green)' }} />
            BUILT ON SOLANA · DEVNET
          </div>
          <h1 className="max-w-2xl text-5xl font-black leading-[1.02] tracking-[-0.065em] sm:text-6xl lg:text-[76px]">
            Good work deserves <span style={{ color: 'var(--green)' }}>real rewards.</span>
          </h1>
          <p className="muted mt-7 max-w-xl text-base leading-8 sm:text-lg">
            BountyStacks brings Web3 builders and project teams together. Discover meaningful tasks, lock rewards in escrow, and make completed work verifiable on Solana.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="#bounties" className="btn btn-primary min-h-12">
              Explore bounties <ArrowRight size={17} />
            </Link>
            <Link href="/bounties/create" className="btn btn-secondary min-h-12">
              Post a bounty <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-semibold muted">
            <span className="inline-flex items-center gap-2"><CheckCircle2 size={15} style={{ color: 'var(--green)' }} /> Funded before work starts</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 size={15} style={{ color: 'var(--green)' }} /> On-chain settlement</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[510px]">
          <div className="absolute -inset-5 rounded-[36px] opacity-50 blur-2xl" style={{ background: 'var(--green-soft)' }} />
          <div className="card relative overflow-hidden p-5 sm:p-7">
            <div className="flex items-center justify-between border-b pb-5" style={{ borderColor: 'var(--line)' }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] muted">The Bounty flow</p>
                <p className="mt-1 text-lg font-extrabold">From task to transaction</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>
                <Blocks size={20} />
              </div>
            </div>
            <div className="space-y-3 py-5">
              <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold muted">BOUNTY CREATED</span>
                  <span className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>OPEN</span>
                </div>
                <p className="mt-3 font-bold">Build a feature for a Solana dApp</p>
                <p className="mt-1 text-xs muted">Clear scope · Reward committed · Deadline set</p>
              </div>
              <div className="flex justify-center"><div className="h-5 border-l-2 border-dashed" style={{ borderColor: 'var(--green)' }} /></div>
              <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--line)' }}>
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><LockKeyhole size={17} /></div>
                  <div className="min-w-0 flex-1"><p className="text-sm font-bold">Reward secured in escrow</p><p className="mt-1 text-xs muted">Funds committed on Solana</p></div>
                  <CheckCircle2 size={19} style={{ color: 'var(--green)' }} />
                </div>
              </div>
              <div className="flex justify-center"><div className="h-5 border-l-2 border-dashed" style={{ borderColor: 'var(--green)' }} /></div>
              <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--line)' }}>
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><BadgeCheck size={17} /></div>
                  <div className="min-w-0 flex-1"><p className="text-sm font-bold">Work reviewed and accepted</p><p className="mt-1 text-xs muted">One winning submission selected</p></div>
                  <ArrowRight size={18} className="muted" />
                </div>
              </div>
              <div className="flex justify-center"><div className="h-5 border-l-2 border-dashed" style={{ borderColor: 'var(--green)' }} /></div>
              <div className="flex items-center justify-between gap-3 rounded-2xl p-4" style={{ background: 'var(--green)', color: '#062417' }}>
                <div><p className="text-[10px] font-black uppercase tracking-[.15em] opacity-75">Final outcome</p><p className="mt-1 font-extrabold">Reward released to winner</p></div>
                <div className="grid h-10 w-10 place-items-center rounded-full bg-black/10"><CircleDollarSign size={22} /></div>
              </div>
            </div>
            <p className="text-center text-[11px] muted">Illustrative product flow · actual transactions require wallet approval</p>
          </div>
        </div>
      </section>

      <section className="border-y py-8" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <div className="shell grid gap-5 sm:grid-cols-3">
          {[
            ['01', 'Discover', 'Find tasks from teams building on Web3.'],
            ['02', 'Contribute', 'Deliver work against clear bounty requirements.'],
            ['03', 'Earn', 'Receive the agreed reward when selected.'],
          ].map(([n, title, desc]) => (
            <div key={n} className="flex items-start gap-4">
              <span className="text-sm font-black" style={{ color: 'var(--green)' }}>{n}</span>
              <div><p className="font-extrabold">{title}</p><p className="muted mt-1 text-sm leading-6">{desc}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="shell py-20 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-black uppercase tracking-[.2em]" style={{ color: 'var(--green)' }}>A better way to collaborate</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Opportunities should be clear. Payments should be fair.</h2>
          <p className="muted mt-4 leading-7">BountyStacks is designed around a simple promise: make the agreement visible before the work begins, and make the outcome verifiable after it is done.</p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {principles.map(({ icon: Icon, title, description }) => (
            <article className="card p-6 sm:p-7" key={title}>
              <div className="grid h-12 w-12 place-items-center rounded-2xl" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><Icon size={22} /></div>
              <h3 className="mt-5 text-lg font-extrabold">{title}</h3>
              <p className="muted mt-2 text-sm leading-7">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="py-20" style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="shell">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="text-xs font-black uppercase tracking-[.2em]" style={{ color: 'var(--green)' }}>What can you bring?</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Put your skills to work.</h2><p className="muted mt-3 max-w-xl leading-7">From your first contribution to your next big build, find a place to make an impact.</p></div>
            <Link href="#bounties" className="inline-flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--green)' }}>Explore opportunities <ChevronRight size={17} /></Link>
          </div>
          <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map(({ label, icon: Icon, detail }) => (
              <Link href="#bounties" key={label} className="card flex items-center gap-4 p-5 no-underline transition-transform hover:-translate-y-1">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><Icon size={20} /></div>
                <div><p className="font-extrabold">{label}</p><p className="muted mt-1 text-xs leading-5">{detail}</p></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="bounties" className="shell scroll-mt-8 py-20 md:py-24">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-xs font-black uppercase tracking-[.2em]" style={{ color: 'var(--green)' }}>The marketplace</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Find your next bounty.</h2><p className="muted mt-3 text-sm leading-6">Explore live opportunities and choose work you can deliver.</p></div>
          <Link href="/bounties/create" className="btn btn-secondary">Post a bounty <ArrowUpRight size={16} /></Link>
        </div>
        {bounties.length > 0 ? (
          <BountyBrowser bounties={bounties} />
        ) : (
          <div className="card px-6 py-14 text-center sm:px-10">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><BriefcaseBusiness size={24} /></div>
            <h3 className="mt-5 text-xl font-extrabold">The next opportunity starts here.</h3>
            <p className="muted mx-auto mt-2 max-w-md text-sm leading-7">There are no open bounties listed right now. If you are building something on Solana, publish the first task and invite contributors to take it on.</p>
            <Link href="/bounties/create" className="btn btn-primary mt-6">Create the first bounty <ArrowRight size={16} /></Link>
          </div>
        )}
      </section>

      <section className="shell pb-20">
        <div className="relative overflow-hidden rounded-[28px] p-8 sm:p-12" style={{ background: 'var(--green)', color: '#062417' }}>
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border-[36px] border-black/5" />
          <div className="relative z-10 flex flex-col justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-xl"><p className="text-xs font-black uppercase tracking-[.2em] opacity-70">Build something that counts</p><h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Your next contribution could be your best one yet.</h2><p className="mt-4 max-w-lg text-sm leading-7 opacity-80">Bring your skills. Find a real problem. Get rewarded for work that moves a project forward.</p></div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row"><Link href="#bounties" className="btn border-transparent bg-[#062417] text-white">Browse bounties <ArrowRight size={16} /></Link><Link href="/bounties/create" className="btn border-black/15 bg-white/15 text-[#062417]">I’m a project creator</Link></div>
          </div>
        </div>
      </section>

      <footer className="border-t py-8" style={{ borderColor: 'var(--line)' }}>
        <div className="shell flex flex-col justify-between gap-4 text-xs muted sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} BountyStacks · Built by GTECH INNOVATION</p>
          <div className="flex flex-wrap gap-5"><Link href="/verify" className="hover:underline">Verify a completion</Link><Link href="/dashboard/contributor" className="hover:underline">Contributor dashboard</Link><Link href="/bounties/create" className="hover:underline">Post a bounty</Link></div>
        </div>
      </footer>
    </div>
  );
}
