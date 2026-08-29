# Sprint Planner / Backlog (Jira-ready)

## Project: **Vaultory** — Small Business Inventory and Sales App (SBISA)

| **Document ID** | SPI-PLAN-VAULTORY-001 |
|---|---|
| **Version** | 2.1 |
| **Status** | Ready for Jira creation |
| **Prepared By** | Devdarshan S (Scrum Master) — Vaultory |
| **Date** | 29/08/2026 |
| **Base Documents** | BRD v3.4 · SRS v1.1 · SOW v1.2 |
| **Jira Tool** | Jira Software (Scrum board mode) |

---

## Revision History

| Version | Date | Author | Description of Change |
|---|---|---|---|
| 1.0 | 29/08/2026 | Devdarshan S (SM) | Initial sprint plan & backlog (6 × 1-week sprints) |
| 2.0 | 29/08/2026 | Devdarshan S (SM) | Compressed to **3 sprints** to meet Sept 30 submission; consolidated original S1+S2 → Sprint 1, S3+S4 → Sprint 2, S5+S6 → Sprint 3 |
| 2.1 | 29/08/2026 | Devdarshan S (SM) | Updated Sprint 1 stories for locked stack (React+Tailwind+shadcn/ui, Node.js backend, Supabase Postgres/Auth/Storage, Groq AI) per BRD v3.4 |

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

This document is the **single planning source** for creating the Vaultory Jira board and executing the project in **Scrum**. It defines:

- Epics, stories, tasks, and their sprint allocation.
- Sprint goals and **Must / Should / Could** priorities (MOSCOW).
- Ready/DoD, pointing, assignments, and ceremonies.

**Approach:** **3 sprints**, running **29 Aug → 30 Sep 2026** (submission deadline), delivering working software every sprint (SOW §4). Each sprint ends with a **working increment** demonstrable to the client.

> **Scope note:** This plan covers **BRD §8 / SRS §4** only. Everything in BRD §9 remains out of scope unless a Change Request is approved.

---

## 2. Jira Setup & Conventions

- **Project type:** Company-managed Scrum project **"VAULTORY"** key: `VAU`.
- **Issue types used:** Epic · Story · Task · Bug · Sub-task (optional).
- **Sprints:** 3 sprints, each ~1.5 weeks (named `Sprint 1 … 3`).
- **Board:** Scrum board; backlog first.
- **Workflow:** `To Do → In Progress → In Review → Done` (+ `Blocked`).
- **Labels:** `must`, `should`, `could`, `module:<name>`, `sprint:all`.
- **Fields:** Story points, Priority, Fix Version (Sprint 1–3), Epic Link, and requirement IDs (see §12).
- **Custom field:** `Requirement ID` (maps to BRD/SRS IDs for traceability).

---

## 3. Sprint Calendar

| Sprint | Dates | Theme | Goal |
|---|---|---|---|
| Sprint 1 | 29 Aug – 8 Sep | Foundation, Planning & Design | Project setup, BRD/SRS/SOW/Plan sign-off, DB schema + API design + auth foundation + core models |
| Sprint 2 | 9 Sep – 19 Sep | Core Build — Inventory, Sales & Procurement | Products, stock ops, sales + daily/qtr/yr reports, RBAC, safety stock + alerts, suppliers, manual POs, PO lifecycle |
| Sprint 3 | 20 Sep – 30 Sep | AI, Monitoring, Test & Handover | AI auto-ordering + warehouse AI, dashboards, value-adds, QA/UAT fixes, user guide, demo, acceptance, handover |

> Timeline ends **30 Sep 2026** (submission). **Sprint 1 ≈ 11 calendar days; Sprint 2 ≈ 11 calendar days; Sprint 3 ≈ 11 calendar days.**

**Exit criteria per sprint** are defined in the sprint section (all Must items Done + DoD met).

---

## 4. Epics

| Epic Key | Epic | Covers (Stories) | Sprint(s) |
|---|---|---|---|
| `VAU-E-01` | Project Setup & DevOps | S1 (setup, deploy skeleton, CI) | 1 |
| `VAU-E-02` | Documentation & Planning | S1 (BRD/SRS/SOW/Plan docs) | 1 |
| `VAU-E-03` | Data & Architecture | S1 (schema, API, masking design) | 1 |
| `VAU-E-04` | Inventory Management | S2 (products, locations, stock ops) | 2 |
| `VAU-E-05` | Sales Management & Reports | S2 (sales + reports) | 2 |
| `VAU-E-06` | Safety Stock & Alerts | S2 | 2 |
| `VAU-E-07` | Supplier & Procurement (PO) | S2 | 2 |
| `VAU-E-08` | AI Engine (Ordering + Warehouse) | S3 | 3 |
| `VAU-E-09` | Monitoring, Dashboards & RBAC | S2–S3 (RBAC base in S2; dashboards S3) | 2,3 |
| `VAU-E-10` | Value-Add Modules | S3 (bulk import/export, audit viewer, onboarding, categories, fast/slow movers, supplier perf) | 3 |
| `VAU-E-11` | Quality, UAT & Handover | S3 | 3 |

