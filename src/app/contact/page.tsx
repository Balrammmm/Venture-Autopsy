import type { Metadata } from 'next'
import Link from 'next/link'
import { PageFrame, Section } from '@/components/PageFrame'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'How to reach the people behind Venture Autopsy.',
}

const REPO = 'https://github.com/Balrammmm/Venture-Autopsy'

export default function ContactPage() {
  return (
    <PageFrame
      eyebrow="Contact"
      title="Get in touch"
      lede="Bug reports and feature requests are best filed where they can be tracked. Everything else, email works."
    >
      <Section heading="Issues and feature requests">
        <p>
          Open an issue on the repository. Include what you did, what you expected, and what happened — plus
          your browser if it is a rendering problem.
        </p>
        <p>
          <Link
            href={`${REPO}/issues`}
            target="_blank"
            rel="noreferrer noopener"
            className="tap inline-flex items-center gap-1.5 text-action-text underline-offset-4 hover:underline"
          >
            {REPO.replace('https://', '')}/issues
            <span aria-hidden="true">↗</span>
          </Link>
        </p>
      </Section>

      <Section heading="Source">
        <p>
          The project is open source. Read it, fork it, or run it yourself — the README covers local setup.
        </p>
        <p>
          <Link
            href={REPO}
            target="_blank"
            rel="noreferrer noopener"
            className="tap inline-flex items-center gap-1.5 text-action-text underline-offset-4 hover:underline"
          >
            {REPO.replace('https://', '')}
            <span aria-hidden="true">↗</span>
          </Link>
        </p>
      </Section>

      <Section heading="Security">
        <p>
          If you find something that exposes credentials or another user&rsquo;s data, please report it
          privately through the repository&rsquo;s security advisories rather than opening a public issue.
        </p>
      </Section>
    </PageFrame>
  )
}
