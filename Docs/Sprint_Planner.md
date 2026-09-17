# Sprint Planner / Backlog (Jira-ready)

## Project: **Vaultory** — Small Business Inventory and Sales App (SBISA)

| **Document ID** | SPI-PLAN-VAULTORY-001 |
| ---------------- | --------------------- |
| **Version** | 3.0 |
| **Status** | Ready for Jira / Professor Review |
| **Prepared By** | Devdarshan S (Scrum Master) — Vaultory |
| **Date** | 16/09/2026 |
| **Base Documents** | BRD v3.4 · SRS v1.1 · SOW v1.2 |
| **Jira Tool** | Jira Software (Scrum board mode) |

---

## Revision History

| Version | Date | Author | Description of Change |
| ------- | ---------- | ----------------- | --------------------- |
| 1.0 | 29/08/2026 | Devdarshan S (SM) | Initial sprint plan & backlog (6 × 1-week sprints) |
| 2.0 | 29/08/2026 | Devdarshan S (SM) | Compressed to **3 sprints** to meet Sept 30 submission; consolidated original S1+S2 → Sprint 1, S3+S4 → Sprint 2, S5+S6 → Sprint 3 |
| 2.1 | 29/08/2026 | Devdarshan S (SM) | Updated Sprint 1 stories for locked stack (React+Tailwind+shadcn/ui, Node.js backend, Supabase Postgres/Auth/Storage, Groq AI) per BRD v3.4 |
| 2.2 | 29/08/2026 | Anoop Gupta (SA) | Filled Sprint 1 foundation tickets; added Sprint 2 authentication, user administration, void/returns; expanded Sprint 3 scope; updated story-point totals, terminology, and epic buckets |
| 3.0 | 16/09/2026 | Devdarshan S (SM) | Reconciled the planner with the current Jira task set; removed numbering gaps; renumbered planner items sequentially from VAU-001; consolidated subtasks into task descriptions |

---

## Approvals

| Role / Designation | Name | Signature | Date |
| ------------------- | -------------- | --------- | ---- |
| Client / Sponsor | Prof | | |
| Project Manager | Laxman Patel | | |
| Business Analyst | Ved Naik | | |
| Solutions Architect | Anoop Gupta | | |
| Scrum Master | Devdarshan S | | |
| Tech Lead | Rohan Vashisht | | |

---

## Table of Contents

