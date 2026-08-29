# Sprint Planner / Backlog (Jira-ready)

## Project: **Vaultory** — Small Business Inventory and Sales App (SBISA)

| **Document ID** | SPI-PLAN-VAULTORY-001 |
|---|---|
| **Version** | 1.0 |
| **Status** | Ready for Jira creation |
| **Prepared By** | Devdarshan S (Scrum Master) — Vaultory |
| **Date** | 29/08/2026 |
| **Base Documents** | BRD v3.3 · SRS v1.0 · SOW v1.0 |
| **Jira Tool** | Jira Software (Scrum board mode) |

---

## Revision History

| Version | Date | Author | Description of Change |
|---|---|---|---|
| 1.0 | 29/08/2026 | Devdarshan S (SM) | Initial sprint plan & backlog |

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

**Approach:** 6 sprints × 1 week, delivering working software every sprint (SOW §4). Each sprint ends with a **working increment** demonstrable to the client.

> **Scope note:** This plan covers **BRD §8 / SRS §4** only. Everything in BRD §9 remains out of scope unless a Change Request is approved.

---

## 2. Jira Setup & Conventions

- **Project type:** Company-managed Scrum project **"VAULTORY"** key: `VAU`.
- **Issue types used:** Epic · Story · Task · Bug · Sub-task (optional).
- **Sprints:** 6 sprints, each 1 week (named `Sprint 1 … 6`).
- **Board:** Scrum board; backlog first.
- **Workflow:** `To Do → In Progress → In Review → Done` (+ `Blocked`).
- **Labels:** `must`, `should`, `could`, `module:<name>`, `sprint:all`.
- **Fields:** Story points, Priority, Fix Version (Sprint 1–6), Epic Link, and requirement IDs (see §12).
- **Custom field:** `Requirement ID` (maps to BRD/SRS IDs for traceability).

---

## 3. Sprint Calendar

| Sprint | Dates (indicator) | Theme | Goal |
|---|---|---|---|
| Sprint 1 | Week 1 | Foundation & Planning | Project setup + BRD baseline + working repo/deploy skeleton |
| Sprint 2 | Week 2 | Design & Spec | SRS/SOW/Plan approved; DB schema + API design + mockups |
| Sprint 3 | Week 3 | Inventory & Sales Core | Products, stock ops, sales + daily/qtr/yr reports, RBAC base |
| Sprint 4 | Week 4 | Procurement & Safety Stock | Safety stock + alerts, suppliers, POs, PO lifecycle |
| Sprint 5 | Week 5 | AI & Monitoring | Auto-ordering, warehouse AI, dashboards, value-adds |
| Sprint 6 | Week 6 | Test, UAT & Handover | QA/UAT fixes, user guide, demo, acceptance, handover |

**Exit criteria per sprint** are defined in the sprint section (all Must items Done + DoD met).

---

## 4. Epics

| Epic Key | Epic | Covers (Stories) | Sprint(s) |
|---|---|---|---|
| `VAU-E-01` | Project Setup & DevOps | S1 (setup, deploy skeleton, CI) | 1 |
| `VAU-E-02` | Documentation & Planning | S1–S2 (BRD/SRS/SOW/Plan docs) | 1–2 |
| `VAU-E-03` | Data & Architecture | S2 (schema, API, masking design) | 2 |
| `VAU-E-04` | Inventory Management | S3 (products, locations, stock ops) | 3 |
| `VAU-E-05` | Sales Management & Reports | S3 (sales + reports) | 3 |
| `VAU-E-06` | Safety Stock & Alerts | S4 | 4 |
| `VAU-E-07` | Supplier & Procurement (PO) | S4 | 4 |
| `VAU-E-08` | AI Engine (Ordering + Warehouse) | S5 | 5 |
| `VAU-E-09` | Monitoring, Dashboards & RBAC | S3–S5 (RBAC base in S3; dashboards S5) | 3,5 |
| `VAU-E-10` | Value-Add Modules | S5 (bulk import/export, audit viewer, onboarding, categories, fast/slow movers, supplier perf) | 5 |
| `VAU-E-11` | Quality, UAT & Handover | S6 | 6 |

---

## 5. Backlog (Stories & Tasks) by Sprint

> Format: `ID | Type | Story/Task | Priority | Points | Owner | Requirement ID`
> Points use Fibonacci (1,2,3,5,8,13). **Must** items are the committed sprint scope.

