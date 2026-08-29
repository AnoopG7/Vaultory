# Business Requirements Document (BRD)

## Project: **Vaultory** — Small Business Inventory and Sales App (SBISA)

| **Document ID** | BRD-VAULTORY-001 |
|---|---|---|
| **Project Name** | **Vaultory** |
| **Version** | 3.4 |
| **Status** | Draft for Review & Sign-off |
| **Prepared By** | Ved Naik (Business Analyst) & Anoop Gupta (Solutions Architect) — Vaultory Project Team |
| **Date** | 29/08/2026 |
| **Client / Sponsor** | Small Business Retailer (Prof) |
| **Source Problem Statement** | Product 5: Small Business Inventory and Sales App |

---

## Revision History

| Version | Date | Author | Description of Change |
|---|---|---|---|
| 1.0 | 29/08/2026 | Ved Naik (BA) & Anoop (SA) | Initial draft BRD |
| 2.0 | 29/08/2026 | Ved Naik (BA) & Anoop (SA) | Expanded to feature-level detail, added project name, tighter scope control |
| 3.0 | 29/08/2026 | Ved Naik (BA) & Anoop (SA) | Added technology stack & architecture; expanded modules beyond the 11 core points with value-add features |
| 3.1 | 29/08/2026 | Ved Naik (BA) & Anoop (SA) | Added team name & team members (Project Team section); updated Approvals & Stakeholders |
| 3.2 | 29/08/2026 | Ved Naik (BA) & Anoop (SA) | Renamed project to Vaultory (co-shared with company name) |
| 3.3 | 29/08/2026 | Ved Naik (BA) & Anoop (SA) | Deployed hosting: Vercel (frontend) + Render (backend) free tier kept live; GCP/AWS reserved for post-handover (Phase 2) |
| 3.4 | 29/08/2026 | Ved Naik (BA) & Anoop (SA) | Locked stack: React + Tailwind + **shadcn/ui** frontend (Vercel); **Node.js** backend + AI via **Groq API** (Render); **Supabase** for PostgreSQL + Auth (email/OTP) + Storage |

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

> **SIGN-OFF NOTICE (read first):** This BRD is the **binding baseline** for the Vaultory project. It lists everything the system **will** and **will not** do, down to individual features. The client must review, sign, and date this document **before** development begins. **Any feature or requirement NOT written in this document is OUT OF SCOPE** and can only be added through the formal Change Request process in Section 21. This protects both the client (clear expectations, no surprises) and the delivery team (no unplanned work).

---

## Project Team

**Team Name:** **Vaultory**

| Role | Team Member | Primary Responsibilities |
|---|---|---|
| **Business Analyst (BA)** | **Ved Naik** | Requirements elicitation & documentation (BRD/SRS), traceability, UAT support |
| **Project Manager (PM)** | **Laxman Patel** | Scope, schedule, budget, risk, stakeholder communication |
| **Solutions Architect (SA)** | **Anoop Gupta** | System architecture, deployment design (Vercel/Render for Phase 1; GCP/AWS for Phase 2 post-handover), data masking, tech-stack decisions |
| **Scrum Master (SM)** | **Devdarshan S** | Agile facilitation, sprint planning, removing impediments |
| **Tech Lead** | **Rohan Vashisht** | Development leadership, code quality, implementation |

> **Note:** All five roles are filled by distinct team members, but the delivery is conducted by this single team working together (per the agile delivery model). Placeholders `[Your Name]` elsewhere in this document should be read as the responsible role-holder above.

---

## Table of Contents

