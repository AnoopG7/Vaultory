# Sprint Planner / Backlog (Jira-ready)

## Project: **Vaultory** — Small Business Inventory and Sales App (SBISA)

| **Document ID** | SPI-PLAN-VAULTORY-001 |
|---|---|
| **Version** | 2.2 |
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
| 2.2 | 29/08/2026 | Anoop Gupta (SA) | Filled Sprint 1 foundation tickets VAU-010..018 (schema, API contract, RBAC, masking, CI/CD); added Sprint 2 auth flow + user admin + void/returns (VAU-035..037); renumbered Sprint 3 to VAU-038..056; fixed story-point totals (§9), NestJS→Express, epic buckets, and AC→T-AC naming |

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
| Sprint 1 | 29 Aug – 8 Sep | Foundation, Planning & Design | Project setup, BRD/SRS/SOW/Plan sign-off, DB schema + API design + auth foundation + RBAC + masking + core models |
| Sprint 2 | 9 Sep – 19 Sep | Core Build — Inventory, Sales & Procurement | Products, stock ops, sales + daily/qtr/yr reports, RBAC, safety stock + alerts, suppliers, manual POs, PO lifecycle, auth flow + user admin + void/returns |
| Sprint 3 | 20 Sep – 30 Sep | AI, Monitoring, Test & Handover | AI auto-ordering + warehouse AI, dashboards, value-adds, QA/UAT fixes, user guide, demo, acceptance, handover |

> Timeline ends **30 Sep 2026** (submission). **Sprint 1 ≈ 11 calendar days; Sprint 2 ≈ 11 calendar days; Sprint 3 ≈ 11 calendar days.**

**Exit criteria per sprint** are defined in the sprint section (all Must items Done + DoD met).

---

## 4. Epics

> Backlog is organized as **full-stack module stories** — one ticket = one complete feature module (backend + frontend) so a team member owns an end-to-end vertical slice (not a 5-line function). Where a module is genuinely parallelizable, it is split into `Backend: <module>` and `Frontend: <module>` sub-tickets.

| Epic Key | Epic | Covers (Stories) | Sprint(s) |
|---|---|---|---|
| `VAU-E-01` | Foundations & DevOps | S1 (monorepo, CI/CD, deploy, Supabase, schema, API contract) | 1 |
| `VAU-E-02` | Documentation & Planning | S1 (BRD/SRS/SOW/Plan) | 1 |
| `VAU-E-03` | Security & Access | S1–S2 (RBAC, masking, auth, user admin) | 1,2 |
| `VAU-E-04` | Inventory, Products & Categories | S2 | 2 |
| `VAU-E-05` | Sales & Reports | S2 | 2 |
| `VAU-E-06` | Safety Stock, Alerts & Suppliers | S2 | 2 |
| `VAU-E-07` | Purchase Orders (Procurement) | S2 | 2 |
| `VAU-E-08` | AI Engine (Ordering + Warehouse) | S3 | 3 |
| `VAU-E-09` | Monitoring & Dashboards | S3 | 3 |
| `VAU-E-10` | Value-Add Modules | S3 | 3 |
| `VAU-E-11` | Quality, UAT & Handover | S3 | 3 |

---

## 5. Backlog (Full-Stack Module Stories) by Sprint

> Format: `ID | Type | Item | Description | Pri | Pts | Req ID`
> Each story is a **finished feature module** (backend API + DB + frontend UI tested together). `(B)` = backend ticket, `(F)` = frontend ticket where a module is split. Points Fibonacci (1,2,3,5,8,13); **Must** = committed scope.

### SPRINT 1 — Foundations & Architecture (Goal: dev-ready foundation + live skeleton)

> Scaffold (VAU-001…009) is largely done; this sprint formalizes the architecture tickets every module builds on.

