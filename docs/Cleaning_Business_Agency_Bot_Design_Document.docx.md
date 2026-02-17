

**CLEANING BUSINESS**

**AGENCY BOT**

SYSTEM DESIGN DOCUMENT

**\[Agency Name\]**

Prepared by: \[Author 1\] & \[Author 2\]

Version 1.0  |  February 2026

**PUBLIC DOCUMENT**

# **Table of Contents**

# **1\. Executive Summary**

This document defines the system architecture, workflow logic, and technical implementation plan for an agency bot designed to automate and streamline operations for residential cleaning businesses. The system is built to replace manual operational overhead while preserving the human touchpoints that drive customer retention and cleaner accountability.

The bot system addresses the full client lifecycle: lead intake, quoting, booking, day-of operations, post-clean follow-up, payment processing, and payroll. It integrates with existing platforms (Booking Koala, Jobber, Stripe, QuickBooks, OpenPhone) and uses Slack as the primary command interface for business owners who operate from their phones in the field.

This design is intentionally platform-agnostic at the scheduling layer, supporting both Booking Koala and Jobber as the primary job management tools, with Google Sheets serving as a lightweight CRM alternative for lead tracking and follow-up cadence management.

# **2\. Current State Operations**

Based on the operational workflow documented in the February 13, 2026 working session between \[Author 1\] and \[Author 2\], the following represents the standard operating procedure for cleaning business clients currently being served:

## **2.1 Daily Operational Routine**

The daily routine follows a sequential process tied to each scheduled cleaning:

1. Send text reminders to cleaners and clients either the evening before or one hour prior to the scheduled clean.

2. Monitor cleaner check-in. If a cleaner has not clocked in within five minutes of the scheduled start, trigger a follow-up call or text.

3. Upon clock-out, cleaners upload before-and-after photos to Booking Koala.

4. One hour after clean completion, Stripe charges the client’s card on file.

5. Two to three hours after the clean, one-time clients are contacted for feedback. Positive responses trigger a Google Review request link; negative feedback triggers a pacification workflow.

## **2.2 Lead Management and Sales Process**

Leads originate from three primary channels: LSA/Google Ads calls, organic text messages, and direct phone calls. The current intake process is:

1. Call the lead immediately upon receipt, regardless of source.

2. If no answer, send a text message inquiring about their cleaning needs, followed by a second call attempt.

3. Qualifying questions: number of bedrooms, number of bathrooms, approximate square footage.

4. Pull pricing from Booking Koala’s rate structure and deliver the quote.

5. If no response, implement follow-up cadence: Day 1–2 after initial contact, then at one week, then at two weeks.

## **2.3 Payment and Payroll**

Client charges are processed through Stripe, which is connected to Booking Koala. Cleaner payouts are handled through either QuickBooks or Stripe, depending on the client’s setup. Payouts can be triggered manually or automatically through Booking Koala’s built-in payout system.

## **2.4 Current Tool Stack**

| Tool | Function | Notes |
| :---- | :---- | :---- |
| **Booking Koala** | Scheduling, job management, cleaner app | Primary system for most clients |
| **Jobber** | Invoicing, quoting, scheduling | Alternative to BK; has CC function via Stripe API |
| **Stripe** | Payment processing | Connected to BK and/or Jobber |
| **QuickBooks** | Payroll, accounting | Alternative payout method |
| **OpenPhone** | Client/cleaner calls and SMS | API available for message reading |
| **Google Sheets** | Lead tracking CRM substitute | Selected over AirTable; API available |

## **2.5 Compliance Concern: Credit Card Data via OpenPhone**

A critical compliance risk was identified: clients sometimes text full credit card details (number, expiration, CVC) through OpenPhone. This creates PCI-DSS liability for the cleaning business. The “we didn’t ask for it” defense does not hold up under compliance review. **The bot system must include guardrails to detect and flag incoming CC data, and redirect clients to secure payment links (Stripe checkout or Booking Koala’s payment portal) instead.**

# **3\. Automation Classification Matrix**

Each operational task has been classified by automation potential. This matrix drives the architecture decisions for which components are fully automated, which are bot-assisted with human confirmation, and which require human involvement.

