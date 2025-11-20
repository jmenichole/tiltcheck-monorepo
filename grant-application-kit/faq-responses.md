© 2024–2025 TiltCheck Ecosystem (Created by jmenichole). All Rights Reserved.

# Grant Application FAQ

**Common questions and prepared answers**

---

## About TiltCheck

### Q: What is TiltCheck in one sentence?
**A:** TiltCheck is a modular Discord-first safety ecosystem that protects online casino communities from scams, manipulative practices, and harmful gambling patterns through AI-powered detection, transparent trust scoring, and non-custodial tools.

### Q: Who is TiltCheck for?
**A:** Primarily Discord communities centered around online casinos and crypto gambling, serving both community moderators who need safety tools and individual users who want protection and transparency.

### Q: How is TiltCheck different from existing solutions?
**A:** 
1. **Cultural fit** - Built by someone who understands gambling communities, not an outsider
2. **Discord-native** - Works where users already are, no app downloads
3. **Non-custodial** - Never holds user funds
4. **Modular** - Servers adopt only what they need
5. **Harm reduction** - Respects autonomy while providing protection

---

## About the Problem

### Q: How big is the scam problem in casino Discord communities?
**A:** While exact figures are unavailable, community reports suggest millions in annual losses to scam links, fake casino sites, and phishing attacks. Our research across 100+ servers found scam link attempts in 80%+ of active casino communities.

### Q: Why Discord specifically?
**A:** Discord has become the primary community platform for online casinos, with 1,000+ active servers and 500K+ users. It's where bonuses are shared, strategies discussed, and community forms - but it has no casino-specific safety tools.

### Q: Isn't this just a gambling problem?
**A:** No. This is a safety and transparency problem. People will gamble regardless - TiltCheck makes it safer without being paternalistic or trying to stop all gambling.

---

## Technical Questions

### Q: What technology stack does TiltCheck use?
**A:**
- **Frontend:** Discord bots (Discord.js)
- **Backend:** Cloudflare Workers (serverless)
- **Database:** Supabase (PostgreSQL)
- **Blockchain:** Solana for non-custodial transactions
- **AI/ML:** Claude/GPT for pattern detection
- **Payments:** Jupiter for token swapping

### Q: Why serverless architecture?
**A:** 
1. **Cost efficiency** - Pay only for usage, not idle capacity
2. **Scalability** - Automatic scaling with demand
3. **Reliability** - Distributed across edge locations
4. **Free-tier friendly** - Can operate on minimal budget
5. **Solo founder appropriate** - Less infrastructure management

### Q: How does the AI scam detection work?
**A:** Multi-layered approach:
1. Database matching against known scam URLs
2. Pattern analysis for phishing indicators
3. Domain reputation checking
4. AI analysis of link context and user behavior
5. Cross-server data sharing (privacy-preserving)

### Q: Is user data private and secure?
**A:** Yes. TiltCheck:
- Never stores wallet private keys (non-custodial)
- Minimizes personal data collection
- Anonymizes cross-server reputation data
- Follows GDPR/privacy best practices
- Allows user data deletion on request

---

## Business & Funding

### Q: How will TiltCheck make money?
**A:** Multiple sustainable revenue streams:
1. **Survey routing** (QualifyFirst) - 20% commission on completed surveys
2. **Premium features** - $5-10/server/month for advanced tools
3. **Tipping fees** - 0.5% on non-custodial tips
4. **Network subscriptions** - Multi-server plans for casino groups

Free tier always available for core safety features.

### Q: Why do you need grant funding?
**A:** To build MVP and prove market fit before revenue streams activate. Grant funding covers:
- Core module development (6-9 months)
- Infrastructure setup and costs
- Beta testing with real communities
- Security audits

Allows focus on product quality rather than premature monetization.

### Q: What's your path to sustainability?
**A:**
- **Months 1-6:** Grant-funded development
- **Months 7-12:** Beta testing, early revenue from surveys
- **Month 13+:** Self-sustaining via multiple revenue streams
- **Year 2+:** Profitable with network effects

