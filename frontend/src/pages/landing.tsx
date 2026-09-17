import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  ArrowRight,
  ShoppingCart,
  Boxes,
  Truck,
  PackageCheck,
  ShieldCheck,
  Store,
  Warehouse,
  ChevronDown,
  ChevronUp,
  Cpu,
  Database,
  Zap,
  Lock,
  ScanLine,
  Check,
  Activity,
  FileCheck2,
  ArrowRightLeft,
  LogIn,
} from 'lucide-react'
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui'
import { ModeToggle } from '@/components/theme'
import { useAuthStore } from '@/stores'

// ---------------------------------------------------------------------------
// Workflow Steps (Conceptual, zero hardcoded values/data)
// ---------------------------------------------------------------------------

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Central Catalog & Distribution',
    desc: 'Central warehouse establishes master product definitions, barcode standards, and store-specific safety buffers.',
    icon: Warehouse,
  },
  {
    step: '02',
    title: 'POS Checkout & Live Stock Depletion',
    desc: 'Cashiers scan barcodes at checkout counters; sales tender instantly while deducting local on-hand inventory.',
    icon: ShoppingCart,
  },
  {
    step: '03',
    title: 'Autonomous Condition Monitoring',
    desc: 'Background engine continuously evaluates available stock against reorder thresholds to prevent retail stockouts.',
    icon: Activity,
  },
  {
    step: '04',
    title: 'Supplier Routing & Order Lifecycle',
    desc: 'Automated purchase orders dispatch to preferred suppliers with lead-time tracking and duplicate protection.',
    icon: Truck,
  },
  {
    step: '05',
    title: 'Dock Inspection & Stock Reconciliation',
    desc: 'Goods-in receiving verifies delivered quantities against order lines, automatically updating inventory ledgers.',
    icon: PackageCheck,
  },
]

// ---------------------------------------------------------------------------
// Core Capability Highlights
// ---------------------------------------------------------------------------

const CAPABILITIES = [
  {
    title: 'Multi-Store Stock Visibility',
    desc: 'Unify central warehouses with all branch retail outlets in a single coordinated pane.',
    icon: Boxes,
    features: [
      'Store-specific safety buffers & reorder points',
      'Inter-store stock transfer & transit tracking',
      'Automated low-stock notifications & warnings',
      'Central warehouse allocation control',
    ],
  },
  {
    title: 'Barcode-First Point of Sale',
    desc: 'Fast, responsive checkout terminal tailored for high-volume retail counters.',
    icon: ShoppingCart,
    features: [
      'Handheld USB & Bluetooth barcode scanner support',
      'Instant local stock deduction upon completed tender',
      'Split payments via UPI, Credit/Debit cards, and Cash',
      'Receipt printing and audit-logged sale returns',
    ],
  },
  {
    title: 'Autonomous Purchase Orders',
    desc: 'Complete lifecycle progression from stock alert to goods-in dock verification.',
    icon: PackageCheck,
    features: [
      'Condition-triggered automated purchase order drafts',
      'Duplicate order prevention safeguards',
      'Partial and complete line-item goods-in receiving',
      'Closed-loop audit logging and ledger updates',
    ],
  },
  {
    title: 'Supplier & Lead-Time Analytics',
    desc: 'Maintain vendor contracts, product mappings, and fulfillment reliability.',
    icon: Truck,
    features: [
      'Direct supplier-to-product catalog relationships',
      'Supplier-specific lead-time window tracking',
      'Fulfillment punctuality & performance ratings',
      'Vendor contact records & procurement terms',
    ],
  },
  {
    title: 'AI Demand Forecasting',
    desc: 'Predictive intelligence modeling sales velocity and replenishment requirements.',
    icon: Cpu,
    features: [
      'Groq-accelerated seasonal demand predictions',
      'Deterministic statistical fallback engine',
      'Safety stock buffer optimization recommendations',
      'Human-in-the-loop managerial approval workflow',
    ],
  },
  {
    title: 'Enterprise RBAC & Audit Trails',
    desc: 'Comprehensive governance, store scoping, and transaction accountability.',
    icon: ShieldCheck,
    features: [
      'Scoped roles for Admins, Store Staff, and Cashiers',
      'Immutable audit trail recording every inventory adjustment',
      'Multi-period executive sales and performance reports',
      'Secure tokenized authentication and access control',
    ],
  },
]

// ---------------------------------------------------------------------------
// FAQ Items
// ---------------------------------------------------------------------------