| ID | Type | Item | Description | Pri | Pts | Req ID |
|---|---|---|---|---|---|---|
| VAU-001 | Task | Monorepo | Git repo, branch strategy, linting (done, verify) | Must | 3 | — |
| VAU-002 | Task | Frontend scaffold | React + TS + Tailwind + shadcn/ui + routing | Must | 3 | — |
| VAU-003 | Task | Backend scaffold | Express + TS + health endpoint | Must | 3 | — |
| VAU-004 | Task | Supabase setup | Provision Supabase + connect backend (real project) | Must | 3 | BRD §2.3 |
| VAU-005 | Task | Deploy skeleton | Skeleton live on Vercel + Render + Groq config | Must | 3 | BRD §8.5 |
| VAU-006 | Task | CI/CD | CI on push (lint + build) + CD (Vercel/Render/migrations) | Should | 5 | — |
| VAU-007 | Story | BRD finalize | BRD v3.4 baseline with client (sign-off) | Must | 2 | BRD |
| VAU-008 | Task | Jira setup | Seed Jira board, epics, module labels | Must | 2 | — |
| VAU-009 | Task | Ceremonies | Weekly review + retro | Must | 1 | — |
| VAU-010 | Story | Database schema | Full ERD, migrations, constraints, indexes, RLS, generated TS types | Must | 13 | BRD §14, SRS §6 |
| VAU-011 | Story | API contract | Endpoint catalogue + shared request/response types (zod) for ALL modules | Must | 8 | BRD §14 |
| VAU-012 | Story | Migrations & seed | Install SQL for schema + seed (3 stores, products, stock, test users) | Must | 5 | FR-INV-02 |
| VAU-013 | Story | Security base (B) | RBAC middleware, role claims, masking util, audit helper | Must | 8 | FR-USER-02, FR-SEC-03 |
| VAU-014 | Story | Frontend foundations (F) | API client, query hooks, auth store, route guards, shared UI kit (grid, form dialog, badges, CSV export) | Must | 8 | — |

**Sprint 1 exit:** dev-ready foundation — schema + API contract + security base + frontend foundations all merged; live skeleton.

### SPRINT 2 — Core Full-Stack Modules (Goal: every core module usable end-to-end)

> Each row is a complete module a developer owns from DB → API → UI. Modules with heavy parallel potential are split `(B)`/`(F)`.

| ID | Type | Item | Description | Pri | Pts | Req ID |
|---|---|---|---|---|---|---|
| VAU-016 | Story | Auth module | Signup, signin, email OTP, forgot + reset password, logout, session persistence, route guards | Must | 13 | FR-USER-01, SRS T-AC10 |
| VAU-017 | Story | User admin module | Create/edit/deactivate users, role + store assignment, search | Must | 8 | FR-USER-03 |
| VAU-018 | Story | Products & categories | Product CRUD/archive/search + categories & units config + grouping | Must | 13 | FR-INV-01, FR-CAT |
| VAU-019 | Story | Inventory & stock | Stock-on-hand per store, stock-in/out/transfer/adjust, status badges, movements, no-negative guard | Must | 13 | FR-INV-03..08 |
| VAU-020 | Story | Sales module | Record sale (POS), stock deduction, void/returns, audit | Must | 13 | FR-SAL-01, FR-SAL-04 |
| VAU-021 | Story | Reports module | Daily/quarterly/yearly sales + store performance + CSV/PDF export | Must | 13 | FR-SAL-02, FR-SAL-03, FR-MON-01 |
| VAU-022 | Story | Safety stock & alerts | Safety stock config, reorder points, low/out detection, alerts center, preferences | Should | 8 | FR-SST-01, FR-SST-02, FR-ALR-01 |
| VAU-023 | Story | Suppliers module | Supplier CRUD + product mapping + lead time + performance tracking | Should | 8 | FR-PRO-01, FR-SUP-01..04 |
| VAU-024 | Story | Purchase order module | Manual PO, auto-PO trigger, lifecycle (draft→sent→partial→received→closed), goods-in, duplicate prevention | Must | 13 | FR-PRO-02..06 |
| VAU-025 | Story | RBAC enforcement | Apply role matrix to all routes + menu gating | Should | 5 | FR-USER-02 |

