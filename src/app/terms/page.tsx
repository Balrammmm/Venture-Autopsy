import type { Metadata } from 'next'
import { PageFrame, Section } from '@/components/PageFrame'

export const metadata: Metadata = {
  title: 'Terms',
  description: 'The terms under which Venture Autopsy is provided.',
}

export default function TermsPage() {
  return (
    <PageFrame
      eyebrow="Terms"
      title="Terms of use"
      lede="Short version: this is a thinking tool, not an advisor. Check anything it tells you before you spend money on it."
    >
      <Section heading="What this software is">
        <p>
          Venture Autopsy helps you structure and pressure-test a business idea. It generates analysis,
          assumptions, experiment designs, and plans using a language model. It is a tool for thinking, not a
          source of truth.
        </p>
      </Section>

      <Section heading="Not professional advice">
        <p>
          Nothing produced here is legal, financial, tax, or investment advice. Market sizes, competitor
          claims, pricing, and feasibility judgements are estimates unless a cited source is attached, and the
          interface marks them as such. Verify anything you intend to act on.
        </p>
      </Section>

      <Section heading="Generated content">
        <p>
          Language models make mistakes, including confident ones. Output can be inaccurate, out of date, or
          internally inconsistent. You are responsible for reviewing it and for any decision you make on the
          basis of it.
        </p>
      </Section>

      <Section heading="Acceptable use">
        <p>
          Do not use this software to generate material that is unlawful, that infringes someone else&rsquo;s
          rights, or that is designed to deceive. Do not attempt to extract server credentials or circumvent
          rate limits.
        </p>
      </Section>

      <Section heading="Third-party services">
        <p>
          Analysis depends on Google&rsquo;s Gemini API and, in Research Mode, Google Search. Your use of those
          services through this software is also subject to Google&rsquo;s terms.
        </p>
      </Section>

      <Section heading="No warranty">
        <p>
          The software is provided as is, without warranty of any kind. To the extent permitted by law, the
          authors are not liable for any loss arising from its use.
        </p>
      </Section>
    </PageFrame>
  )
}