### SPRINT 1 — Foundation & Planning (Goal: working skeleton + BRD baseline)

| ID | Type | Item | Pri | Pts | Owner | Req ID |
|---|---|---|---|---|---|---|
| VAU-001 | Task | Set up monorepo (frontend/backend), git, branch strategy, linting | Must | 3 | Tech Lead | — |
| VAU-002 | Task | Scaffold React (TS) app + Tailwind + routing | Must | 3 | Tech Lead | — |
| VAU-003 | Task | Scaffold backend (Node or Python) + health endpoint | Must | 3 | Tech Lead | — |
| VAU-004 | Task | Provision PostgreSQL (free tier) + connect backend | Must | 3 | SA | — |
| VAU-005 | Task | Deploy skeleton to Vercel + Render (free tier, live) | Must | 3 | SA | BRD §8.5 |
| VAU-006 | Task | CI on push (build + lint) | Should | 3 | Tech Lead | — |
| VAU-007 | Story | Finalize BRD v3.3 baseline with client (sign-off) | Must | 2 | BA | BRD |
| VAU-008 | Task | Create/seed Jira board, epics, labels | Must | 2 | SM | — |
| VAU-009 | Task | Weekly review + retrospective | Must | 1 | SM | — |

**Sprint 1 exit:** repo + live skeleton URL; BRD signed.

### SPRINT 2 — Design & Spec (Goal: approved specs + DB/API design)

| ID | Type | Item | Pri | Pts | Owner | Req ID |
|---|---|---|---|---|---|---|
| VAU-010 | Story | SRS v1.0 finalized & signed | Must | 3 | BA/SA | SRS |
| VAU-011 | Story | SOW v1.0 finalized & signed | Must | 2 | PM | SOW |
| VAU-012 | Task | Sprint Planner (this doc) completed | Must | 2 | SM | — |
| VAU-013 | Story | DB schema (DDL) per SRS §6 + seed 3 stores & warehouse | Must | 5 | SA | BRD FR-INV-02, §14 |
| VAU-014 | Task | API contract (resources, error envelope) documented | Must | 3 | SA | SRS §5.3 |
| VAU-015 | Task | Data masking design + masked-field list confirmed | Must | 3 | SA/BA | BRD §14.2, SRS §7 |
| VAU-016 | Task | UI mockups for core screens (login, dashboard, inventory) | Should | 5 | Tech Lead | SRS §11 |
| VAU-017 | Story | Auth foundation: users seed, bcrypt, JWT, RBAC middleware | Must | 5 | Tech Lead | FR-USER |
| VAU-018 | Story | Location & Product models + CRUD API (backend) | Must | 5 | Tech Lead | FR-INV-01/02 |

**Sprint 2 exit:** specs signed; DB + core models + auth foundation coded.

### SPRINT 3 — Inventory & Sales Core (Goal: stock + sales + reports + RBAC base)

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

**Sprint 3 exit:** client can log in, manage stock, record sale, view day/qtr/yr reports.

### SPRINT 4 — Procurement & Safety Stock (Goal: alerts + PO lifecycle)

| ID | Type | Item | Pri | Pts | Owner | Req ID |
|---|---|---|---|---|---|---|
| VAU-027 | Story | Safety stock & reorder config (per product/location + validation) | Must | 5 | Tech Lead | FR-SST-01 |
| VAU-028 | Story | Low-stock detection + alerts center (role-scoped) | Must | 5 | Tech Lead | FR-SST-02, FR-INV-08 |
| VAU-029 | Story | Supplier master + product mapping (API + UI) | Must | 5 | Tech Lead | FR-PRO-01 |
| VAU-030 | Story | Manual PO creation & PO list/detail | Must | 5 | Tech Lead | FR-PRO-02 |
| VAU-031 | Story | PO lifecycle states + transitions + audit | Must | 5 | Tech Lead | FR-PRO-04 |
| VAU-032 | Story | PO receipt / goods-in (partial & full) updating stock | Must | 5 | Tech Lead | FR-PRO-05 |
| VAU-033 | Story | Duplicate-open-PO prevention | Should | 3 | Tech Lead | FR-PRO-06 |
| VAU-034 | Story | Supplier performance & lead-time tracking (value-add) | Could | 5 | Tech Lead | FR-SUP |