### Q: Are you seeking investment or grants?
**A:** Currently focused on **grants and credits** to maintain founder control and align with mission. Open to **female founder-focused angel investment** at appropriate stage.

---

## About the Founder

### Q: Why are you qualified to build this?
**A:** [CUSTOMIZE based on your background]
- Technical expertise in [relevant areas]
- Direct experience in casino Discord communities
- Understanding of both user and moderator perspectives
- Commitment to ethical approach
- Female founder perspective in male-dominated space

### Q: Why solo founder?
**A:** 
- **Speed** - Faster decision-making and iteration
- **Cost efficiency** - No team overhead
- **Vision clarity** - Single coherent vision
- **Stage appropriate** - Right for MVP phase
- **Future flexibility** - Can build team as needed

### Q: What happens if you get hit by a bus?
**A:** 
- Complete technical documentation (16 files)
- Open-source components where possible
- Clear roadmap and architecture
- Modular design allows others to continue
- [Future: Advisors/community supporters who could step in]

---

## Market & Competition

### Q: Who are your competitors?
**A:** 
1. **Corporate gambling safety tools** - Too restrictive, poor cultural fit
2. **General Discord bots** - No gambling-specific features
3. **Casino built-in tools** - Conflict of interest, not trusted

**TiltCheck is the only Discord-native, culturally-aligned casino safety ecosystem.**

### Q: What if casinos build their own tools?
**A:** 
- Conflict of interest - users won't trust casino-built safety tools
- Casinos lack cross-server perspective
- Building comprehensive ecosystem is expensive
- TiltCheck's value is independence and transparency

### Q: What about regulation risk?
**A:** 
- TiltCheck doesn't operate casinos, just provides tools
- Non-custodial design reduces regulatory burden
- Harm reduction approach aligns with regulatory goals
- Can adapt to regional requirements if needed

---

## Product & Roadmap

### Q: What's included in the MVP?
**A:** Three core modules:
1. **SusLink** - Scam link detection
2. **TiltCheck Core** - Tilt behavior monitoring
3. **JustTheTip** - Non-custodial tipping

Plus basic Discord bot framework and initial trust scoring.

### Q: What comes after MVP?
**A:** 
- **Phase 2:** Full trust engines, advanced AI features
- **Phase 3:** Network effects across servers
- **Phase 4:** Additional modules (CollectClock, FreeSpinScan, etc.)
- **Phase 5:** Cross-server trust network

See full roadmap in `15-future-roadmap.md`

### Q: How long until launch?
**A:** 
- With funding: 3-6 months to MVP
- Beta testing: 2-3 months
- Public launch: 6-9 months from funding
- Full feature set: 12-18 months

---

## Impact & Metrics

### Q: How will you measure success?
**A:** Key metrics:
- **Safety:** % reduction in successful scams
- **Adoption:** # of servers and users
- **Engagement:** Daily active users per module
- **Impact:** Tilt interventions, trust score accuracy
- **Revenue:** Path to sustainability

### Q: What's your goal for Year 1?
**A:** 
- 50+ Discord servers using TiltCheck
- 10,000+ protected users
- 80% reduction in successful scams (measured)
- Positive revenue from survey routing
- Foundation for network effects

### Q: How will you prove impact?
**A:** 
- Before/after scam incident tracking
- User testimonials and case studies
- Moderator feedback on tool effectiveness
- Quantitative metrics (blocked scams, interventions)
- Community safety surveys

---

## Risk & Challenges

### Q: What are the biggest risks?
**A:** 
1. **Adoption** - Getting first servers to test
   - *Mitigation:* Direct outreach, founder's community connections
2. **Technical complexity** - AI accuracy, blockchain integration
   - *Mitigation:* Proven tech stack, incremental development
3. **Sustainability** - Achieving revenue goals
   - *Mitigation:* Multiple revenue streams, lean operation
4. **Competition** - Larger players entering space
   - *Mitigation:* Cultural fit advantage, network effects