1. [Purpose & Approach](#1-purpose--approach)
2. [Jira Setup & Conventions](#2-jira-setup--conventions)
3. [Sprint Calendar](#3-sprint-calendar)
4. [Epics](#4-epics)
5. [Backlog (Stories & Tasks) by Sprint](#5-backlog-stories--tasks-by-sprint)
6. [Sprint Goals & Scope (Must / Should / Could)](#6-sprint-goals--scope-must--should--could)
7. [Definition of Ready (DoR)](#7-definition-of-ready-dor)
8. [Definition of Done (DoD)](#8-definition-of-done-dod)
9. [Story Pointing & Velocity](#9-story-pointing--velocity)
10. [Team Capacity & Assignments](#10-team-capacity--assignments)
11. [Ceremonies & Rituals](#11-ceremonies--rituals)
12. [Jira Fields / CustomFields per Ticket](#12-jira-fields--customfields-per-ticket)
13. [Traceability (Story → BRD/SRS ID)](#13-traceability-story--brdsrs-id)
14. [Risks & Assumptions](#14-risks--assumptions)

---

## 1. Purpose & Approach

This document defines the sprint plan and backlog for the Vaultory project.

It captures:

- Epics, stories, tasks, and their sprint allocation.
- Sprint goals and **Must / Should / Could** priorities.
- Ready/DoD, story pointing, assignments, and ceremonies.
- Task descriptions, requirement references, and expected sprint outcomes.

**Approach:** **3 sprints**, running **29 Aug → 30 Sep 2026** to meet the submission deadline, delivering working software every sprint. Each sprint ends with a **working increment** demonstrable to the client.

> **Scope note:** This plan covers the approved BRD/SRS scope. Any functionality outside the approved scope requires a Change Request before inclusion.

> **Numbering note:** The IDs in this planner are sequential documentation IDs beginning at VAU-001. They are used to maintain a clean and continuous planner structure. Historical Jira issue-key gaps are not reproduced in this document.

---

## 2. Jira Setup & Conventions

- **Project type:** Company-managed Scrum project **"VAULTORY"**, key: `VAU`.
- **Issue types used:** Epic · Story · Task · Bug · Sub-task.
- **Sprints:** 3 sprints, each approximately 1.5 weeks, named `Sprint 1`, `Sprint 2`, and `Sprint 3`.
- **Board:** Scrum board; backlog first.
- **Workflow:** `To Do → In Progress → In Review → Done` (+ `Blocked`).
- **Labels:** `must`, `should`, `could`, `module:<name>`, `sprint:all`.
- **Fields:** Story points, Priority, Fix Version, Epic Link, Sprint, and requirement IDs.
- **Custom field:** `Requirement ID`, mapping tasks to BRD/SRS IDs for traceability.
- **Task numbering:** Planner IDs are sequential and independent of historical Jira issue-key numbering.
- **Subtasks:** Subtasks may be maintained in Jira under their parent story. In this planner, their implementation activities are represented within the parent task description unless a separate task is necessary.

---

## 3. Sprint Calendar

| Sprint | Dates | Theme | Goal |
| -------- | ---------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sprint 1 | 29 Aug – 8 Sep | Foundation, Planning & Design | Project setup, BRD/SRS/SOW/Plan sign-off, DB schema, API design, authentication foundation, RBAC, masking, and core models |
| Sprint 2 | 9 Sep – 19 Sep | Core Build — Inventory, Sales & Procurement | Products, stock operations, sales, reports, safety stock, alerts, suppliers, purchase orders, authentication flow, user administration, and void/returns |
| Sprint 3 | 20 Sep – 30 Sep | AI, Monitoring, Test & Handover | AI auto-ordering, warehouse AI, dashboards, value-adds, QA/UAT fixes, user guide, demo, acceptance, handover, and final report |

> Timeline ends **30 Sep 2026** for submission. **Sprint 1, Sprint 2, and Sprint 3 are each approximately 11 calendar days.**

**Exit criteria per sprint:** All Must items are Done, the Definition of Done is met, and the completed increment is demonstrable.

---

## 4. Epics

> Backlog is organized as **full-stack module stories** where possible. One ticket represents one complete feature module, including backend, database, frontend, and testing activities. Where a module is genuinely parallelizable, backend and frontend work may be handled through Jira subtasks.

| Epic Key | Epic | Covers | Sprint(s) |
| ------------ | -------------------------------- | ------------------------------------------------------------ | --------- |
| `VAU-E-01` | Foundations & DevOps | S1: repository, CI/CD, deployment, Supabase, schema, and API contract | 1 |
| `VAU-E-02` | Documentation & Planning | S1: BRD, SRS, SOW, sprint planner, and project documentation | 1 |
| `VAU-E-03` | Security & Access | S1–S2: RBAC, masking, authentication, and user administration | 1, 2 |
| `VAU-E-04` | Inventory, Products & Categories | S2: products, categories, units, stock, and inventory operations | 2 |
| `VAU-E-05` | Sales & Reports | S2: sales, returns, voids, reporting, and sales analysis | 2 |
| `VAU-E-06` | Safety Stock, Alerts & Suppliers | S2: safety stock, reorder points, alerts, and supplier management | 2 |
| `VAU-E-07` | Purchase Orders / Procurement | S2: manual purchase orders, receiving, and purchase-order lifecycle | 2 |
| `VAU-E-08` | AI Engine | S3: AI ordering and warehouse recommendations | 3 |
| `VAU-E-09` | Monitoring & Dashboards | S3: dashboard, KPIs, monitoring, and drill-down views | 3 |
| `VAU-E-10` | Value-Add Modules | S3: fast/slow movers, bulk import/export, onboarding, audit logs, and preferences | 3 |
| `VAU-E-11` | Quality, UAT & Handover | S3: testing, defect fixing, UAT, user guide, acceptance, and handover | 3 |

---

## 5. Backlog (Full-Stack Module Stories) by Sprint

> **Format:** `ID | Type | Item | Description | Pri | Pts | Req ID`

> Each story represents a finished feature module or project deliverable. Backend, database, frontend, validation, testing, and documentation activities may be represented as subtasks under the parent item where required. Points use the Fibonacci scale: `1, 2, 3, 5, 8, 13`.

### SPRINT 1 — Foundations & Architecture

**Goal:** Development-ready foundation, architecture, and live project skeleton.

| ID | Type | Item | Description | Pri | Pts | Req ID |
| ------- | ----- | ------------------------ | -------------------------------------------------------------------------------------------------------- | ------ | --- | --------------------- |
| VAU-001 | Task | Monorepo | Git repository, branch strategy, project structure, linting, and initial codebase setup. | Must | 3 | — |
| VAU-002 | Task | Frontend scaffold | React + TypeScript + Tailwind + shadcn/ui setup, routing, shared layout, and base components. | Must | 3 | — |
| VAU-003 | Task | Backend scaffold | Express + TypeScript backend setup, environment configuration, base structure, and health endpoint. | Must | 3 | — |
| VAU-004 | Task | Supabase setup | Provision Supabase and connect the backend to Postgres, Auth, and Storage where required. | Must | 3 | BRD §2.3 |
| VAU-005 | Task | Deploy skeleton | Deploy the initial application skeleton using Vercel, Render, Supabase, and Groq configuration. | Must | 3 | BRD §8.5 |
| VAU-006 | Task | CI/CD | Configure continuous integration for linting and builds, together with deployment and migration workflows. | Should | 5 | — |
| VAU-007 | Story | BRD finalize | Finalize the BRD baseline with client review and sign-off. | Must | 2 | BRD |
| VAU-008 | Task | Jira setup | Configure Jira project, board, epics, labels, issue types, and sprint structure. | Must | 2 | — |
| VAU-009 | Task | Ceremonies | Establish sprint planning, daily stand-up, sprint review, and retrospective routines. | Must | 1 | — |
| VAU-010 | Story | Database schema | Create the full ERD, migrations, constraints, indexes, RLS policies, and generated TypeScript types. | Must | 13 | BRD §14, SRS §6 |
| VAU-011 | Story | API contract | Prepare the endpoint catalogue and shared request/response types for all application modules. | Must | 8 | BRD §14 |
| VAU-012 | Story | Migrations & seed | Prepare SQL migrations and seed data, including stores, products, stock, and test users. | Must | 5 | FR-INV-02 |
| VAU-013 | Story | Security base | Implement RBAC middleware, role claims, masking utilities, and audit helpers. | Must | 8 | FR-USER-02, FR-SEC-03 |
| VAU-014 | Story | Frontend foundations | Implement the API client, query hooks, authentication store, route guards, and shared UI components. | Must | 8 | — |

**Sprint 1 exit:** Development-ready foundation with schema, API contract, security base, frontend foundations, and live skeleton available.

---

### SPRINT 2 — Core Full-Stack Modules

**Goal:** Every core business module is usable end-to-end.

| ID | Type | Item | Description | Pri | Pts | Req ID |
| ------- | ----- | --------------------- | -------------------------------------------------------------------------------------------------------------- | ------ | --- | --------------------- |
| VAU-015 | Story | Auth module | Implement signup, signin, email OTP, forgot password, reset password, logout, session persistence, and route guards. Frontend screens, backend APIs, validation, and session handling may be represented as subtasks. | Must | 13 | FR-USER-01, SRS T-AC10 |
| VAU-016 | Story | User admin module | Implement user creation, editing, deactivation, role assignment, store assignment, and user search. | Must | 8 | FR-USER-03 |
| VAU-017 | Story | Products & categories | Implement product creation, viewing, editing, archiving, searching, category management, unit configuration, and product grouping. | Must | 13 | FR-INV-01, FR-CAT |
| VAU-018 | Story | Inventory & stock | Implement stock-on-hand per store, stock-in, stock-out, stock transfers, stock adjustments, status badges, movement history, and prevention of invalid negative stock. | Must | 13 | FR-INV-03..08 |
| VAU-019 | Story | Sales module | Implement sale recording, stock deduction, sale history, void operations, returns, and relevant audit records. | Must | 13 | FR-SAL-01, FR-SAL-04 |
| VAU-020 | Story | Reports module | Implement daily, quarterly, and yearly sales reports, store-performance reporting, filtering, and CSV/PDF export. | Must | 13 | FR-SAL-02, FR-SAL-03, FR-MON-01 |
| VAU-021 | Story | Safety stock & alerts | Implement safety-stock configuration, reorder points, low-stock and out-of-stock detection, alerts centre, and alert preferences. | Should | 8 | FR-SST-01, FR-SST-02, FR-ALR-01 |
| VAU-022 | Story | Suppliers module | Implement supplier creation, editing, viewing, deletion or archival, product mapping, lead-time information, and supplier performance tracking. | Should | 8 | FR-PRO-01, FR-SUP-01..04 |
| VAU-023 | Story | Purchase order module | Implement manual purchase orders, automatic purchase-order triggers, lifecycle management, goods-in processing, partial receiving, order closure, and duplicate-order prevention. | Must | 13 | FR-PRO-02..06 |
| VAU-024 | Story | RBAC enforcement | Apply the role and permission matrix across routes, APIs, menus, and protected actions. Ensure users can only access functions permitted by their role and store. | Should | 5 | FR-USER-02 |

**Sprint 2 exit:** The client can log in, manage products and stock, record sales, view daily/quarterly/yearly reports, manage suppliers, run purchase orders with goods-in, and use safety-stock advisories.

---

### SPRINT 3 — AI, Dashboards, Value-Adds, Test & Handover

**Goal:** AI functionality, monitoring, quality assurance, client acceptance, and handover are completed.

| ID | Type | Item | Description | Pri | Pts | Req ID |
| ------- | ----- | -------------------- | -------------------------------------------------------------------------------------------------------------------- | ------ | ----- | -------------------------------- |
| VAU-025 | Story | AI auto-order | Implement demand forecasting and AI-assisted purchase-order generation when stock reaches or falls below the reorder level. Include accept, modify, reject, and fallback workflows. | Must | 13 | FR-AI-01, FR-AI-03, SRS §8.1 |
| VAU-026 | Story | AI warehouse recs | Implement AI-based warehouse reorder-target recommendations with rationale, accept/modify/reject actions, and audit tracking. | Must | 13 | FR-AI-02, SRS §8.2 |
| VAU-027 | Story | Dashboard module | Implement executive monitoring and KPI widgets covering inventory health, stock value, stock turnover, current sales, and drill-down information. | Must | 8 | FR-MON-02, FR-DSH |
| VAU-028 | Story | Value-add modules | Implement selected additional modules such as fast/slow movers, bulk CSV import/export, audit-log viewing, onboarding wizard, alert preferences, and category grouping. | Could | 13 | FR-FSM, FR-BULK, FR-AUD, FR-ONB, FR-ALR, FR-CAT |
| VAU-029 | Task | Full test pass | Execute the complete functional test suite based on the acceptance and test criteria, including T-AC1 to T-AC14. Record test results and identify defects. | Must | 8 | SRS §13 |
| VAU-030 | Task | Fix internal defects | Resolve defects identified during internal testing, perform regression testing, and update defect records. | Must | (var) | — |
| VAU-031 | Task | Client demo + UAT | Conduct the client demonstration and user-acceptance testing sessions. Record feedback, issues, approval conditions, and requested changes. | Must | 3 | — |
| VAU-032 | Task | Fix UAT defects | Resolve valid in-scope defects reported during UAT. Out-of-scope feature requests are recorded separately as Change Requests. | Must | (var) | — |
| VAU-033 | Story | User Guide | Prepare the user guide covering roles, login, products, inventory, sales, reports, purchase orders, alerts, and AI functionality. | Must | 3 | — |
| VAU-034 | Task | Acceptance sign-off | Obtain formal client acceptance based on the agreed acceptance criteria and completed UAT activities. | Must | 2 | SOW §7 |
| VAU-035 | Task | Handover | Complete project handover, including source code, deployment information, environment instructions, access details, operational instructions, and relevant documentation. | Must | 3 | SOW D-9 |
| VAU-036 | Task | Final report | Prepare the final project report, summarize completed work, document lessons learned, and conduct the final retrospective. | Should | 2 | — |

**Sprint 3 exit:** Signed acceptance, AI features and dashboards available, application deployed, handover completed, and final documentation submitted.

---

## 6. Sprint Goals & Scope (Must / Should / Could)

- **Must:** In-scope requirements required for a usable increment each sprint. Must items represent committed scope.
- **Should:** Important features that should be delivered if capacity allows. These may be deferred if Must items require additional effort.
- **Could:** Optional improvements that may be delivered after Must and Should work is stable.
- **Won't / Deferred:** Features outside the approved scope or reserved for future releases.

> Review priorities at every sprint planning session. Priority changes require PM/BA and client awareness. Adding new scope requires a Change Request.

---

## 7. Definition of Ready (DoR)

A story is **Ready** for a sprint when:

1. It has a clear and testable description.
2. Acceptance criteria are defined.
3. It is traced to a BRD/SRS requirement where applicable.
4. Dependencies are identified.
5. It has been estimated using relative story points.
6. The expected demonstration outcome is defined.
7. Required designs, data, and access are available.

---

## 8. Definition of Done (DoD)

A story is **Done** when:

1. Code is implemented and merged through the agreed review process.
2. Acceptance criteria are satisfied.
3. Backend and frontend functionality is integrated and tested.
4. The UI is verified in the agreed deployment environment where applicable.
5. RBAC, masking, and data protection are verified for affected functionality.
6. No unresolved critical defects remain.
7. Audit and reporting impacts have been considered.
8. Relevant documentation has been updated.
9. The feature is demonstrable.
10. The corresponding Jira issue is moved to Done.

---

## 9. Story Pointing & Velocity

- Points use the Fibonacci scale: `1, 2, 3, 5, 8, 13`.
- Story points represent relative effort, complexity, uncertainty, integration, and testing requirements.
- Target velocity is approximately **50–55 points per sprint**, subject to actual team capacity.
- Sprint commitment should be finalized during Sprint Planning based on actual progress and available capacity.

### Booked Points

| Sprint | Estimated Points | Notes |
| ------- | ---------------- | ----- |
| Sprint 1 | Approximately 62 points | Includes foundation, architecture, security, and frontend setup |
| Sprint 2 | Approximately 107 points | Includes core modules; Must, Should, and variable work are tracked separately |
| Sprint 3 | Approximately 66 fixed points | Excludes variable internal and UAT defect-fix effort |
| **Total** | **Approximately 235 fixed points** | Excludes variable defect-fix effort |

> Booked totals may exceed target velocity because the backlog represents the complete planned scope. Should and Could items may be deferred based on actual velocity, dependencies, testing, and sprint capacity.

---

## 10. Team Capacity & Assignments

| Member | Role | Primary Focus Areas |
| -------------------------- | ------------------- | -------------------------------------------------- |
| Rohan Vashisht | Tech Lead | Core coding, code review, integration, and QA collaboration |
| Anoop Gupta | Solutions Architect | Architecture, database, AI, deployment, and security design |
| Ved Naik | Business Analyst | Documentation, UAT mapping, requirement clarity, and acceptance |
| Devdarshan S | Scrum Master | Jira, ceremonies, impediment tracking, and sprint reporting |
| Laxman Patel | Project Manager | Client communication, change requests, risk, and acceptance |

### Assignment Notes

Tasks may be divided into implementation subtasks according to the team's needs. Typical subtasks may include:

- Requirement analysis
- UI design
- Backend API implementation
- Database implementation
- Frontend implementation
- Integration
- Testing
- Documentation
- Review and validation

Subtasks remain associated with their parent story and do not require separate top-level planner IDs unless independently managed.

---

## 11. Ceremonies & Rituals

| Ceremony | When | Duration | Attendees |
| -------------------- | --------------------- | -------- | -------------------------- |
| Sprint Planning | Start of sprint | 60 min | Whole team |
| Daily Standup | Daily | 15 min | Whole team; async allowed |
| Sprint Review / Demo | End of sprint | 45 min | Team + Client |
| Retrospective | End of sprint | 30 min | Whole team |
| Backlog Refinement | Mid-sprint | 30 min | PM / BA / SM / TL |
| Client Sync / Update | Weekly | 15 min | PM + Client |

---

## 12. Jira Fields / CustomFields per Ticket

| Field | Value |
| -------------------- | --------------------------------------------------------- |
| Summary | Concise action or feature name |
| Issue Type | Epic / Story / Task / Bug / Sub-task |
| Epic Link | `VAU-E-xx` |
| Priority | Highest / High / Medium / Low |
| Story Points | Fibonacci estimate: 1–13 |
| Labels | `must` / `should` / `could`, module labels, sprint labels |
| Requirement ID | Example: `FR-INV-03`, `FR-SAL-02`, or `SRS §4.1.3` |
| Fix Version / Sprint | Sprint 1–3 |
| Acceptance Criteria | Conditions required for completion |
| Description | Scope, implementation notes, and relevant subtask details |
| Definition of Done | Checklist applied according to §8 |
| Assignee | Responsible team member |
| Status | To Do / In Progress / In Review / Done / Blocked |

---

## 13. Traceability (Story → BRD/SRS ID)

| Sprint | Planner Stories / Tasks | Primary BRD/SRS References |
| ------ | ------------ | --------------------------------------------------------------------------------------------------------- |
| S1 | VAU-001..014 | BRD §8.5, §14, §23; SRS §6, §7, §8; FR-USER-02, FR-SEC-03 |
| S2 | VAU-015..024 | FR-INV-01..08, FR-SAL-01..04, FR-USER-01..03, FR-SST, FR-PRO, FR-SUP |
| S3 | VAU-025..036 | FR-AI, FR-MON, FR-DSH, FR-FSM, FR-BULK, FR-AUD, FR-ONB, FR-ALR, FR-CAT, SRS §13, SOW §7 |

### Primary Requirement References

| Area | References |
| ----------------------------- | --------------------------------------------- |
| Authentication and Users | FR-USER-01, FR-USER-02, FR-USER-03 |
| Inventory | FR-INV-01 to FR-INV-08 |
| Sales | FR-SAL-01 to FR-SAL-04 |
| Safety Stock | FR-SST-01, FR-SST-02 |
| Suppliers | FR-SUP-01 to FR-SUP-04 |
| Procurement | FR-PRO-01 to FR-PRO-06 |
| Categories | FR-CAT |
| Alerts | FR-ALR-01 |
| AI | FR-AI-01 to FR-AI-03 |
| Monitoring and Dashboard | FR-MON-01, FR-MON-02, FR-DSH |
| Value-Added Features | FR-FSM, FR-BULK, FR-AUD, FR-ONB |
| Testing | SRS §13 |
| Acceptance and Handover | SOW §7, SOW D-9 |

---

## 14. Risks & Assumptions

- **Velocity / re-scoping:** Should and Could items may be deferred; Must items remain the committed scope.
- **Free-tier limits:** Vercel, Render, Supabase, and Groq usage limits may affect deployment, cold starts, AI requests, or demonstrations.
- **Client availability:** Client sign-offs, reviews, and UAT are assumed to occur within the planned cadence.
- **AI data:** Insufficient historical data may require fallback or rule-based recommendations.
- **Integration dependencies:** Frontend, backend, database, authentication, and AI modules must be integrated before final validation.
- **Defect uncertainty:** Internal and UAT defect-fix effort is variable and depends on the defects discovered.
- **Change Control:** All scope changes must go through the Change Request process.
- **Documentation:** User guides, final reports, and handover documents must be updated when implementation changes.
- **Out-of-scope requests:** Requests outside the approved requirements must be recorded separately and assessed before implementation.

---

## Approval Sign-off

| Role | Name | Signature | Date |
| ------------------- | -------------- | --------- | ---- |
| Client / Sponsor | Prof | | |
| Project Manager | Laxman Patel | | |
| Business Analyst | Ved Naik | | |
| Solutions Architect | Anoop Gupta | | |
| Scrum Master | Devdarshan S | | |
| Tech Lead | Rohan Vashisht | | |

---

*End of Sprint Planner — Version 3.0 · Project: Vaultory · Team: Vaultory*