const FAQ_ITEMS = [
  {
    q: 'How does Vaultory synchronize stock between central warehouses and branch stores?',
    a: 'Vaultory operates on a centralized relational PostgreSQL backbone with real-time transactional updates. Whenever a sale is registered at any retail counter, local inventory decreases immediately. Stock transfers between central storage and branch storefronts are tracked throughout transit with complete auditability.',
  },
  {
    q: 'How does automated Purchase Order triggering work?',
    a: 'Vaultory continuously compares on-hand inventory plus incoming on-order quantities against your configured reorder points. When available stock breaches the defined threshold, an automated purchase order draft is generated for the assigned supplier, preventing duplicate pending orders.',
  },
  {
    q: 'Does the Point-of-Sale (POS) terminal support physical barcode scanners?',
    a: 'Yes. The POS terminal includes a barcode-first keyboard listener compatible with standard USB and Bluetooth handheld scanners. Products scan instantly into the cart for rapid customer checkout.',
  },
  {
    q: 'What user roles and access controls are available?',
    a: 'Vaultory provides role-based access control (RBAC) out of the box: Admin (full system access & global settings), Store Staff (store inventory management, PO receiving, threshold adjustments), Sales Personnel (POS register, checkout, returns), and Senior Stakeholder (executive reports and performance analytics).',
  },
  {
    q: 'Can store cashiers continue operating if local connectivity fluctuates?',
    a: 'Yes. The retail application utilizes optimistic state updates and client-side caching to ensure counter transactions proceed smoothly, synchronizing back with the central server once network stability returns.',
  },
  {
    q: 'How do I access the operational dashboard?',
    a: 'To maintain enterprise security and data isolation, the operational dashboard is accessible exclusively after signing in with authorized staff credentials or creating an approved account.',
  },
]

