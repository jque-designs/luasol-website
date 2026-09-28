import Link from 'next/link';
import Mark, { Wordmark } from './Mark';
import CopyButton from './CopyButton';
import { IDENTITY, LINKS, VOTE_ACCOUNT } from '@/lib/constants';

export function Nav({ current }: { current?: 'home' | 'tools' }) {
  return (
    <header className="nav">
      <div className="nav-left">
        <Link href="/" className="brand" aria-label="Lua Sol Labs home">
          <Mark variant="night" size={40} />
          <Wordmark />
        </Link>
        <nav aria-label="Primary" className="nav-links">
          <Link href="/tools" aria-current={current === 'tools' ? 'page' : undefined}>
            Tools
          </Link>
          <Link href="/#stake">Validator</Link>
        </nav>
      </div>
      <div className="nav-right">
        <nav aria-label="Secondary" className="nav-links">
          <Link href="/#giving">Giving</Link>
          <a href={LINKS.x} target="_blank" rel="noreferrer">
            X
          </a>
        </nav>
        <Link href="/#stake" className="btn btn-ink">
          Stake
        </Link>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-grid">
        <div className="stack gap-24">
          <div className="row gap-16">
            <Mark variant="night" size={88} />
            <Wordmark stacked />
          </div>
          <p className="footer-tag">Tools, apps and infrastructure for Solana. Night and day.</p>
          <div className="stack gap-8" style={{ maxWidth: 520 }}>
            <CopyButton value={VOTE_ACCOUNT} label="VOTE" tone="dark" />
            <CopyButton value={IDENTITY} label="IDENTITY" tone="dark" />
          </div>
        </div>
        <div className="footer-cols">
          <div className="stack gap-12">
            <span className="eyebrow">Tools</span>
            <Link href="/tools#bam">BAM Subsidy Checker</Link>
            <Link href="/tools">All tools</Link>
            <a href={LINKS.telegram} target="_blank" rel="noreferrer">Request a tool</a>
          </div>
          <div className="stack gap-12">
            <span className="eyebrow">Validator</span>
            <Link href="/#stake">Stake</Link>
            <a href={LINKS.stakewiz} target="_blank" rel="noreferrer">Stakewiz ↗</a>
            <a href={LINKS.validatorsApp} target="_blank" rel="noreferrer">validators.app ↗</a>
            <a href={LINKS.solscanVote} target="_blank" rel="noreferrer">Solscan ↗</a>
            <a href={LINKS.decentra} target="_blank" rel="noreferrer">Decentra ↗</a>
            <a href={LINKS.jito} target="_blank" rel="noreferrer">Jito ↗</a>
          </div>
          <div className="stack gap-12">
            <span className="eyebrow">Giving</span>
            <Link href="/#giving">Our charities</Link>
            <a href={LINKS.givingBlock} target="_blank" rel="noreferrer">The Giving Block ↗</a>
          </div>
          <div className="stack gap-12">
            <span className="eyebrow">Connect</span>
            <a href={LINKS.x} target="_blank" rel="noreferrer">@LuaSol_Labs ↗</a>
            <a href={LINKS.telegram} target="_blank" rel="noreferrer">Telegram ↗</a>
          </div>
        </div>
      </div>
      <div className="wrap footer-base mono">
        <span>© {new Date().getFullYear()} Lua Sol Labs · luasol.io</span>
        <span>Lua Sol Labs is a company, not a registered charity. Staking carries risk; nothing here is financial advice.</span>
      </div>
    </footer>
  );
}
