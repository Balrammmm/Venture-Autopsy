import type { AtlasPayload } from './atlas-types'

export const DEMO_IDEA =
  'A tool for small UK landlords with one to five properties who self-manage. The tenant reports a repair by text, we dispatch a vetted local tradesperson, and every job is logged as a compliance record the landlord can hand to a council or insurer.'

export const EXAMPLE_IDEAS = [
  {
    label: 'Landlord repairs',
    idea: DEMO_IDEA,
  },
  {
    label: 'Prep-note scanner',
    idea: 'Restaurant kitchens run on messy handwritten prep notes that live in one chef\'s head. An app where you photograph the notes and get back standardised, costed recipe cards that new staff can actually follow.',
  },
  {
    label: 'Clinic no-shows',
    idea: 'Small physiotherapy clinics lose serious money to no-shows. A service that predicts which appointments are likely to be missed and automatically offers those slots to a waitlist by text, taking a cut of each recovered booking.',
  },
  {
    label: 'Grant writing',
    idea: 'Small arts nonprofits spend weeks writing grant applications and reuse the same content badly. A workspace that keeps their organisational facts in one place and drafts each application against a specific funder\'s criteria.',
  },
]

export const DEMO_SOURCES = [
  {
    kind: 'note',
    title: 'Call notes — three landlords, Leeds LS6',
    url: null as string | null,
    snippet:
      'All three self-manage. Two keep certificates in a drawer, one in Google Drive. None could recall a council ever requesting a record. All three named the same problem unprompted: finding someone reliable at short notice. One said she would "absolutely" pay for it, then would not commit to a number.',
    evidence: 'user_provided',
  },
  {
    kind: 'competitor',
    title: 'Competitor scan — what landlords say they use today',
    url: null as string | null,
    snippet:
      'Landlords in the forum threads I read mention: a saved plumber number, Checkatrade, a local Facebook group, and their old letting agent on a repairs-only package. Nobody mentioned dedicated software. Not verified beyond forum posts.',
    evidence: 'user_provided',
  },
]