**Sprint 4 exit:** safety stock advisories + full manual PO flow with goods-in.

### SPRINT 5 — AI & Monitoring (Goal: AI auto-order, warehouse AI, dashboards, value-adds)

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

**Sprint 5 exit:** AI features live; executive dashboards live; value-adds as prioritized (Must + agreed Should/Could).

### SPRINT 6 — Test, UAT & Handover (Goal: accepted, live product)

| ID | Type | Item | Pri | Pts | Owner | Req ID |
|---|---|---|---|---|---|---|
| VAU-046 | Task | Full test pass: AC-1…AC-14 (SRS §13) | Must | 8 | All | SRS §13 |
| VAU-047 | Task | Fix defects from internal tests | Must | (var) | Tech Lead | — |
| VAU-048 | Task | Client demo + UAT session(s) | Must | 3 | BA/SM | — |
| VAU-049 | Task | UAT defects fixed (in-scope only; rest = CR) | Must | (var) | Tech Lead | — |
| VAU-050 | Story | User Guide (roles, key tasks) | Must | 3 | BA | — |
| VAU-051 | Task | Acceptance form signed (AC-1…14) | Must | 2 | PM | SOW §7 |
| VAU-052 | Task | Handover: source, deployment access/instructions, credentials | Must | 3 | SA/TL | SOW D-9 |
| VAU-053 | Task | Final report + retrospective | Should | 2 | SM | — |

**Sprint 6 exit:** Signed acceptance; app live on Vercel/Render; handover complete.

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
3. UI verified on the live (Vercel/Render) environment.
4. RBAC + masking verified for the affected data.
5. No P0/P1 defects open for the story.
6. Audit/reporting impact considered and tested.
7. Updated documentation (if affected).

---

## 9. Story Pointing & Velocity

- Points: Fibonacci (1,2,3,5,8,13). Baseline team velocity target: **~30 points/sprint** (5 members).
- Capacity: 5 members × 1 week ≈ 5–7 focused story points/person, allowing for documentation + UAT + fixes.
- **Sprint 1 estimate ≈ 20 pts; Sprint 2 ≈ 30; Sprint 3 ≈ 36; Sprint 4 ≈ 33; Sprint 5 ≈ 45 (incl. Must + Should/Could); Sprint 6 ≈ 18 + defect buffer.**
- Velocity is re-baselined after Sprint 1 from actuals.

> If velocity < plan, **Should/Could** items are the first trimmed (never Musts).

---

## 10. Team Capacity & Assignments

| Member | Avg pts/sprint | Primary focus areas |
|---|---|---|
| Rohan Vashisht (Tech Lead) | 7 | Core coding, code review, QA collab |
| Anoop Gupta (SA) | 6 | Architecture, DB, AI, deploy, masking |
| Ved Naik (BA) | 5 | Docs, UAT mapping, requirement clarity, acceptance |
| Devdarshan S (SM) | 5 | Jira, ceremonies, impediments, sprint reports |
| Laxman Patel (PM) | 5 | Client comms, CRs, risk, acceptance |
| **Team velocity** | **≈ 28–30** | — |

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
| Fix Version / Sprint | Sprint 1–6 |
| Acceptance Criteria | Written in the ticket |
| Definition of Done | Checklist applied (DoD §8) |

---

## 13. Traceability (Story → BRD/SRS ID)

| Sprint | Stories | Primary BRD/SRS refs |
|---|---|---|
| S1 | VAU-001..009 | BRD §8.5, §23 |
| S2 | VAU-010..018 | SRS §6, §8; BRD §14, FR-USER |
| S3 | VAU-019..026 | FR-INV-01..08, FR-SAL-01..03, FR-USER-02 |
| S4 | VAU-027..034 | FR-SST, FR-PRO, FR-SUP |
| S5 | VAU-035..045 | FR-AI, FR-MON, FR-DSH, FR-FSM, FR-BULK, FR-AUD, FR-ONB, FR-ALR, FR-CAT |
| S6 | VAU-046..053 | SRS §13 (AC-1…14), SOW §7 |

---

## 14. Risks & Assumptions

- **Velocity/re-scoping:** Should/Could items may be deferred; Musts are protected.
- **Free-tier limits:** 1 Vercel project + 1 Render service; sleep/cold-start acceptable (BRD §8.5).
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

*End of Sprint Planner — Version 1.0 · Project: Vaultory · Team: Vaultory*