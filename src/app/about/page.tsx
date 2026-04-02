import Link from 'next/link'
import Image from 'next/image'

export const metadata = {
  title: 'About — Central Connect',
  description: 'Learn about Central Connect, the alumni network for Central Catholic High School Pittsburgh.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--cc-surface)' }}>

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-white border-b" style={{ borderColor: 'var(--cc-border)' }}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/cc-seal.png" alt="Central Catholic seal" width={34} height={34} />
            <span className="text-base font-bold" style={{ color: 'var(--cc-navy)' }}>Central Connect</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login"
              className="text-sm font-medium px-4 py-2 rounded-lg border"
              style={{ borderColor: 'var(--cc-border)', color: 'var(--cc-navy)' }}>
              Sign in
            </Link>
            <Link href="/signup"
              className="text-sm font-semibold px-4 py-2 rounded-lg text-white"
              style={{ background: 'var(--cc-navy)' }}>
              Join
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="py-20 text-center"
        style={{ background: 'linear-gradient(160deg, var(--cc-navy) 0%, #0f1a30 100%)' }}>
        <div className="max-w-3xl mx-auto px-6">
          <Image src="/cc-seal.png" alt="Central Catholic seal" width={80} height={80}
            className="mx-auto mb-6 opacity-90" />
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">About Central Connect</h1>
          <p className="text-base" style={{ color: 'rgba(255,255,255,0.65)' }}>
            The story behind the platform, the people it serves, and the mission that drives it.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-16 space-y-16">

        {/* ── MISSION ── */}
        <section>
          <div className="inline-block mb-5">
            <span className="text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
              style={{ background: 'var(--cc-gold-pale)', color: 'var(--cc-gold)' }}>
              Mission
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: 'var(--cc-navy)' }}>
            Why Central Connect exists
          </h2>
          <div className="bg-white rounded-2xl border p-7 relative overflow-hidden"
            style={{ borderColor: 'var(--cc-border)' }}>
            {/* Gold accent bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: 'var(--cc-gold)' }} />
            <blockquote className="text-lg font-semibold leading-snug pl-4" style={{ color: 'var(--cc-navy)' }}>
              "Central Connect strengthens the Central Catholic brotherhood beyond the hallowed grounds of 5th Avenue —
              connecting past generations of Vikings with the new, and ensuring no alum ever has to navigate their
              next chapter alone."
            </blockquote>
          </div>
          <p className="text-sm leading-relaxed mt-5" style={{ color: 'var(--cc-text-muted)' }}>
            Central Catholic produces graduates who go on to do remarkable things. Doctors, engineers, athletes,
            entrepreneurs, artists, and public servants — all shaped by the same hallways, the same values, and
            the same Viking pride. Central Connect exists so that shared identity never fades after graduation.
            It is a directory, a professional network, a mentorship platform, and a community — all built
            specifically for the people who know what it means to be a Viking.
          </p>
        </section>

        {/* ── THE PLATFORM ── */}
        <section>
          <div className="inline-block mb-5">
            <span className="text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
              style={{ background: 'var(--cc-gold-pale)', color: 'var(--cc-gold)' }}>
              The Platform
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: 'var(--cc-navy)' }}>
            What Central Connect does
          </h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--cc-text-muted)' }}>
            Central Connect is a purpose-built professional and social network for Central Catholic High School
            alumni and current students. Unlike generic platforms, every feature was designed around how Vikings
            actually connect — by class year, by sport, by club, by industry, and by the simple fact of having
            shared something irreplaceable together.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {platformPoints.map(p => (
              <div key={p.title} className="bg-white rounded-xl border p-5"
                style={{ borderColor: 'var(--cc-border)' }}>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--cc-navy)' }}>{p.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--cc-text-muted)' }}>{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CREATOR ── */}
        <section>
          <div className="inline-block mb-5">
            <span className="text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
              style={{ background: 'var(--cc-gold-pale)', color: 'var(--cc-gold)' }}>
              Creator
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-6" style={{ color: 'var(--cc-navy)' }}>
            Built by a Viking, for Vikings
          </h2>

          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--cc-border)' }}>
            <div className="h-20" style={{ background: 'linear-gradient(135deg, var(--cc-navy), #0f1a30)' }} />
            <div className="px-6 pb-6">
              <div className="-mt-9 mb-4 flex items-end justify-between">
                <div className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center text-lg font-bold text-white"
                  style={{ background: 'var(--cc-navy)' }}>
                  SB
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold text-white mb-1"
                  style={{ background: 'var(--cc-gold)' }}>
                  Class of 2025
                </span>
              </div>
              <h3 className="text-lg font-bold mb-0.5" style={{ color: 'var(--cc-navy)' }}>Samuel Brackney</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--cc-text-muted)' }}>
                Central Catholic High School, Pittsburgh · '25
              </p>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--cc-text)' }}>
                Samuel Brackney is a member of Central Catholic's Class of 2025 and a Viking Ambassador —
                one of the students entrusted with representing the school to prospective families and the broader
                community. As an Ambassador, Sam experienced firsthand how powerful the Central Catholic
                connection is, and how much potential it holds when alumni stay meaningfully engaged.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--cc-text)' }}>
                Central Connect grew out of a simple conviction: the brotherhood built at Central Catholic
                shouldn't stop at graduation. Sam built this platform to give every Viking — from the Class
                of 1960 to the Class of 2030 — a shared home to find each other, lift each other up,
                and carry the Viking tradition forward.
              </p>
            </div>
          </div>
        </section>

        {/* ── VALUES ── */}
        <section>
          <div className="inline-block mb-5">
            <span className="text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
              style={{ background: 'var(--cc-gold-pale)', color: 'var(--cc-gold)' }}>
              Values
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-6" style={{ color: 'var(--cc-navy)' }}>
            What we stand for
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {values.map(v => (
              <div key={v.title} className="bg-white rounded-xl border p-5 text-center"
                style={{ borderColor: 'var(--cc-border)' }}>
                <div className="text-3xl mb-3">{v.icon}</div>
                <p className="text-sm font-bold mb-1" style={{ color: 'var(--cc-navy)' }}>{v.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--cc-text-muted)' }}>{v.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── SCHOOL LINK ── */}
        <section className="bg-white rounded-2xl border p-7 flex items-center gap-5"
          style={{ borderColor: 'var(--cc-border)' }}>
          <Image src="/cc-seal.png" alt="Central Catholic seal" width={60} height={60} className="shrink-0" />
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--cc-navy)' }}>
              Central Catholic High School
            </p>
            <p className="text-xs mb-2" style={{ color: 'var(--cc-text-muted)' }}>
              4720 Fifth Avenue, Pittsburgh, Pennsylvania 15213
            </p>
            <a href="https://www.centralcatholichs.com/" target="_blank" rel="noopener noreferrer"
              className="text-xs font-semibold hover:underline" style={{ color: 'var(--cc-gold)' }}>
              centralcatholichs.com →
            </a>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="text-center py-6">
          <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--cc-navy)' }}>
            Ready to join your fellow Vikings?
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--cc-text-muted)' }}>
            Create your free profile today and become part of the network.
          </p>
          <Link href="/signup"
            className="inline-block px-7 py-3 rounded-lg font-semibold text-sm text-white"
            style={{ background: 'var(--cc-navy)' }}>
            Create your profile →
          </Link>
        </section>
      </div>

      {/* ── FOOTER ── */}
      <footer className="bg-white border-t py-8" style={{ borderColor: 'var(--cc-border)' }}>
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Image src="/cc-seal.png" alt="seal" width={26} height={26} className="opacity-60" />
            <span className="text-sm font-semibold" style={{ color: 'var(--cc-navy)' }}>Central Connect</span>
          </div>
          <div className="flex gap-5 text-xs" style={{ color: 'var(--cc-text-muted)' }}>
            <Link href="/" className="hover:underline">Home</Link>
            <Link href="/login" className="hover:underline">Sign in</Link>
            <Link href="/signup" className="hover:underline">Create account</Link>
          </div>
          <p className="text-xs" style={{ color: 'var(--cc-text-muted)' }}>
            Made with pride by Samuel Brackney '25
          </p>
        </div>
      </footer>
    </div>
  )
}