| Task | Classification | Bot Role | Human Role |
| :---- | ----- | :---- | :---- |
| Cleaner/client reminders | **Fully Automatable** | Send SMS/email on schedule | None |
| Cleaner check-in monitoring | **Fully Automatable** | Monitor clock-in, auto-follow-up at \+5 min | Escalation only if no response |
| Photo collection from cleaners | **Fully Automatable** | Slack DM prompt, auto-follow-up | None |
| Post-clean card charging | **Fully Automatable** | Trigger Stripe charge 1hr after completion | None |
| Payroll batching | **Fully Automatable** | Calculate and push via Stripe/QB | Approve via Slack tap |
| Lead intake and quoting | **Semi-Automatable** | Qualify, collect specs, generate quote | Close high-value or skeptical leads |
| Follow-up cadence (non-responsive) | **Semi-Automatable** | Automated SMS/email sequence | Review and personalize if needed |
| Post-clean feedback collection | **Semi-Automatable** | Auto-send feedback request, route to Google Review or escalate | Handle negative feedback / pacification |
| CC data interception | **Bot-Assisted** | Detect CC data in messages, auto-redirect to secure link | Review flagged messages |
| Complaint resolution | **Human Required** | Flag and surface to owner via Slack | Direct client communication |

# **4\. System Architecture**

## **4.1 Two-Layer Agent Design**

The system is designed as two distinct agents that work in tandem:

| OPERATIONS AGENT | COMMUNICATION AGENT |
| ----- | ----- |
| Connects to Booking Koala / Jobber APIs Manages Stripe payment triggers Handles QuickBooks payroll Monitors cleaner clock-in/out events Manages job lifecycle state Runs scheduled automations (reminders, charges, follow-ups) Maintains Google Sheets CRM data | Slack-facing interface for business owners Surfaces daily briefings and alerts Collects owner decisions (approve/reject/escalate) Handles cleaner-facing messaging (Slack DMs or SMS) Manages client-facing SMS/email sequences Processes owner commands (invoice, follow-up, etc.) Routes complaints and escalations |

## **4.2 Data Layer: Google Sheets as CRM**

Per the design decision made during the February 13 working session, Google Sheets will serve as the CRM substitute. This was selected over AirTable for simplicity and cost, with the understanding that it can be backed by a Postgres database on a Mac Mini for clients that need more scale.

The Google Sheets CRM will contain the following tabs:

* **Leads:** Name, source (LSA/Google Ads/Organic), contact info, bedrooms/bathrooms/sqft, quote amount, status (New / Contacted / Quoted / Booked / Lost), follow-up dates, notes

* **Clients:** Active client roster, address, property specs, recurring schedule, payment method status, lifetime value, last clean date, review status

* **Cleaners:** Name, contact, availability, assigned jobs, payout method (Stripe/QB), performance metrics, photo compliance rate

* **Jobs:** Job ID, client, cleaner, date/time, status (Scheduled / In Progress / Completed / Charged / Paid Out), photos uploaded (Y/N), feedback received, charge amount, payout amount

* **Follow-Up Queue:** Lead/client ID, follow-up type, scheduled date, status (Pending / Sent / Responded / Closed), message template used

## **4.3 Integration Map**

| Integration | Direction | Method | Purpose |
| :---- | :---- | :---- | :---- |
| **Booking Koala** | Bidirectional | REST API | Job scheduling, cleaner management, pricing |
| **Jobber** | Bidirectional | REST API | Alternative scheduler, invoicing, quotes |
| **Stripe** | Outbound | REST API | Client charges, cleaner payouts |
| **QuickBooks** | Outbound | REST API / Zapier | Payroll processing, accounting sync |
| **OpenPhone** | Bidirectional | REST API / Webhooks | SMS/call monitoring, lead intake |
| **Google Sheets** | Bidirectional | Sheets API v4 | CRM data store, lead tracking |
| **Slack** | Bidirectional | Slack Bot API | Owner interface, cleaner comms |
| **Google Business Profile** | Outbound | Review Link | Post-clean review requests |

# **5\. Workflow Specifications**

