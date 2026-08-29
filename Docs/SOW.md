# Statement of Work (SOW)

## Project: **Vaultory** — Small Business Inventory and Sales App (SBISA)

| **Document ID** | SOW-VAULTORY-001 |
|---|---|
| **Version** | 1.0 |
| **Status** | Draft for Approval & Sign-off |
| **Prepared By** | Laxman Patel (Project Manager) — Vaultory |
| **Date** | 29/08/2026 |
| **Client / Sponsor** | Small Business Retailer (Prof) |
| **Base Documents** | BRD v3.3 · SRS v1.0 |

---

## Revision History

| Version | Date | Author | Description of Change |
|---|---|---|---|
| 1.0 | 29/08/2026 | Laxman Patel (PM) | Initial SOW |

---

## Approvals

| Role / Designation | Name | Signature | Date |
|---|---|---|---|
| Client / Sponsor | Prof | | |
| Project Manager | Laxman Patel | | |
| Business Analyst | Ved Naik | | |
| Solutions Architect | Anoop Gupta | | |
| Scrum Master | Devdarshan S | | |
| Tech Lead | Rohan Vashisht | | |

> **IMPORTANT NOTE:** This SOW is a binding **agreement of work**. It defines exactly what Vaultory will deliver, the deliverables, the timeline, client responsibilities, and the controls around scope and changes. Any work not listed here is **not part of this engagement**.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Scope of Work](#2-scope-of-work)
3. [Deliverables](#3-deliverables)
4. [Project Phases & Timeline](#4-project-phases--timeline)
5. [Team & Responsibilities](#5-team--responsibilities)
6. [Client Responsibilities](#6-client-responsibilities)
7. [Acceptance & Approval Process](#7-acceptance--approval-process)
8. [Payment / Commercial Terms](#8-payment--commercial-terms)
9. [Project Control, Communication & Reporting](#9-project-control-communication--reporting)
10. [Change Control](#10-change-control)
11. [Assumptions & Dependencies](#11-assumptions--dependencies)
12. [Constraints & Assumptions](#12-constraints--assumptions)
13. [Limitations & Exclusions (Out of Scope)](#13-limitations--exclusions-out-of-scope)
14. [Risk Management](#14-risk-management)
15. [Sign-off](#15-sign-off)

---

## 1. Project Overview

### 1.1 Summary
Vaultory is a web-based Inventory & Sales application (SRS v1.0) for a small retailer operating **3 stores**. It gives the client real-time inventory visibility, automated AI reordering at safety stock, AI warehouse stock-level recommendations, daily/quarterly/yearly sales reports, store-wise sales monitoring, an executive dashboard, and full role-based access control with data masking.

### 1.2 Objectives
The engagement delivers the **working Vaultory application**, hosted and **kept live** on the **Vercel (frontend) + Render (backend)** free tier, exactly per the requirements in BRD v3.3 and SRS v1.0.

### 1.3 Parties
- **Client:** Small Business Retailer (Prof), sponsoring and role-playing the real business owner.
- **Delivery Team (Vaultory):** PM (Laxman Patel), BA (Ved Naik), SA (Anoop Gupta), SM (Devdarshan S), Tech Lead (Rohan Vashisht).

---

## 2. Scope of Work

### 2.1 Work In Scope
The delivery team will:

1. Build the **Vaultory web application** per SRS v1.0:
   - Inventory Management (multi-location: 3 stores + warehouses).
   - Sales Management with daily / quarterly / yearly reports.
   - Safety Stock Management with low-stock alerts.
   - Supplier & Procurement (Purchase Orders).
   - **AI Automated Ordering** (auto-PO when stock ≤ reorder point).
   - **AI Warehouse Stock-Level Recommendations**.
   - Sales Performance Monitoring (per store).
   - Executive Monitoring Dashboard (senior stakeholders).
   - User Management, RBAC, Data Masking, Audit Logging, Bulk Import/Export, Onboarding Wizard, and value-add modules (BRD §8.1).
2. Set up and maintain the **React** frontend and **Node.js/Python** backend (DB: PostgreSQL).
3. Deploy and keep the product **live on Vercel (frontend) + Render (backend)** free tier for the **final product**.
4. Provide **documentation**: this SOW set (BRD, SRS, SOW, Sprint Planner), and a short User Guide.
5. Deliver **demo** and **UAT** (User Acceptance Testing) sessions.
6. Hand over **source code**, deployment access/instructions, and credentials to the client.

### 2.2 Work Excluded (Not Part of This Engagement)
- Any item in BRD §9 / SRS §3.2 (L-1…L-21): no native mobile apps, e-commerce, payments, POS/hardware, CRM, accounting/GST, supplier portal, ERP integration, multi-currency, etc.
- **Phase-2 production hosting on GCP/AWS** — explicitly after handover, separate engagement/Change Request (BRD §8.5).
- Guaranteed SLA / paid hosting during the project (free tier is best-effort; BRD §8.5 / NFR-4).
- Data migration from any legacy system (manual entry by client).
- External compliance certification (ISO/SOC2).

### 2.3 Constraints
- Delivery follows **Agile/Scrum** with time-boxed sprints (see Sprint Planner).
- Fixed timeline and budget; changes require approved Change Requests (§10).
- Free-tier limits: 1 Vercel project + 1 Render service (~750 hrs/mo) per account.

---

## 3. Deliverables

| # | Deliverable | Format | Due |
|---|---|---|---|
| D-1 | BRD (Business Requirements Document) | MD + PDF | Sprint 1 (Baseline) |
| D-2 | SRS (Software Requirements Specification) | MD + PDF | Sprint 2 |
| D-3 | SOW (Statement of Work) | MD + PDF | Sprint 2 |
| D-4 | Sprint Planner / Backlog (Jira-ready) | MD + Jira | Sprint 2 |
| D-5 | Working web application | Code + live URLs | Sprint 6 |
| D-6 | Database schema & seed data | SQL / DDL script | Sprint 3 |
| D-7 | User Guide | MD / PDF | Sprint 6 |
| D-8 | UAT report & signed acceptance | MD / PDF | Sprint 6 |
| D-9 | Source code repository + deployment instructions & access | Git + doc | Handover |

---

## 4. Project Phases & Timeline

> Agile Scrum, **6 sprints** of **1 week** each (28 working-day equivalent). Aligned with the Sprint Planner. Timeline starts at BRD sign-off.

| Phase | Sprint(s) | Duration | Key Deliverables / Exit Criteria |
|---|---|---|---|
| **Initiation & Planning** | Sprint 1 | Week 1 | BRD baseline sign-off; project setup; environment setup (Vercel/Render/DB); backlog created |
| **Design & Spec** | Sprint 2 | Week 2 | SRS + SOW + Sprint Planner sign-off; DB schema; API design; UI mockups |
| **Core Build — Inventory & Sales** | Sprint 3 | Week 3 | Products, locations, stock-in/out/transfer/adjust, sales recording, daily/qtr/yr reports, RBAC base |
| **Procurement & Safety Stock** | Sprint 4 | Week 4 | Safety stock config, alerts, suppliers, manual POs, PO lifecycle |
| **AI & Monitoring** | Sprint 5 | Week 5 | AI auto-ordering, AI warehouse recommendations, dashboards, executive monitoring, value-add modules |
| **Test, UAT & Handover** | Sprint 6 | Week 6 | QA/UAT, bug fixes, user guide, demo, acceptance, handover (code + access) |

**Delivery end-date:** end of Sprint 6 (subject to timely sign-offs — see §6).

---

## 5. Team & Responsibilities

| Role | Name | Responsibility in this SOW |
|---|---|---|
| Project Manager | Laxman Patel | Scope/schedule/budget control, client communication, CR handling |
| Business Analyst | Ved Naik | Requirement confirmation, UAT coordination, requirement traceability |
| Solutions Architect | Anoop Gupta | Architecture, DB design, masking, deployment design (Vercel/Render) |
| Scrum Master | Devdarshan S | Sprint facilitation, impediment removal, Jira management |
| Tech Lead | Rohan Vashisht | Implementation, code quality, CI/CD, delivery of D-5/D-9 |

---

## 6. Client Responsibilities

The Client agrees to:

1. **Sign off** BRD (§23), SRS, and SOW in a timely manner (within 3 working days of receipt) to avoid slippage.
2. Provide **master data** during onboarding: products, suppliers, stores/warehouses, and initial stock counts.
3. Provide **free-tier accounts / access**: Vercel (frontend) and Render (backend) — or authorize the team to create them.
4. Appoint a **single point of contact (SPOC)** for clarifications.
5. Participate in **demo & UAT** and give timely feedback (within the sprint).
6. Provide the **final go-live approval** at UAT acceptance.
7. Not request out-of-scope work without an approved Change Request (§10).

**Effect of non-performance:** delays in client responsibilities extend the timeline pro-rata (no cost change).

---

## 7. Acceptance & Approval Process

1. **UAT:** Client tests against SRS v1.0 acceptance criteria (Section 13) using the live free-tier app.
2. **Defects:** any breach of an in-scope specification is fixed by the team at no cost.
3. **Acceptance:** on meeting all AC-1…AC-14, client signs the **Acceptance Form** (included in UAT Report).
4. **Deferred items:** any pending non-blocking items listed in the UAT report are accepted as known limitations or tracked as Change Requests.

---

## 8. Payment / Commercial Terms

> **No monetary payment.** This is an academic capstone-style engagement delivered by the Vaultory team under the **Simulated Client (Prof)** arrangement.

- **Compensation:** not applicable (academic project).
- **Costs:** free tiers are used; if the client requests paid hosting/a guaranteed SLA during the project, that is a **Change Request** with cost pass-through approved by the client.
- **No guarantees:** the free tier is best-effort (sleep/cold-start). Phase-2 (GCP/AWS) paid hosting is a post-handover engagement.

---

## 9. Project Control, Communication & Reporting

- **Cadence:** weekly sprint reviews + daily standup (or agreed equivalent).
- **Communication channels:** email / project chat; a shared Jira board tracks all work.
- **Reports to client (weekly):** sprint progress, completed scope, open risks, next steps.
- **Escalation:** SM (Devdarshan S) resolves impediments; PM (Laxman Patel) owns client communication.
- **Change requests** are the only formal way to alter scope (§10).

---

## 10. Change Control

1. Any scope/requirement change is submitted as a **Change Request Form (CRF)** by the requester.
2. BA/PM assess impact: scope, schedule, cost, risk.
3. Present impact to the client; client **accepts or rejects** in writing.
4. If accepted: schedule into a future sprint; update SOW/SRS via controlled document versions.
5. **Defect vs Enhancement:** fixing an in-scope bug = free; any new behavior not specified in BRD/SRS = Change Request.

> Forms and process follow the BRD §21 Change Management section.

---

## 11. Assumptions & Dependencies

### 11.1 Assumptions
1. Client provides master data, opening stock, and safety-stock starting values.
2. **3 stores** scope; single currency; single language (English).
3. Sales are entered manually into the app (no POS).
4. Free-tier accounts on Vercel + Render are available (one project/service per account).
5. Internet connectivity for users.
6. All users have modern browsers.

### 11.2 Dependencies
- BRD/SRS sign-off.
- Master data and initial stock counts from client.
- Vercel/Render accounts.
- Timely UAT feedback.
- Stable free-tier database service.

---

## 12. Constraints & Assumptions

1. **Timeline:** 6 weekly sprints (fixed), starts at BRD sign-off.
2. **Technology:** React (frontend); Node.js or Python (backend); PostgreSQL; Vercel + Render free tier.
3. **Team:** 5 members as defined in §5.
4. **Scope:** strictly BRD §8 / SRS §4.
5. **Data protection:** masking per BRD §14 / SRS §7.

---

## 13. Limitations & Exclusions (Out of Scope)

Reproduced for clarity (full detail in BRD §9):
1. Native mobile apps (iOS/Android).
2. Customer-facing e-commerce / online store.
3. Online payments / gateways.
4. POS / barcode / hardware integration.
5. CRM / loyalty / promotions.
6. Accounting / bookkeeping / taxation / GST.
7. Customer invoicing / credit notes.
8. Supplier self-service portal.
9. Third-party ERP / e-procurement integration.
10. Loyalty & discount engine.
11. Multi-currency / multi-language.
12. IoT / RFID / shelf sensors.
13. Offline sync.
14. > 3 retail stores.
15. SMS/email customer notifications.
16. Courier / logistics tracking.
17. Voice / chatbot assistant.
18. Data migration from legacy systems.
19. External compliance certification.
20. Any AI beyond automated reorder + warehouse recommendation.
21. **Phase-2 production hosting (GCP/AWS)** — after handover, separate engagement.

---

## 14. Risk Management

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-1 | Client scope creep | High | High | Binding BRD/SRS/SOW; CR-only changes; reset expectations |
| R-2 | Late client sign-offs / data | Medium | High | SPOC, agreed response times, early checklists |
| R-3 | Free-tier outages/sleep | Medium | Medium | Communicated as best-effort; demo fallback plan; Phase-2 = CR |
| R-4 | AI forecast accuracy | Medium | Medium | Explainable, advisory-only AI with fallbacks |
| R-5 | Masking misconfiguration | Medium | High | SA review, mask tests (SRS §7.3) |
| R-6 | Team capacity (5 members) | Medium | Medium | MoSCoW priorities; time-boxed sprints |
| R-7 | Data loss | Low | High | Provider backups + scheduled exports |

Full risk register maintained by PM; reviewed weekly.

---

## 15. Sign-off

By signing, the Client acknowledges and agrees to the scope, deliverables, timeline, responsibilities, constraints, exclusions, and change-control process defined in this SOW.

| Role | Name | Signature | Date |
|---|---|---|---|
| Client / Sponsor | Prof | | |
| Project Manager | Laxman Patel | | |
| Business Analyst | Ved Naik | | |
| Solutions Architect | Anoop Gupta | | |
| Scrum Master | Devdarshan S | | |
| Tech Lead | Rohan Vashisht | | |

---

*End of SOW — Version 1.0 · Project: Vaultory · Team: Vaultory*