---

## 5. Backlog (Stories & Tasks) by Sprint

> Format: `ID | Type | Story/Task | Priority | Points | Owner | Requirement ID`
> Points use Fibonacci (1,2,3,5,8,13). **Must** items are the committed sprint scope.

### SPRINT 1 — Foundation, Planning & Design (Goal: specs signed + repo skeleton + DB/auth foundation)

> Combines original Sprint 1 (Foundation & Planning) and Sprint 2 (Design & Spec).

| ID | Type | Item | Pri | Pts | Owner | Req ID |
|---|---|---|---|---|---|---|
| VAU-001 | Task | Set up monorepo (frontend/backend), git, branch strategy, linting | Must | 3 | Tech Lead | — |
| VAU-002 | Task | Scaffold React (TS) app + Tailwind + shadcn/ui + routing | Must | 3 | Tech Lead | — |
| VAU-003 | Task | Scaffold Node.js backend (Express/NestJS) + health endpoint | Must | 3 | Tech Lead | — |
| VAU-004 | Task | Provision Supabase (PostgreSQL/Auth/Storage) + connect backend | Must | 3 | SA | — |
| VAU-005 | Task | Deploy skeleton to Vercel + Render (+ Supabase/Groq config, live) | Must | 3 | SA | BRD §8.5 |
| VAU-006 | Task | CI on push (build + lint) | Should | 3 | Tech Lead | — |
| VAU-007 | Story | Finalize BRD v3.4 baseline with client (sign-off) | Must | 2 | BA | BRD |
| VAU-008 | Task | Create/seed Jira board, epics, labels | Must | 2 | SM | — |
| VAU-009 | Task | Weekly review + retrospective | Must | 1 | SM | — |

**Sprint 1 exit:** repo + live skeleton URL; BRD, SRS, SOW & Plan signed; DB schema + API design + auth foundation coded.

### SPRINT 2 — Core Build: Inventory, Sales & Procurement (Goal: stock + sales + reports + RBAC + safety stock + PO lifecycle)

> Combines original Sprint 3 (Inventory & Sales Core) and Sprint 4 (Procurement & Safety Stock).

| ID | Type | Item | Pri | Pts | Owner | Req ID |
|---|---|---|---|---|---|---|
| VAU-019 | Story | Product master UI (grid, create/edit, archive, search) | Must | 5 | Tech Lead | FR-INV-01 |
| VAU-020 | Story | Stock-on-hand view per location with status badges | Must | 5 | Tech Lead | FR-INV-03 |
| VAU-021 | Story | Stock-In / Stock-Out / Transfer / Adjust (API + UI) | Must | 8 | Tech Lead | FR-INV-04..07 |
| VAU-022 | Story | Stock status logic (LOW/OUT/IN/OVER) + no-negative guard | Must | 5 | Tech Lead | FR-INV-03, 08 |
| VAU-023 | Story | Record Sale (API + UI) with stock deduction & validation | Must | 8 | Tech Lead | FR-SAL-01 |
| VAU-024 | Story | Sales reports: Daily / Quarterly / Yearly (filters, sort, export CSV/PDF) | Must | 8 | Tech Lead | FR-SAL-02 |
| VAU-025 | Story | Store-wise performance dashboard (sales personnel) | Should | 5 | Tech Lead | FR-SAL-03 |
| VAU-026 | Story | RBAC enforcement on all routes/menus (server-side) | Must | 5 | Tech Lead | FR-USER-02 |
| VAU-027 | Story | Safety stock & reorder config (per product/location + validation) | Must | 5 | Tech Lead | FR-SST-01 |
| VAU-028 | Story | Low-stock detection + alerts center (role-scoped) | Must | 5 | Tech Lead | FR-SST-02, FR-INV-08 |
| VAU-029 | Story | Supplier master + product mapping (API + UI) | Must | 5 | Tech Lead | FR-PRO-01 |
| VAU-030 | Story | Manual PO creation & PO list/detail | Must | 5 | Tech Lead | FR-PRO-02 |
| VAU-031 | Story | PO lifecycle states + transitions + audit | Must | 5 | Tech Lead | FR-PRO-04 |
| VAU-032 | Story | PO receipt / goods-in (partial & full) updating stock | Must | 5 | Tech Lead | FR-PRO-05 |
| VAU-033 | Story | Duplicate-open-PO prevention | Should | 3 | Tech Lead | FR-PRO-06 |
| VAU-034 | Story | Supplier performance & lead-time tracking (value-add) | Could | 5 | Tech Lead | FR-SUP |