export default function HomePage() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* ----------------------------------------------------------------- */}
      {/* 1. STICKY GLASSMORPHIC NAVBAR */}
      {/* ----------------------------------------------------------------- */}
      <header
        id="landing-nav"
        className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl transition-all"
      >
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group cursor-pointer">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-md shadow-primary/20 transition-transform group-hover:scale-105">
              <Sparkles className="size-5" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text">
                Vaultory
              </span>
              <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                Retail Operating System
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
            <a href="#overview" className="hover:text-foreground transition-colors">
              Overview
            </a>
            <a href="#workflow" className="hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="#modules" className="hover:text-foreground transition-colors">
              Modules
            </a>
            <a href="#architecture" className="hover:text-foreground transition-colors">
              Architecture
            </a>
            <a href="#faq" className="hover:text-foreground transition-colors">
              FAQ
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            <ModeToggle />
            {isAuthenticated && user ? (
              <Button asChild size="sm" className="gap-2 shadow-sm">
                <Link to="/dashboard" id="nav-btn-dashboard">
                  <Activity className="size-4" />
                  <span>Enter Dashboard</span>
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm" className="gap-1.5 shadow-sm shadow-primary/20">
                <Link to="/login" id="nav-btn-login">
                  <LogIn className="size-3.5" />
                  <span>Sign In</span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ----------------------------------------------------------------- */}
      {/* 2. HERO SECTION (Clean, zero mock values/data) */}
      {/* ----------------------------------------------------------------- */}
      <section id="overview" className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28 border-b border-border/40">
        {/* Subtle decorative background glows */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-[130px] dark:bg-primary/15" />
        <div className="pointer-events-none absolute top-1/2 -right-40 -z-10 h-72 w-72 rounded-full bg-primary/5 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-0 -left-40 -z-10 h-72 w-72 rounded-full bg-primary/5 blur-[100px]" />

        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary shadow-inner mb-6">
              <Sparkles className="size-3.5" />
              <span>Multi-Store Retail Inventory & Procurement Platform</span>
            </div>

            {/* Master Headline */}
            <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Synchronize Inventory.{' '}
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                Automate Procurement.
              </span>{' '}
              Unify Every Store.
            </h1>

            {/* Subheading */}
            <p className="mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
              Vaultory connects central distribution warehouses with retail storefronts. Built for
              zero-discrepancy stock management, high-speed barcode checkout, autonomous purchase orders,
              and AI-powered replenishment.
            </p>

            {/* Authenticated / Unauthenticated CTA buttons */}
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
              {isAuthenticated ? (
                <Button asChild size="lg" className="gap-2.5 px-7 shadow-lg shadow-primary/25 text-base">
                  <Link to="/dashboard" id="hero-cta-dashboard">
                    <Activity className="size-5" />
                    <span>Open Operational Dashboard</span>
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg" className="gap-2 px-7 shadow-lg shadow-primary/25 text-base">
                    <Link to="/login" id="hero-cta-login">
                      <LogIn className="size-4.5" />
                      <span>Sign In to Access Dashboard</span>
                      <ArrowRight className="size-4 ml-1" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild className="text-base">
                    <a href="#workflow" id="hero-cta-workflow">
                      <span>Explore How It Works</span>
                    </a>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 3. HOW IT WORKS / END-TO-END RETAIL WORKFLOW */}
      {/* ----------------------------------------------------------------- */}
      <section id="workflow" className="py-20 bg-muted/20 border-b border-border/40">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="outline" className="mb-3 border-primary/30 text-primary">
              Operational Workflow
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How Vaultory Powers Multi-Store Retail
            </h2>
            <p className="mt-3 text-muted-foreground">
              A unified pipeline that coordinates master inventory, counter sales, automated reordering,
              and supplier shipments across your entire chain.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-5">
            {WORKFLOW_STEPS.map((step, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl border border-border/70 bg-card/60 flex flex-col justify-between hover:border-primary/50 transition-all hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <step.icon className="size-5" />
                    </div>
                    <span className="text-xs font-mono font-bold text-muted-foreground">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-foreground mb-2">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 4. CORE FEATURE MODULES */}
      {/* ----------------------------------------------------------------- */}
      <section id="modules" className="py-20 border-b border-border/40">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="outline" className="mb-3 border-primary/30 text-primary">
              Platform Modules
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Complete Retail Management Capabilities
            </h2>
            <p className="mt-3 text-muted-foreground">
              Purpose-built modules designed to eliminate manual tracking, prevent stockouts, and maintain
              complete operational transparency.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((cap, idx) => (
              <Card
                key={idx}
                className="border-border/70 hover:border-primary/50 transition-all hover:shadow-lg bg-card/60 flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                    <cap.icon className="size-5" />
                  </div>
                  <CardTitle className="text-lg">{cap.title}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed">{cap.desc}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 pt-1">
                  <ul className="space-y-2 text-xs text-muted-foreground border-t border-border/40 pt-3">
                    {cap.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2">
                        <Check className="size-3.5 text-primary shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 5. ARCHITECTURAL SHOWCASE TABS */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-20 bg-muted/20 border-b border-border/40">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Badge variant="outline" className="mb-3 border-primary/30 text-primary">
              System Design
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Enterprise Hub-and-Spoke Mechanics
            </h2>
            <p className="mt-3 text-muted-foreground">
              Understand how Vaultory balances central warehouse distribution with edge retail checkouts.
            </p>
          </div>

          <Tabs defaultValue="sync-arch" className="w-full">
            <div className="flex justify-center mb-8">
              <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full max-w-3xl min-h-12 p-1.5 bg-muted/60 dark:bg-card/80 border border-border/80 rounded-xl gap-1.5 shadow-xs">
                <TabsTrigger
                  value="sync-arch"
                  className="py-2.5 px-3 text-xs sm:text-sm font-medium gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm cursor-pointer"
                >
                  <Boxes className="size-4 text-primary" />
                  <span>Multi-Location Sync</span>
                </TabsTrigger>
                <TabsTrigger
                  value="pos-arch"
                  className="py-2.5 px-3 text-xs sm:text-sm font-medium gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm cursor-pointer"
                >
                  <ScanLine className="size-4 text-primary" />
                  <span>POS Edge Checkout</span>
                </TabsTrigger>
                <TabsTrigger
                  value="po-arch"
                  className="py-2.5 px-3 text-xs sm:text-sm font-medium gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm cursor-pointer"
                >
                  <FileCheck2 className="size-4 text-primary" />
                  <span>PO State Machine</span>
                </TabsTrigger>
                <TabsTrigger
                  value="ai-arch"
                  className="py-2.5 px-3 text-xs sm:text-sm font-medium gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm cursor-pointer"
                >
                  <Cpu className="size-4 text-primary" />
                  <span>Predictive Replenishment</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: MULTI-LOCATION SYNC */}
            <TabsContent value="sync-arch" className="focus-visible:outline-none">
              <Card className="border-border/80 shadow-md">
                <CardHeader className="border-b border-border/50 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Boxes className="size-5 text-primary" />
                    <span>Hub-and-Spoke Inventory Architecture</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Central Warehouses maintain bulk replenishment stock while retail stores manage localized safety buffers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 grid md:grid-cols-3 gap-6">
                  <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                      <Warehouse className="size-4 text-primary" />
                      <span>Central Warehouse Hub</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Acts as the primary intake point for supplier purchase orders. Distributes bulk stock to branch
                      locations based on store-level replenishment requests.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                      <ArrowRightLeft className="size-4 text-primary" />
                      <span>Inter-Store Transfers</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Enables lateral stock transfers between retail branches during localized demand surges,
                      complete with transit status logging.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                      <Store className="size-4 text-primary" />
                      <span>Branch Retail Outlets</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Maintains independent safety stock buffers and reorder thresholds tailored to the store's
                      physical capacity and customer traffic.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: POS CHECKOUT */}
            <TabsContent value="pos-arch" className="focus-visible:outline-none">
              <Card className="border-border/80 shadow-md">
                <CardHeader className="border-b border-border/50 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ScanLine className="size-5 text-primary" />
                    <span>Counter POS Architecture & Real-Time Depletion</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Direct integration between retail cashier terminals and back-office inventory records.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 grid md:grid-cols-3 gap-6">
                  <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                    <div className="font-semibold text-sm text-foreground">Barcode-First Input</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Hardware-agnostic input listener automatically parses scanned barcodes, verifies SKU
                      definitions, and adds items directly to the active customer ticket.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                    <div className="font-semibold text-sm text-foreground">Multi-Tender Settlement</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Accommodates split tenders across UPI QR, debit/credit cards, and cash tenders with
                      instant GST tax invoice computations and digital receipts.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                    <div className="font-semibold text-sm text-foreground">Atomic Inventory Deduction</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Transaction completion immediately decrements available store on-hand stock, preventing
                      concurrent overselling across multiple checkout lanes.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: PO STATE MACHINE */}
            <TabsContent value="po-arch" className="focus-visible:outline-none">
              <Card className="border-border/80 shadow-md">
                <CardHeader className="border-b border-border/50 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileCheck2 className="size-5 text-primary" />
                    <span>Purchase Order Lifecycle Progression</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Structured state transitions guarantee traceability from automated creation to dock closing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { state: 'Draft', desc: 'Auto-triggered or manually prepared; editable line items' },
                      { state: 'Sent', desc: 'Dispatched to supplier; pending delivery confirmation' },
                      { state: 'Partial', desc: 'Dock verified initial shipment; awaiting remaining lines' },
                      { state: 'Received', desc: 'All ordered items inspected and verified at dock' },
                      { state: 'Closed', desc: 'Inventory counts updated and transaction audited' },
                    ].map((st, i) => (
                      <div key={i} className="p-3.5 rounded-xl border border-border/60 bg-card space-y-1">
                        <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                          Stage 0{i + 1}
                        </Badge>
                        <div className="font-semibold text-sm text-foreground mt-1">{st.state}</div>
                        <p className="text-[11px] text-muted-foreground leading-tight">{st.desc}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 4: AI FORECASTING */}
            <TabsContent value="ai-arch" className="focus-visible:outline-none">
              <Card className="border-border/80 shadow-md">
                <CardHeader className="border-b border-border/50 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Cpu className="size-5 text-primary" />
                    <span>Predictive Demand & Reorder Intelligence</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Combining historical sales velocity with supplier delivery lead times to prevent stockouts.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 grid md:grid-cols-3 gap-6">
                  <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                    <div className="font-semibold text-sm text-foreground">Velocity Modeling</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Evaluates rolling sales velocities, day-of-week seasonality, and product turnover trends
                      to forecast upcoming replenishment needs.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                    <div className="font-semibold text-sm text-foreground">Lead-Time Windowing</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Factors in each supplier's historical fulfillment window so orders trigger early enough
                      to arrive before the safety buffer depletes.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                    <div className="font-semibold text-sm text-foreground">Human-in-the-Loop Review</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Store managers review, accept, modify, or reject AI replenishment suggestions with full
                      explanatory rationale.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 6. TECHNICAL ARCHITECTURE & SECURITY */}
      {/* ----------------------------------------------------------------- */}
      <section id="architecture" className="py-20 border-b border-border/40">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="outline" className="mb-3 border-primary/30 text-primary">
              Enterprise Foundation
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Reliable, Resilient Infrastructure
            </h2>
            <p className="mt-3 text-muted-foreground">
              Engineered with relational data consistency, encrypted sessions, and offline fallback resilience.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="p-6 rounded-2xl border border-border/70 bg-card/60 space-y-3">
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Database className="size-5" />
              </div>
              <h3 className="text-base font-bold">Relational PostgreSQL Core</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                ACID transaction guarantees prevent stock overselling even when multiple store cashiers checkout
                the same product simultaneously across different branches.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border/70 bg-card/60 space-y-3">
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Zap className="size-5" />
              </div>
              <h3 className="text-base font-bold">Offline-Resilient Edge Caching</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Counter POS checkouts utilize optimistic client-side queuing. If retail internet drops,
                sales continue locally and reconcile once the connection re-establishes.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border/70 bg-card/60 space-y-3">
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Lock className="size-5" />
              </div>
              <h3 className="text-base font-bold">Role Scoping & Auditing</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Cryptographic session tokens, server-side role clamping, and immutable audit logs record
                every stock adjustment, sales receipt, and PO state change.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 7. FREQUENTLY ASKED QUESTIONS (FAQ) */}
      {/* ----------------------------------------------------------------- */}
      <section id="faq" className="py-20 bg-muted/20 border-b border-border/40">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3 border-primary/30 text-primary">
              Got Questions?
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-3 text-muted-foreground">
              Answers regarding deployment, multi-store synchronization, hardware, and access control.
            </p>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx
              return (
                <div
                  key={idx}
                  id={`faq-item-${idx}`}
                  className="rounded-xl border border-border/70 bg-card overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between font-semibold text-sm sm:text-base hover:text-primary transition-colors cursor-pointer"
                  >
                    <span>{item.q}</span>
                    {isOpen ? (
                      <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                      {item.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 8. CALL TO ACTION BANNER */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-20 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
            Ready to Unify Your Retail Chain?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Log in with your store credentials or register a staff account to access the live dashboard,
            manage inventory, and operate counter checkouts.
          </p>
          <div className="mt-8 flex justify-center">
            {isAuthenticated ? (
              <Button asChild size="lg" className="px-8 shadow-lg shadow-primary/20 text-base">
                <Link to="/dashboard" id="footer-cta-dashboard">
                  <span>Enter Operational Dashboard</span>
                  <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="px-8 shadow-lg shadow-primary/20 text-base">
                <Link to="/login" id="footer-cta-signin">
                  <LogIn className="size-4.5 mr-2" />
                  <span>Sign In to Access Dashboard</span>
                  <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* FOOTER */}
      {/* ----------------------------------------------------------------- */}
      <footer className="border-t border-border/60 bg-card py-12">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Col 1: Brand Info */}
            <div className="col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Sparkles className="size-4" />
                </div>
                <span className="font-bold text-base">Vaultory</span>
              </div>
              <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                Multi-store retail inventory and sales management platform with AI demand forecasting,
                supplier lead-time tracking, and automated purchase-order generation.
              </p>
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>All Core Systems Operational</span>
              </div>
            </div>

            {/* Col 2: System Capabilities */}
            <div className="space-y-2 text-xs">
              <span className="font-semibold text-foreground uppercase tracking-wider">Capabilities</span>
              <ul className="space-y-2 text-muted-foreground">
                <li>Multi-Store Stock Matrix</li>
                <li>Barcode-First POS Checkout</li>
                <li>Autonomous Purchase Orders</li>
                <li>Supplier Lead-Time Tracking</li>
                <li>Predictive Demand Forecasting</li>
              </ul>
            </div>

            {/* Col 3: Portal Access */}
            <div className="space-y-2 text-xs">
              <span className="font-semibold text-foreground uppercase tracking-wider">Portal Access</span>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <Link to="/login" className="hover:text-foreground">
                    Staff Portal Login
                  </Link>
                </li>
                <li>
                  <Link to="/forgot-password" className="hover:text-foreground">
                    Password Recovery
                  </Link>
                </li>
                <li>
                  <a href="#overview" className="hover:text-foreground">
                    Return to Top
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border/50 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-3">
            <span>© {new Date().getFullYear()} Vaultory Retail Technologies. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <span className="hover:text-foreground cursor-pointer">Security & RBAC</span>
              <span className="hover:text-foreground cursor-pointer">Audit Standards</span>
              <span className="hover:text-foreground cursor-pointer">Architecture Docs</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export { HomePage as LandingPage }
