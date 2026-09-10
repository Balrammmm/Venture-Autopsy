# Venture Autopsy

A venture-validation workspace. You give it a raw business idea; it builds an **explorable atlas** around
that idea — an orbit of its parts, a minefield of the assumptions it rests on, a museum of how it dies, a
prism of pivots, a model of where money moves, three conditional futures, a lab of experiments, and a
seven-day plan.

It is not a report generator. Every visualisation is tied to rows in a real database: click a risk node and
edit what breaks, mark an experiment passed and watch its assumption move with it, attach a competitor note
and regenerate a module to have it re-judged against that evidence.

It will not flatter you.

---

## Quick start

```bash
npm install
npm run setup
```

Then add a Gemini key (see below) and:

```bash
npm run dev
```

Open http://localhost:3000.

`npm run setup` runs `prisma generate`, creates the SQLite database, and seeds a complete worked example —
so the whole product is explorable before you add a key.

### The Gemini key

Create `.env.local` in the project root:

```bash
GEMINI_API_KEY=your-key-here
```

Get one from [Google AI Studio](https://aistudio.google.com/apikey). Restart the dev server; `/settings`
will show the key as configured.

**The key is server-side only.** It is read in route handlers, never bundled, never sent to the browser and
never written to the database. `src/lib/gemini.ts` is marked `server-only`, so importing it from a client
component is a build error rather than a leak.

Without a key the app still runs: every page, the seeded venture and all CRUD work. Analysis, regeneration
and Milo return a 503 with instructions instead of failing silently.

---

## Environment

Two files, because Prisma and Next read different ones.

| File | Holds | Read by |
| --- | --- | --- |
| `.env` | `DATABASE_URL` only | the Prisma CLI (it does not read `.env.local`) |
| `.env.local` | secrets | Next, at runtime. Gitignored. |

`npm run setup` writes `.env` for you. Copy the block from `.env.example` into `.env.local`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | — | Required for analysis and Milo. Server-side only. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Model for analysis and regeneration. |
| `GEMINI_RESEARCH_MODEL` | same as above | Model for the grounded pass. Must support the Search tool. |
| `SESSION_SECRET` | dev fallback | Signs the demo session cookie. Set a long random string. |
| `DATABASE_URL` | `file:./dev.db` | SQLite path. |

---

## Commands

```bash
npm run dev         # dev server on :3000
npm run build       # prisma generate + next build
npm run start       # serve the production build
npm run typecheck   # tsc --noEmit

npm run setup       # generate + db push + seed  (first-time setup)
npm run db:push     # apply schema changes without a migration
npm run db:migrate  # create a named migration
npm run db:seed     # re-seed the worked example (idempotent)
npm run db:studio   # browse the database
```

### A note on `npm install`

`.npmrc` sets `legacy-peer-deps=true`. `@react-three/fiber` declares an optional `expo` peer for its React
Native target; without this, npm tries to resolve the whole Expo tree and the install fails against React 19.
Only the web renderer is used here.

If npm blocks postinstall scripts, approve the two that matter:

```bash
npm approve-scripts @prisma/engines esbuild
```

---

## Research integrity

This is the constraint the product is built around, so it comes before the feature list.

Every claim carries one of three labels, visible in the interface:

| Label | Means |
| --- | --- |
| **Hypothesis** | Derived from your idea description alone. Not researched. Not a fact. |
| **Your evidence** | Supported by something you pasted in — a review, a call note, a pricing page. |
| **Sourced** | Traces to a real URL retrieved by the grounded search, with a timestamp. |

Consequences you should expect:

- **Market sizing returns a method, not a number.** You get a bottom-up approach you can run and a list of
  what you would need to find out. Never a total addressable market figure, because any figure would be
  invented.
- **Competitors are candidates to verify**, labelled as such, not a researched competitive set.
- **Scenarios are conditional routes, not predictions.** Each names the assumptions it rests on and what
  breaks it.
- Pasting a URL yourself marks evidence as *your evidence*, not *sourced*. Only a retrieval with a real link
  earns the sourced label.

### Research Mode

The **Run grounded search** button on `/venture/[id]/research` performs a Google Search–grounded pass and
stores each finding with its real URL, the supporting snippet, and a retrieval timestamp.

This is two API calls by necessity: Gemini cannot combine Search grounding with a structured response schema
in one request. The grounded pass returns prose plus `groundingMetadata`, and those findings feed the
structured pass. If it returns no usable sources, the app says so and nothing is promoted above hypothesis.

Where grounding is unavailable, the evidence desk takes URLs, competitor notes, review text, interview notes
and survey responses — and the analysis may only cite what is actually there.

---

## The pages

| Route | What it is |
| --- | --- |
| `/` | The landing experience — see below. |
| `/onboarding` | Three steps: you, how you work, the idea. Creates the account and first venture. |
| `/ventures` | The library. Each venture is a specimen plate with a generated sigil, not a table row. |
| `/venture/[id]` | Command center: Idea Genome, Assumption Minefield, Failure Museum, Pivot Prism. |
| `/venture/[id]/research` | Market Terrain and the evidence desk. |
| `/venture/[id]/validate` | Validation Lab — experiments as test tubes with real thresholds. |
| `/venture/[id]/strategy` | Business Model Blueprint, Future Scope, Launch Flight Plan. |
| `/venture/[id]/report` | The printable dossier. |
| `/settings` | Gemini status, founder profile, local data. |

### The landing page

One continuous scroll-driven scene, not a stack of sections. A **single WebGL canvas** sits fixed behind
the whole page and a scroll director moves one camera between five acts, so objects genuinely carry from
one act into the next rather than each section owning its own canvas.

| Act | What happens |
| --- | --- |
| **The idea** | The Venture Engine: blueprint sheets, charts, torn receipts, glass plates, coins, a compass, sticky notes and a wireframe prototype, mounted in rings around a lit spine. It breathes at rest, leans toward the pointer, and genuinely dismantles as you scroll. |
| **Evidence** | The sheets fly forward and become three things: one unfolds into a customer silhouette with speech fragments, one becomes a value/money loop with coins travelling the paths, one fractures into risk shards with a warning pulse. |
| **Fieldwork** | A workbench: a notebook whose pages turn with scroll, a phone receiving interview messages, sticky notes flying to a wall and grouping into clusters, a receipt crumpling as the pricing assumption fails, and a prototype resolving from wireframe to solid. Hover any object for the lesson. |
| **The atlas** | Nine instruments orbit a venture core — a DNA helix, a pulsing risk terrain, cracked glass exhibits, a shifting topographic map, a translucent prism, flowing pipes, branching pathways, test tubes and a launch trajectory. Scroll brings each forward; hover names it; click opens it. |
| **The venture** | Every fragment returns and binds into one finished blueprint inside an opening portal. |

Supporting the scenes: a progress rail naming the journey, a cursor that swells into an analysis lens over
interactive elements, kinetic typography, and a theme toggle.

**Themes.** Dark is obsidian and warm ivory with chartreuse as the signal, ember reserved for risk and
cobalt for research. Light is not an inversion — it is warm bone stock with rich ink, where the accents
move to deep forest, terracotta and a darker cobalt so they hold their weight on paper. Lighting,
material colours and grain blend mode all change with the theme, and the choice persists.

### The modules

Every one is interactive and bound to saved data.

- **Idea Genome** — six parts in orbit, placed further out the less established they are, linked by real
  dependencies. Click a node to open its detail and its unknowns.
- **Assumption Minefield** — nodes sized by impact, positioned by uncertainty. Click to open what breaks,
  the proof needed and the cheapest test; edit scores and the terrain moves. Add and delete your own.
- **Failure Museum** — exhibits with plates naming the kill zone and likelihood; expand for warning signals
  and mitigation.
- **Market Terrain** — personas standing on ground, alternatives as the ridge behind, plus positioning gaps
  and the questions you have not answered.
- **Pivot Prism** — a rotating three-faced solid. Drag it, use the arrow keys, or read the comparison table
  underneath. Each face carries effort, ceiling and speed to proof.
- **Business Model Blueprint** — value, money and data flowing between actors, animated along real paths.
  Click a flow to trace it; edit revenue hypotheses in place and save.
- **Future Scope** — three conditional routes with beats, dependencies and what breaks each one.
- **Validation Lab** — experiments as test tubes whose fill and colour carry status. Record a result, mark
  it passed, and the linked assumption becomes *supported* automatically.
- **Launch Flight Plan** — a timeline of milestones with owners and risks, the seven-day sequence, and KPIs
  with failure thresholds.

### Milo

A small mechanical fox in the corner. His ears flatten in the risk modules; his tail wags when an experiment
passes. Clicking opens the **Founder Room** — a conversation tied to this venture, persisted in the database.
The quick actions read your actual atlas: challenge an assumption, design the cheapest experiment, generate
interview questions, stress-test pricing, compare pivots, write a one-page pitch, explain the visual, build
the next seven days. Suggestions change with the module you are looking at.

---

## Architecture

```
prisma/
  schema.prisma        9 models: User, Session, Venture, IdeaInput, Analysis,
                       ResearchSource, Assumption, Experiment, ChatMessage
  seed.ts              the worked example

src/
  app/
    api/               18 route handlers — full CRUD, analysis, research, Milo
    (pages)            9 routes
  components/
    landing/
      canvas/scenes/   the five acts, one shared canvas
      canvas/vocabulary  the object language every act draws from
      scroll/          the scroll director (refs, not re-renders)
      theme/           dark and light, art-directed per theme
      StaticStage      the non-WebGL / reduced-motion page
    venture/           chrome, module frames, Milo, the data hook
    venture/modules/   the nine visualisations
    ui/kit.tsx         buttons, chips, icons, evidence tags, states
  lib/
    gemini.ts          server-only. Prompts, integrity contract, error mapping
    gemini-schemas.ts  structured-output schemas
    atlas-types.ts     the atlas model
    auth.ts            demo sessions, signed cookies, ownership checks
    client.ts          typed fetch + the useApi hook
```

**Versioning.** Analyses are never overwritten. Regenerating a module marks the old row `isCurrent: false`
and writes a new version, so history is intact and a bad regeneration is recoverable in the database.

**Ownership.** Every venture route goes through `requireVenture`, which checks the session user owns the row.
Unauthenticated requests get 401 with a recovery hint.

**Transactions.** A full analysis replaces sections, assumptions and experiments inside one transaction, so a
failure part-way cannot leave a half-written atlas. If it throws, the venture is returned to `captured`
rather than being stranded in `analysing`.

---

## Design and accessibility notes

- **Motion is concentrated**, not scattered: the engine's dismantle, the prism rotation, the kinetic story
  beats. Modules do not each get an entrance animation. `prefers-reduced-motion` is honoured throughout, and
  the kinetic type renders as plain text under it.
- **The 3D degrades to a drawn fallback**, not a blank space. Reduced motion, missing WebGL and a lost
  context all render an SVG composition of the same idea. The fallback is also the server-rendered first
  paint.
- **Content never depends on animation to be visible.** Modules render at rest on first paint, so an anchor
  jump or a throttled tab never lands on a blank screen.
- **Contrast** is computed, not eyeballed. All six text colours clear 4.5:1 against the ink background
  (4.78:1 at the lowest); the primary button is 16.4:1.
- **Touch targets** meet 44×44 on coarse pointers via a `.tap` utility, while staying compact on mouse.
- **Colour is never the only signal.** Scores print their value, statuses are named in text, evidence tags
  carry a word.
- Keyboard navigable with a skip link, visible focus rings, Escape closing dialogs, and arrow-key rotation
  on the prism.
- Landing visuals are **authored SVG and 3D**, not stock photography — there is no licensed imagery in this
  repository. The non-WebGL page is a drawn scene per act, not a placeholder.
- Kinetic type is **CSS-driven**: the on-load reveal runs from the stylesheet and the scroll-triggered
  variants are fully legible before their play class is added, so no copy waits on JavaScript to appear.

## Stack

Next.js 15 (App Router), React 19, TypeScript, Tailwind, Framer Motion, React Three Fiber + drei, Prisma,
SQLite, Zod, `@google/genai`.

## Licence

MIT.
