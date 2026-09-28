import type { Metadata } from 'next';
import { Footer, Nav } from '@/components/Chrome';
import BamChecker from '@/components/BamChecker';
import { LINKS } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Tools — Lua Sol Labs',
  description: 'Free, open-source tools for Solana validators, stakers and builders. Starting with the Jito BAM Subsidy Checker.',
};

export default function Tools() {
  return (
    <>
      <section className="tools-hero">
        <svg viewBox="0 0 1440 400" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
          <rect width="1440" height="400" fill="#2A2873" />
          <path d="M700 0 C650 115 650 285 700 400 L1440 400 L1440 0 Z" fill="#F2835A" />
          <path d="M700 0 C650 115 650 285 700 400" fill="none" stroke="#B3447F" strokeWidth={8} vectorEffect="non-scaling-stroke" />
        </svg>
        <Nav current="tools" />
        <h1>Tools</h1>
        <p className="tools-hero-copy">Free, open-source tools for validators, stakers and builders on Solana.</p>
      </section>

      <main id="main">
        <section className="wrap sec stack gap-24">
          <div className="row between mono" style={{ fontSize: 12, letterSpacing: '.12em', color: 'var(--grey)' }}>
            <span>3 ENTRIES · 1 LIVE</span>
            <span>OPEN SOURCE</span>
          </div>
          <div className="tool-index">
            <a href="#bam" className="tool-card tc-live">
              <span className="mono tag" style={{ justifyContent: 'space-between', width: '100%' }}>
                <span>001 · VALIDATORS</span>
                <span className="row gap-8">
                  <span className="live-dot ink" /> LIVE
                </span>
              </span>
              <span className="tool-name-sm">BAM Subsidy Checker</span>
              <span className="tool-desc" style={{ fontSize: 15 }}>
                JIP-31 subsidy allocation and claim status, every eligible epoch.
              </span>
              <span style={{ marginTop: 'auto', fontWeight: 700 }}>Open ↓</span>
            </a>
            <div className="tool-card tc-soon">
              <span className="mono tag" style={{ color: 'var(--grey)' }}>
                002 · IN DEVELOPMENT
              </span>
              <span className="tool-name-sm">Next up</span>
              <span className="tool-desc">We build in public. Follow along for what lands next.</span>
              <a href={LINKS.x} target="_blank" rel="noreferrer" className="mono" style={{ marginTop: 'auto', fontSize: 12 }}>
                @LuaSol_Labs ↗
              </a>
            </div>
            <div className="tool-card tc-req">
              <span className="mono tag" style={{ color: 'var(--haze)' }}>
                OPEN REQUEST
              </span>
              <span className="tool-name-sm">What should we build next?</span>
              <span className="tool-desc">Validators, stakers, builders: tell us the tool you keep wishing existed.</span>
              <a href={LINKS.telegram} target="_blank" rel="noreferrer" style={{ marginTop: 'auto', fontWeight: 700 }}>
                Request a tool →
              </a>
            </div>
          </div>
        </section>

        <section className="band-panel" id="bam">
          <div className="wrap sec bam">
            <div className="stack gap-24">
              <span className="eyebrow line-c">Tool 001 · Live</span>
              <h2 className="h2" style={{ fontSize: 'clamp(44px, 4.4vw, 64px)' }}>
                BAM Subsidy Checker
              </h2>
              <p className="lede">
                Jito’s BAM programme (JIP-31) allocates JitoSOL subsidies to eligible validators each epoch. Paste a validator
                identity to see every allocation, what’s been claimed and what’s still waiting.
              </p>
              <div className="steps">
                <div>
                  <span className="mono">01</span>Paste a validator identity
                </div>
                <div>
                  <span className="mono">02</span>We read allocations and claims on-chain
                </div>
                <div>
                  <span className="mono">03</span>Copy the claim command for anything left
                </div>
              </div>
              <p className="bam-note">
                Read-only. No wallet connection needed.
                <br />
                Open source:{' '}
                <a href={LINKS.bamRepo} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>
                  bam-rewards-checker ↗
                </a>
              </p>
            </div>
            <BamChecker />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