export const DEMO_ATLAS: AtlasPayload = {
  title: 'Repair Desk for Small Landlords',

  genome: {
    summary:
      'A dispatch layer and compliance record for landlords who self-manage a handful of properties and resent the administration.',
    whyNow:
      'Tightening rental compliance has raised the record-keeping burden on exactly this group. That is a real tailwind — but it favours a compliance product, which is not quite what is being proposed here.',
    nodes: [
      {
        id: 'customer',
        kind: 'customer',
        label: 'Reluctant self-managing landlord',
        detail:
          'One to five properties, no letting agent, a full-time job elsewhere. Often an accidental landlord through inheritance or a move. Treats the property as an asset that generates interruptions.',
        strength: 4,
        unknowns: ['Whether the one-to-five band is actually where the pain concentrates', 'Whether they see themselves as a business'],
      },
      {
        id: 'pain',
        kind: 'pain',
        label: 'The 9pm text about a leak',
        detail:
          '"A tenant texts me at 9pm about a leak and I have no idea who to call, whether the price is fair, or what I am legally required to have logged."',
        strength: 5,
        unknowns: ['How often this actually happens per property per year'],
      },
      {
        id: 'solution',
        kind: 'solution',
        label: 'Text intake, vetted dispatch, logged',
        detail:
          'Tenants text one number. A vetted local tradesperson is dispatched. Every job lands in a per-property record the landlord can export.',
        strength: 3,
        unknowns: ['Whether dispatch or the record is the part people actually pay for', 'Whether tenants will use the channel at all'],
      },
      {
        id: 'revenue',
        kind: 'revenue',
        label: 'Per-property fee, or job margin',
        detail:
          'Proposed as a monthly per-property subscription, possibly plus a margin on dispatched work. Which of the two carries the business is unresolved and changes everything downstream.',
        strength: 2,
        unknowns: ['Whether a few-times-a-year product can sustain a subscription', 'What a margin would have to be to work'],
      },
      {
        id: 'distribution',
        kind: 'distribution',
        label: 'Unspecified — the largest hole',
        detail:
          'The idea does not say how the first hundred landlords hear about this. This group is diffuse, not organised into obvious channels, and largely absent from where software is normally marketed.',
        strength: 1,
        unknowns: ['Whether any repeatable channel exists at all', 'Cost per real conversation'],
      },
      {
        id: 'advantage',
        kind: 'advantage',
        label: 'The trades network — which does not exist',
        detail:
          'The vetted-tradesperson network is the only component here that would be hard to copy. It has not been built. Everything else is assemblable in a weekend.',
        strength: 1,
        unknowns: ['Whether trades will accept dispatch at low volume', 'Whether it can be rebuilt in a second city'],
      },
    ],
    links: [
      { from: 'solution', to: 'advantage', note: 'Dispatch is only a product if the trades network is real.' },
      { from: 'customer', to: 'distribution', note: 'A diffuse customer with no gathering place is what makes the channel hard.' },
      { from: 'revenue', to: 'pain', note: 'Pain arrives a few times a year; a monthly fee is billed twelve times.' },
      { from: 'advantage', to: 'revenue', note: 'Without a supply moat, trades and landlords transact around you.' },
      { from: 'pain', to: 'solution', note: 'The 9pm text is the moment the product must be present for.' },
      { from: 'distribution', to: 'revenue', note: 'If acquisition costs more than a year of fee, no pricing rescues it.' },
    ],
    missingInformation: [
      'Whether the landlord or the tenant is the one who must feel the relief — they have different problems.',
      'What a landlord currently spends per repair, and whether they think that number is too high.',
      'Whether trades in a given postcode will accept dispatch from a platform with no volume.',
      'Which compliance records actually get requested, by whom, and how often.',
      'Whether the founder can service a second city without rebuilding the network from zero.',
    ],
  },

  market: {
    personas: [
      {
        id: 'reluctant',
        name: 'Reluctant Landlord',
        role: 'Accidental landlord, two properties',
        context: 'Full-time job elsewhere. Never intended to be in property. Handles it in evenings, badly.',
        jobToBeDone: 'Make the property stop generating decisions I have to make at 9pm.',
        currentWorkaround: "A tradesperson's number saved three years ago, and a web search when that fails.",
        buyingTrigger: 'One bad repair that cost too much, took too long, or had to be done twice.',
        objection: '"I only get two of these a year. Why am I paying every month?"',
        x: 0.24,
        y: 0.62,
      },
      {
        id: 'scaling',
        name: 'Scaling Side-Hustler',
        role: 'Four properties, buying a fifth',
        context: 'Treats it as a business. Spreadsheets. Wants systems before the portfolio outgrows them.',
        jobToBeDone: 'Build the process now so the sixth property does not break me.',
        currentWorkaround: 'A spreadsheet, a WhatsApp group with two trades, a folder of scanned certificates.',
        buyingTrigger: 'Buying the next property, or a compliance deadline they nearly missed.',
        objection: '"My spreadsheet works. What does this do that it does not?"',
        x: 0.68,
        y: 0.3,
      },
      {
        id: 'trade',
        name: 'The Dispatched Tradesperson',
        role: 'Self-employed plumber, three-week backlog',
        context: 'Not the buyer, but the product fails without them. Chooses work by margin and hassle.',
        jobToBeDone: 'Fill gaps in my week with jobs that pay on time and do not waste a trip.',
        currentWorkaround: 'Word of mouth and a handful of landlords who call him directly.',
        buyingTrigger: 'A cancellation leaving a hole in tomorrow.',
        objection: '"Why would I give you a cut of a customer I could keep myself?"',
        x: 0.78,
        y: 0.74,
      },
    ],
    alternatives: [
      {
        name: 'The status quo: a saved phone number',
        why: 'Free, familiar, good enough most of the time. The hardest competitor to displace.',
        evidence: 'user_provided',
        sourceIds: [],
      },
      {
        name: 'Traditional letting agents on a repairs-only package',
        why: 'The real incumbent. Many will manage repairs for a fee your pricing must beat.',
        evidence: 'user_provided',
        sourceIds: [],
      },
      {
        name: 'General home-services marketplaces',
        why: 'Solve dispatch for homeowners already. Whether landlords use them, and what breaks when they do, is unchecked.',
        evidence: 'hypothesis',
        sourceIds: [],
      },
      {
        name: 'Property management software for small portfolios',
        why: 'Likely already owns the records surface; repairs may be a checkbox feature there.',
        evidence: 'hypothesis',
        sourceIds: [],
      },
    ],
    positioningGaps: [
      {
        gap: 'Nobody owns the 9pm emergency for a landlord specifically',
        whyItExists: 'Consumer marketplaces optimise for the homeowner; agents optimise for their own margin.',
        risk: 'The gap may exist because the moment is too rare to build a business on.',
      },
      {
        gap: 'The compliance record is treated as filing, not as a product',
        whyItExists: 'It is unglamorous and only matters on the day someone asks for it.',
        risk: 'If nobody is ever asked, the need is imagined rather than felt.',
      },
    ],
    researchGaps: [
      {
        question: 'How many repairs does a single property actually generate in a year?',
        howToAnswer: 'Ask ten landlords to count last year from their bank statements, not from memory.',
        blocksWhat: 'Everything about pricing and retention.',
      },
      {
        question: 'Will trades accept dispatch at zero initial volume, and at what cut?',
        howToAnswer: 'Call fifteen plumbers in one postcode and ask directly.',
        blocksWhat: 'Whether dispatch is a product at all.',
      },
      {
        question: 'Has a council or insurer ever actually requested a record from these landlords?',
        howToAnswer: 'Ask in every interview. Look for a specific incident, not a general worry.',
        blocksWhat: 'Whether compliance is the hook or a decoration.',
      },
      {
        question: 'What does a repairs-only agent package cost locally?',
        howToAnswer: 'Ring three agents as a prospective landlord and ask for a quote.',
        blocksWhat: 'Your pricing ceiling.',
      },
    ],
    sizingMethod: {
      approach:
        'Build it bottom-up from one postcode and refuse a national figure until the local one is real. Count self-managing landlords in a single area, multiply by properties held, then by a price someone has actually paid you. Every step must come from a number you gathered, not one you found in a headline.',
      inputsNeeded: [
        'Landlords in a target postcode who self-manage rather than use an agent',
        'The real distribution of portfolio size — the one-to-five band may be narrower than assumed',
        'Repairs per property per year, which sets both value and usage frequency',
        'Local repairs-only agent pricing, as the ceiling',
      ],
      evidence: 'hypothesis',
    },
    note: 'The alternatives above are categories to go and verify in your own postcode, not a researched competitive set. Nothing here has been confirmed beyond what you pasted in yourself.',
  },

  failures: [
    {
      id: 'directory-drift',
      title: 'The Slow Slide Into Being A Directory',
      narrative:
        'Trades would not commit to response times at low volume, so dispatch quietly became "here are three numbers to try". Landlords compared that to a web search and correctly concluded it was the same thing. Churn ran high from month two and never recovered. The compliance log was the only part anyone opened, and nobody would pay for a log alone.',
      warningSignals: [
        'Trades asking to be listed rather than dispatched.',
        'Support messages that are really just requests for a phone number.',
        'Usage concentrated entirely in the records view.',
      ],
      mitigation:
        'Guarantee response on one narrow job type in one postcode before widening. A hard promise on a small surface beats a soft promise on a large one.',
      likelihood: 'high',
      killZone: 'supply',
    },
    {
      id: 'acquisition-wall',
      title: 'A Product They Love That Nobody Can Find',
      narrative:
        'The dozen pilot landlords were genuinely delighted, which was mistaken for validation. Every one of them came through the founder\'s own network. Each attempt to reach a stranger cost more than a year of subscription revenue. The product was good; the business had no way to grow.',
      warningSignals: [
        'Every early customer traceable to someone the founder already knew.',
        'Paid channels producing clicks but no completed signups.',
        'Explaining the product taking more than one sentence to a stranger.',
      ],
      mitigation:
        'Before building further, spend one week acquiring three customers who have never heard of you. Treat failure there as the real result.',
      likelihood: 'high',
      killZone: 'channel',
    },
    {
      id: 'one-bad-job',
      title: 'The Job That Ended It',
      narrative:
        'A dispatched electrician did work that later failed an inspection. The landlord pointed at the platform, the platform pointed at the contractor, and the contract had never settled who carried it. Legal costs consumed the runway. The insurance that would have covered it had been deferred as a post-revenue problem.',
      warningSignals: [
        'Vetting that is a phone call and a gut feeling.',
        'No written allocation of liability with either side.',
        'Insurance treated as a later-stage concern.',
      ],
      mitigation: 'Settle liability and insurance before the first dispatched job, not before the first funding round.',
      likelihood: 'moderate',
      killZone: 'legal',
    },
    {
      id: 'seasonal-hollow',
      title: 'Four Repairs A Year',
      narrative:
        'Usage was real but rare. A landlord with three properties opened the app perhaps four times a year, forgot the password each time, and cancelled during a quiet spring. The retention curve looked like a product problem and was in fact a frequency problem that no amount of pricing could fix.',
      warningSignals: [
        'Long gaps between sessions in the pilot cohort.',
        'Password resets as a top support category.',
        'Cancellations clustering in low-repair months.',
      ],
      mitigation:
        'Find the between-repairs reason to open it — renewals, certificates, inspection dates — or move to per-job pricing and stop pretending it is SaaS.',
      likelihood: 'moderate',
      killZone: 'retention',
    },
  ],

  pivots: [
    {
      id: 'safer',
      kind: 'safer',
      title: 'Compliance Vault First',
      description:
        'Drop dispatch at the start. Sell the record: every certificate, inspection date and repair log per property, with reminders before deadlines.',
      whatChanges: 'No supply side to build. The hard marketplace problem is deferred until you have customers who trust you.',
      whoItServes: 'The same landlord, but the anxious administrative part of them rather than the 9pm-emergency part.',
      tradeoff: 'A much smaller promise on a crowded shelf. You win on focus and price, not on being the only option.',
      effort: 2,
      ceiling: 2,
      speedToProof: 5,
    },
    {
      id: 'sharper',
      kind: 'sharper',
      title: 'One Postcode, One Trade, Guaranteed',
      description:
        'Pick a single postcode and a single job category — emergency plumbing. Guarantee a named plumber within four hours. Nothing else.',
      whatChanges: 'The vague promise becomes a hard one you can keep, and supply becomes three relationships instead of a network.',
      whoItServes: 'Landlords in one area whose worst night is a burst pipe.',
      tradeoff: 'The addressable market shrinks to something that looks unfundable. It is also the only version you can prove in a month.',
      effort: 3,
      ceiling: 3,
      speedToProof: 4,
    },
    {
      id: 'bolder',
      kind: 'bolder',
      title: 'Sell To The Trades, Not The Landlords',
      description:
        'Invert it. The tradesperson holds the recurring, high-value relationship with a book of small landlords. Give them the intake, scheduling and compliance paperwork; they bring their own landlords.',
      whatChanges: 'The customer changes, and with it the channel — trades are reachable through suppliers and trade counters in ways landlords are not.',
      whoItServes: 'Independent trades running a book of repeat landlord clients on paper and WhatsApp.',
      tradeoff: 'A different product, a different buyer, and none of the landlord research transfers. A restart with better distribution.',
      effort: 4,
      ceiling: 5,
      speedToProof: 2,
    },
  ],

  model: {
    valueFlows: [
      { id: 'f1', from: 'Tenant', to: 'Repair Desk', what: 'Reports the fault by text', kind: 'data' },
      { id: 'f2', from: 'Repair Desk', to: 'Tradesperson', what: 'Dispatches a job with address and detail', kind: 'value' },
      { id: 'f3', from: 'Tradesperson', to: 'Tenant', what: 'Attends and fixes it', kind: 'value' },
      { id: 'f4', from: 'Repair Desk', to: 'Landlord', what: 'A logged, exportable compliance record', kind: 'value' },
      { id: 'f5', from: 'Landlord', to: 'Repair Desk', what: 'Subscription or per-job fee', kind: 'money' },
      { id: 'f6', from: 'Repair Desk', to: 'Tradesperson', what: 'Payment less margin', kind: 'money' },
    ],
    revenueStreams: [
      {
        id: 'r1',
        name: 'Per property, per month',
        model: 'Subscription',
        pricePoint: 'A low monthly figure per property — untested, and the number matters less than whether anyone pays at all',
        rationale: 'Scales with the portfolio and reads as small next to rent.',
        testMethod: 'A founding-member offer with a real card taken. Not a survey response.',
        risk: 'Cancellation in any quiet stretch, because the charge is visible and the value is not.',
        evidence: 'hypothesis',
      },
      {
        id: 'r2',
        name: 'Margin on dispatched jobs',
        model: 'Take rate',
        pricePoint: 'A percentage per job, to be tested against what trades will actually accept',
        rationale: 'Payment lands exactly when relief is felt, which removes the "paying for nothing" objection.',
        testMethod: 'Run ten jobs manually at a stated margin and see whether either side objects once it is real money.',
        risk: 'Trades route around you the moment they have the landlord\'s number — which is after the first visit.',
        evidence: 'hypothesis',
      },
    ],
    costDrivers: [
      { id: 'c1', name: 'Liability insurance', kind: 'fixed', note: 'The single largest unknown. Price it before trusting any projection.' },
      { id: 'c2', name: 'Founder time building the trades network', kind: 'fixed', note: 'Unpaid, unglamorous, and not compressible.' },
      { id: 'c3', name: 'Covering a job that goes wrong', kind: 'variable', note: 'You will eat some of these to protect the promise.' },
      { id: 'c4', name: 'Acquisition per landlord', kind: 'variable', note: 'Currently unknown, and the most likely thing to sink the model.' },
    ],
    unitEconomics: [
      {
        metric: 'Repairs per property per year',
        hypothesis: 'Low single digits, which fights the subscription model directly.',
        howToMeasure: 'Ask ten landlords to count last year from bank statements.',
      },
      {
        metric: 'Cost to acquire one landlord',
        hypothesis: 'High, because there is no obvious channel.',
        howToMeasure: 'Spend a fixed sum and a fixed week; divide by landlords actually won.',
      },
      {
        metric: 'Dispatch acceptance rate',
        hypothesis: 'Unknown, and it decides whether dispatch is real.',
        howToMeasure: 'Offer ten real jobs to your trade list and count first-offer acceptances.',
      },
    ],
    mvpScope: {
      inScope: [
        'A phone number tenants can text, answered by a human — you.',
        'A per-property log of every report, job and document.',
        'A manually curated list of three trades in one postcode.',
        'A printable record for a single property.',
      ],
      outOfScope: [
        'A tenant app. The text message is the feature.',
        'Automated dispatch. Do it by hand until the pattern is obvious.',
        'Payments, rent tracking, accounting.',
        'A second city.',
      ],
      successCriteria:
        'Ten dispatched jobs across at least three landlords who are not friends, with one paying and one record used for something real.',
    },
    note: 'Which revenue stream carries this business is entirely unresolved, and the answer changes the product, the customer and the channel.',
  },

  scenarios: {
    disclaimer:
      'These are conditional routes, not forecasts. Each one holds only while the assumptions beneath it hold. Treat them as a way to see which assumptions matter most, not as a plan.',
    paths: [
      {
        kind: 'conservative',
        title: 'A good local business',
        narrative:
          'The trades network works in one postcode and never travels. You serve a few dozen landlords well, the record becomes genuinely useful, and it pays for itself without ever becoming a company.',
        beats: [
          { t: 0.1, label: 'Three trades signed', detail: 'Enough supply to keep a hard promise in one area.' },
          { t: 0.45, label: 'Twenty paying landlords', detail: 'All local, most by word of mouth.' },
          { t: 0.85, label: 'Steady, capped', detail: 'Growth limited by the founder personally making calls.' },
        ],
        dependsOn: ['Trades accept dispatch at low volume', 'Word of mouth works inside one postcode'],
        breaksIf: 'The founder stops making calls, or a second city is attempted too early.',
      },
      {
        kind: 'expected',
        title: 'Compliance wins, dispatch fades',
        narrative:
          'Usage concentrates in the record rather than the dispatch. You follow the evidence, narrow to compliance, and find a smaller but real business with far less operational risk.',
        beats: [
          { t: 0.15, label: 'Dispatch underused', detail: 'Landlords keep calling their own contact.' },
          { t: 0.5, label: 'Pivot to the vault', detail: 'The record becomes the product; supply problem disappears.' },
          { t: 0.9, label: 'Slower, safer', detail: 'Lower ceiling, no liability exposure, honest retention.' },
        ],
        dependsOn: ['Someone has actually been asked for a record', 'Landlords will pay for filing they rarely open'],
        breaksIf: 'Compliance turns out to be a stated fear rather than a felt need.',
      },
      {
        kind: 'ambitious',
        title: 'The trades own the relationship',
        narrative:
          'You invert the model, sell to trades, and reach landlords through them. Distribution stops being the bottleneck and the network compounds — but this is effectively a different company.',
        beats: [
          { t: 0.2, label: 'First trades onboard', detail: 'They bring their own landlord books.' },
          { t: 0.55, label: 'Channel compounds', detail: 'Each trade brings several landlords at near-zero cost.' },
          { t: 0.9, label: 'Real scale possible', detail: 'The acquisition problem is finally solved by someone else.' },
        ],
        dependsOn: ['Trades will pay for admin software', 'Trades will share their landlord relationships'],
        breaksIf: 'Trades see you as a threat to their direct relationships rather than a tool.',
      },
    ],
  },

  launch: {
    milestones: [
      { id: 'm1', name: 'Supply proven', outcome: 'Three named trades agree in writing to a response time and a cut.', owner: 'Founder', risk: 'Nobody agrees at zero volume.', week: 1 },
      { id: 'm2', name: 'Liability settled', outcome: 'A written three-way agreement and an indicative insurance quote.', owner: 'Founder + solicitor', risk: 'The premium makes the margin negative.', week: 2 },
      { id: 'm3', name: 'Ten manual jobs', outcome: 'Ten repairs dispatched by hand, every step logged.', owner: 'Founder', risk: 'Tenants bypass the number entirely.', week: 4 },
      { id: 'm4', name: 'Cold acquisition tested', outcome: 'Three landlords won who had never heard of you.', owner: 'Founder', risk: 'Cost per landlord exceeds a year of fee.', week: 6 },
      { id: 'm5', name: 'First real payment', outcome: 'One landlord has paid money, not promised to.', owner: 'Founder', risk: 'Enthusiasm does not convert to a card.', week: 8 },
    ],
    sevenDays: [
      { day: 1, action: 'Call fifteen plumbers and electricians in one postcode.', output: 'A written list of who would accept dispatch, at what cut, with what response time.' },
      { day: 2, action: 'Finish the calls and write up the pattern honestly.', output: 'A one-page verdict on whether supply exists at all.' },
      { day: 3, action: 'Ring three letting agents as a prospective landlord.', output: 'Local repairs-only pricing — your ceiling.' },
      { day: 4, action: 'Interview three landlords about their last actual repair.', output: 'Three specific incidents with real numbers attached.' },
      { day: 5, action: 'Interview three more, asking about compliance requests.', output: 'Evidence on whether anyone has ever been asked for a record.' },
      { day: 6, action: 'One paid hour with a solicitor on contractor liability.', output: 'A clear answer on who carries a bad job.' },
      { day: 7, action: 'Decide: dispatch, vault, or trades-first.', output: 'A written decision with the evidence that drove it.' },
    ],
    kpis: [
      { name: 'Dispatch acceptance rate', definition: 'Share of jobs accepted by the first trade offered.', target: 'Above 70%', failureThreshold: 'Below 50% means the supply side is not real.' },
      { name: 'Report to booked visit', definition: 'Median hours from tenant report to a confirmed appointment.', target: 'Under four working hours', failureThreshold: 'Over twelve hours means the promise is not being kept.' },
      { name: 'Intake leakage', definition: 'Share of issues reported around the system, straight to the landlord.', target: 'Under 20%', failureThreshold: 'Above 40% means the intake design has failed.' },
      { name: 'Cost per acquired landlord', definition: 'All spend and founder hours divided by paying landlords won.', target: 'Under one year of their fee', failureThreshold: 'Above two years of fee means there is no viable channel.' },
      { name: 'Records actually used', definition: 'Compliance records exported for a real external request.', target: 'Any non-zero number in the first quarter', failureThreshold: 'Zero after six months means compliance is decoration.' },
    ],
    readinessNote:
      'This is not ready to launch. It is ready to be tested by hand in one postcode, which is a different and much cheaper thing.',
  },

  verdict: {
    verdict: 'High Risk',
    confidence: 'moderate',
    reasoning:
      'The pain is real and specifically described, which is more than most ideas have. But the business rests on a two-sided network in a fragmented local market, sold to a customer group with no obvious channel, at a usage frequency that fights the subscription model proposed. Any one of those is survivable; all four together is why this reads high risk rather than merely unvalidated. The compliance angle is the strongest thread and is currently positioned as a supporting feature rather than the product.',
    strongestSignal:
      "The pain is described in the customer's own language and tied to a specific moment — the 9pm text. That specificity usually means it was observed rather than imagined.",
    fatalFlawRisk:
      'Acquisition cost. A product this group loves is still worthless if reaching a stranger costs more than they will ever pay. Nothing else here matters until that is tested.',
    whatWouldChangeThis:
      'Ten dispatched jobs in one postcode with trades accepting at a workable margin, plus three landlords acquired cold. That would move this to Needs Validation immediately, and toward Promising if retention held past ninety days.',
    healthScore: 34,
  },

  assumptions: [
    {
      claim: 'Vetted local tradespeople will accept jobs from a platform that starts with almost no volume.',
      category: 'Supply',
      impact: 5,
      uncertainty: 5,
      breaksIfFalse: 'The core promise collapses to a directory. Dispatch is the product; without supply you are a phone book with a subscription fee.',
      proofNeeded: 'Written agreement from at least three trades in one postcode on cut and response time.',
      cheapestTest: 'Call fifteen plumbers and electricians in one postcode. Describe the model honestly, including the low volume.',
      testCost: '$0',
      testDuration: '2 days',
    },
    {
      claim: 'A landlord with three properties will pay a recurring monthly fee for something used a few times a year.',
      category: 'Willingness to pay',
      impact: 5,
      uncertainty: 4,
      breaksIfFalse: 'Recurring revenue disappears and the model becomes transactional, needing far more volume and a different customer.',
      proofNeeded: 'A completed card payment from someone outside your network.',
      cheapestTest: 'Offer ten landlords a founding price today and take a card. Not a survey — an actual payment attempt.',
      testCost: 'under $50',
      testDuration: '5 days',
    },
    {
      claim: 'There is a repeatable, affordable way to reach self-managing small landlords.',
      category: 'Channel',
      impact: 5,
      uncertainty: 4,
      breaksIfFalse: 'Unit economics never close. A product they love is worthless if each customer costs more to find than they return.',
      proofNeeded: 'Three landlords acquired who had never heard of you, with a known cost per acquisition.',
      cheapestTest: 'Spend two days reaching twenty strangers by any means, recording cost and time per real conversation.',
      testCost: 'under $200',
      testDuration: '3 days',
    },
    {
      claim: 'The compliance record is what they buy, and repairs are the delivery mechanism.',
      category: 'Demand',
      impact: 4,
      uncertainty: 4,
      breaksIfFalse: 'You have built the wrong hero feature, and positioning, pricing and roadmap all aim at the wrong anxiety.',
      proofNeeded: 'A specific, dated incident where a record was requested by a council, insurer or buyer.',
      cheapestTest: 'In every interview, ask when they were last asked for a document. Push for an incident, not a feeling.',
      testCost: '$0',
      testDuration: '3 days',
    },
    {
      claim: 'Tenants will report issues through the tool rather than texting the landlord directly.',
      category: 'Adoption',
      impact: 4,
      uncertainty: 3,
      breaksIfFalse: 'The landlord keeps receiving 9pm texts, the record is incomplete, and the central promise quietly fails.',
      proofNeeded: 'Measured leakage below one in five across at least ten real reports.',
      cheapestTest: 'Run it manually for three landlords with a plain phone number and a spreadsheet, and count leakage.',
      testCost: '$0',
      testDuration: '2 weeks',
    },
    {
      claim: 'Dispatching a tradesperson does not make you liable for their work.',
      category: 'Regulatory',
      impact: 5,
      uncertainty: 3,
      breaksIfFalse: 'A single bad job becomes an existential legal event, and insurance may render the margin negative.',
      proofNeeded: 'A solicitor\'s written view plus an indicative broker premium.',
      cheapestTest: 'One paid hour with a solicitor who knows contractor liability, and one call to a broker.',
      testCost: 'under $400',
      testDuration: '1 week',
    },
    {
      claim: 'The trades network can be rebuilt city by city at acceptable cost.',
      category: 'Scalability',
      impact: 4,
      uncertainty: 4,
      breaksIfFalse: 'You have a single-city lifestyle business, which may be fine but is not the business implied here.',
      proofNeeded: 'A costed plan for city two that does not depend on the founder personally.',
      cheapestTest: 'Cost out the second city on paper before building the first.',
      testCost: '$0',
      testDuration: '1 day',
    },
  ],

  experiments: [
    {
      name: 'The Supply Call-Round',
      kind: 'interview',
      hypothesis: 'At least five of fifteen trades in one postcode will accept dispatch at a workable margin and a stated response time.',
      method: 'Cold-call fifteen plumbers and electricians in a single postcode. Describe the model honestly including the low starting volume. Record cut, response time and objection verbatim.',
      script: [
        'How do you fill a gap when a job cancels tomorrow?',
        'Where does most of your work come from right now?',
        'Have you ever taken work through a platform or agency? What happened?',
        'What cut would make a dispatched job worth taking?',
        'What would make you turn a job down even when you had space?',
      ],
      successThreshold: 'Five or more willing at a cut that leaves a margin, with a stated response time.',
      failThreshold: 'Fewer than three willing, or all demanding to be listed rather than dispatched.',
      sampleSize: '15 trades',
      duration: '2 days',
      cost: '$0',
      assumptionClaim: 'Vetted local tradespeople will accept jobs from a platform that starts with almost no volume.',
    },
    {
      name: 'The Founding Price Door',
      kind: 'fake_door',
      hypothesis: 'At least two of ten landlords will enter card details for a founding subscription today.',
      method: 'A one-page offer with a real payment form. Present it at the end of an interview. Take the card if offered; refund immediately and tell them why.',
      script: [
        'Show the one-pager and stop talking.',
        'Ask what they would expect to pay before naming a price.',
        'Present the founding price and the payment form.',
        'If they hesitate, ask what would need to be true instead of persuading.',
      ],
      successThreshold: 'Two or more completed payments out of ten.',
      failThreshold: 'Zero payments despite verbal enthusiasm — that is a no.',
      sampleSize: '10 landlords',
      duration: '5 days',
      cost: 'under $50',
      assumptionClaim: 'A landlord with three properties will pay a recurring monthly fee for something used a few times a year.',
    },
    {
      name: 'The Cold Postcode',
      kind: 'concierge',
      hypothesis: 'Three landlords with no connection to the founder can be reached and signed within one week at a knowable cost.',
      method: 'Pick one postcode. Try every channel available — local groups, forums, letters, agent castoffs. Log hours and money against every landlord actually reached.',
      script: [
        'Log every attempt, including the ones that go nowhere.',
        'Record time and money spent per real conversation.',
        'Stop when three sign or the week ends, whichever comes first.',
      ],
      successThreshold: 'Three signed at a cost below one year of their fee.',
      failThreshold: 'Fewer than one signed, or a cost above two years of fee.',
      sampleSize: '1 postcode, 1 week',
      duration: '7 days',
      cost: 'under $200',
      assumptionClaim: 'There is a repeatable, affordable way to reach self-managing small landlords.',
    },
  ],
}