## **5.1 Lead Intake Workflow**

**Trigger:** New call/text received via OpenPhone or new lead from Google Ads

1. Bot detects incoming lead via OpenPhone webhook or Google Ads integration.

2. Bot sends immediate SMS: “Hi \[Name\], thanks for reaching out to \[Business Name\]\! To get you a quick quote, could you tell us: how many bedrooms, bathrooms, and the approximate square footage of your home?”

3. If lead responds with property details, bot calculates quote from Booking Koala rate table and presents it via SMS.

4. If lead does not respond within 15 minutes, bot places a follow-up call via OpenPhone. If no answer, sends a second text.

5. Lead is logged to Google Sheets CRM with status “Contacted” or “Quoted.”

6. If no response after initial attempts, bot enters the lead into the follow-up cadence (see 5.4).

7. High-value leads (properties over a configured sqft threshold or deep clean requests) are flagged to the owner via Slack for personal follow-up.

## **5.2 Day-of-Clean Workflow**

**Trigger:** Scheduled clean date arrives

1. Evening before or 1 hour before clean: Bot sends reminder to both cleaner and client via SMS.

2. At scheduled start time: Bot monitors Booking Koala for cleaner clock-in.

3. Start time \+ 5 minutes with no clock-in: Bot sends text to cleaner: “Hey \[Name\], just checking in — are you on your way to the \[Client Name\] job at \[Address\]?”

4. Start time \+ 15 minutes with no clock-in: Bot escalates to owner via Slack with one-tap options: “Call Cleaner” / “Reassign Job” / “Notify Client.”

5. Upon clock-out: Bot sends Slack DM to cleaner requesting before/after photo upload.

6. Photos not uploaded within 30 minutes: Bot auto-follows up. If still missing after 1 hour, flags to owner.

7. One hour after completion: Bot triggers Stripe charge on client’s card.

8. Charge failure: Bot alerts owner via Slack with “Retry Charge” / “Send Invoice” / “Call Client” options.

## **5.3 Post-Clean Feedback Workflow**

**Trigger:** 2–3 hours after clean completion (one-time clients)

* Bot sends SMS: “Hi \[Name\], how was your clean today with \[Business Name\]? Reply 1–5 (1 \= needs improvement, 5 \= excellent).”

* Rating 4–5: Bot responds with Google Review link and a thank-you message.

* Rating 1–3: Bot responds with empathy message and immediately escalates to owner via Slack for personal follow-up. CRM is updated with complaint flag.

* No response: Bot sends one follow-up after 24 hours, then marks as “No Feedback” in CRM.

## **5.4 Lead Follow-Up Cadence**

**Trigger:** Lead quoted but not booked, or lead unresponsive after initial contact

| Timing | Channel | Message Theme | Escalation |
| :---- | :---- | :---- | :---- |
| **Day 1–2** | SMS | Friendly follow-up referencing their quote | None |
| **Day 7** | SMS \+ Email | Value reminder; limited-time offer if configured | None |
| **Day 14** | SMS | Final check-in; ask if needs changed | Owner notified via Slack |
| **Day 30+** | Email | Drip nurture (seasonal promos, tips) | Marked as nurture in CRM |

## **5.5 Payroll Workflow**

**Trigger:** Configured payout schedule (weekly, biweekly, or on-demand)

* Bot aggregates completed jobs for each cleaner from Booking Koala/Jobber.

* Calculates payout amounts based on configured rate (percentage or flat fee per job).

* Sends payout summary to owner via Slack: list of cleaners, job counts, amounts, total.

* Owner approves with one-tap. Bot pushes payouts via Stripe Connect or logs to QuickBooks for manual processing.

* Confirmation sent to each cleaner via SMS or Slack DM.

## **5.6 PCI Compliance Guardrail**

**Trigger:** Incoming message via OpenPhone detected by webhook

* Bot runs regex pattern matching on all incoming SMS for credit card number patterns (13–19 digit sequences), expiration date formats, and 3–4 digit CVC patterns.

* If detected: Bot immediately responds to client with a secure payment link (Stripe Checkout URL or Booking Koala payment page) and a message: “For your security, please use this secure link to enter your payment details: \[link\]. We cannot accept card information via text.”

