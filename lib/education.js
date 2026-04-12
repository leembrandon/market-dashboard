// Education content for all four LevelSight reports
// Each report answers: What is this? How do I trade it? Common mistakes.

const EDUCATION = {
  orb: {
    title: "Opening Range Breakout",
    slug: "orb",
    what: {
      heading: "What is the Opening Range?",
      body: "The Opening Range (OR) is the price range established during the first N minutes of a trading session. LevelSight tracks the 5-minute, 15-minute, and 30-minute opening ranges. When price breaks above or below this range, it's called an Opening Range Breakout. The direction of the first breakout — and whether it holds — is one of the most statistically reliable signals in intraday trading.",
      terms: [
        { term: "OR High / OR Low", def: "The highest and lowest prices during the opening range period." },
        { term: "First Break Direction", def: "Which side of the OR breaks first — above or below." },
        { term: "First Break Reliability", def: "How often the first break correctly predicts the session's direction." },
        { term: "A-Move", def: "The initial move from the OR edge to the session's furthest point in the breakout direction." },
        { term: "B-Move", def: "The retracement back toward (or through) the OR after the A-move." },
        { term: "Trapped", def: "When the first breakout fails and price reverses to break the opposite side." },
      ],
    },
    trade: {
      heading: "How to Trade It",
      steps: [
        "Wait for the opening range period to complete (e.g., first 15 minutes). The range isn't set until the time window closes.",
        "Note the OR High and OR Low — these are your breakout reference levels.",
        "When price breaks one side, check LevelSight: does the first break tend to hold for this ticker, session, and day of week?",
        "If hold rate is high (>65%), consider entering in the breakout direction with a stop on the other side of the OR.",
        "Use the A-Move median from LevelSight as your initial profit target.",
        "If the trap rate is elevated (>30%), consider fading the first break instead — or simply stay flat until the trap resolves.",
      ],
    },
    mistakes: [
      {
        bad: "Entering before the OR period closes",
        fix: "The OR isn't defined until the window completes. Early entries are guessing, not trading a setup.",
      },
      {
        bad: "Ignoring session context",
        fix: "A 15-min ORB in NY behaves very differently from Asia. Always filter by the active session.",
      },
      {
        bad: "Using the same OR period for every instrument",
        fix: "CL is far more volatile than ES. Check which OR period has the best hold rate for your instrument.",
      },
      {
        bad: "Skipping the day-of-week heatmap",
        fix: "Mondays and Fridays often behave differently. The heatmap shows which days the breakout is most reliable.",
      },
    ],
  },

  gap_fill: {
    title: "Gap Fill",
    slug: "gap-fill",
    what: {
      heading: "What is a Gap?",
      body: "A gap occurs when a session opens at a different price than the prior session's close. If the open is higher, it's a gap up; lower is a gap down. A gap fill happens when price travels back to the prior close level during the current session. LevelSight tracks how often gaps fill, how long it takes, the worst drawdown before the fill, and what happens when gaps don't fill.",
      terms: [
        { term: "Gap Size", def: "The distance between the session open and the prior close, in points and as a percentage." },
        { term: "Gap Filled", def: "Price returned to the prior session's close level during the current session." },
        { term: "Fill Time", def: "How many minutes into the session it took to fill the gap." },
        { term: "Max Adverse", def: "The furthest price moved against the fill direction before filling. This is your worst-case drawdown." },
        { term: "Overshoot", def: "How far past the fill level price traveled after filling." },
        { term: "Continuation Move", def: "If the gap didn't fill, how far price moved in the gap direction instead." },
      ],
    },
    trade: {
      heading: "How to Trade It",
      steps: [
        "At the session open, identify whether there's a gap and its direction (up or down).",
        "Check LevelSight's fill rate for this ticker, session, and gap direction.",
        "If fill rate is high (>70%), consider fading the gap — trading toward the prior close.",
        "Set your stop using the max adverse stat. This tells you how much heat fill trades typically take.",
        "Use the median fill time to set expectations — if most fills happen in 30 minutes, don't panic at minute 10.",
        "If the fill rate is low, consider trading with the gap (continuation) instead of against it.",
      ],
    },
    mistakes: [
      {
        bad: "Assuming every gap fills",
        fix: "Some sessions and instruments have fill rates below 50%. Always check the actual data before fading.",
      },
      {
        bad: "Setting stops too tight on fill trades",
        fix: "The max adverse stat shows how far price typically moves against you before filling. Size accordingly.",
      },
      {
        bad: "Not distinguishing gap direction",
        fix: "Gap-up and gap-down fills can have very different rates. A ticker might fill 80% of gap-downs but only 55% of gap-ups.",
      },
      {
        bad: "Ignoring gap size",
        fix: "Tiny gaps (<0.1%) are noise. Unusually large gaps behave differently. Focus on the typical range shown in the stats.",
      },
    ],
  },

  ib: {
    title: "Initial Balance",
    slug: "ib",
    what: {
      heading: "What is the Initial Balance?",
      body: "The Initial Balance (IB) is the price range formed during the first 60 minutes of a session. It acts as a framework for the rest of the day — price either stays inside the IB (range day) or extends beyond it (trend day). LevelSight tracks extension rates, which direction extends first, how far extensions travel as a multiple of the IB range, and whether both sides break.",
      terms: [
        { term: "IB High / IB Low", def: "The highest and lowest prices during the first 60 minutes." },
        { term: "IB Range", def: "The distance from IB High to IB Low, in points." },
        { term: "Extension", def: "When price breaks above the IB High or below the IB Low." },
        { term: "Extension Multiple", def: "How far price extended beyond the IB edge, expressed as a multiple of the IB range (e.g., 1.5x)." },
        { term: "Stay Inside", def: "Price never broke above IB High or below IB Low — a range/chop day." },
        { term: "Double Break", def: "Price extended both above and below the IB — typically a choppy, difficult session." },
        { term: "IB Size (Narrow/Wide)", def: "Relative size of the IB range. Narrow IBs tend to extend more often." },
      ],
    },
    trade: {
      heading: "How to Trade It",
      steps: [
        "After the first 60 minutes, note the IB High and IB Low — these are your key levels for the rest of the session.",
        "Check the extension rate in LevelSight. A high rate (>65%) means most days break out of the IB.",
        "Check IB size context: narrow IBs extend more often than wide ones. Filter by IB size if the current day's IB is notably small or large.",
        "When price breaks the IB edge, check the first extension reliability — does the first break direction tend to be the real one?",
        "Use the extension multiple as your target. If the average is 1.5x and the IB range is 20 points, target 30 points from the IB edge.",
        "If the stay-inside rate is high, consider mean-reversion trades back toward the IB midpoint instead.",
      ],
    },
    mistakes: [
      {
        bad: "Trading the IB breakout on a high stay-inside day",
        fix: "If the stay-inside rate is elevated for this session/day combo, breakout trades will get chopped. Check first.",
      },
      {
        bad: "Ignoring double-break risk",
        fix: "A high double-break rate means the first extension is unreliable. Wait for the second break to confirm direction.",
      },
      {
        bad: "Using raw point targets instead of multiples",
        fix: "A 20-point move means something different on a narrow IB vs. a wide one. Think in multiples of the IB range.",
      },
      {
        bad: "Not adjusting for IB size",
        fix: "Narrow IBs extend more often but can also trap more. Filter by IB size to see separate stats.",
      },
    ],
  },

  prior_day_levels: {
    title: "Prior Day Levels",
    slug: "prior-day-levels",
    what: {
      heading: "What are Prior Day Levels?",
      body: "Prior Day Levels are the high (PDH), low (PDL), and close (PDC) from the previous trading session. These act as support and resistance — when today's price reaches yesterday's high or low, it either bounces (reversal) or breaks through (continuation). LevelSight tracks how often each level gets tested, the first-touch result, how long the level holds, and the size of the subsequent move.",
      terms: [
        { term: "PDH", def: "Prior Day High — yesterday's session high price." },
        { term: "PDL", def: "Prior Day Low — yesterday's session low price." },
        { term: "PDC", def: "Prior Day Close — yesterday's session closing price." },
        { term: "Test Rate", def: "How often price reaches the level during today's session." },
        { term: "Bounce", def: "Price touches the level and reverses. A support/resistance hold." },
        { term: "Break", def: "Price pushes through the level and continues. A breakout." },
        { term: "First Touch Result", def: "What happened the first time price reached the level — this is often the highest-probability reaction." },
        { term: "Hold Duration", def: "How long a break was sustained before price reversed or the session ended." },
      ],
    },
    trade: {
      heading: "How to Trade It",
      steps: [
        "Before the session, identify where PDH, PDL, and PDC sit relative to the current price.",
        "Check the test rate — does price typically reach this level during this session? If the test rate is low (<40%), it may not come into play.",
        "When price approaches a level, check the first-touch bounce rate. This tells you the probability of a reversal on first contact.",
        "If bounce rate is high (>55%), consider a counter-trend entry at the level with a stop just beyond it.",
        "If break rate is high, wait for a clean break and use the average break move as your target.",
        "Compare all three levels (PDH/PDL/PDC) in the Level Breakdown. Different levels have different characteristics.",
      ],
    },
    mistakes: [
      {
        bad: "Treating all prior day levels the same",
        fix: "PDH, PDL, and PDC each behave differently. PDC, for example, is a magnet level — it often gets tested but reactions are weaker. Check each level's stats separately.",
      },
      {
        bad: "Fading a level with a low bounce rate",
        fix: "If the bounce rate is only 35%, you're on the wrong side of the probability. Trade with the break instead.",
      },
      {
        bad: "Ignoring the time dimension",
        fix: "A level test at 9:45 AM behaves differently from one at 3:30 PM. Use the average test time to understand when the level is most likely to be in play.",
      },
      {
        bad: "Not using hold duration for stop management",
        fix: "If breaks typically hold for 15+ minutes, you can give the trade room. If breaks reverse quickly, tighten stops after entry.",
      },
    ],
  },
};

export default EDUCATION;