**Sprint 2 exit:** client can log in, manage stock, record sale, view day/qtr/yr reports; safety stock advisories + full manual PO flow with goods-in.

### SPRINT 3 — AI, Monitoring, Test & Handover (Goal: AI live + dashboards + accepted, live product)

> Combines original Sprint 5 (AI & Monitoring) and Sprint 6 (Test, UAT & Handover).

| ID | Type | Item | Pri | Pts | Owner | Req ID |
|---|---|---|---|---|---|---|
| VAU-035 | Story | AI automated ordering at reorder point (auto-PO, qty logic, edge cases) | Must | 8 | SA/Lead | FR-AI-01, SRS §8.1 |
| VAU-036 | Story | AI warehouse stock-level recommendations (rationale, accept/modify/reject) | Must | 8 | SA/Lead | FR-AI-02, SRS §8.2 |
| VAU-037 | Story | Demand forecasting (SMA/ES) + insufficient-data fallback | Should | 5 | SA | FR-AI-03 |
| VAU-038 | Story | Executive monitoring dashboard (inventory health + sales, drill-down) | Must | 5 | Tech Lead | FR-MON-02 |
| VAU-039 | Story | KPI widgets (stock value, turnover, low/out counts, today's sales) | Should | 5 | Tech Lead | FR-DSH |
| VAU-040 | Story | Fast/slow mover classification (must thresholds configurable) | Could | 5 | Tech Lead | FR-FSM |
| VAU-041 | Story | Bulk CSV import/export with validation & error report | Should | 8 | Tech Lead | FR-BULK |
| VAU-042 | Story | Audit log viewer (Admin) — append-only, masked | Must | 3 | Tech Lead | FR-AUD |
| VAU-043 | Story | Onboarding wizard (6-step, resumable) | Could | 5 | Tech Lead | FR-ONB |
| VAU-044 | Story | Alert preferences (in-app + optional email) | Could | 3 | Tech Lead | FR-ALR |
| VAU-045 | Story | Categories & units config + grouping in reports | Should | 3 | Tech Lead | FR-CAT |
| VAU-046 | Task | Full test pass: AC-1…AC-14 (SRS §13) | Must | 8 | All | SRS §13 |
| VAU-047 | Task | Fix defects from internal tests | Must | (var) | Tech Lead | — |
| VAU-048 | Task | Client demo + UAT session(s) | Must | 3 | BA/SM | — |
| VAU-049 | Task | UAT defects fixed (in-scope only; rest = CR) | Must | (var) | Tech Lead | — |
| VAU-050 | Story | User Guide (roles, key tasks) | Must | 3 | BA | — |
| VAU-051 | Task | Acceptance form signed (AC-1…14) | Must | 2 | PM | SOW §7 |
| VAU-052 | Task | Handover: source, deployment access/instructions, credentials | Must | 3 | SA/TL | SOW D-9 |
| VAU-053 | Task | Final report + retrospective | Should | 2 | SM | — |

**Sprint 3 exit:** Signed acceptance; AI features + dashboards live; app live on Vercel + Render + Supabase; handover complete.

---

## 6. Sprint Goals & Scope (Must / Should / Could)

- **Must (committed):** In-scope requirements required for a usable increment each sprint (marked **Must** above). If a Must slips, the sprint is not Done.
- **Should:** Important value, delivered if capacity allows (not committed).
- **Could:** Delivered if all Musts/shoulds are ahead (e.g., FR-EXP perishable, FR-ALR email, FR-FSM, FR-ONB).
- **Won't (deferred):** Items reserved for future (BRD §22: mobile, ecommerce, etc.).

> Review at every sprint planning: priority changes require PM/BA + client awareness; adding scope requires a Change Request.

---

## 7. Definition of Ready (DoR)

A story is **Ready** for a sprint when:
1. Clear, testable description + acceptance criteria.
2. Traced to BRD/SRS requirement ID.
3. Dependencies identified (API/DB/UI).
4. Estimated (relative points) by the team.
5. "How to demo" defined.

---

## 8. Definition of Done (DoD)

A story is **Done** when:
1. Code merged to main via PR.
2. Meets acceptance criteria / tests pass (backend + frontend).
3. UI verified on the live (Vercel/Render + Supabase) environment.
4. RBAC + masking verified for the affected data.
5. No P0/P1 defects open for the story.
6. Audit/reporting impact considered and tested.
7. Updated documentation (if affected).

---

## 9. Story Pointing & Velocity

- Points: Fibonacci (1,2,3,5,8,13). Target velocity: **~50–55 points/sprint** (5 members × ~1.5-week sprints).
- Capacity: 5 members × ~1.5 weeks ≈ 9–11 focused story points/person per sprint, allowing for documentation + UAT + fixes.
- **Sprint 1 ≈ 40 pts (must+should); Sprint 2 ≈ 53 pts; Sprint 3 ≈ 55 pts (incl. Must + Should/Could).** Baseline is re-adjusted from Sprint 1 actuals.
- Velocity is re-baselined after Sprint 1 from actuals.

> If velocity < plan, **Should/Could** items are the first trimmed (never Musts). Total ≈ 148 pts across 3 sprints (~49/sprint).

---

## 10. Team Capacity & Assignments

| Member | Avg pts/sprint | Primary focus areas |
|---|---|---|
| Rohan Vashisht (Tech Lead) | 12 | Core coding, code review, QA collab |
| Anoop Gupta (SA) | 11 | Architecture, DB, AI, deploy, masking |
| Ved Naik (BA) | 9 | Docs, UAT mapping, requirement clarity, acceptance |
| Devdarshan S (SM) | 9 | Jira, ceremonies, impediments, sprint reports |
| Laxman Patel (PM) | 9 | Client comms, CRs, risk, acceptance |
| **Team velocity** | **≈ 50–55** | — |

---

## 11. Ceremonies & Rituals

| Ceremony | When | Duration | Attendees |
|---|---|---|---|
| Sprint Planning | Start of sprint | 60 min | Whole team |
| Daily Standup | Daily | 15 min | Whole team (async allowed) |
| Sprint Review / Demo | End of sprint | 45 min | Team + Client |
| Retrospective | End of sprint | 30 min | Whole team |
| Backlog Refinement | Mid-sprint | 30 min | PM/BA/SM/TL |
| Client Sync / Update | Weekly (after review) | 15 min | PM + Client |

---

## 12. Jira Fields / CustomFields per Ticket

| Field | Value |
|---|---|
| Summary | Concise action item |
| Issue Type | Epic / Story / Task / Bug |
| Epic Link | VAU-E-xx |
| Priority | Highest / High / Medium / Low |
| Story Points | 1–13 |
| Labels | `must`/`should`/`could`, `module:inventory`, etc. |
| Requirement ID | e.g., `FR-INV-03, FR-SAL-02` (BRD) or `SRS §4.1.3` |
| Fix Version / Sprint | Sprint 1–3 |
| Acceptance Criteria | Written in the ticket |
| Definition of Done | Checklist applied (DoD §8) |

---

## 13. Traceability (Story → BRD/SRS ID)

| Sprint | Stories | Primary BRD/SRS refs |
|---|---|---|
| S1 | VAU-001..018 | BRD §8.5, §23; SRS §6, §8; BRD §14, FR-USER |
| S2 | VAU-019..034 | FR-INV-01..08, FR-SAL-01..03, FR-USER-02, FR-SST, FR-PRO, FR-SUP |
| S3 | VAU-035..053 | FR-AI, FR-MON, FR-DSH, FR-FSM, FR-BULK, FR-AUD, FR-ONB, FR-ALR, FR-CAT, SRS §13 (AC-1…14), SOW §7 |

---

## 14. Risks & Assumptions

- **Velocity/re-scoping:** Should/Could items may be deferred; Musts are protected.
- **Free-tier limits:** 1 Vercel project + 1 Render service + Supabase (Postgres/Auth/Storage) + Groq credits; sleep/cold-start acceptable (BRD §8.5).
- **Client availability:** sign-offs & UAT within cadence assumed; delays extend timeline pro-rata (SOW §6).
- **AI data:** insufficient history handled via fallbacks (SRS §8).
- **Change Control:** all scope changes go through CR process (BRD §21 / SOW §10).

---

## Approval Sign-off

| Role | Name | Signature | Date |
|---|---|---|---|
| Client / Sponsor | Prof | | |
| Project Manager | Laxman Patel | | |
| Business Analyst | Ved Naik | | |
| Solutions Architect | Anoop Gupta | | |
| Scrum Master | Devdarshan S | | |
| Tech Lead | Rohan Vashisht | | |

---

*End of Sprint Planner — Version 2.1 · Project: Vaultory · Team: Vaultory*