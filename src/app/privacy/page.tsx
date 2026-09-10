import type { Metadata } from 'next'
import { PageFrame, Section } from '@/components/PageFrame'

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What Venture Autopsy stores, where it stores it, and what leaves the machine.',
}

export default function PrivacyPage() {
  return (
    <PageFrame
      eyebrow="Privacy"
      title="What we store, and what leaves"
      lede="Venture Autopsy is a validation lab, not an advertising business. This page describes what the software actually does with what you type into it."
    >
      <Section heading="What is stored">
        <p>
          Your account details, your ventures, and everything generated for them — assumptions, experiments,
          research sources, strategy models, and companion conversations — are written to the application
          database. Nothing about your ventures is shared with other users.
        </p>
      </Section>

      <Section heading="Where it is stored">
        <p>
          On a local install, that database is a SQLite file inside the project directory on your own machine.
          Nothing is uploaded anywhere. On a hosted deployment, it lives in the database the operator of that
          deployment has configured.
        </p>
      </Section>

      <Section heading="What is sent to Google">
        <p>
          Analysis, research, and companion replies are produced by Google&rsquo;s Gemini API. When you run an
          analysis, the relevant venture content is sent to that API from the server so it can respond. It is
          sent from the server, never from your browser.
        </p>
        <p>
          Research Mode additionally uses Gemini&rsquo;s Search grounding, which means your research query
          reaches Google Search. Google&rsquo;s handling of that data is governed by their terms, not ours.
        </p>
      </Section>

      <Section heading="API keys">
        <p>
          The Gemini API key is read from a server-side environment variable. It is never sent to the browser,
          never written to the database, never logged, and never displayed in the interface. The settings page
          reports only whether a key is present.
        </p>
      </Section>

      <Section heading="Deleting your data">
        <p>
          Deleting a venture removes it and everything attached to it. On a local install you can also delete
          the database file directly to remove everything at once.
        </p>
      </Section>
    </PageFrame>
  )
}