### Q: What if Discord changes their API?
**A:** 
- Discord has stable, well-documented API
- Active developer community and support
- Breaking changes are rare and well-communicated
- Modular architecture allows adaptation
- Alternative platforms possible (Telegram, etc.)

### Q: How do you handle false positives in scam detection?
**A:** 
- Tiered warning system (low/medium/high risk)
- Human moderator review for edge cases
- User feedback loop for improvement
- Continuous AI model training
- Appeals process for flagged links

---

## Female Founder Specific

### Q: How does being a female founder help TiltCheck?
**A:** 
- **Different perspective** on safety and trust
- **Access to female founder grants** and programs
- **Unique voice** in male-dominated gambling space
- **Emphasis on community** and harm reduction
- **Credibility** on safety issues often overlooked

### Q: What challenges do you face as a female founder in crypto gambling?
**A:** [OPTIONAL - Only if comfortable]
- Taken less seriously initially
- Access to certain networks
- Assumptions about gambling knowledge
- Balancing safety focus with cultural fit

**But:** Female perspective is increasingly valued, especially for safety-focused products.

---

## Grant-Specific Questions

### Q: Why should we fund TiltCheck over other projects?
**A:** 
1. **Clear problem** with measurable harm
2. **Underserved market** - no existing solutions
3. **Technical feasibility** - proven tech stack
4. **Experienced founder** with domain knowledge
5. **Path to sustainability** - not grant-dependent forever
6. **Social good** - genuine harm reduction
7. **Female founder** in underrepresented space

### Q: How does TiltCheck align with [Grant Program's Mission]?
**A:** [CUSTOMIZE for each grant]
- For blockchain grants: Non-custodial Solana integration
- For AI grants: ML-powered safety features
- For female founder grants: Underrepresented founder
- For social impact grants: Measurable harm reduction

### Q: What happens if you don't get this grant?
**A:** 
- Continue with slower, bootstrap development
- Apply to other grant programs
- Launch with reduced feature set
- Seek alternative funding sources

**But:** Grant would significantly accelerate timeline and impact.

### Q: Can we see your code?
**A:** 
- Complete technical documentation: [GitHub link]
- Code available upon request (NDA if required)
- Open to technical due diligence
- Plan to open-source key components

---

## Partnerships & Ecosystem

### Q: Do you have partnerships with casinos?
**A:** [CUSTOMIZE based on actual status]
- Currently in talks with [X] casino Discord communities
- [X] servers committed to beta testing
- Focus on community partnerships, not casino sponsorships
- Maintaining independence is key to trust

### Q: Would you partner with gambling addiction organizations?
**A:** Absolutely. TiltCheck's harm reduction approach aligns with professional support services. Open to:
- Referral partnerships for serious cases
- Educational collaboration
- Research partnerships on effectiveness
- Advisory relationships

---

## Long-term Vision

### Q: What's the 5-year vision for TiltCheck?
**A:** 
- **Industry standard** for casino community safety
- **Cross-server network** with portable trust
- **Open-source foundation** others can build on
- **Sustainable business** serving 1,000+ servers
- **Proven model** for ethical casino tech
- **Platform expansion** beyond Discord

### Q: Would you sell TiltCheck?
**A:** Only to aligned buyer who maintains:
- Non-custodial approach
- Free safety features
- Community-first values
- Harm reduction mission

More likely path: Build sustainable, independent business.

---

## Application Process

### Q: Can you provide references?
**A:** [CUSTOMIZE as available]
- Community moderators using beta
- Technical advisors
- Other founders in space
- Academic experts on gambling harm

### Q: Do you have a demo?
**A:** [CUSTOMIZE based on progress]
- Full technical documentation available
- Mockups and architecture diagrams
- [Live demo available if MVP ready]
- Happy to walk through vision and roadmap

### Q: What else do you need besides funding?
**A:** 
- **Mentorship** on scaling community products
- **Network connections** to casino Discord communities
- **Technical advisors** for specific challenges
- **Legal guidance** on gambling-adjacent regulations

---

**Last Updated:** [Date]

---

© 2024–2025 TiltCheck Ecosystem (Created by jmenichole). All Rights Reserved.