* Flags the message to the owner via Slack with a compliance alert.

* The original message containing CC data is flagged for deletion/redaction from OpenPhone records where possible.

# **6\. Slack Command Center Design**

The Slack bot is the primary interface for business owners who manage operations from their phone. It eliminates the need to log into separate dashboards by surfacing everything through conversational interactions and actionable buttons.

## **6.1 Daily Briefing**

Sent automatically each morning at a configured time (e.g., 7:00 AM local):

* Today’s scheduled cleans with cleaner assignments and client addresses.

* Any unconfirmed bookings requiring attention.

* Outstanding follow-ups from the follow-up queue.

* Yesterday’s revenue summary (charges processed, any failures).

* Cleaner performance flags (missed clock-ins, missing photos from previous day).

## **6.2 Owner Command Palette**

The owner can interact with the bot via natural language or slash commands:

| Command | Action |
| :---- | :---- |
| **/leads** | Show current lead pipeline with statuses |
| **/today** | Show today’s schedule with cleaner assignments |
| **/revenue \[period\]** | Revenue summary for day/week/month |
| **/follow-up \[name\]** | Trigger a follow-up message to a specific client or lead |
| **/invoice \[client\]** | Generate and send an invoice via Stripe or Jobber |
| **/payroll** | View pending payouts and approve |
| **/reassign \[job\]** | Reassign a job to a different cleaner |
| **/quote \[specs\]** | Generate a quick quote: /quote 3bed 2bath 1800sqft |

## **6.3 Notification Channels**

The Slack workspace is organized into purpose-specific channels:

* **\#new-leads:** Real-time notifications for every incoming lead with qualify/quote/dismiss buttons.

* **\#day-of-ops:** Live feed of clock-ins, clock-outs, photo uploads, charge confirmations.

* **\#alerts:** Escalations only — missed clock-ins, charge failures, complaints, compliance flags.

* **\#reviews:** Client feedback scores and new Google Reviews.

* **DM with bot:** Personal command interface for the owner.

# **7\. Technical Implementation**

## **7.1 Recommended Stack**

| Component | Technology | Rationale |
| :---- | :---- | :---- |
| **Runtime** | Node.js / Python | API ecosystem support; async event handling |
| **Orchestration** | n8n or Make (Integromat) | Visual workflow builder; lower maintenance than custom code for standard flows |
| **Scheduling** | Cron jobs / n8n scheduler | Timed triggers for reminders, follow-ups, briefings |
| **Database** | Google Sheets (primary) / Postgres (scale) | Sheets for small ops; Postgres on Mac Mini for growth clients |
| **Bot Framework** | Slack Bolt SDK | Native Slack integration with interactive components |
| **AI Layer** | Claude API (Anthropic) | Natural language understanding for owner commands and lead conversations |
| **Hosting** | Railway / Render / Mac Mini | Lightweight hosting; Mac Mini for self-hosted clients |

## **7.2 Platform Adapter Pattern**

Since clients may use either Booking Koala or Jobber, the system implements a platform adapter pattern. Both scheduling platforms expose a common interface for job CRUD, pricing lookup, cleaner management, and payment triggers. The operations agent calls the adapter, which routes to the appropriate platform API based on the client’s configuration. This means the workflow logic is written once and works regardless of the underlying scheduling tool.

## **7.3 Security Considerations**

* All API keys stored in environment variables, never in code or Sheets.

* Stripe webhook signatures validated on every incoming event.

* PCI compliance guardrail active on all OpenPhone message ingestion (see Section 5.6).

* Google Sheets access scoped to minimum required permissions via service account.

* Slack bot tokens rotated on a regular schedule; workspace restricted to authorized users.

* Client PII (addresses, payment status) never logged in plain text outside of the secured CRM.

# **8\. Implementation Roadmap**

## **8.1 Phase 1: Foundation (Weeks 1–2)**

Stand up the core infrastructure and automate the highest-impact, lowest-risk workflows.

* Deploy Google Sheets CRM template with all five tabs (Leads, Clients, Cleaners, Jobs, Follow-Up Queue).

