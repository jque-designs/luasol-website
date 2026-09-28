import Link from 'next/link';
import { Footer, Nav } from '@/components/Chrome';
import CopyButton from '@/components/CopyButton';
import Mark from '@/components/Mark';
import StakeWidget from '@/components/StakeWidget';
import Terminator from '@/components/Terminator';
import { IDENTITY, LINKS, VOTE_ACCOUNT, short } from '@/lib/constants';
import { getAll, num } from '@/lib/data';

export const revalidate = 60;

export default async function Home() {
  const { validator: v, epoch } = await getAll();
  const pct = epoch?.pct ?? null;
  const dash = '—';

  return (
    <>
      <section className="hero">
        <Terminator pct={pct} className="hero-bg hero-bg-v" />
        <Terminator pct={pct} orient="h" className="hero-bg hero-bg-h" />
        <Nav current="home" />
        <div className="hero-word hero-lua" aria-hidden="true">
          Lua
        </div>
        <div className="hero-word hero-sol" aria-hidden="true">
          Sol
        </div>
        <div className="hero-badge">
          <Mark size="74%" title="Lua Sol Labs" />
        </div>
        {epoch && (
          <div className="hero-epoch mono" title="The line fills as the current epoch progresses">
            EPOCH {epoch.epoch} · {num(epoch.pct, 0)}% THROUGH
          </div>
        )}
        <div className="hero-copy" id="main">
          <h1>Night and day, we build for Solana.</h1>
          <p>Open tools, apps and mainnet infrastructure. A share of every epoch goes to kids’ STEM and health charities.</p>
          <div className="row gap-12 flexwrap">
            <Link href="/tools" className="btn btn-mist">
              Explore tools →
            </Link>
            <Link href="#stake" className="btn btn-outline-mist hero-mobile-only">
              Stake
            </Link>
          </div>
        </div>
        <div className="hero-side">
          <div className="mono hero-pillars">
            <span>01 VALIDATE</span>
            <span>02 BUILD</span>
            <span>03 SHIP</span>
            <span>04 GIVE</span>
          </div>
          <div className="mono hero-key">
            <span>VOTE {short(VOTE_ACCOUNT)}</span>
            <span>
              {v ? `${num(v.commissionPct)}% · ${v.mevCommissionPct == null ? dash : `${num(v.mevCommissionPct)}%`} MEV · ${v.delinquent ? 'DELINQUENT' : 'VOTING'}` : 'LIVE DATA UNAVAILABLE'}
            </span>
          </div>
          <Link href="#stake" className="btn btn-outline-ink">
            Stake natively
          </Link>
        </div>
      </section>

      <section className="stats" aria-label="Live validator stats">
        <div className="stat">
          <span className="stat-l mono">
            <span className="live-dot" /> ACTIVE STAKE
          </span>
          <span className="stat-v">
            {v ? num(v.activeStake) : dash} <small>SOL</small>
          </span>
          <span className="stat-s mono sun">{v?.activatingStake ? `+${num(v.activatingStake)} ACTIVATING` : ' '}</span>
        </div>
        <div className="stat">
          <span className="stat-l mono">COMMISSION</span>
          <span className="stat-v">{v ? `${num(v.commissionPct, v.commissionPct % 1 ? 1 : 0)}%` : dash}</span>
          <span className="stat-s mono">
            {v ? `${v.mevCommissionPct == null ? dash : `${num(v.mevCommissionPct)}%`} MEV${v.isJito ? ' · JITO' : ''}` : ' '}
          </span>
        </div>
        <div className="stat">
          <span className="stat-l mono">SKIP RATE</span>
          <span className="stat-v">{v ? `${num(v.skipRate, 2)}%` : dash}</span>
          <span className="stat-s mono">{v && v.skipRate < 0.5 ? 'NOT A TYPO' : ' '}</span>
        </div>
        <div className="stat">
          <span className="stat-l mono">VOTE SUCCESS</span>
          <span className="stat-v">{v ? `${num(v.voteSuccess, 2)}%` : dash}</span>
          <span className="stat-s mono">{v ? `UPTIME ${num(v.uptime, 0)}%` : ' '}</span>
        </div>
        <div className="stat">
          <span className="stat-l mono">EPOCH</span>
          <span className="stat-v">{epoch ? epoch.epoch : dash}</span>
          <span className="stat-bar" aria-label={epoch ? `${num(epoch.pct, 0)}% through the epoch` : undefined}>
            <span style={{ width: `${pct ?? 0}%` }} />
          </span>
        </div>
        <Link href="#stake" className="stat stat-cta">
          <span className="stat-l mono">NATIVE STAKING</span>
          <span className="stat-go">Stake here →</span>
        </Link>
      </section>

      <main>
        <section className="wrap sec what">
          <div className="stack gap-24">
            <span className="eyebrow">What we do</span>
            <h2 className="h2">
              Four things, <span className="line-c">around the clock.</span>
            </h2>
            <p className="lede">
              Lua Sol Labs is a small, independent team building for Solana. The validator keeps the lights on; the tools and
              apps are why we exist.
            </p>
          </div>
          <div className="pillars">
            <div className="pillar p-lua">
              <span className="mono">01</span>
              <div>
                <h3>Validate</h3>
                <p>A mainnet validator with low commission and public performance. No surprises.</p>
              </div>
            </div>
            <div className="pillar p-out">
              <span className="mono">02</span>
              <div>
                <h3>Build</h3>
                <p>Open-source tools for validators, stakers and builders, starting with the ones we needed ourselves.</p>
              </div>
            </div>
            <div className="pillar p-sol">
              <span className="mono">03</span>
              <div>
                <h3>Ship</h3>
                <p>Applications for the Solana ecosystem, released in public and maintained properly.</p>
              </div>
            </div>
            <div className="pillar p-out">
              <span className="mono line-c">04</span>
              <div>
                <h3>Give</h3>
                <p>A share of every epoch goes to children’s charities: STEM, digital access and health.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="band-lua" id="tools">
          <div className="wrap sec stack gap-40">
            <div className="row between flexwrap gap-24">
              <div className="stack gap-16">
                <span className="eyebrow eyebrow-mist">Tools</span>
                <h2 className="h2">Tools for the chain.</h2>
              </div>
              <Link href="/tools" className="btn btn-outline-mist">
                All tools →
              </Link>
            </div>
            <div className="tools-grid">
              <Link href="/tools#bam" className="tool-feature">
                <span className="mono tag">
                  <span className="live-dot ink" /> TOOL 001 · LIVE
                </span>
                <span className="tool-name">BAM Subsidy Checker</span>
                <span className="tool-desc">
                  Check any validator’s Jito BAM (JIP-31) subsidy allocation and claim status across every eligible epoch, with
                  the claim command for anything left over.
                </span>
                <span className="btn btn-ink" style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>
                  Open the checker →
                </span>
              </Link>
              <div className="stack gap-20">
                <div className="tool-soon">
                  <span className="mono tag">TOOL 002 · IN DEVELOPMENT</span>
                  <span className="tool-name-sm">Next up</span>
                  <span className="tool-desc">We ship in public. Follow along on X for what’s landing next.</span>
                  <a href={LINKS.x} target="_blank" rel="noreferrer" className="mono" style={{ marginTop: 'auto' }}>
                    @LuaSol_Labs ↗
                  </a>
                </div>
                <div className="tool-req">
                  <span className="mono tag line-c">WHAT SHOULD WE BUILD?</span>
                  <span className="tool-name-sm">Tell us the tool you wish existed.</span>
                  <a href={LINKS.telegram} target="_blank" rel="noreferrer" style={{ marginTop: 'auto', fontWeight: 700 }}>
                    Request a tool →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="wrap sec stake" id="stake">
          <div className="stack gap-24">
            <span className="eyebrow">Validator · native staking</span>
            <h2 className="h2">
              Stake with <span className="c-lua">Lua</span> <span className="c-sol">Sol</span> Labs. Right here.
            </h2>
            <p className="lede">
              Stake natively from your own wallet. You keep stake and withdraw authority the whole time; we never touch your SOL.
            </p>
            <dl className="facts">
              <div>
                <dt>Starts earning</dt>
                <dd>Next epoch · ~2 days</dd>
              </div>
              <div>
                <dt>Unstaking cool-down</dt>
                <dd>About one epoch</dd>
              </div>
              <div>
                <dt>Commission</dt>
                <dd>
                  {v ? `${num(v.commissionPct)}% inflation · ${v.mevCommissionPct == null ? dash : `${num(v.mevCommissionPct)}%`} MEV` : dash}
                </dd>
              </div>
            </dl>
            <div className="stack gap-8">
              <CopyButton value={VOTE_ACCOUNT} label="VOTE" />
              <CopyButton value={IDENTITY} label="IDENTITY" />
            </div>
            <div className="mono node-meta">
              {v?.isJito && <span>JITO CLIENT v{v.version}</span>}
              {v?.city && <span>{`${v.city}${v.country ? `, ${v.country === 'United States' ? 'US' : v.country}` : ''}`.toUpperCase()}</span>}
              {v?.firstEpoch ? <span>SINCE EPOCH {v.firstEpoch}</span> : null}
              {v?.wizScore != null && <span>WIZ SCORE {num(v.wizScore, 1)}</span>}
            </div>
            <div className="mono node-links">
              <a href={LINKS.stakewiz} target="_blank" rel="noreferrer">Stakewiz ↗</a>
              <a href={LINKS.solscanVote} target="_blank" rel="noreferrer">Solscan ↗</a>
              <a href={LINKS.validatorsApp} target="_blank" rel="noreferrer">validators.app ↗</a>
            </div>
          </div>
          <StakeWidget apy={v?.apy ?? null} nextEpoch={epoch ? epoch.epoch + 1 : null} />
        </section>

        <section className="band-panel" id="giving">
          <div className="wrap sec stack gap-40">
            <div className="giving-head">
              <div className="stack gap-16">
                <span className="eyebrow">Giving — secondary, always on</span>
                <h2 className="h2">
                  A share of every epoch goes <span className="line-c">to kids.</span>
                </h2>
              </div>
              <p className="lede">
                Building comes first. But a share of our validator revenue is set aside every epoch for children’s charities,
                donated on-chain through The Giving Block.
              </p>
            </div>
            <div className="charities">
              <a className="charity c1" href={LINKS.first} target="_blank" rel="noreferrer">
                <span className="mono tag">STEM</span>
                <span className="charity-name">FIRST</span>
                <span>Robotics and STEM programs that get kids building.</span>
                <span className="mono" style={{ marginTop: 'auto' }}>firstinspires.org ↗</span>
              </a>
              <a className="charity c2" href={LINKS.humanit} target="_blank" rel="noreferrer">
                <span className="mono tag">DIGITAL ACCESS</span>
                <span className="charity-name">Human-I-T</span>
                <span>Devices, internet access and digital skills for low-income families.</span>
                <span className="mono" style={{ marginTop: 'auto' }}>human-i-t.org ↗</span>
              </a>
              <a className="charity c3" href={LINKS.starlight} target="_blank" rel="noreferrer">
                <span className="mono tag">KIDS’ HEALTH</span>
                <span className="charity-name">Starlight Children’s Foundation</span>
                <span>Support for seriously ill children and their families.</span>
                <span className="mono" style={{ marginTop: 'auto' }}>starlight.org ↗</span>
              </a>
            </div>
          </div>
        </section>

        <section className="name">
          <Terminator className="name-bg name-bg-v" />
          <Terminator orient="h" className="name-bg name-bg-h" />
          <div className="name-grid">
            <div className="name-lua">
              <span className="mono">LUA · PORTUGUESE · NOUN</span>
              <span className="name-word">Lua</span>
              <span className="name-def">the moon. The night shift: blocks voted, slots signed, while you sleep.</span>
            </div>
            <div className="name-sol">
              <span className="mono">SOL · PORTUGUESE · NOUN</span>
              <span className="name-word">Sol</span>
              <span className="name-def">the sun. The day shift: tools designed, shipped and maintained in the open.</span>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
