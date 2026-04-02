import Link from 'next/link'
import Image from 'next/image'

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--cc-surface)', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-white border-b" style={{ borderColor: 'var(--cc-border)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/cc-seal.png" alt="Central Catholic seal" width={36} height={36} />
            <span className="text-base font-bold" style={{ color: 'var(--cc-navy)' }}>Central Connect</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/about"
              className="text-sm font-medium hidden sm:block hover:underline"
              style={{ color: 'var(--cc-text-muted)' }}>
              About
            </Link>
            <Link href="/login"
              className="text-sm font-medium px-4 py-2 rounded-lg border"
              style={{ borderColor: 'var(--cc-border)', color: 'var(--cc-navy)' }}>
              Sign in
            </Link>
            <Link href="/signup"
              className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
              style={{ background: 'var(--cc-navy)' }}>
              Join the network
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(160deg, var(--cc-navy) 0%, #0f1a30 55%, #1a2a4e 100%)',
          }}
        />
        {/* Decorative gold arc */}
        <div
          className="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, var(--cc-gold) 0%, transparent 70%)' }}
        />
        <div className="relative max-w-6xl mx-auto px-6 py-28 md:py-36 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 text-white">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
              style={{ background: 'rgba(201,162,39,0.2)', color: 'var(--cc-gold-light)', border: '1px solid rgba(201,162,39,0.3)' }}>
              Central Catholic High School · Pittsburgh, PA
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Where Vikings <br />
              <span style={{ color: 'var(--cc-gold-light)' }}>Stay Connected</span>
            </h1>
            <p className="text-lg leading-relaxed mb-8 max-w-xl" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Central Connect is the alumni network built for Central Catholic's brotherhood —
              linking every class, every era, and every Viking who ever walked through those doors on 5th Avenue.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup"
                className="px-6 py-3 rounded-lg font-semibold text-sm text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--cc-gold)' }}>
                Create your profile →
              </Link>
              <Link href="/login"
                className="px-6 py-3 rounded-lg font-semibold text-sm border border-white/30 text-white hover:bg-white/10 transition-colors">
                Sign in
              </Link>
            </div>
          </div>
          <div className="shrink-0 hidden md:block">
            <div className="relative w-64 h-64 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full opacity-20" style={{ background: 'var(--cc-gold)' }} />
              <Image
                src="/cc-seal.png"
                alt="Central Catholic High School seal"
                width={180}
                height={180}
                className="relative z-10 drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── MISSION ── */}
      <section className="bg-white border-y py-16" style={{ borderColor: 'var(--cc-border)' }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-block mb-4">
            <span className="text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
              style={{ background: 'var(--cc-gold-pale)', color: 'var(--cc-gold)' }}>
              Our Mission
            </span>
          </div>
          <blockquote className="text-2xl md:text-3xl font-semibold leading-snug mb-6"
            style={{ color: 'var(--cc-navy)' }}>
            "Strengthening the Central Catholic brotherhood beyond the hallowed grounds of 5th Avenue."
          </blockquote>
          <p className="text-base leading-relaxed" style={{ color: 'var(--cc-text-muted)' }}>
            Central Connect is the directory, network, and community hub for every Central Catholic
            alumnus — bridging the generations of Vikings who came before with those still carrying the
            tradition forward today.
          </p>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ background: 'var(--cc-gold-pale)', color: 'var(--cc-gold)' }}>
            Platform Features
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-3" style={{ color: 'var(--cc-navy)' }}>
            Everything the Viking network needs
          </h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--cc-text-muted)' }}>
            Built around the way Central Catholic alumni actually connect —
            professional, personal, and proud.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(f => (
            <div key={f.title}
              className="bg-white rounded-2xl border p-6 hover:shadow-lg transition-shadow"
              style={{ borderColor: 'var(--cc-border)' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 text-xl"
                style={{ background: 'var(--cc-gold-pale)' }}>
                {f.icon}
              </div>
              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--cc-navy)' }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--cc-text-muted)' }}>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-white border-y py-20" style={{ borderColor: 'var(--cc-border)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
              style={{ background: 'var(--cc-gold-pale)', color: 'var(--cc-gold)' }}>
              Getting Started
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mt-4" style={{ color: 'var(--cc-navy)' }}>
              Be part of the network in minutes
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={s.title} className="text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white mx-auto mb-5"
                  style={{ background: 'var(--cc-navy)' }}>
                  {i + 1}
                </div>
                <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--cc-navy)' }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--cc-text-muted)' }}>{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROFILE PREVIEW ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
              style={{ background: 'var(--cc-gold-pale)', color: 'var(--cc-gold)' }}>
              Alumni Profiles
            </span>
            <h2 className="text-3xl font-bold mt-4 mb-4" style={{ color: 'var(--cc-navy)' }}>
              Your full story,<br />one profile
            </h2>
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--cc-text-muted)' }}>
              Every profile captures your complete journey: from the clubs and sports you loved at
              Central Catholic through your college years, career milestones, and the skills you've built
              along the way.
            </p>
            <ul className="space-y-3">
              {profileDetails.map(d => (
                <li key={d} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: 'var(--cc-gold)' }}>✓</span>
                  <span style={{ color: 'var(--cc-text)' }}>{d}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Mock profile card */}
          <div className="bg-white rounded-2xl border shadow-xl overflow-hidden max-w-sm mx-auto w-full"
            style={{ borderColor: 'var(--cc-border)' }}>
            <div className="h-20" style={{ background: 'linear-gradient(135deg, var(--cc-navy), #0f1a30)' }} />
            <div className="px-5 pb-5">
              <div className="-mt-8 mb-3">
                <div className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center text-lg font-bold text-white"
                  style={{ background: 'var(--cc-navy)' }}>
                  SB
                </div>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-bold" style={{ color: 'var(--cc-navy)' }}>Samuel Brackney</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold text-white"
                  style={{ background: 'var(--cc-gold)' }}>✓ Verified</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--cc-text-muted)' }}>Class of 2025 · Pittsburgh, PA</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--cc-text-muted)' }}>Viking Ambassador · Central Catholic</p>
              <div className="flex gap-1.5 mt-3 flex-wrap">
                <span className="text-[11px] px-2 py-1 rounded-full font-medium"
                  style={{ background: 'var(--cc-gold-pale)', color: 'var(--cc-navy)' }}>Open to mentoring</span>
                <span className="text-[11px] px-2 py-1 rounded-full font-medium"
                  style={{ background: '#e8f5e9', color: '#2e7d32' }}>Open to opps</span>
              </div>
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--cc-border)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--cc-navy)' }}>Skills</p>
                <div className="flex flex-wrap gap-1">
                  {['Leadership', 'Public speaking', 'Networking'].map(s => (
                    <span key={s} className="text-[11px] px-2 py-1 rounded-full border"
                      style={{ borderColor: 'var(--cc-border)', color: 'var(--cc-text-muted)' }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24" style={{ background: 'linear-gradient(160deg, var(--cc-navy) 0%, #0f1a30 100%)' }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Image src="/cc-seal.png" alt="Central Catholic seal" width={64} height={64} className="mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to reconnect with your<br />
            <span style={{ color: 'var(--cc-gold-light)' }}>fellow Vikings?</span>
          </h2>
          <p className="text-base mb-8" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Join Central Connect and become part of the most connected alumni network
            in Central Catholic history.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/signup"
              className="px-7 py-3 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90"
              style={{ background: 'var(--cc-gold)', color: 'white' }}>
              Create your free profile
            </Link>
            <Link href="/about"
              className="px-7 py-3 rounded-lg font-semibold text-sm border border-white/30 text-white hover:bg-white/10 transition-colors">
              Learn more
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-white border-t py-8" style={{ borderColor: 'var(--cc-border)' }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Image src="/cc-seal.png" alt="seal" width={28} height={28} className="opacity-60" />
            <span className="text-sm font-semibold" style={{ color: 'var(--cc-navy)' }}>Central Connect</span>
          </div>
          <div className="flex gap-5 text-xs" style={{ color: 'var(--cc-text-muted)' }}>
            <Link href="/about" className="hover:underline">About</Link>
            <Link href="/login" className="hover:underline">Sign in</Link>
            <Link href="/signup" className="hover:underline">Create account</Link>
            <a href="https://www.centralcatholichs.com/" target="_blank" rel="noopener noreferrer" className="hover:underline">
              centralcatholichs.com
            </a>
          </div>
          <p className="text-xs" style={{ color: 'var(--cc-text-muted)' }}>
            Made with pride by Samuel Brackney '25
          </p>
        </div>
      </footer>
    </div>
  )
}

const features = [
  {
    icon: '📰',
    title: 'Alumni Feed',
    description: 'Share career milestones, internship wins, grad school news, and anything worth celebrating with the Central Catholic community.',
  },
  {
    icon: '🔍',
    title: 'Alumni Directory',
    description: 'Search every Viking by graduation year, industry, location, or current company. Find people who walked the same halls as you.',
  },
  {
    icon: '🤝',
    title: 'Mentorship Matching',
    description: 'Alumni mark themselves as open to mentoring. Students and younger grads can request guidance from those who have been there.',
  },
  {
    icon: '💼',
    title: 'Opportunities Board',
    description: 'Alumni post internships, full-time roles, networking events, and webinars — exclusively for the Central Catholic community.',
  },
  {
    icon: '📅',
    title: 'Events',
    description: 'From class reunions to networking nights and fundraisers, keep up with everything happening in the Viking community.',
  },
  {
    icon: '💬',
    title: 'Direct Messaging',
    description: 'Message any alum directly and join group chats organized by industry, graduation year, or former clubs and sports teams.',
  },
]

const steps = [
  {
    title: 'Create your profile',
    description: 'Sign up and fill in your Central Catholic experience — graduation year, clubs, sports, and where life has taken you since.',
  },
  {
    title: 'Find your network',
    description: 'Search the alumni directory, filter by what matters to you, and reconnect with classmates or find a mentor in your field.',
  },
  {
    title: 'Give back and grow',
    description: 'Post opportunities, share updates, host events, and help the next generation of Vikings find their path.',
  },
]

const profileDetails = [
  'Graduation year and Central Catholic activities, clubs, and sports',
  'College / university with degree, major, and honors',
  'Work experience, internships, and involvement',
  'Skills and peer endorsements',
  'Mentor availability and open-to-opportunities status',
  'Verified alumni badge confirming your graduating class',
]