* Build Booking Koala API integration: read scheduled jobs, monitor clock-in/out events.

* Implement reminder engine: cleaner and client SMS reminders on configurable schedule.

* Deploy PCI compliance guardrail on OpenPhone webhook.

* Set up Slack workspace with channel structure and basic bot commands (/today, /leads).

## **8.2 Phase 2: Operations Automation (Weeks 3–4)**

Automate the day-of operational workflow end to end.

* Cleaner check-in monitoring with 5-minute and 15-minute escalation.

* Photo collection workflow via Slack DM with auto-follow-up.

* Post-clean Stripe charge automation with failure handling.

* Post-clean feedback sequence for one-time clients.

* Daily briefing Slack message with full schedule and previous-day summary.

## **8.3 Phase 3: Lead Management (Weeks 5–6)**

Automate lead intake, quoting, and follow-up cadence.

* OpenPhone webhook integration for incoming lead detection.

* Conversational lead qualification bot (SMS-based): bedrooms, bathrooms, sqft.

* Auto-quoting from Booking Koala rate tables.

* Follow-up cadence engine with Day 1–2, Day 7, Day 14, Day 30+ sequences.

* Slack \#new-leads channel with interactive qualify/quote/dismiss buttons.

## **8.4 Phase 4: Payroll and Polish (Weeks 7–8)**

Payroll automation, Jobber adapter, and production hardening.

* Payroll aggregation and Slack approval workflow.

* Stripe Connect and/or QuickBooks payout integration.

* Jobber platform adapter (for clients not on Booking Koala).

* Owner command palette expansion (/revenue, /invoice, /reassign, /quote).

* Error handling, retry logic, monitoring, and alerting.

* Documentation and SOP handoff for onboarding new cleaning business clients.

# **9\. Success Metrics**

The following KPIs will be tracked to measure the effectiveness of the bot system:

| Metric | Baseline (Manual) | Target (Automated) |
| :---- | :---- | :---- |
| **Speed to lead (first contact)** | 5–30 minutes | Under 60 seconds |
| **Lead follow-up compliance** | Inconsistent | 100% cadence adherence |
| **Cleaner no-show detection time** | 15–30 minutes | 5 minutes |
| **Photo collection rate** | 60–70% | 95%+ |
| **Post-clean feedback rate** | 20–30% | 60%+ |
| **Google Review conversion** | 5–10% | 25%+ |
| **Owner daily admin time** | 2–3 hours | Under 30 minutes |
| **Payment failure resolution** | Hours to days | Under 1 hour |

# **10\. Appendix**

## **10.1 Platform Support Matrix**

The bot system is designed to support the following platform combinations:

| Scheduler | Payment | Payroll | Comms |
| :---- | :---- | :---- | :---- |
| Booking Koala | Stripe (via BK) | Stripe Connect | OpenPhone \+ Slack |
| Booking Koala | Stripe (via BK) | QuickBooks | OpenPhone \+ Slack |
| Jobber | Stripe (via Jobber) | Stripe Connect | OpenPhone \+ Slack |
| Jobber | Stripe (via Jobber) | QuickBooks | OpenPhone \+ Slack |

## **10.2 Open Questions**

* Jobber’s credit card handling: \[Team\] to confirm whether Jobber can accept payment directly or only through invoicing. If invoice-only, the bot will need to auto-generate and send Jobber invoices rather than triggering direct charges.

* Voice AI for lead intake: Should Phase 3 include a voice bot (e.g., Vapi, Bland AI) for answering incoming calls automatically, or should the bot only handle SMS-based qualification?

* GHL integration: Some clients use GoHighLevel. Determine if a GHL adapter is needed in a future phase.

* Cleaner Slack adoption: Not all cleaners will have Slack. Need a fallback pathway (SMS-only) for cleaner communications including photo uploads.

* Multi-location support: Design currently assumes single-location operations. Scoping needed for multi-location clients.

## **10.3 Source Reference**

This document was compiled from the following working session:

**Meeting:** Internal Working Session — February 2026

**Participants:** \[Redacted\]

**Notes:** AI-generated meeting transcript and summary

*End of Document*