**Front Matter**
- [Project Team](#project-team)
- [Approvals](#approvals)

**Sections**
1. [Executive Summary](#1-executive-summary)
2. [Project Name & Branding](#2-project-name--branding)
3. [Business Context & Background](#3-business-context--background)
4. [Stakeholders](#4-stakeholders)
5. [Definitions, Acronyms, Abbreviations](#5-definitions-acronyms-abbreviations)
6. [Business Problem Statement](#6-business-problem-statement)
7. [Business Goals & Success Metrics](#7-business-goals--success-metrics)
8. [In Scope — What Vaultory Does](#8-in-scope--what-vaultory-does) *(incl. Technology Stack §8.4)*
9. [Out of Scope — What Vaultory Does NOT Do (Limitations)](#9-out-of-scope--what-vaultory-does-not-do-limitations)
10. [Functional Requirements — Feature-Level Detail](#10-functional-requirements--feature-level-detail)
11. [Non-Functional Requirements](#11-non-functional-requirements)
12. [User Roles & Permissions (RBAC)](#12-user-roles--permissions-rbac)
13. [Business Process Flows — Step by Step](#13-business-process-flows--step-by-step)
14. [Data Model & Data Masking](#14-data-model--data-masking)
15. [AI Engine — Detailed Behavior](#15-ai-engine--detailed-behavior)
16. [Reports & Monitoring](#16-reports--monitoring)
17. [Assumptions & Dependencies](#17-assumptions--dependencies)
18. [Constraints & Limitations](#18-constraints--limitations)
19. [Acceptance Criteria](#19-acceptance-criteria)
20. [Risks & Mitigations](#20-risks--mitigations)
21. [Change Management & Scope Control](#21-change-management--scope-control)
22. [Future Scope (Deferred)](#22-future-scope-deferred)
23. [Appendix](#23-appendix)

---

## 1. Executive Summary

**Vaultory** is a web-based inventory and sales management application built for **small retailers** who run **multiple stores**. The client operates **3 retail stores** within the city and cannot reliably answer three fundamental questions:

1. **"How much stock do I have?"** — the client's biggest problem.
2. **"Am I stocked in sync with what sells?"** — demand and supply are frequently out of sync.
3. **"What is selling, and how much, per day / quarter / year?"** — there is no reliable sales visibility.

Vaultory solves these by providing:

- **Real-time, multi-location inventory tracking** (3 stores + warehouses).
- **Sales recording and reporting** at daily, quarterly, and yearly intervals.
- **Configurable safety-stock levels** with automatic low-stock alerting.
- **AI-powered automated ordering** — the system orders from the supplier automatically whenever stock falls to/below the safety stock level.
- **AI warehouse stock-level recommendations** — suggesting how much inventory each warehouse should hold.
- **Store-wise sales performance monitoring** for sales personnel.
- **An executive monitoring dashboard** for senior stakeholders covering inventory + sales across all stores.
- **Value-add features** (categories, fast/slow-mover identification, supplier performance, KPI dashboards, bulk import/export, audit viewer, onboarding wizard) that deepen the inventory/sales value without leaving the domain.
- **A secure backend** — data stored in a database, sensitive product information **masked**, and the app kept **live** for the final product (hosted on **Vercel + Render** free tier; see Section 8.5).
- **A modern tech stack** — **React** frontend, **Node.js** backend, **Supabase-PostgreSQL** database + auth + storage (full stack in Section 8.4).

---

## 2. Project Name & Branding

| Attribute | Value |
|---|---|
| **Company / Team Name** | **Vaultory** |
| **Project Name** | **Vaultory** (the project carries the company name) |
| **Product Name** | **Vaultory** — Small Business Inventory and Sales App |
| **Tagline (suggested)** | "Your stock, in sync with your sales." |
| **Rationale** | The company and project share the name **Vaultory** — evoking a trusted vault/control room, fitting for an inventory and sales command center. The tagline retains the core promise of keeping stock **in sync** with sales. |
| **Domain** | www.vaultory.app (placeholder) |
| **Acronym (formal)** | SBISA (Small Business Inventory and Sales App) |

> **Note:** The name is internal branding. If the client wishes a different name, it is a trivial, non-functional cosmetic change with no scope/cost impact.

---

## 3. Business Context & Background

### 3.1 How the Client Operates Today
- The client owns **3 retail stores** in the city.
- Each store sells a variety of physical products supplied by one or more **suppliers**.
- Stock is stored **at each store** and potentially in **central warehouse(s)**.
- Inventory is currently tracked manually, causing the following operational failures:

| Observed Problem | Consequence to the Business |
|---|---|
| Can't tell how much stock is on hand | Over-ordering, or running out unknowingly |
| Demand ≠ supply (stock-outs & overstock) | Lost sales + wasted capital |
| No daily/quarterly/yearly sales view | Can't identify best-sellers or slow movers |
| Manual, untriggered reordering | Late orders, missed restocks |
| No safety-stock control | Consistent stock-outs of key items |
| No cross-store sales comparison | Can't see which store performs best |
| No visibility for senior stakeholders | Can't make informed strategic decisions |

### 3.2 What Vaultory Changes
- Replaces manual tracking with **real-time, digital, per-location stock counts**.
- Introduces **safety-stock rules + AI** so reordering happens **automatically** at the right time.
- Generates **automatic daily / quarterly / yearly sales reports**.
- Gives **every role** (staff, sales, senior management) a view tailored to them.
- Stores data in a **PostgreSQL database** with **masking** for sensitive product data.

---

## 4. Stakeholders

| # | Stakeholder | Role in Project | What They Need From Vaultory |
|---|---|---|---|
| 1 | **Client / Business Owner (Prof)** | Sponsor & primary user; role-plays the real client | Accurate inventory, sales visibility, no hidden costs/scope surprises |
| 2 | **Project Manager (PM)** — Laxman Patel | Owns schedule, budget, scope, risk | Deliver on time, in budget, in scope |
| 3 | **Business Analyst (BA)** — Ved Naik | Elicits & documents requirements | Complete, unambiguous, traceable requirements |
| 4 | **Scrum Master (SM)** — Devdarshan S | Facilitates agile process | Sprint plan runs smoothly |
| 5 | **Solution Architect (SA)** — Anoop Gupta | Technical architecture, deployment design (Vercel/Render, then GCP/AWS post-handover), masking | Robust, scalable, secure design |
| 6 | **Tech Lead** — Rohan Vashisht | Development & code quality | Feasible, clean implementation |
| 7 | **Store Staff** | Daily users of inventory management | Fast, simple stock operations |
| 8 | **Sales Personnel** | Track sales & their performance | Clear store-wise performance view |
| 9 | **Senior Stakeholders** | Monitor via dashboards | Real-time inventory + sales health |

---

## 5. Definitions, Acronyms, Abbreviations

| Term | Definition |
|---|---|
| **SKU** | Stock Keeping Unit — unique ID per product/variant |
| **Safety Stock** | The minimum quantity that must be held to avoid a stock-out before the next order arrives |
| **Reorder Point** | The stock level at which a new order must be placed (≥ safety stock, accounts for lead time) |
| **Lead Time** | Days between placing a PO with a supplier and receiving the goods |
| **Target / Max Level** | Desired stock level to restore to when reordering |
| **PO (Purchase Order)** | Request to a supplier for products |
| **On-hand / Available Stock** | Current physical quantity of a SKU at a location |
| **Stock-out** | Available stock = 0 |
| **Overstock** | Holding more than required, tying up capital |
| **Cycle Count** | Physical recount of stock to verify records |
| **Data Masking** | Obscuring sensitive field values so they aren't fully readable |
| **RBAC** | Role-Based Access Control |
| **GCP** | Google Cloud Platform — reserved for **post-handover** production deployment (Phase 2) |
| **AWS** | Amazon Web Services — alternative reserved for **post-handover** production deployment (Phase 2) |
| **Vercel** | Frontend hosting platform (Hobby free tier) used to keep the **final product live** (Phase 1) |
| **Render** | Backend hosting platform (free tier, ~750 hrs/mo) used to host the **Node.js backend + AI service** and keep the **final product live** (Phase 1) |
| **Supabase** | Managed open-source backend services used by Vaultory for **PostgreSQL database**, **Auth (email/password + email OTP)**, and **Object Storage** only (not used as a full backend-as-a-service) |
| **Groq** | Cloud provider of fast LLM inference — used by the Vaultory AI service for **forecasting / recommendation reasoning & explanations** (via API key) |
| **shadcn/ui** | Open-source React component library built on Tailwind CSS — used for the Vaultory UI components |
| **Free Tier** | No-cost allowance across Vercel (Hobby), Render (~750 hrs/mo), Supabase (free), and Groq (free-tier credits/limits) sufficient for Phase 1 |
| **UAT** | User Acceptance Testing |
| **RPO / RTO** | Recovery Point Objective / Recovery Time Objective (backup metrics) |
| **CR / CRF** | Change Request / Change Request Form |
| **AI** | Artificial Intelligence (the rule+forecast engine in Vaultory, using the Groq API for reasoning/recommendations) |
| **Warehouse** | Central storage that supplies the stores |
| **React** | JavaScript/TypeScript library used for the Vaultory frontend (SPA) |
| **Node.js** | JavaScript runtime — the Vaultory backend (Express/NestJS) + AI service; also runs TypeScript for type safety |
| **PostgreSQL** | Relational database used for Vaultory data (hosted via **Supabase** on the Phase-1 free tier) |

---

## 6. Business Problem Statement

> **"We want to develop a simple product for small retailers to manage their inventory and sales. The product should help business owners understand what they have in stock and what is selling."**

The client's specific problems (from the problem statement "Sir said / told"):

1. **Can't see inventory quantity** — *"Client has a problem in understanding how much he has stored in his inventory."*
2. **Demand/supply out of sync** — *"At times the client has observed that the demand and supply are not in sync."*
3. **No sales visibility** — *"Client has a problem understanding what he is selling and how much every day, every quarter, every year."*
4. **No staff inventory tool + reordering** — needs a feature for *"store staff to manage inventory"* and *"order products from suppliers if the inventory level goes down."*
5. **No safety-stock control** — needs to *"maintain and track ideal safety stock level."*
6. **No sales-per-store tracking** — salespeople need to *"monitor and track sales performance in different stores."*
7. **No automated ordering** — needs *"automated ordering ... whenever safety stock is down, using AI."*
8. **No warehouse-level guidance** — the *"AI engine should suggest what level of inventory is required in the warehouses."*
9. **No database / masking / managed hosting** — data in a *"database,"* product info *"masked,"* app *"managed"* on a hosting platform (per the client statement, GCP was named; the build phase is delivered on **Vercel + Render**, with **GCP/AWS reserved for post-handover** — see Section 8.5).
10. **No stakeholder monitoring** — needs a *"monitoring system ... for inventory and sales performance to all senior stakeholders."*

Vaultory is built to resolve **all ten** of these points (mapped one-to-one to requirements in Section 10).

---

## 7. Business Goals & Success Metrics

| # | Business Goal | Measurable Success Metric | Target |
|---|---|---|---|
| G-1 | Accurate, current inventory visibility | # of inventory counting errors / time-to-value | ≥95% accuracy; near real-time |
| G-2 | Reduce stock-outs | Reduction in stock-out events vs. baseline | ≥50% |
| G-3 | Reduce overstock | Reduction in overstock value vs. baseline | ≥30% |
| G-4 | Sync demand & supply | Forecasting accuracy (demand vs. actual) | ≥80% |
| G-5 | Sales visibility (day/quarter/year) | Auto-generated reports for all 3 periods | 100% |
| G-6 | Automated, timely reordering | % of reorders triggered automatically at safety stock | 100% |
| G-7 | Cross-store sales tracking | All 3 stores visible & comparable in reports | 3 stores |
| G-8 | Senior stakeholder monitoring | Executive dashboard uptime & availability | 99.5% |
| G-9 | Data privacy via masking | % of sensitive fields masked | 100% |

---

## 8. In Scope — What Vaultory Does

### 8.1 Modules In Scope
1. **Inventory Management** — SKU/product master, per-location stock tracking, stock-in/out/transfer/adjust, cycle counts.
2. **Sales Management** — sale recording, sales-driven stock deduction, daily/quarterly/yearly reports, store-wise tracking.
3. **Safety Stock Management** — configurable safety stock & reorder points, low-stock alerts.
4. **Supplier & Procurement** — supplier master, purchase orders, PO lifecycle.
5. **AI Automated Ordering** — auto-PO generation at/below reorder point with AI quantity.
6. **AI Warehouse Stock Recommendation** — recommended warehouse stock levels.
7. **Sales Performance Monitoring** — store-wise sales dashboards for sales personnel.
8. **Executive Monitoring** — inventory + sales dashboards for senior stakeholders.
9. **User Management & RBAC** — auth, roles, permissions.

**Value-Add Modules (also in scope — enhance the client's stated needs without leaving the inventory/sales domain):**
10. **Product Categories & Units** — structured product classification for better reporting.
11. **Supplier Performance & Lead-Time Tracking** — track on-time delivery and lead-time reliability to make PO/AI decisions better.
12. **Dashboard Widgets & KPIs** — configurable cards (stock value, turnover rate, fast/slow movers) on dashboards.
13. **Product Fast/Slow Mover Identification** — highlight best-sellers vs. slow-moving stock to guide stocking (directly addresses "demand & supply not in sync").
14. **Expiry / Perishable Item Handling (flag)** — mark perishable SKUs and warn on low remaining shelf-life (only a data field + alert, no complex batch tracking).
15. **Search / Bulk Operations** — import/export products & stock via CSV templates for faster onboarding.
16. **Email/In-app Alert Preferences** — choose how low-stock & PO alerts are delivered (in-app + optional email). *(SMS/customer marketing remains out of scope — L-15.)*
17. **User Activity & Audit Log Viewer** — admin view of the audit trail for accountability and dispute resolution.
18. **Onboarding / Data Upload Wizard** — guided first-time setup (stores, warehouse, products, suppliers, opening stock, safety stock).

> These value-add modules stay **strictly within** inventory, sales, procurement, and monitoring — they do not open new domains (no CRM, accounting, ecommerce, payments). Any of them can be made **optional/will-omit** per final sprint prioritization (see SRS/Sprint Planner), but all are deliverable within the agreed scope.

### 8.2 Technical Scope In Scope
- Web application (responsive: desktop/tablet/mobile browsers).
- Backend database (relational, **PostgreSQL** hosted via **Supabase**) for persistent storage.
- RESTful API for UI↔backend communication.
- Deployment & hosting on **Vercel (frontend) + Render (backend) + Supabase (Postgres/Auth/Storage)** — free tier, kept live for the final product (see **8.5 Deployment Strategy**).
- **Data masking** for sensitive product info (DB + app layers).
- Authentication + RBAC.
- Audit logging of significant actions.
- Automated periodic reports.
- Git-based CI/CD (auto-deploy) with the hosting providers.

### 8.3 Supported Business Entities
Products/SKUs, categories, units, stores (3), warehouses, suppliers, purchase orders, sales transactions, stock movements, safety-stock rules, users, roles, alerts, AI recommendations.

### 8.4 Technology Stack (Agreed Baseline)

> The stack below is the **agreed technical baseline** for Vaultory. It is decided by the Solution Architect and locked for v1.0. Changing the stack or adding new technologies is a **Change Request**.

| Layer | Technology (Agreed) | Purpose / Notes |
|---|---|---|
| **Frontend** | **React** (with TypeScript) | SPA UI; component-based, responsive, fast. |
| **UI Styling / Components** | Tailwind CSS + **shadcn/ui**; charts via **Recharts** | Consistent, responsive design; reusable components and data-viz. |
| **State / Data Fetching** | React Hooks + TanStack Query (React Query) + Zustand | Client-side state, caching, server state. |
| **Backend** | **Node.js** (Express / NestJS) + TypeScript | RESTful API, business logic, RBAC enforcement, masking. |
| **AI / Forecasting Engine** | Node.js service calling the **Groq API** (LLM reasoning for demand forecast, reorder quantity & warehouse-level recommendations with explainable rationale) | Explainable AI microservice; deterministic rules (reorder point, no-duplicate PO, consent) stay in the Node backend. |
| **Database** | **PostgreSQL** (**Supabase**-hosted, free tier) | Core transactional data per Section 14.1; managed & kept live via Supabase. |
| **Caching / Sessions** | Redis (optional) | Sessions, rate limiting, fast lookups (optional, if within free-tier limits). |
| **Object Storage** | **Supabase Storage** (free tier) | Exported reports, files (kept within free-tier limits). |
| **API** | REST (JSON) over HTTPS | UI ↔ backend ↔ AI service. |
| **Auth & RBAC** | **Supabase Auth** (email/password + **email OTP**/magic link) issuing JWTs; **Node** role middleware | Authentication & authorization; Node validates the Supabase JWT and enforces role/permission on every route. |
| **Deployment / Hosting (live, free tier)** | **Vercel (Hobby, free) for the React frontend** + **Render (free tier, ~750 hrs/mo) for the Node.js backend/AI service** + **Supabase (free) for Postgres/Auth/Storage** | Keeps the **final product live** for the client during and after the project (see 8.5 Deployment Strategy). |
| **Monitoring / Logging** | Vercel + Render built-in logs/metrics (free tier) | Ops visibility for the hosting period. |
| **Security** | TLS/HTTPS, encryption at rest, data masking, **secrets as env vars** (Groq API key, Supabase keys) | Per FR-SEC / Section 14.2. |
| **Backup** | Supabase managed backups + scheduled exports | Data safeguarded for the hosting period. |
| **CI/CD** | Git-based auto-deploy (GitHub + Vercel/Render) | Merge/commit triggers automatic deploy. |

> The stack above is **locked** for v1.0 — **React + Tailwind + shadcn/ui (frontend), Node.js (backend + AI via Groq), Supabase (PostgreSQL/Auth/Storage)**. No further backend/UI choices remain open. Any change is a **Change Request**.

### 8.5 Deployment & Hosting Strategy (Two Phases)

> This defines **where** Vaultory runs and how it stays live, split into two clear phases so the client's expectations are explicit and no scope confusion occurs after handover.

| Phase | Period | Frontend | Backend / DB / AI | Purpose |
|---|---|---|---|---|
| **Phase 1 — Build & Final-Product Hosting (free tier)** | Throughout the project and **kept live for the final product** | **Vercel** (Hobby, free tier, 1 project/account) | **Render** (free tier, ~750 hrs/mo, 1 project/account) hosting the **Node.js backend + AI service** + **Supabase** (free) for **PostgreSQL / Auth / Storage** | Demo, UAT, and the **final deliverable** kept live for the client. |
| **Phase 2 — Post-Handover / Production** | **After handover** (separate initiative / Change Request) | **GCP or AWS** (managed hosting) | **GCP or AWS** (Cloud SQL / RDS etc.) | Enterprise-grade, managed, scaled production. |

**Free-tier details (agreed):**
- **Vercel Hobby** supports one project on one account for free — used for the React frontend.
- **Render free tier** offers **750 free hours/month** per service on one account — used for the **Node.js backend + AI service**, adequate for a single always-on app (750 hrs ≈ a single service running ~24/7, or two services staggered).
- **Supabase free tier** provides a hosted **PostgreSQL** database, **Auth** (email/password + email OTP), and **Storage** — adequate for this project's scale.
- **Groq API** free tier supplies LLM inference for the AI service; the **API key is stored as a secret environment variable on Render** (never committed to the repo).
- **Yes — the free tier is sufficient** for 1 frontend project (Vercel) + 1 backend service (Render) + Supabase (Postgres/Auth/Storage) + Groq credits on one account each, and it will keep the **final product live** for the client.

**Constraints & limitations of the free tier (accepted):**
- Free-tier services may **sleep/pause** after idle periods (Render) and have **cold-start** latency; Supabase free projects pause after ~1 week of inactivity.
- Free-tier **uptime is not guaranteed** and is **lower than the 99.5% target** in NFR-4. If the client requires a guaranteed SLA during the build phase, that is a **Change Request** (move to Phase 2 paid hosting earlier).
- Free-tier has **resource limits** (compute, bandwidth, storage, Groq rate limits); within this project's scale these are sufficient.
- The **Groq API** and **Supabase** are external services; availability follows their free-tier terms (best-effort).

> **Phase 2 (GCP/AWS) is explicitly OUT OF SCOPE for the build/final-delivery phase.** It is listed here only to set clear ownership: moving to GCP/AWS happens **after handover** and is a separate engagement / Change Request, not part of the current delivery.

---

## 9. Out of Scope — What Vaultory Does NOT Do (Limitations)

> **READ THIS SECTION CAREFULLY — CLIENT CONFIRMATION REQUIRED.** The items below are **explicitly excluded** from Vaultory v1.0. Requesting any of these during the project triggers the formal Change Request process (Section 21) with added cost & timeline.

### 9.1 Product-Level Limitations (Excluded by Default)
| # | Excluded Item | Why / Clarification |
|---|---|---|
| L-1 | **Native mobile apps** (iOS/Android) | Responsive web only. |
| L-2 | **Customer-facing e-commerce / online store** | Internal management tool only; no customer storefront, cart, checkout. |
| L-3 | **Online payments / payment gateways** | No payment processing, refunds, or settlement. |
| L-4 | **POS / barcode / hardware integration** | No POS terminals, scanners, cash drawers, printers. |
| L-5 | **Customer Relationship Management (CRM)** | No customer profiles, loyalty, promotions, marketing. |
| L-6 | **Accounting / bookkeeping / tax / GST** | Sales recording is in scope; financial accounting is not. |
| L-7 | **Customer-facing invoicing / credit notes to customers** | Not in scope. |
| L-8 | **Supplier self-service portal** | Suppliers interact only through POs managed by the retailer. |
| L-9 | **Third-party ERP / e-procurement integration** | No external system integration. |
| L-10 | **Loyalty & customer discounts engine** | Not in scope. |
| L-11 | **Multi-currency / multi-language** | Single currency, single language assumed. |
| L-12 | **IoT / RFID / real-time shelf sensors** | Not in scope. |
| L-13 | **Offline mobile with data sync** | Internet required. |
| L-14 | **More than 3 retail stores** | Scoped for exactly 3 stores + warehouses. |
| L-15 | **SMS/email customer notifications** | No customer marketing notifications. |
| L-16 | **Third-party delivery / courier tracking** | Internal PO status only. |
| L-17 | **Voice / chatbot assistant** | Not in scope. |
| L-18 | **Data migration from legacy systems** | Manual data entry by client; no automated migration. |
| L-19 | **Formal external compliance certification** (ISO/SOC2) | Best-practice security applied; not certified. |
| L-20 | **White-labelling of a third-party platform** | Not applicable. |
| L-21 | **Any AI beyond the specified scope** | AI = automated reorder + warehouse stock recommendation + demand forecast to support these. No general ML platform/workbench. |

### 9.2 Default Rule
> **Anything not explicitly listed under Section 8 (In Scope) is OUT OF SCOPE by default.** If it isn't written in this BRD, it isn't part of Vaultory v1.0.

---

## 10. Functional Requirements — Feature-Level Detail

> Requirements are numbered `FR-<module>-<seq>`. MoSCoW priority: **M**=Must, **S**=Should, **C**=Could. **Every feature is broken down to its smallest concrete behaviors** so the client knows exactly what to expect and the team knows exactly what to build.

### 10.1 MODULE: Inventory Management

#### FR-INV-01 → Product (SKU) Master
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-INV-01.1 | Admin can **create** a product with fields: SKU code (unique, auto-suggested), product name, description, category, unit of measure, default unit cost (masked), default sale price, default safety stock, default reorder point, default target level. | M |
| FR-INV-01.2 | Admin can **view, edit, and soft-deactivate** (archive, not delete) any product. | M |
| FR-INV-01.3 | Deactivated products remain in history/reports but cannot be used in new transactions. | M |
| FR-INV-01.4 | SKU codes are **unique**; system blocks duplicates. | M |
| FR-INV-01.5 | Category & unit are from a configurable list (not free text). | S |
| FR-INV-01.6 | Product list is searchable & filterable (by name, category, status). | S |

#### FR-INV-02 → Location Master (Stores & Warehouses)
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-INV-02.1 | System pre-seeds **3 stores** (Store A/B/C) and at least **1 warehouse**. | M |
| FR-INV-02.2 | Admin can view/edit store & warehouse attributes: name, city, address, status (active/inactive). | M |
| FR-INV-02.3 | Admin can **add additional stores** (but see L-14: scoped for 3; extra stores = CR). | C |

#### FR-INV-03 → Stock-on-Hand Tracking
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-INV-03.1 | System maintains **one on-hand quantity per (SKU, location)** row. | M |
| FR-INV-03.2 | On-hand quantity updates automatically after every stock-in, stock-out, transfer, adjustment, and sale. | M |
| FR-INV-03.3 | Users with permission can **view current stock** of any SKU in any store/warehouse. | M |
| FR-INV-03.4 | Stock view shows: on-hand, reorder point, safety stock, target level, and **status badge** (In Stock / Low / Out / Over). | M |

#### FR-INV-04 → Stock-In
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-INV-04.1 | Store staff (own store) & Admin can record Stock-In: SKU, quantity (>0), destination location, optional PO reference, notes, date. | M |
| FR-INV-04.2 | Stock-In **increases** on-hand stock of destination. | M |
| FR-INV-04.3 | If linked to a PO, Stock-In updates the PO's received status (see FR-PRO-05). | M |

#### FR-INV-05 → Stock-Out
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-INV-05.1 | Authorized users record Stock-Out: SKU, quantity, source location, reason (damage/loss/other), date. | M |
| FR-INV-05.2 | Stock-Out **decreases** on-hand stock; system blocks negative stock (warns/errors if insufficient). | M |

#### FR-INV-06 → Stock Transfer
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-INV-06.1 | Authorized users create a transfer: SKU, quantity, from-location, to-location. | M |
| FR-INV-06.2 | Transfer **decreases** from-location and **increases** to-location (net change = 0). | M |
| FR-INV-06.3 | Transfer cannot exceed available stock at from-location. | M |

#### FR-INV-07 → Stock Adjustment (Cycle Count)
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-INV-07.1 | Authorized users perform a count: enter counted quantity vs. system quantity; system computes **variance**. | M |
| FR-INV-07.2 | On confirmation, system posts an adjustment to match the counted value and records the reason. | M |
| FR-INV-07.3 | Every adjustment is logged to the **audit trail** (who, when, old, new, reason). | M |

#### FR-INV-08 → Inventory Status & Alerts
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-INV-08.1 | System computes stock status vs. reorder point/safety stock continuously. | M |
| FR-INV-08.2 | System flags **Low Stock** (≤ reorder point), **Out of Stock** (=0), **Over Stock** (>target). | M |
| FR-INV-08.3 | On transition to low/out-of-stock, system raises an **in-app alert/notification**. | M |

---

### 10.2 MODULE: Sales Management

#### FR-SAL-01 → Sale Recording
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-SAL-01.1 | Sales personnel / assigned staff record a sale: store, date/time, and line items (SKU, qty, unit price, line total). | M |
| FR-SAL-01.2 | A sale must have ≥1 line item; quantities >0. | M |
| FR-SAL-01.3 | System **auto-computes** line totals and sale total. | M |
| FR-SAL-01.4 | System **decrements** on-hand stock of the sale's store for each line item. | M |
| FR-SAL-01.5 | If sale quantity > available stock, system **warns** and blocks (or allows negative with config, default block). | M |
| FR-SAL-01.6 | Sale is **immutable after save** unless authorized to void (see FR-SAL-04). | M |

#### FR-SAL-02 → Sales Reports (Day / Quarter / Year)
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-SAL-02.1 | System provides **Daily Sales** report (filter: store, product, date). | M |
| FR-SAL-02.2 | System provides **Quarterly Sales** report (filter: store, product, quarter). | M |
| FR-SAL-02.3 | System provides **Yearly Sales** report (filter: store, product, year). | M |
| FR-SAL-02.4 | Reports show: units sold, sale value, by store and by product; sorting & export (CSV/PDF). | M |
| FR-SAL-02.5 | Daily/Quarterly/Yearly summaries are **generated automatically** (dashboard + report). | M |

#### FR-SAL-03 → Store-wise Performance (Sales Personnel)
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-SAL-03.1 | Sales personnel can view a **per-store dashboard**: total sales value, units, period. | M |
| FR-SAL-03.2 | Sales personnel can **compare stores** side-by-side (value, units, trend). | S |
| FR-SAL-03.3 | Top-selling products per store are shown. | S |

#### FR-SAL-04 → Void / Returns
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-SAL-04.1 | Authorized users may **void** a sale (requires reason, logged to audit). | S |
| FR-SAL-04.2 | Voiding **restores** stock and removes from sales totals. | S |
| FR-SAL-04.3 | **Returns** (product returned by customer) increase stock and record negative sale. | S |

---

### 10.3 MODULE: Safety Stock Management

#### FR-SST-01 → Configure Safety Stock & Reorder Point
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-SST-01.1 | For each product, Admin configures: **safety stock**, **reorder point**, **target/max level**, per location (store/warehouse) or global. | M |
| FR-SST-01.2 | System validates reorder point ≥ safety stock. | M |
| FR-SST-01.3 | Values can be **manually set** or **auto-suggested by the AI engine** (see Section 15). | S |

#### FR-SST-02 → Tracking & Alerts
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-SST-02.1 | System continuously compares on-hand vs. reorder point & safety stock. | M |
| FR-SST-02.2 | When on-hand ≤ reorder point, system flags product and **triggers reorder evaluation** (Section 15). | M |
| FR-SST-02.3 | Alerts are **role-targeted** (Admin + relevant staff) and shown in an alerts center. | M |

---

### 10.4 MODULE: Supplier & Procurement

#### FR-PRO-01 → Supplier Master
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-PRO-01.1 | Admin creates/view/edits suppliers: name, contact person, phone, email, address, **lead time (days)**, status. | M |
| FR-PRO-01.2 | Admin maps which **products** each supplier supplies (supplier-product links). | M |
| FR-PRO-01.3 | Supplier detail may include **finances/margin** fields marked **masked** (Section 14). | S |

#### FR-PRO-02 → Purchase Order Creation (Manual)
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-PRO-02.1 | Authorized users can create a **manual PO**: supplier, destination (store/warehouse), line items (SKU, qty), expected date (auto = order date + lead time). | M |
| FR-PRO-02.2 | PO number is **auto-generated & unique**. | M |

#### FR-PRO-03 → Automated PO (from AI reorder)
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-PRO-03.1 | When a product hits its reorder point AND auto-order is enabled, system **auto-generates** a PO (see Section 15). | M |
| FR-PRO-03.2 | Auto-generated PO uses the AI-computed quantity (Section 15). | M |

#### FR-PRO-04 → PO Lifecycle & Status
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-PRO-04.1 | PO statuses: **Draft → Sent/Ordered → Partially Received → Received → Closed / Cancelled**. | M |
| FR-PRO-04.2 | Status changes are recorded with timestamp & actor (audit). | M |
| FR-PRO-04.3 | Users can view open POs, expected dates, and received amounts. | M |

#### FR-PRO-05 → PO Receipt / Goods-In
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-PRO-05.1 | On receiving goods, user records receipt against the PO (SKU, qty received). | M |
| FR-PRO-05.2 | System **increases** on-hand stock at the destination. | M |
| FR-PRO-05.3 | If partial, PO → Partially Received; when fully received → Received. | M |

#### FR-PRO-06 → Duplicate-Order Prevention
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-PRO-06.1 | System **prevents** generating a duplicate auto-PO for the same (SKU, location) while an open PO exists (unless consolidation window/config overrides). | S |

---

### 10.5 MODULE: AI Engine

> Full AI behavior in **Section 15**. High-level requirements:

#### FR-AI-01 → Automated Ordering (AI)
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-AI-01.1 | System detects stock ≤ reorder point and, if auto-order enabled, computes & issues a PO (Section 15.1). | M |
| FR-AI-01.2 | AI quantity = function of target level, current stock, open POs, forecast demand, lead time. | M |

#### FR-AI-02 → Warehouse Stock-Level Recommendation
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-AI-02.1 | System **recommends** the optimal quantity to hold in each warehouse per product (Section 15.2). | M |
| FR-AI-02.2 | Recommendation shown with **rationale**; user can accept/modify/reject. | M |

#### FR-AI-03 → Demand Forecasting (supporting AI)
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-AI-03.1 | System forecasts demand using available historical sales (handles insufficient history gracefully). | S |
| FR-AI-03.2 | Forecast informs reorder quantity & warehouse recommendation. | S |

---

### 10.6 MODULE: Monitoring & Dashboards

#### FR-MON-01 → Sales Performance (Sales Personnel)
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-MON-01.1 | Per-store sales dashboard: value, units, period trend. | M |
| FR-MON-01.2 | Cross-store comparison available. | S |

#### FR-MON-02 → Executive Monitoring (Senior Stakeholders)
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-MON-02.1 | Executive dashboard shows **inventory health** (total stock value, low-stock count, out-of-stock count) + **sales summary** (day/qtr/yr totals). | M |
| FR-MON-02.2 | Drill-down into store and product level. | M |
| FR-MON-02.3 | Data reflects near real-time (see NFR-2). | M |

---

### 10.7 MODULE: User Management & RBAC

#### FR-USER-01 → Authentication
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-USER-01.1 | Login with email/username + password; password hashed & stored securely. | M |
| FR-USER-01.2 | Logout; session management; automatic timeout (configurable). | M |
| FR-USER-01.3 | Failed-login rate limiting / lockout after N attempts (configurable). | S |

#### FR-USER-02 → Roles & Permissions
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-USER-02.1 | Supports roles: **Admin, Store Staff, Sales Personnel, Senior Stakeholder** (see Section 12). | M |
| FR-USER-02.2 | Every action checks the role's permission; unauthorized actions/menus hidden & rejected server-side. | M |

#### FR-USER-03 → User Administration
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-USER-03.1 | Admin creates/view/edit/deactivate users; assigns role & store. | M |
| FR-USER-03.2 | User list searchable; status active/inactive. | S |

---

### 10.8 MODULE: Data Masking & Security
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-SEC-01 | Sensitive product info stored **masked** in the database (Section 14). | M |
| FR-SEC-02 | Masked values shown to unauthorized roles; full values only to authorized roles via logged access. | M |
| FR-SEC-03 | Sensitive data never in logs/API for unauthorized roles. | M |
| FR-SEC-04 | All data in transit encrypted (TLS); at rest encrypted. | M |
| FR-SEC-05 | Significant actions logged (audit trail). | M |

### 10.9 MODULE: Product Categories & Units (Value-Add)
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-CAT-01 | Admin manages a **category tree** (e.g., Grocery → Beverages → Soft Drinks). | M |
| FR-CAT-02 | Each product assigned to one category; each category to one **unit of measure** default. | M |
| FR-CAT-03 | Reports/dashboards support **grouping by category** and **unit**. | S |
| FR-CAT-04 | Category/unit lists are configurable (add/edit/deactivate, no delete of in-use values). | S |

### 10.10 MODULE: Supplier Performance & Lead Time (Value-Add)
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-SUP-01 | System tracks actual **on-time delivery** per supplier (PO expected date vs. received date). | S |
| FR-SUP-02 | System computes a **supplier reliability score** (on-time % over a rolling window). | S |
| FR-SUP-03 | AI ordering may use the **effective lead time** (historical average) instead of the nominal lead time where data exists. | S |
| FR-SUP-04 | Admin views a supplier performance report. | S |

### 10.11 MODULE: Dashboard Widgets & KPIs (Value-Add)
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-DSH-01 | Dashboards show configurable KPI cards: total stock value, **inventory turnover**, low-stock count, out-of-stock count, today's sales. | S |
| FR-DSH-02 | Users (per role) can choose which widgets appear on their dashboard (role-constrained set). | C |
| FR-DSH-03 | Widgets are clickable for drill-down to underlying data. | S |

### 10.12 MODULE: Fast / Slow Mover Identification (Value-Add)
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-FSM-01 | System classifies each product as **Fast / Normal / Slow mover** based on sales velocity over a rolling period. | S |
| FR-FSM-02 | Slow movers are flagged (via status/color) to guide stocking decisions & reduce overstock (directly supports G-3). | S |
| FR-FSM-03 | Fast movers are prioritized for reorder/warehouse stocking by the AI. | S |
| FR-FSM-04 | Classification thresholds are configurable by Admin. | C |

### 10.13 MODULE: Perishable / Expiry Handling (Flag-level)
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-EXP-01 | Products can be marked **perishable** and given a **shelf-life** attribute. | S |
| FR-EXP-02 | System warns when a perishable SKU's estimated remaining shelf-life falls low (flag/alert). | C |
| FR-EXP-03 | Perishable SKUs are preferred for sale/consumption before non-perishable alternatives (advisory only). | C |
> **Scope guardrail:** Perishable handling is **flag/alert-only** — it does NOT include full lot/batch tracking, FEFO picking systems, or cold-chain IoT (those remain out of scope, see L-12).

### 10.14 MODULE: Bulk Import / Export (Value-Add)
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-BULK-01 | Admin can **export** products, inventory, sales, and POs to CSV. | S |
| FR-BULK-02 | Admin can **import** products and opening stock from a CSV template (with validation & error report). | S |
| FR-BULK-03 | Import runs are logged to audit (who, when, file, rows added/updated/failed). | S |

### 10.15 MODULE: Alert Preferences (Value-Add)
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-ALR-01 | Users can configure **in-app** alert preferences (low-stock, PO, expiry). | S |
| FR-ALR-02 | Optional **email** delivery of alerts to Admin/Seniors (uses configured email only; no SMS/customer marketing). | C |
| FR-ALR-03 | Alerts center lists all alerts with read/unread status. | M (from FR-SST-02.3) |

### 10.16 MODULE: Audit Log Viewer (Value-Add)
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-AUD-01 | Admin can **view the audit trail**: actor, action, entity, detail, timestamp, filtered & searchable. | S |
| FR-AUD-02 | Audit log is append-only; cannot be edited/deleted by any user. | M |
| FR-AUD-03 | Sensitive values are masked in audit logs (per FR-SEC-03). | M |

### 10.17 MODULE: Onboarding / Data Upload Wizard (Value-Add)
| # | Detailed Behavior | Pri |
|---|---|---|
| FR-ONB-01 | First-time setup **wizard** guides: add stores/warehouse → create admin/staff users → import products → map suppliers → set opening stock & safety stock. | S |
| FR-ONB-02 | Wizard is skippable and resumable; progress saved. | S |
| FR-ONB-03 | Wizard validates each step and shows clear error guidance. | S |

---

## 11. Non-Functional Requirements

| # | Category | Requirement | Pri |
|---|---|---|---|
| NFR-1 | Performance | Dashboards/inventory views load ≤ 3s under normal load. | M |
| NFR-2 | Performance | Data entered reflected in reports within 5 minutes (near real-time). | M |
| NFR-3 | Scalability | Supports 3 stores, multiple warehouses, ≥50 concurrent users. | M |
| NFR-4 | Availability | **Phase 1 (free tier):** best-effort availability on Vercel/Render + Supabase/Groq; free-tier sleep/cold-start accepted (GCP/AWS production target of 99.5% applies to **Phase 2** post-handover). | M |
| NFR-5 | Security | TLS for transit; encryption at rest. | M |
| NFR-6 | Security | Secure password hashing; rate-limited login. | M |
| NFR-7 | Data Protection | Sensitive product info masked (Section 14). | M |
| NFR-8 | Usability | Responsive UI; intuitive for non-technical staff. | M |
| NFR-9 | Maintainability | Modular, documented code. | S |
| NFR-10 | Reliability | Graceful errors; no data corruption on partial failure. | M |
| NFR-11 | Auditability | Audit log for significant actions. | M |
| NFR-12 | Backup/Recovery | Phase 1: provider-managed backups where available on free tier + scheduled exports. Phase 2 (post-handover): production RPO ≤24h, RTO ≤4h. | M |
| NFR-13 | Compliance | Data-protection best practices on the chosen providers (Vercel/Render for Phase 1; GCP/AWS security guidelines for Phase 2). | M |
| NFR-14 | Accessibility | Clear UI; single language in scope. | S |

---

## 12. User Roles & Permissions (RBAC)

> **This is the agreed permission model.** Detailed matrix finalized in the SRS.

| Module / Action | Admin | Store Staff | Sales Personnel | Senior Stakeholder |
|---|---|---|---|---|
| View stock (all locations) | ✅ | ✅ own store | 👁 read | ✅ |
| Stock-In / Out / Transfer / Adjust | ✅ | ✅ own store | ❌ | ❌ |
| Product master create/edit | ✅ | ❌ | ❌ | ❌ |
| Record sale | ✅ | ❌ | ✅ | ❌ |
| View sales reports | ✅ | ❌ | ✅ | ✅ |
| Store comparison | ✅ | ❌ | ✅ | ✅ |
| Configure safety stock / reorder | ✅ | ❌ | ❌ | 👁 |
| Manage suppliers / POs | ✅ | 📦 receive | ❌ | 👁 |
| View AI recommendations | ✅ | ❌ | ❌ | ✅ |
| Executive dashboard | ✅ | ❌ | ❌ | ✅ |
| User management | ✅ | ❌ | ❌ | ❌ |
| Unmasked sensitive data | ✅ | 👁 masked | 👁 masked | as authorized |

**Legend:** ✅ Full · 👁 View · ❌ None · 📦 Conditional (assigned)

---

## 13. Business Process Flows — Step by Step

### 13.1 Record a Sale (drives stock-out + reorder)
```
1. Sales person opens Sale screen
2. Selects store
3. Adds line items (SKU, qty, price)  [system validates stock]
4. Saves sale
5. System decrements store's on-hand stock for each line
6. System updates daily/quarterly/yearly sales
7. System checks each line: on-hand ≤ reorder point?
     No → done
     Yes → go to AI automated ordering (13.4)
```

### 13.2 Receive Goods (Stock-In)
```
1. Goods arrive from supplier
2. Staff records Stock-In (SKU, qty, destination) OR against an open PO
3. System increases on-hand stock at destination
4. If PO-linked: PO status → Partially Received / Received
5. System re-evaluates stock status (may clear low-stock alert)
```

### 13.3 Transfer Between Locations
```
1. User creates transfer (SKU, qty, from, to)
2. System validates from-stock sufficient
3. System decreases from; increases to
4. Audit logged
```

### 13.4 AI Automated Ordering
```
1. Product on-hand ≤ reorder point (step 7 above, or cycle/adjust)
2. System checks: auto-order enabled for this SKU? open PO exists?
     a. Not enabled → only low-stock alert; no PO
     b. Open PO exists → skip (no duplicate) unless configured otherwise
3. AI computes reorder qty = max(0, target_level − current_stock − open_po_qty) adjusted by forecast/lead time
4. System creates PO draft to the SKU's configured supplier
5. (If auto-approve) PO → Sent/Ordered; else Admin approves
6. Supplier delivers → Goods-In → stock updated → PO Received
```

### 13.5 AI Warehouse Stock Recommendation
```
1. System gathers historical sales per SKU
2. AI forecasts demand (trend + lead time + seasonality where data allows)
3. AI computes recommended warehouse stock level + safety stock
4. Presents recommendation with rationale
5. User accepts / modifies / rejects (logged)
```

### 13.6 Onboard a New Product
```
1. Admin creates SKU (name, category, unit, prices)
2. Admin sets safety stock / reorder point / target (manual or AI-suggest)
3. Admin maps supplier + lead time + auto-order on/off
4. Admin picks locations; initial stock entered (can be 0)
5. Product now visible & tracked
```

---

## 14. Data Model & Data Masking

### 14.1 Core Entities (Database tables)
- **users** (id, name, email, password_hash, role, store_id, status, created_at)
- **stores** (id, name, city, address, status)
- **warehouses** (id, name, address, status)
- **products** (id, sku_code, name, description, category, unit, cost_price, sale_price, status)
- **suppliers** (id, name, contact, phone, email, lead_time_days, status)
- **supplier_products** (id, supplier_id, product_id)
- **locations** (id, type [store/warehouse], ref_id)
- **inventory** (id, product_id, location_id, qty_on_hand)
- **safety_stock_rules** (id, product_id, location_id, safety_stock, reorder_point, target_level, auto_order_enabled)
- **purchase_orders** (id, po_number, supplier_id, destination_id, status, order_date, expected_date, approved_by)
- **po_lines** (id, po_id, product_id, qty, received_qty)
- **sales** (id, store_id, sale_datetime, total, status)
- **sale_lines** (id, sale_id, product_id, qty, unit_price, line_total)
- **stock_movements** (id, product_id, location_id, type, qty, ref_id, reason, created_by, created_at) — audit
- **alerts** (id, type, product_id, location_id, message, target_role, read, created_at)
- **ai_recommendations** (id, product_id, location_id, type, recommended_value, reasoning, accepted, created_at)
- **audit_logs** (id, actor_id, action, entity, detail, created_at)

### 14.2 Data Masking — Detailed Rules
- **Purpose:** Protect sensitive product information from unauthorized visibility (esp. cost/margin data and supplier commercial terms).
- **Fields marked sensitive (masked):** product **cost_price**, computed/supplier **margin**, supplier **financial/commercial** fields, and any field flagged sensitive in the SRS.
- **DB layer:** sensitive columns stored masked/encrypted or tokenized so raw values aren't directly readable in the database.
- **App layer:** unauthorized roles see masked form (e.g., `$**` or `••••`); authorized roles (Admin + explicitly authorized) see full values via a **logged** access path.
- **Guarantees:** sensitive values never appear in: API responses to unauthorized roles, logs, or exports (exports respect the caller's permission).

> **NOTE:** The exact list of masked fields is **finalized in the SRS** (next document). Changing the mask list after BRD sign-off = Change Request.

---

## 15. AI Engine — Detailed Behavior

> Vaultory's "AI" combines a **deterministic demand-forecast + rule engine** with **LLM reasoning via the Groq API**. The rule engine enforces safety/reorder/consent and quantity math; the Groq-backed service produces forecasts and plain-language, **explainable** recommendations. Every decision is **auditable** and **never overrides configured consent** (auto-ordering must be enabled; recommendations are advisory). Groq API keys are stored as secret environment variables and never committed.

### 15.1 Automated Ordering — Trigger & Quantity
- **Trigger:** on-hand ≤ reorder point AND auto-order enabled AND no blocking open PO.
- **Quantity formula:**
  `reorder_qty = max(0, target_level − qty_on_hand − qty_already_on_open_PO)`
  then refined by forecast demand over the lead-time window.
- **Output:** Auto-PO to the product's mapped supplier with expected date = today + lead time.
- **Edge cases:**
  - No supplier mapped → raise alert "no supplier for auto-order"; do NOT create PO.
  - Auto-order disabled → low-stock alert only.
  - No sales history → fall back to configured default quantity.
  - Multiple products hitting threshold → batched into PO efficiencies where configured.

### 15.2 Warehouse Stock-Level Recommendation
- **Goal:** Suggest how much inventory to hold in each warehouse per product.
- **Method:** Base = forecast demand × (lead time + safety buffer), bounded by [safety stock, target level].
- **Output:** recommended warehouse level + recommended safety stock, with a plain-language rationale (e.g., "based on last 90 days, expected ~120 units/wk; recommend holding 240 units to cover 2-week lead time + buffer").
- **Acceptance:** user may **accept** (applies as target), **modify**, or **reject** (logged in ai_recommendations).

### 15.3 Explainability & Audit Guarantees
- Every recommendation/order records: inputs (on-hand, target, open PO, lead time, forecast), the computed value, and `accepted/rejected`.
- The Groq-generated rationale is stored alongside each recommendation for audit and transparency.
- AI **never** bypasses RBAC or the auto-order consent flag (FR-E7 / FR-AI-01.1).

> **Scope note (avoids AI scope-creep):** AI covers (1) auto-ordering, (2) warehouse stock recommendations, and (3) demand forecasting to support these. It does **not** include general predictive analytics, custom model training, chat/AI assistants, or other AI use-cases (see L-21).

---

## 16. Reports & Monitoring

| Report / Dashboard | Frequency | Audience | Key Metrics |
|---|---|---|---|
| Daily Sales Report | Auto, daily | Sales, Admin | units & value by store/product |
| Quarterly Sales Report | Auto, quarterly | Sales, Seniors | by store/product, QoQ trend |
| Yearly Sales Report | Auto, yearly | Seniors | annual totals, best sellers, store compare |
| Inventory Status | Real-time | Admin, Staff | on-hand, low/out/over stock |
| Safety Stock / Reorder | Real-time | Admin | at/below reorder, pending POs |
| PO Status | On-demand | Admin | open POs, expected dates, received |
| Executive Dashboard | Real-time | Seniors | inventory health + sales summary |
| AI Recommendation Report | On-demand | Admin, Seniors | recommended vs. actual |

**Export:** All reports exportable to CSV/PDF. **Auto-generation:** Daily/Quarterly/Yearly are automatic (FR-SAL-02.5).

---

## 17. Assumptions & Dependencies

### 17.1 Assumptions
1. Client operates **3 retail stores** (+ warehouses); system scoped for this.
2. **Single currency** and **single language**.
3. Sales are **entered manually** into Vaultory (no external POS).
4. Client provides **master data** (products, suppliers, stores, warehouses) and **initial stock counts** during onboarding/UAT.
5. **Internet connectivity** required; no offline mode.
6. Data masking field list is finalized in the SRS; default (cost/margin/supplier-financial) applies until then.
7. AI uses in-system sales history; products with no history fall back to configurable defaults.
8. **Phase-1 hosting access** — delivery team has free-tier accounts for **Vercel (frontend)** and **Render (backend, 750 hrs/mo)** to deploy and keep the final product live.
9. Client assigns a **single point of contact** and gives **timely sign-offs**.
10. Initial safety-stock/reorder values provided by client OR accepted from AI suggestions.
11. **Phase-2 production hosting (GCP/AWS) happens AFTER handover** and is a separate engagement; it is NOT included in this delivery.

### 17.2 Dependencies
1. Accurate master data & initial counts from client.
2. Free-tier hosting accounts on **Vercel** and **Render** (one project/account each).
3. BRD + SRS sign-off.
4. Timely UAT feedback.
5. Stable free-tier database service on the Phase-1 host.

---

## 18. Constraints & Limitations

### 18.1 Technical Constraints
1. Must be **deployed & kept live** on **Vercel (frontend)** + **Render (Node.js backend/AI)** + **Supabase (Postgres/Auth/Storage)** free tier for the final product (Phase 1). **GCP/AWS are reserved for post-handover** production (Phase 2) and are out of scope for this delivery.
2. Data persisted in a **database** (relational — **PostgreSQL**, hosted via **Supabase**).
3. Sensitive product info **masked**.
4. Web-based, responsive; no native mobile apps (L-1).
5. Frontend **must** use **React + Tailwind + shadcn/ui**; backend **must** use **Node.js (Express/NestJS)**; database/auth/storage via **Supabase**; AI via the **Groq API** (per Section 8.4 locked stack).
6. Free-tier limits apply: **1 project on Vercel (Hobby)** and **~750 hrs/month on Render** per account; **Supabase free** (DB/Auth/Storage) and **Groq free-tier credits**. Free-tier services may sleep/idle and have lower availability (see NFR-4).

### 18.2 Schedule / Resource Constraints
1. **Agile/Scrum** delivery; fixed sprint cadence (see Sprint Planner).
2. **Single team of 5 members** — PM, BA, SA, SM, Tech Lead (see Project Team). Like most student projects, delivery runs as a collaborative single unit on a fixed timeline.
3. Fixed timeline & budget; scope changes only via CR.

### 18.3 Functional Constraints
1. Single currency, single language.
2. Exactly up to 3 stores in scope.
3. RPO ≤ 24h, RTO ≤ 4h backups.

> **See also:** the full Out-of-Scope limitation list in **Section 9**.

---

## 19. Acceptance Criteria

**Vaultory is accepted when ALL of the following pass UAT and are signed off:**

| # | Acceptance Criterion | Maps To |
|---|---|---|
| AC-1 | Real-time stock levels visible for every product across all 3 stores & warehouses | FR-INV-03, G-1 |
| AC-2 | Staff can do Stock-In/Out/Transfer/Adjustment; stock updates correctly & no negative stock | FR-INV-04..07 |
| AC-3 | Sales recorded; stock decremented; day/quarter/year reports generated & exportable | FR-SAL-01..02 |
| AC-4 | Safety stock & reorder configurable; low-stock alerts fire | FR-SST-01..02 |
| AC-5 | Auto-PO generated when product ≤ reorder point (when enabled), with correct quantity | FR-AI-01, FR-PRO-03 |
| AC-6 | PO lifecycle trackable; receiving stock updates inventory | FR-PRO-04..05 |
| AC-7 | AI recommends warehouse levels with rationale; accept/modify/reject works | FR-AI-02 |
| AC-8 | Sales personnel see per-store & cross-store performance | FR-MON-01 |
| AC-9 | Senior stakeholders access executive dashboard (inventory + sales, drill-down) | FR-MON-02 |
| AC-10 | Login + RBAC enforced; users only see permitted data/menus | FR-USER |
| AC-11 | Sensitive product info masked in DB & to unauthorized roles | FR-SEC |
| AC-12 | App **deployed & kept live** on Vercel (frontend) + Render (Node.js backend/AI) + Supabase (Postgres/Auth/Storage) free tier with a working database | NFR-4, G-9, §8.5 |
| AC-13 | Dashboards ≤3s; near-real-time updates | NFR-1, NFR-2 |
| AC-14 | Client confirms all Out-of-Scope items (Section 9) by signature | Section 9 |

---

## 20. Risks & Mitigations

| # | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| R-1 | **Scope creep** (client adds features mid-build) | High | High | Signed BRD baseline; In/Out of Scope lists; formal CR process (§21) |
| R-2 | Inaccurate master data / initial stock | High | Med | Data-entry templates, onboarding checklist, UAT validation, cycle counts |
| R-3 | Ambiguous requirements → rework | Med | Med | BRD → SRS, walkthroughs, traceability, early sign-offs |
| R-4 | AI forecast inaccuracy → low adoption | Med | Med | Explainable AI, fallback defaults, advisory-only, UAT education |
| R-5 | Masking misconfiguration → data exposure | High | Med | SA security review, least-privilege, masking tests, audit logs |
| R-6 | Small-team (5 members) delivery & dependency on each role-holder | Med | High | MoSCoW-prioritized backlog, time-boxed sprints, Musts first; clear role ownership to avoid bottlenecks |
| R-7 | Free-tier hosting limits (sleep/cold-start/uptime) affecting live demo | Med | Med | Use Vercel/Render/Supabase/Groq free tiers within limits; 1 project/account; store Groq/Supabase keys as secrets; communicate free-tier availability (NFR-4); Phase 2 (GCP/AWS) as a separate Change Request if a guaranteed SLA is needed |
| R-8 | Delayed sign-off / UAT feedback | Med | Med | Agreed response times, scheduled checkpoints |
| R-9 | Data loss / corruption | High | Low | Automated backups, defined RPO/RTO, restore testing |

---

## 21. Change Management & Scope Control

### 21.1 Change Request Process
1. Requester submits a **Change Request Form (CRF)**: description, business need, priority.
2. **BA/PM** assess impact: scope, schedule, cost, resources, risk.
3. Impact presented to client for decision.
4. Client **approves or rejects** formally.
5. If approved → scheduled in a future sprint with updated plan; if rejected → no work.
6. Approved changes tracked in a change log.

### 21.2 Defect vs. Enhancement
- **Defect (free fix):** a documented in-scope feature does not work as specified.
- **Enhancement (CR):** any request for functionality not already written in this BRD — requires a CR.

### 21.3 Scope Control Rules
- Only sign-off-authorized requirements are built.
- Out-of-scope items (§9) are not built unless via approved CR.
- The BRD baseline only changes via approved CRs.

---

## 22. Future Scope (Deferred — Not in v1.0)

1. Native mobile apps (iOS/Android).
2. POS / barcode / hardware integration.
3. Customer-facing e-commerce & payments.
4. Accounting / tax / GST.
5. CRM / loyalty / promotions.
6. Data migration from legacy systems.
7. Multi-language / multi-currency.
8. Stores beyond 3.
9. Supplier self-service portal.
10. Advanced ML / predictive analytics platform.

> Each item above would need separate scoping & agreement. None are part of Vaultory v1.0.

---

## 23. Appendix

### 23.1 Name Rationale
**Vaultory** — the company and project share one name. "Vault" evokes a trusted, secure storehouse and control room, fitting for an inventory & sales command center; the product's promise is captured by the tagline "Your stock, in sync with your sales" (addressing the client's core pain: demand & supply not in sync).

### 23.2 Traceability (Problem Statement → Requirements)
Every "Sir said" point maps to covered requirements:
| Problem-statement point | Requirement(s) |
|---|---|
| 3 stores in the city | FR-INV-02, §8.3 |
| Understand how much stored in inventory | FR-INV-03, AC-1 |
| Demand & supply not in sync | G-2..G-4, AI §15 |
| What/how much selling — daily, quarterly, yearly | FR-SAL-02, AC-3 |
| Store staff manage inventory & order when down | FR-INV-04..07, FR-PRO |
| Maintain & track ideal safety stock | FR-SST, AC-4 |
| Sales people monitor per-store performance | FR-SAL-03, FR-MON-01 |
| Automated ordering when safety stock down (AI) | FR-AI-01, §15.1 |
| AI suggests warehouse inventory level | FR-AI-02, §15.2 |
| Data in database | FR-INV/SAL, §14 |
| Deployed & managed (live) — GCP/AWS for post-handover | NFR-4, G-9, §8.5 |
| Product info masked | FR-SEC, §14.2 |
| Monitoring system for senior stakeholders | FR-MON-02, AC-9 |

### 23.3 Client Sign-off Checklist
- [ ] Confirm 3-store scope (Section 8 → not beyond L-14).
- [ ] Review & accept Out-of-Scope list (Section 9).
- [ ] Confirm **technology stack** — React + Tailwind + shadcn/ui frontend, Node.js backend (Express/NestJS) + AI via Groq API, Supabase (PostgreSQL/Auth/Storage) (Section 8.4).
- [ ] Confirm **Deployment: Vercel (frontend) + Render (backend) free tier kept live** for the final product; GCP/AWS reserved for **post-handover** only (Sections 8.4–8.5).
- [ ] Confirm masking fields in SRS (Section 14).
- [ ] Confirm AI scope = auto-ordering + warehouse recommendation only (Section 15).
- [ ] Confirm value-add modules (categories, fast/slow movers, supplier performance, dashboards, bulk import/export, audit viewer, onboarding wizard) are in scope and may be prioritized/trimmed at sprint planning (Section 8.1 / 10.9–10.17).
- [ ] Confirm single currency / single language (Section 17).
- [ ] Confirm project name "Vaultory" (Section 2).
- [ ] Sign BRD to approve the baseline.

---

## Approval Sign-off

By signing, the client confirms agreement with all contents, including the **In-Scope** (§8), **Out-of-Scope/ Limitations** (§9), **Acceptance Criteria** (§19), and **Change Management** process (§21).

| Role | Name | Signature | Date |
|---|---|---|---|
| Client / Sponsor | Prof | | |
| Project Manager | Laxman Patel | | |
| Business Analyst | Ved Naik | | |
| Solutions Architect | Anoop Gupta | | |
| Scrum Master | Devdarshan S | | |
| Tech Lead | Rohan Vashisht | | |

---

*End of BRD — Version 3.3 · Project: Vaultory · Team: Vaultory*
