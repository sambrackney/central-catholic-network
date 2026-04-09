import Link from 'next/link'
import Image from 'next/image'

export default function TermsPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--cc-surface)' }}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 mb-10">
          <Image src="/cc-seal.png" alt="Central Catholic seal" width={32} height={32} />
          <span className="text-base font-bold" style={{ color: 'var(--cc-navy)' }}>Central Connect</span>
        </Link>

        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--cc-navy)' }}>Terms of Use</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--cc-text-muted)' }}>Last updated: April 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--cc-navy)' }}>1. Who may use Central Connect</h2>
            <p>Central Connect is a private network exclusively for current students, alumni, and faculty of Central Catholic High School in Pittsburgh, PA. By creating an account you confirm you are affiliated with Central Catholic.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--cc-navy)' }}>2. Acceptable use</h2>
            <p>You agree to use Central Connect in good faith and in a manner consistent with the values of Central Catholic High School. You must not:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Post content that is defamatory, harassing, or discriminatory</li>
              <li>Share another user's personal information without their consent</li>
              <li>Use the platform for spam, phishing, or commercial solicitation unrelated to alumni networking</li>
              <li>Attempt to gain unauthorized access to any part of the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--cc-navy)' }}>3. Content</h2>
            <p>You retain ownership of content you post. By posting, you grant Central Connect a non-exclusive license to display that content to other authenticated members of the network. We reserve the right to remove content that violates these terms.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--cc-navy)' }}>4. Account security</h2>
            <p>You are responsible for maintaining the security of your account and password. Notify us immediately of any unauthorized use.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--cc-navy)' }}>5. Limitation of liability</h2>
            <p>Central Connect is provided "as is" for educational and networking purposes. We are not liable for any damages arising from your use of the platform or content posted by other users.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--cc-navy)' }}>6. Changes</h2>
            <p>We may update these terms from time to time. Continued use of the platform after updates constitutes acceptance of the revised terms.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--cc-navy)' }}>7. Contact</h2>
            <p>Questions? Reach out through the platform or email <span style={{ color: 'var(--cc-navy)', fontWeight: 600 }}>support@centralcatholichsconnect.com</span>.</p>
          </section>
        </div>

        <div className="mt-10 pt-8 border-t flex gap-6 text-sm" style={{ borderColor: 'var(--cc-border)' }}>
          <Link href="/privacy" className="hover:underline" style={{ color: 'var(--cc-navy)' }}>Privacy Policy</Link>
          <Link href="/" className="hover:underline" style={{ color: 'var(--cc-text-muted)' }}>← Back to home</Link>
        </div>
      </div>
    </div>
  )
}
