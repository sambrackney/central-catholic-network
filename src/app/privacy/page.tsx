import Link from 'next/link'
import Image from 'next/image'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--cc-surface)' }}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 mb-10">
          <Image src="/cc-seal.png" alt="Central Catholic seal" width={32} height={32} />
          <span className="text-base font-bold" style={{ color: 'var(--cc-navy)' }}>Central Connect</span>
        </Link>

        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--cc-navy)' }}>Privacy Policy</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--cc-text-muted)' }}>Last updated: April 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--cc-navy)' }}>1. What we collect</h2>
            <p>When you create an account we collect your name, email address, and graduation year. You may optionally add profile information such as your photo, employer, headline, location, and skills. We also collect content you post, messages you send, and activity on the platform.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--cc-navy)' }}>2. How we use your information</h2>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>To operate and provide the Central Connect platform to verified members</li>
              <li>To send transactional emails (account confirmation, password reset, message notifications)</li>
              <li>To enable other authenticated members to find and connect with you</li>
              <li>To detect and prevent misuse of the platform</li>
            </ul>
            <p className="mt-2">We do not sell your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--cc-navy)' }}>3. Who can see your information</h2>
            <p>Your profile is visible to other authenticated Central Connect members only. Direct messages are visible only to the participants of that conversation. Your contact email and phone number are governed by your privacy settings within the platform.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--cc-navy)' }}>4. Third-party services</h2>
            <p>We use the following services to operate the platform:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Supabase</strong> — database, authentication, and real-time messaging infrastructure</li>
              <li><strong>Resend</strong> — transactional email delivery via our domain <span style={{ color: 'var(--cc-navy)' }}>mail.centralcatholichsconnect.com</span></li>
              <li><strong>Vercel</strong> — hosting and deployment</li>
            </ul>
            <p className="mt-2">Each provider has their own privacy policy governing their handling of data.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--cc-navy)' }}>5. Data retention</h2>
            <p>Your data is retained for as long as your account is active. You may request deletion of your account and associated data at any time by contacting us.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--cc-navy)' }}>6. Security</h2>
            <p>We implement industry-standard security measures including row-level security on all database tables, encrypted authentication sessions, HTTPS-only access, and strict Content Security Policy headers.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--cc-navy)' }}>7. Your rights</h2>
            <p>You may update or delete your profile information at any time from your profile settings. To request full account deletion, contact us directly.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--cc-navy)' }}>8. Contact</h2>
            <p>Privacy questions? Email <span style={{ color: 'var(--cc-navy)', fontWeight: 600 }}>support@centralcatholichsconnect.com</span>.</p>
          </section>
        </div>

        <div className="mt-10 pt-8 border-t flex gap-6 text-sm" style={{ borderColor: 'var(--cc-border)' }}>
          <Link href="/terms" className="hover:underline" style={{ color: 'var(--cc-navy)' }}>Terms of Use</Link>
          <Link href="/" className="hover:underline" style={{ color: 'var(--cc-text-muted)' }}>← Back to home</Link>
        </div>
      </div>
    </div>
  )
}