**Sprint 2 exit:** client can log in, manage products/stock, record sales, view day/qtr/yr reports, run manual POs with goods-in; safety-stock advisories live.

### SPRINT 3 — AI, Dashboards, Value-Adds, Test & Handover (Goal: AI live + accepted, live product)

| ID | Type | Item | Description | Pri | Pts | Req ID |
|---|---|---|---|---|---|---|
| VAU-026 | Story | AI auto-order | Demand forecasting + Groq auto-PO when stock ≤ reorder, accept/modify/reject, fallback | Must | 13 | FR-AI-01, FR-AI-03, SRS §8.1 |
| VAU-027 | Story | AI warehouse recs | Reorder target levels per warehouse w/ rationale, accept/modify/reject, audit | Must | 13 | FR-AI-02, SRS §8.2 |
| VAU-028 | Story | Dashboard module | Executive monitoring + KPI widgets (inventory health, stock value, turnover, today's sales, drill-down) | Must | 8 | FR-MON-02, FR-DSH |
| VAU-029 | Story | Value-add modules | Fast/slow movers + bulk CSV import/export + audit log viewer + onboarding wizard + alert prefs + categories grouping | Could | 13 | FR-FSM, FR-BULK, FR-AUD, FR-ONB, FR-ALR |
| VAU-030 | Task | Full test pass | T-AC1…T-AC14 (SRS §13) | Must | 8 | SRS §13 |
| VAU-031 | Task | Fix internal defects | Fix defects from internal tests | Must | (var) | — |
| VAU-032 | Task | Client demo + UAT | Client demo + UAT session(s) | Must | 3 | — |
| VAU-033 | Task | Fix UAT defects | UAT defects fixed (in-scope only; rest = CR) | Must | (var) | — |
| VAU-034 | Story | User Guide | Roles, key tasks | Must | 3 | — |
| VAU-035 | Task | Acceptance sign-off | Acceptance form signed (T-AC1…T-AC14) | Must | 2 | SOW §7 |
| VAU-036 | Task | Handover | Source, deployment access/instructions, credentials | Must | 3 | SOW D-9 |
| VAU-037 | Task | Final report | Final report + retrospective | Should | 2 | — |

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
- **Booked points (Must = committed; Should/Could = stretch):**
  - **Sprint 1 ≈ 71 pts** (Must 58 + Should/Could 13)
  - **Sprint 2 ≈ 106 pts** (Must 88 + Should 13 + Could 5)
  - **Sprint 3 ≈ 79 pts** (Must 43 + Should 23 + Could 13; excludes `(var)` defect fixes)
  - **Total ≈ 256 pts across 3 sprints.**
- Because booked totals exceed the ~50–55 target velocity, **Should/Could items are the committed trim list** (never Musts). Sprint commitment is set at planning from actual velocity; Sprint 1's 71 pts assumes parallelizable Members (SA/SM/BA/TL) working foundations alongside each other.

> Baseline is re-adjusted from Sprint 1 actuals; velocity re-baselined from actuals after Sprint 1.

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
| S1 | VAU-001..018 | BRD §8.5, §14, §23; SRS §6, §7, §8; FR-USER-02, FR-SEC-03 |
| S2 | VAU-019..037 | FR-INV-01..08, FR-SAL-01..04, FR-USER-01..03, FR-SST, FR-PRO, FR-SUP |
| S3 | VAU-038..056 | FR-AI, FR-MON, FR-DSH, FR-FSM, FR-BULK, FR-AUD, FR-ONB, FR-ALR, FR-CAT, SRS §13 (T-AC1…T-AC14), SOW §7 |

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

*End of Sprint Planner — Version 2.2 · Project: Vaultory · Team: Vaultory*