# FinCare

FinCare traces four stages of cancer care in Finland: Screening → Referral → Diagnosis → Treatment. It compares breast-screening participation and colorectal colonoscopy attendance after a positive screening test across 21 wellbeing services counties and Helsinki. Referral and treatment explain the missing comparable waiting-time evidence and how teams could collect it.

## Run locally

Use Node.js 22 or later and pnpm. Run `pnpm install --frozen-lockfile`, then `pnpm dev` and open [FinCare](http://127.0.0.1:3000).

To enable FinCare AI, copy `.env.example` to `.env.local`, set `ANTHROPIC_API_KEY` in that file, and restart the server. The underlying model defaults to Claude Sonnet 5.5. The dashboard and curated pilots remain available without an API key. Run `pnpm test`, `pnpm check` and `pnpm build` to verify the application.

Production AI requests are limited per running server instance. Set a monthly spend limit on FinCare’s Claude workspace to enforce a budget across instances. The Claude Console requires a workspace member with billing permissions to set that limit.

## Junction demo

Two questions to try in FinCare AI

1. “Which county has the largest gap in colonoscopy follow-up after a positive colorectal screen, and what could its team try?”
2. “How long do patients wait for referral and treatment in Helsinki?” FinCare explains the limits of its public county data and links to the published guidance.

1. Start in Helsinki. The finalized 2024 attendance rate was 74.3%, compared with 81.6% in the Registry’s national benchmark excluding Åland.
2. Open FinCare AI and ask how Helsinki compares with North Ostrobothnia. Follow up by asking what Helsinki should pilot and how to evaluate it. Expand Investigation Steps to see the evidence and proposal the tools returned.
3. Compare pilot attendance with usual practice over the same follow-up period. Report the language-group gap where counts permit.
4. Switch to Diagnosis. In Helsinki, 67.8% of people with a positive colorectal screen attended colonoscopy versus 72.7% nationally. Ask FinCare AI what the screening and hospital endoscopy teams can check and pilot.
5. Open Referral and Treatment to see what teams should collect before comparing waiting times.
6. Open Goal 3 outcome evidence. Compare lung cancer mortality in men in Lapland with Finland and use FinCare AI to outline a local audit. Mortality is an outcome signal and cannot identify a specific delay.
7. Expand **Plan a pilot target** on Screening or Diagnosis to see how many more people would attend at the selected share of the gap to the national rate. This is a planning scenario.

## Data and FinCare AI

The Goal 3 explorer uses the Finnish Cancer Registry's [Cancer in Finland 2024](https://syoparekisteri.fi/assets/themes/ssy3/factsheets/cancer_in_finland_2024.html), tables 15.12 and 15.13. It includes lung cancer incidence, five-year relative survival and mortality for women and men across 21 wellbeing services counties and Helsinki. Åland is not shown separately in those tables. The comparison uses the Registry's national values and displays published mortality confidence intervals.

To extend the outcome data, map published rows to the reporting-area IDs in `lib/screening.ts`, record the period, unit, definition, coverage and exact table alongside the series, then verify national values and representative regional rows against the original publication. Keep unavailable values explicit. Age-standardised rates and survival estimates use the published national value rather than a mean of regional estimates.

The local 2024 tables come from the Finnish Cancer Registry’s [breast screening statistics](https://stats.cancerregistry.fi/joukkistilastot/breast.html) and [colorectal screening statistics](https://stats.cancerregistry.fi/joukkistilastot/colorectal.html). Both exclude Åland. The breast denominator includes people whose invitations may go unsent. The colorectal denominator includes positive screening tests. The colonoscopy measure excludes alternative CT colonography and gives no diagnosis interval or confirmation rate. Comparisons use published one-decimal rates.

For chat, the browser sends the current region, stage and up to six recent exchanges along with the new question. The conversation stays visible until the page is reloaded. The server lets the model choose read-only tools for regional data, comparisons, pathway evidence, and pilot design. It validates tool inputs and caps the investigation at four tool rounds. Exact figures and source links come from the tools. The original one-click pilot uses the same persona and curated options. Review generated hypotheses and recommendations before using them operationally.