const platformPoints = [
  {
    title: 'Alumni Directory',
    body: 'A searchable, filterable directory of every Central Catholic alumni on the platform — searchable by grad year, location, industry, and more.',
  },
  {
    title: 'Mentorship Network',
    body: 'Alumni who want to give back can mark themselves as open to mentoring. Students and young grads find them and request guidance.',
  },
  {
    title: 'Opportunities Board',
    body: 'Internships, full-time jobs, and networking events posted directly by alumni — for alumni. No noise, just real Viking connections.',
  },
  {
    title: 'Direct Messaging',
    body: 'Message any member one-on-one, or join group chats organized by graduation year, industry, or former clubs and sports teams.',
  },
  {
    title: 'Alumni Feed',
    body: 'A shared space to celebrate wins, share updates, and stay informed about what the Viking community is doing in the world.',
  },
  {
    title: 'Events Calendar',
    body: 'Reunions, fundraisers, networking nights, and alumni-hosted webinars — all in one place, open to the whole Viking community.',
  },
]

const values = [
  {
    icon: '⚔️',
    title: 'Brotherhood',
    body: 'The bond formed at Central Catholic doesn\'t expire at graduation. We exist to keep it alive.',
  },
  {
    icon: '🎓',
    title: 'Service',
    body: 'Those who came before have a responsibility to help those who follow. Mentorship is not optional — it\'s Viking.',
  },
  {
    icon: '🔗',
    title: 'Connection',
    body: 'Your next opportunity, mentor, or collaborator may be a Viking from a different class. We make that easy to find.',
  },
]
