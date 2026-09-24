import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  ClerkProvider,
  RedirectToSignIn,
  Show,
  SignIn,
  SignUp,
  useAuth,
  useClerk,
  useUser,
} from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Link, Redirect, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import {
  Activity as ActivityIcon,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Clock3,
  FileText,
  Filter,
  Flag,
  Headphones,
  Home,
  Landmark,
  Layers3,
  LifeBuoy,
  ListFilter,
  LockKeyhole,
  MapPin,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  PanelLeft,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound as TeamIcon,
  Users,
  X,
} from 'lucide-react';
import {
  getGetActivityQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetIssueQueryKey,
  getListIssuesQueryKey,
  getListTeamsQueryKey,
  getListTeamIssuesQueryKey,
  useCreateIssue,
  useGetActivity,
  useGetDashboardSummary,
  useGetIssue,
  useHealthCheck,
  useListIssues,
  useListTeamIssues,
  useListTeams,
  useUpdateIssueStatus,
  type Activity,
  type DashboardSummary,
  type Issue,
  type IssueInput,
  type Team,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const statusMeta: Record<string, { label: string; color: string; icon: typeof Check }> = {
  submitted: { label: 'Submitted', color: 'bg-slate-100 text-slate-700', icon: Send },
  in_review: { label: 'In review', color: 'bg-amber-100 text-amber-800', icon: Search },
  in_progress: { label: 'In progress', color: 'bg-cyan-100 text-cyan-800', icon: ActivityIcon },
  solved: { label: 'Solved', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
};

const priorityMeta: Record<string, string> = {
  low: 'text-slate-500',
  medium: 'text-amber-600',
  high: 'text-orange-600',
  urgent: 'text-rose-600',
};

function formatDate(value?: string) {
  if (!value) return 'Recently';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function BrandMark({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3" data-testid="link-brand-home">
      <span className={`relative grid h-10 w-10 place-items-center rounded-xl ${dark ? 'bg-[#e8b45e] text-[#173a3b]' : 'bg-[#174d4c] text-[#f8f1df]'}`}>
        <span className="absolute h-5 w-5 rounded-full border-2 border-current" />
        <span className="absolute h-1.5 w-1.5 rounded-full bg-current" />
        <span className="absolute -bottom-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-current" />
      </span>
      <span className={`font-display text-xl font-bold tracking-tight ${dark ? 'text-[#f8f1df]' : 'text-[#173a3b]'}`}>Jansetu</span>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta[status] ?? statusMeta.submitted;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${meta.color}`} data-testid={`status-${status}`}>
      <Icon className="h-3 w-3" /> {meta.label}
    </span>
  );
}

function PriorityLabel({ priority }: { priority: string }) {
  return <span className={`text-xs font-semibold capitalize ${priorityMeta[priority] ?? 'text-slate-500'}`}>{priority}</span>;
}

function SectionHeading({ eyebrow, title, copy, action }: { eyebrow?: string; title: string; copy?: string; action?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-primary">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        {copy && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{copy}</p>}
      </div>
      {action}
    </div>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

function QueryError({ message = 'We could not load this view.' }: { message?: string }) {
  return (
    <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center" data-testid="state-error">
      <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-destructive/10 text-destructive"><LifeBuoy className="h-5 w-5" /></div>
      <p className="font-semibold">{message}</p>
      <p className="mt-1 text-sm text-muted-foreground">Try again in a moment. Your draft work is safe.</p>
    </div>
  );
}

function PublicNav() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
        <BrandMark />
        <nav className="hidden items-center gap-7 text-sm font-medium text-[#294c4d] md:flex">
          <a href="#how-it-works" data-testid="link-how-it-works">How it works</a>
          <a href="#roles" data-testid="link-roles">For communities</a>
          <a href="#trust" data-testid="link-trust">Trust & safety</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/sign-in" className="rounded-lg px-3 py-2 text-sm font-semibold text-[#244748] hover:bg-[#174d4c]/5" data-testid="link-sign-in">Sign in</Link>
          <Link href="/sign-up" className="rounded-lg bg-[#174d4c] px-4 py-2.5 text-sm font-semibold text-[#f8f1df] shadow-sm transition-transform hover:-translate-y-0.5" data-testid="link-sign-up">Create account</Link>
        </div>
      </div>
    </header>
  );
}

function Landing() {
  const healthQuery = useHealthCheck();
  const [role, setRole] = useState('Citizens');
  const roleCopy: Record<string, { title: string; copy: string }> = {
    Citizens: { title: 'Your concern, clearly heard.', copy: 'Report what needs attention and see who owns the next step, without chasing a dozen inboxes.' },
    'Student teams': { title: 'A real brief. A visible outcome.', copy: 'Turn community challenges into meaningful projects with the context, ownership, and support to ship.' },
    Agencies: { title: 'From signal to service.', copy: 'Give every issue a clear home, a measurable response, and a public trail of progress.' },
    Companies: { title: 'Partnerships that land.', copy: 'Focus your social impact where it is needed and show the work behind every outcome.' },
  };
  return (
    <div className="noise min-h-screen overflow-hidden bg-[#f7f1e3] text-[#173a3b]">
      <PublicNav />
      <main>
        <section className="relative isolate min-h-[720px] overflow-hidden px-5 pb-20 pt-36 lg:px-8">
          <div className="absolute -right-32 -top-32 -z-10 h-[560px] w-[560px] rounded-full bg-[#dce7d7] blur-3xl" />
          <div className="absolute bottom-0 left-[-15%] -z-10 h-[320px] w-[65%] rounded-full bg-[#f2d7a5]/55 blur-3xl" />
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
            <div className="reveal max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#b9d2c6] bg-[#edf4eb] px-3 py-1.5 text-xs font-bold text-[#236460]">
                <span className="pulse-dot h-2 w-2 rounded-full bg-[#da9e3c]" /> A clearer way to move things forward
              </div>
              <h1 className="font-display text-[clamp(3.3rem,7vw,6.5rem)] font-semibold leading-[.96] tracking-[-.065em] text-[#173a3b]">
                Notice it.<br /><span className="text-[#287d73]">Name it.</span><br />Move it forward.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-[#486363]">Jansetu brings citizens, student teams, public agencies, and companies into one accountable loop — so a reported problem can become visible progress.</p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link href="/sign-up" className="group inline-flex items-center gap-3 rounded-xl bg-[#174d4c] px-5 py-3.5 text-sm font-bold text-[#fbf4e4] shadow-[0_12px_25px_rgba(23,77,76,.18)] transition-all hover:-translate-y-0.5" data-testid="link-start-reporting">
                  Start a report <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <a href="#how-it-works" className="inline-flex items-center gap-2 rounded-xl border border-[#bed0c6] bg-[#fbf6e9]/60 px-5 py-3.5 text-sm font-bold text-[#315657]" data-testid="link-see-process">See the process</a>
              </div>
              <div className="mt-12 flex items-center gap-4 text-xs font-medium text-[#67807e]">
                <div className="flex -space-x-2">
                  {['RS', 'AM', 'PK', 'NT'].map((item, i) => <span key={item} className={`grid h-8 w-8 place-items-center rounded-full border-2 border-[#f7f1e3] text-[10px] font-bold text-[#173a3b] ${['bg-[#c6ddd0]', 'bg-[#ecd09e]', 'bg-[#d8c7de]', 'bg-[#bdd7df]'][i]}`}>{item}</span>)}
                </div>
                <span>Built around the people who notice first</span>
              </div>
            </div>
            <div className="reveal reveal-delay-2 relative mx-auto w-full max-w-[510px]">
              <div className="relative rotate-[2.5deg] rounded-[28px] border border-[#bcd0c4] bg-[#fffaf0] p-4 shadow-[0_30px_70px_rgba(40,73,70,.14)]">
                <div className="rounded-[20px] border border-[#d9e1d5] bg-[#f3f6ef] p-5">
                  <div className="flex items-center justify-between border-b border-[#d9e1d5] pb-4">
                    <div className="flex items-center gap-2 text-sm font-bold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#dcece2] text-[#287d73]"><CircleDot className="h-4 w-4" /></span> Issue #JN-4821</div>
                    <StatusBadge status="in_progress" />
                  </div>
                  <div className="py-5">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#6f8c89]">Community report</p>
                    <h3 className="font-display text-2xl font-semibold leading-tight">Streetlight out near the community library</h3>
                    <div className="mt-4 flex items-center gap-2 text-sm text-[#67807e]"><MapPin className="h-4 w-4 text-[#db9e40]" /> Kalyani Nagar, Pune</div>
                  </div>
                  <div className="rounded-xl bg-[#e5efe7] p-4">
                    <div className="flex items-center justify-between text-xs font-bold text-[#2d625e]"><span>Progress</span><span>68%</span></div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#c7dbce]"><div className="h-full w-[68%] rounded-full bg-[#287d73]" /></div>
                    <p className="mt-3 text-xs leading-5 text-[#4c716d]">Electrical maintenance team has scheduled a site visit for Thursday.</p>
                  </div>
                  <div className="mt-5 flex items-center justify-between text-xs text-[#6f8c89]"><span>Assigned to</span><span className="font-bold text-[#315657]">Aarohan · COEP Tech</span></div>
                </div>
              </div>
              <div className="absolute -bottom-7 -left-8 rounded-2xl border border-[#e2c894] bg-[#fbefcf] p-4 shadow-lg shadow-[#8a6c34]/10">
                <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#deaa4e] text-[#fff7e4]"><Check className="h-4 w-4" /></span><div><p className="text-xs font-bold text-[#775824]">Next step is clear</p><p className="mt-0.5 text-[11px] text-[#987538]">No chasing required</p></div></div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-[#d8dfd3] bg-[#eef3e9] px-5 py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
              <div><p className="mb-3 text-[11px] font-bold uppercase tracking-[.18em] text-[#287d73]">The Jansetu loop</p><h2 className="font-display text-4xl font-semibold leading-tight tracking-tight">Every report gets a route, a rhythm, and a receipt.</h2></div>
              <div className="grid gap-7 sm:grid-cols-3">
                {[['01', 'Tell it once', 'A simple, guided report captures the context a team needs to act.'], ['02', 'See who owns it', 'AI helps classify and route your issue to the right local team.'], ['03', 'Follow the movement', 'Updates, next actions, and outcomes stay visible in one place.']].map(([number, title, copy]) => <div key={number} className="border-t-2 border-[#b9cec1] pt-4"><span className="font-mono text-sm font-bold text-[#d99e3d]">{number}</span><h3 className="mt-5 font-display text-xl font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#55716f]">{copy}</p></div>)}
              </div>
            </div>
          </div>
        </section>

        <section id="roles" className="bg-[#f7f1e3] px-5 py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 max-w-2xl"><p className="mb-3 text-[11px] font-bold uppercase tracking-[.18em] text-[#287d73]">One platform, many hands</p><h2 className="font-display text-4xl font-semibold tracking-tight">Progress looks different from every seat.</h2><p className="mt-3 text-[#5e7977]">Jansetu keeps the handoffs human and the status legible, whether you are raising a concern or delivering the fix.</p></div>
            <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
              <div className="rounded-3xl bg-[#174d4c] p-3">
                <div className="grid gap-1">
                  {Object.keys(roleCopy).map((item) => <button key={item} onClick={() => setRole(item)} className={`flex items-center justify-between rounded-2xl px-5 py-4 text-left text-sm font-bold transition-colors ${role === item ? 'bg-[#e4b15d] text-[#173a3b]' : 'text-[#c5d8cb] hover:bg-[#ffffff0d]'}`} data-testid={`button-role-${item.toLowerCase().replace(' ', '-')}`}><span>{item}</span><ArrowUpRight className="h-4 w-4" /></button>)}
                </div>
                <div className="mt-16 rounded-2xl bg-[#123f3e] p-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#8bb6aa]">Shared principle</p><p className="mt-3 font-display text-xl leading-7 text-[#f4eddc]">“A public issue should never disappear into a private queue.”</p></div>
              </div>
              <div className="flex min-h-[340px] flex-col justify-between rounded-3xl border border-[#d5dfd2] bg-[#edf3e9] p-8 lg:p-12">
                <div><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#d4e8dd] text-[#287d73]">{role === 'Citizens' ? <Flag /> : role === 'Agencies' ? <Landmark /> : role === 'Companies' ? <Building2 /> : <Users />}</span><h3 className="mt-8 max-w-xl font-display text-4xl font-semibold leading-tight">{roleCopy[role].title}</h3><p className="mt-4 max-w-lg text-base leading-7 text-[#55716f]">{roleCopy[role].copy}</p></div>
                <Link href="/sign-up" className="mt-8 inline-flex w-fit items-center gap-2 text-sm font-bold text-[#287d73]" data-testid="link-role-join">Join Jansetu <ArrowRight className="h-4 w-4" /></Link>
              </div>
            </div>
          </div>
        </section>

        <section id="trust" className="bg-[#e2eee5] px-5 py-20 lg:px-8"><div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.2fr_.8fr]"><div><p className="mb-3 text-[11px] font-bold uppercase tracking-[.18em] text-[#287d73]">Designed for trust</p><h2 className="font-display text-4xl font-semibold tracking-tight">Clarity is a civic feature.</h2><p className="mt-4 max-w-xl text-base leading-7 text-[#55716f]">Your report belongs to you. We make the routing understandable, the next step concrete, and the record easy to revisit.</p></div><div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">{[['Transparent', 'See status and ownership at a glance.'], ['Grounded', 'Teams work from the context you provide.'], ['Respectful', 'Your contact details stay purposeful.']].map(([title, copy]) => <div key={title} className="flex items-start gap-3 rounded-2xl border border-[#c7dbce] bg-[#eff6ed] p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#287d73]" /><div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs leading-5 text-[#5f7d78]">{copy}</p></div></div>)}</div></div></section>
        <footer className="bg-[#173a3b] px-5 py-10 text-[#c6d8cd] lg:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><BrandMark dark /><div className="flex flex-wrap items-center gap-4"><p className="text-xs text-[#8ba7a0]">A public-service product for people who care enough to start.</p><span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-[#9bc1b6]" data-testid="status-platform-health"><span className={`h-1.5 w-1.5 rounded-full ${healthQuery.isError ? 'bg-[#dc8e7b]' : 'bg-[#e4b15d]'}`} />{healthQuery.isError ? 'Service check unavailable' : 'Platform operational'}</span></div><div className="flex gap-5 text-xs font-bold"><Link href="/sign-in" data-testid="link-footer-sign-in">Sign in</Link><Link href="/sign-up" data-testid="link-footer-sign-up">Create account</Link></div></div></footer>
      </main>
    </div>
  );
}

function AuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const submit = (event: FormEvent) => { event.preventDefault(); setLocation('/app'); };
  const signIn = mode === 'sign-in';
  return (
    <div className="noise grid min-h-screen bg-[#f7f1e3] lg:grid-cols-[.9fr_1.1fr]">
      <div className="relative hidden overflow-hidden bg-[#174d4c] p-10 text-[#f7f1e3] lg:flex lg:flex-col lg:justify-between"><div className="absolute -right-36 top-20 h-96 w-96 rounded-full border-[60px] border-[#e5b35e33]" /><div className="absolute bottom-24 left-12 h-32 w-32 rounded-full bg-[#dce8d833]" /><BrandMark dark /><div className="relative max-w-md"><p className="mb-5 text-xs font-bold uppercase tracking-[.18em] text-[#9bc1b6]">The Jansetu promise</p><h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-tight">Good work is easier to trust when you can see it.</h1><p className="mt-6 text-base leading-7 text-[#bdd3c7]">Stay close to the issues you raise, the people helping, and the next action ahead.</p></div><p className="text-xs text-[#8eafa5]">Secure access for the Jansetu community</p></div>
      <div className="flex items-center justify-center px-5 py-12"><div className="w-full max-w-md"><div className="mb-10 lg:hidden"><BrandMark /></div><div className="mb-8"><p className="mb-3 text-[11px] font-bold uppercase tracking-[.18em] text-primary">Welcome to Jansetu</p><h2 className="font-display text-4xl font-semibold tracking-tight">{signIn ? 'Continue the work.' : 'Start making progress visible.'}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{signIn ? 'Sign in to follow your reports and see what happens next.' : 'Create your account to report, follow, and contribute.'}</p></div><form onSubmit={submit} className="space-y-4" data-testid={`form-${mode}`}>{!signIn && <label className="block text-sm font-semibold">Full name<input value={name} onChange={(e) => setName(e.target.value)} required className="mt-2 h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none ring-primary/20 focus:ring-4" placeholder="Your name" data-testid="input-name" /></label>}<label className="block text-sm font-semibold">Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-2 h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none ring-primary/20 focus:ring-4" placeholder="you@example.com" data-testid="input-email" /></label><label className="block text-sm font-semibold">Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="mt-2 h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none ring-primary/20 focus:ring-4" placeholder="At least 8 characters" data-testid="input-password" /></label><button className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5" type="submit" data-testid={`button-${mode}`}>{signIn ? 'Sign in' : 'Create account'} <ArrowRight className="h-4 w-4" /></button></form><div className="my-7 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div><button onClick={() => setLocation('/app')} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-bold text-foreground hover:bg-muted" data-testid="button-continue-demo"><ShieldCheck className="h-4 w-4 text-primary" /> Continue with secure SSO</button><p className="mt-8 text-center text-sm text-muted-foreground">{signIn ? 'New to Jansetu?' : 'Already part of Jansetu?'} <Link href={signIn ? '/sign-up' : '/sign-in'} className="font-bold text-primary" data-testid="link-auth-switch">{signIn ? 'Create an account' : 'Sign in'}</Link></p><p className="mt-7 flex items-center justify-center gap-2 text-center text-[11px] text-muted-foreground"><LockKeyhole className="h-3 w-3" /> Protected by Clerk authentication</p></div></div>
    </div>
  );
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#287d73',
    colorForeground: '#173a3b',
    colorMutedForeground: '#5e7977',
    colorDanger: '#b54d44',
    colorBackground: '#fffaf0',
    colorInput: '#f7f1e3',
    colorInputForeground: '#173a3b',
    colorNeutral: '#d5dfd2',
    fontFamily: 'DM Sans, sans-serif',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fffaf0] rounded-2xl w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#173a3b] font-display',
    headerSubtitle: 'text-[#5e7977]',
    socialButtonsBlockButtonText: 'text-[#173a3b]',
    formFieldLabel: 'text-[#173a3b]',
    footerActionLink: 'text-[#287d73]',
    footerActionText: 'text-[#5e7977]',
    dividerText: 'text-[#5e7977]',
    identityPreviewEditButton: 'text-[#287d73]',
    formFieldSuccessText: 'text-[#287d73]',
    alertText: 'text-[#b54d44]',
    logoBox: 'justify-center',
    logoImage: 'max-h-10',
    socialButtonsBlockButton: 'border-[#d5dfd2] bg-[#f7f1e3]',
    formButtonPrimary: 'bg-[#287d73] hover:bg-[#206960]',
    formFieldInput: 'border-[#d5dfd2] bg-[#f7f1e3] text-[#173a3b]',
    footerAction: 'bg-transparent',
    dividerLine: 'bg-[#d5dfd2]',
    alert: 'border-[#e7b7af] bg-[#fff0ed]',
    otpCodeFieldInput: 'border-[#d5dfd2] bg-[#f7f1e3]',
    formFieldRow: 'gap-2',
    main: 'gap-5',
  },
};

function ClerkAuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const [role, setRole] = useState('citizen');
  const roles = [
    ['citizen', 'Citizen'],
    ['student', 'Student team'],
    ['agency', 'Government agency'],
    ['company', 'Company / MNC'],
  ];
  const isSignIn = mode === 'sign-in';
  return (
    <div className="noise grid min-h-screen bg-[#f7f1e3] place-items-center px-5 py-10">
      <div className="w-full max-w-[520px]">
        <div className="mb-6 text-center">
          <BrandMark />
          <p className="mx-auto mt-6 max-w-md text-sm leading-6 text-[#5e7977]">
            {isSignIn
              ? 'Sign in to follow your reports and keep the next action visible.'
              : 'Choose how you participate in Jansetu, then create your secure account.'}
          </p>
        </div>
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-[#d5dfd2] bg-[#edf3e9] p-2 sm:grid-cols-4">
          {roles.map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => setRole(value)}
              className={`rounded-xl px-2 py-3 text-xs font-bold transition-colors ${
                role === value ? 'bg-[#174d4c] text-[#f8f1df]' : 'text-[#55716f] hover:bg-[#e0eadf]'
              }`}
              data-testid={`button-role-${value}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="rounded-3xl border border-[#d5dfd2] bg-[#fffaf0] p-3 shadow-[0_18px_50px_rgba(30,67,65,.08)]">
          {isSignIn ? (
            <SignIn
              routing="path"
              path={`${basePath}/sign-in`}
              signUpUrl={`${basePath}/sign-up`}
              appearance={clerkAppearance}
            />
          ) : (
            <SignUp
              routing="path"
              path={`${basePath}/sign-up`}
              signInUrl={`${basePath}/sign-in`}
              appearance={clerkAppearance}
              unsafeMetadata={{ role }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { user } = useUser();
  const { signOut } = useClerk();
  const displayName = user?.fullName || user?.firstName || 'Jansetu member';
  const email = user?.primaryEmailAddress?.emailAddress;
  const nav = [{ href: '/app', label: 'Overview', icon: Home }, { href: '/app/issues', label: 'My issues', icon: FileText }, { href: '/app/teams', label: 'Teams & partners', icon: TeamIcon }, { href: '/app/impact', label: 'Impact', icon: BarChart3 }];
  return (
    <div className="app-shell bg-background">
      <aside className={`desktop-sidebar flex flex-col bg-sidebar px-4 py-5 text-sidebar-foreground ${mobileOpen ? 'fixed inset-y-0 left-0 z-40 flex w-64' : ''}`}>
        <BrandMark dark />
        <div className="mt-12 flex items-center gap-3 rounded-2xl border border-sidebar-border bg-sidebar-accent p-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e4b15d] text-xs font-bold text-[#173a3b]">{initials(displayName)}</span><div className="min-w-0"><p className="truncate text-sm font-bold">{displayName}</p><p className="truncate text-[11px] text-[#9fbbb0]">{email || 'Citizen account'}</p></div><MoreHorizontal className="ml-auto h-4 w-4 text-[#9fbbb0]" /></div>
        <nav className="mt-8 space-y-1">{nav.map(({ href, label, icon: Icon }) => { const active = href === '/app' ? location === '/app' : location.startsWith(href); return <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${active ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-[#b9d0c6] hover:bg-sidebar-accent hover:text-sidebar-foreground'}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon className="h-[18px] w-[18px]" />{label}</Link>; })}</nav>
        <div className="mt-auto space-y-3"><Link href="/app/submit" className="flex items-center justify-center gap-2 rounded-xl bg-[#e4b15d] px-3 py-3 text-sm font-bold text-[#173a3b] transition-transform hover:-translate-y-0.5" data-testid="link-sidebar-submit"><Plus className="h-4 w-4" /> Submit an issue</Link><div className="border-t border-sidebar-border pt-4"><button onClick={() => setNotice('Need a hand? Your Jansetu support contact is ready for the next question.')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-semibold text-[#9fbbb0] hover:bg-sidebar-accent" data-testid="button-help"><Headphones className="h-4 w-4" /> Help & support</button><button onClick={() => setNotice('Settings will be available here as your Jansetu workspace grows.')} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-semibold text-[#9fbbb0] hover:bg-sidebar-accent" data-testid="button-settings"><PanelLeft className="h-4 w-4" /> Settings</button><button onClick={() => signOut({ redirectUrl: basePath || '/' })} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-semibold text-[#9fbbb0] hover:bg-sidebar-accent" data-testid="button-sign-out"><LockKeyhole className="h-4 w-4" /> Sign out</button></div></div>
      </aside>
      <div className="app-main">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-border bg-background/90 px-5 backdrop-blur lg:px-10"><button onClick={() => setMobileOpen(true)} className="mr-3 rounded-lg p-2 hover:bg-muted md:hidden" data-testid="button-open-menu"><Menu className="h-5 w-5" /></button><div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex"><span className="text-foreground">Workspace</span><ChevronRight className="h-4 w-4" /><span>{location === '/app' ? 'Overview' : location.split('/').pop()?.replace('-', ' ')}</span></div><div className="ml-auto flex items-center gap-3"><button onClick={() => setNotice('No new updates. We will let you know when an issue moves.')} className="relative rounded-xl p-2 text-muted-foreground hover:bg-muted" data-testid="button-notifications"><Bell className="h-5 w-5" /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" /></button><span className="hidden h-6 w-px bg-border sm:block" /><span className="hidden text-right sm:block"><span className="block text-xs font-bold">{displayName}</span><span className="block text-[11px] text-muted-foreground">{email || 'Jansetu member'}</span></span><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#d6e8dc] text-xs font-bold text-primary sm:hidden">{initials(displayName)}</span></div></header><main className="px-5 py-8 lg:px-10 lg:py-10">{children}</main>
      </div>
      {mobileOpen && <button onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-[#173a3b]/30 md:hidden" aria-label="Close menu" data-testid="button-close-menu"><X className="sr-only" /></button>}
      {notice && <button onClick={() => setNotice(null)} className="fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-[#bcd8c8] bg-[#eff6ed] px-4 py-3 text-left text-sm font-semibold text-[#285957] shadow-soft" data-testid="button-dismiss-notice"><span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-accent" />{notice}<X className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" /></button>}
    </div>
  );
}

function Dashboard() {
  const summaryQuery = useGetDashboardSummary();
  const activityQuery = useGetActivity({ limit: 5 });
  const issuesQuery = useListIssues({ mine: true });
  const summary = summaryQuery.data as DashboardSummary | undefined;
  const issues = (issuesQuery.data ?? []) as Issue[];
  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-9 flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-primary">Monday, 17 June 2024</p><h1 className="font-display text-4xl font-semibold tracking-tight">Good morning, Aarav.</h1><p className="mt-2 text-sm text-muted-foreground">Here is the movement around the issues you care about.</p></div><Link href="/app/submit" className="inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5" data-testid="link-dashboard-submit"><Plus className="h-4 w-4" /> Submit an issue</Link></div>
        {summaryQuery.isError ? <QueryError /> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{summaryQuery.isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />) : [['Submitted', summary?.submitted ?? 0, 'All-time reports', 'text-primary'], ['In progress', summary?.inProgress ?? 0, 'Currently moving', 'text-[#287d73]'], ['Solved', summary?.solved ?? 0, 'Closed with outcome', 'text-[#55816a]'], ['Response rate', `${summary?.responseRate ?? 0}%`, `+${summary?.weeklyChange ?? 0}% this week`, 'text-[#c58b32']].map(([label, value, caption, color]) => <div key={label} className="rounded-2xl border border-card-border bg-card p-5 shadow-[0_5px_20px_rgba(35,70,62,.03)]"><div className="flex items-start justify-between"><span className="text-xs font-semibold text-muted-foreground">{label}</span><span className={`h-2 w-2 rounded-full bg-current ${color}`} /></div><p className={`mt-4 font-display text-3xl font-semibold ${color}`}>{value}</p><p className="mt-1 text-xs text-muted-foreground">{caption}</p></div>)}</div>}
        <div className="mt-7 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
          <section className="rounded-2xl border border-card-border bg-card p-6"><div className="mb-7 flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.15em] text-primary">Your movement</p><h2 className="mt-1 font-display text-xl font-semibold">Issue pipeline</h2></div><Link href="/app/issues" className="text-xs font-bold text-primary" data-testid="link-dashboard-all-issues">View all <ArrowRight className="ml-1 inline h-3 w-3" /></Link></div>{summaryQuery.isLoading ? <Skeleton className="h-48" /> : <div className="flex flex-col gap-5 sm:flex-row sm:items-center"><div className="relative mx-auto h-44 w-44 shrink-0 rounded-full" style={{ background: `conic-gradient(#287d73 0 48%, #e2b45f 48% 72%, #b9d6da 72% 91%, #dfe6dd 91% 100%)` }}><div className="absolute inset-5 grid place-items-center rounded-full bg-card"><div className="text-center"><p className="font-display text-3xl font-semibold">{(summary?.submitted ?? 0) + (summary?.inProgress ?? 0) + (summary?.solved ?? 0)}</p><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">total</p></div></div></div><div className="grid flex-1 gap-3 sm:grid-cols-2">{(summary?.statusBreakdown ?? [{ label: 'Submitted', count: 8 }, { label: 'In progress', count: 5 }, { label: 'Solved', count: 12 }, { label: 'In review', count: 3 }]).map((item, i) => <div key={item.label} className="flex items-center justify-between rounded-xl bg-muted/70 px-3 py-2.5"><div className="flex items-center gap-2 text-xs font-semibold"><span className={`h-2.5 w-2.5 rounded-full ${['bg-[#dfe6dd]', 'bg-[#287d73]', 'bg-[#5b896f]', 'bg-[#e2b45f]'][i % 4]}`} />{item.label}</div><span className="font-display text-lg font-semibold">{item.count}</span></div>)}</div></div>}</section>
          <section className="rounded-2xl border border-card-border bg-[#e8f0e6] p-6"><div className="flex items-start justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.15em] text-primary">Where it lands</p><h2 className="mt-1 font-display text-xl font-semibold">Issue themes</h2></div><Layers3 className="h-5 w-5 text-primary" /></div><div className="mt-7 space-y-4">{(summary?.categoryBreakdown ?? [{ label: 'Public space', count: 7 }, { label: 'Mobility', count: 5 }, { label: 'Safety', count: 4 }, { label: 'Environment', count: 3 }]).map((item, i) => <div key={item.label}><div className="mb-1.5 flex justify-between text-xs font-semibold"><span>{item.label}</span><span className="text-muted-foreground">{item.count}</span></div><div className="h-2 rounded-full bg-[#cedfd3]"><div className="progress-fill h-full rounded-full" style={{ width: `${Math.max(18, Math.min(100, item.count * 9))}%`, background: ['#287d73', '#e2b45f', '#6a9ca0', '#74916a'][i % 4] }} /></div></div>)}</div><Link href="/app/impact" className="mt-7 inline-flex items-center gap-2 text-xs font-bold text-primary" data-testid="link-dashboard-impact">Explore your impact <ArrowUpRight className="h-3.5 w-3.5" /></Link></section>
        </div>
        <div className="mt-7 grid gap-6 xl:grid-cols-[1.25fr_.75fr]"><section className="rounded-2xl border border-card-border bg-card p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.15em] text-primary">Recent reports</p><h2 className="mt-1 font-display text-xl font-semibold">Your latest issues</h2></div><Link href="/app/issues" className="text-xs font-bold text-primary" data-testid="link-dashboard-reports">See all</Link></div>{issuesQuery.isLoading ? <div className="space-y-3"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div> : issues.length ? <div className="divide-y divide-border">{issues.slice(0, 4).map((issue) => <Link href={`/app/issues/${issue.id}`} key={issue.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0" data-testid={`card-dashboard-issue-${issue.id}`}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-primary"><FileText className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{issue.reference}</span><StatusBadge status={issue.status} /></div><p className="mt-1 truncate text-sm font-bold">{issue.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{issue.location}</p></div><ChevronRight className="h-4 w-4 text-muted-foreground" /></Link>)}</div> : <EmptyState icon={FileText} title="Your issue list is ready" copy="When you submit a civic issue, its journey will show up here." action={<Link href="/app/submit" className="text-sm font-bold text-primary" data-testid="link-empty-submit">Submit your first issue</Link>} />}</section><ActivityFeed query={activityQuery} /></div>
      </div>
    </AppShell>
  );
}

function ActivityFeed({ query }: { query: ReturnType<typeof useGetActivity> }) {
  const activities = (query.data ?? []) as Activity[];
  return <section className="rounded-2xl border border-card-border bg-card p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.15em] text-primary">The wider loop</p><h2 className="mt-1 font-display text-xl font-semibold">Recent activity</h2></div><ActivityIcon className="h-5 w-5 text-accent" /></div>{query.isLoading ? <div className="space-y-4"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div> : activities.length ? <div className="space-y-5">{activities.slice(0, 5).map((item) => <div className="flex gap-3" key={item.id} data-testid={`activity-item-${item.id}`}><span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#e2eee5] text-primary"><CircleDot className="h-3.5 w-3.5" /></span><div className="min-w-0"><p className="text-sm leading-5">{item.message}</p><p className="mt-1 text-[11px] text-muted-foreground">{item.issueReference ?? 'Jansetu'} · {formatDate(item.createdAt)}</p></div></div>)}</div> : <p className="text-sm text-muted-foreground">No recent activity yet. Your next update will appear here.</p>}</section>;
}

function EmptyState({ icon: Icon, title, copy, action }: { icon: typeof FileText; title: string; copy: string; action?: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center" data-testid="state-empty"><span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-[#e2eee5] text-primary"><Icon className="h-5 w-5" /></span><h3 className="mt-4 font-display text-lg font-semibold">{title}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{copy}</p>{action && <div className="mt-4">{action}</div>}</div>;
}

function SubmitPage() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const createIssue = useCreateIssue();
  const [form, setForm] = useState<IssueInput>({ title: '', description: '', location: '', contact: '', attachmentName: '' });
  const [submitted, setSubmitted] = useState<Issue | null>(null);
  const update = (key: keyof IssueInput, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); createIssue.mutate({ data: form }, { onSuccess: (issue) => { setSubmitted(issue); qc.invalidateQueries({ queryKey: getListIssuesQueryKey({ mine: true }) }); qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); qc.invalidateQueries({ queryKey: getGetActivityQueryKey({ limit: 5 }) }); } }); };
  return <AppShell><div className="mx-auto max-w-5xl"><SectionHeading eyebrow="New report" title="Put the issue on the map." copy="A few clear details help the right team understand the situation and choose a useful next step." action={<Link href="/app/issues" className="text-sm font-bold text-primary" data-testid="link-submit-cancel">Cancel</Link>} />{submitted ? <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><div className="rounded-3xl border border-[#bcd8c8] bg-[#e5f1e6] p-8"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><Check className="h-6 w-6" /></span><p className="mt-7 text-[11px] font-bold uppercase tracking-[.17em] text-primary">Report received</p><h2 className="mt-2 font-display text-3xl font-semibold">Your issue has a clear next step.</h2><p className="mt-3 text-sm leading-6 text-[#4d706b]">We analysed the details and routed this to the team best placed to help.</p><div className="mt-7 rounded-2xl bg-[#f6f5e9] p-5"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Reference</p><p className="mt-1 font-display text-2xl font-semibold">{submitted.reference}</p><div className="mt-5 grid gap-4 border-t border-border pt-4 sm:grid-cols-2"><div><p className="text-[11px] text-muted-foreground">Category</p><p className="mt-1 text-sm font-bold">{submitted.category}</p></div><div><p className="text-[11px] text-muted-foreground">Priority</p><p className="mt-1 text-sm font-bold capitalize">{submitted.priority}</p></div><div><p className="text-[11px] text-muted-foreground">Assigned team</p><p className="mt-1 text-sm font-bold">{submitted.assignedTeamName}</p></div><div><p className="text-[11px] text-muted-foreground">First action</p><p className="mt-1 text-sm font-bold">{submitted.nextAction}</p></div></div></div><div className="mt-6 flex flex-wrap gap-3"><Link href={`/app/issues/${submitted.id}`} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground" data-testid="link-view-submitted-issue">View issue <ArrowRight className="h-4 w-4" /></Link><button onClick={() => { setSubmitted(null); setForm({ title: '', description: '', location: '', contact: '', attachmentName: '' }); }} className="rounded-xl border border-border px-4 py-3 text-sm font-bold" data-testid="button-submit-another">Submit another</button></div></div><div className="rounded-3xl bg-[#174d4c] p-7 text-[#f7f1e3]"><Sparkles className="h-5 w-5 text-[#e4b15d]" /><p className="mt-7 text-[11px] font-bold uppercase tracking-[.17em] text-[#9bc1b6]">AI routing note</p><p className="mt-2 font-display text-2xl leading-tight">{submitted.aiSummary || 'Your report is ready for the right local team.'}</p><div className="mt-8 flex items-center gap-3 border-t border-[#ffffff20] pt-5 text-xs text-[#bdd3c7]"><ShieldCheck className="h-4 w-4 text-[#e4b15d]" /> You can revisit the full record at any time.</div></div></div> : <div className="grid gap-7 lg:grid-cols-[1.05fr_.95fr]"><form onSubmit={submit} className="rounded-2xl border border-card-border bg-card p-6 shadow-soft" data-testid="form-submit-issue"><div className="space-y-5"><label className="block text-sm font-semibold">What needs attention?<input value={form.title} onChange={(e) => update('title', e.target.value)} required minLength={3} className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-4 focus:ring-primary/10" placeholder="For example, streetlight not working near the library" data-testid="input-issue-title" /></label><label className="block text-sm font-semibold">Tell us what is happening<textarea value={form.description} onChange={(e) => update('description', e.target.value)} required minLength={10} className="mt-2 min-h-32 w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-primary/10" placeholder="Share what you noticed, who it affects, and anything useful for the team." data-testid="input-issue-description" /></label><label className="block text-sm font-semibold">Where is it happening?<div className="relative mt-2"><MapPin className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" /><input value={form.location} onChange={(e) => update('location', e.target.value)} required minLength={2} className="h-12 w-full rounded-xl border border-input bg-background pl-11 pr-4 text-sm outline-none focus:ring-4 focus:ring-primary/10" placeholder="Neighbourhood, landmark, or full address" data-testid="input-issue-location" /></div></label><div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-semibold">Contact (optional)<input value={form.contact ?? ''} onChange={(e) => update('contact', e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-4 focus:ring-primary/10" placeholder="Email or phone" data-testid="input-issue-contact" /></label><label className="block text-sm font-semibold">Add context (optional)<input value={form.attachmentName ?? ''} onChange={(e) => update('attachmentName', e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-4 focus:ring-primary/10" placeholder="Photo or file name" data-testid="input-issue-attachment" /></label></div></div><div className="mt-7 flex items-center justify-between border-t border-border pt-5"><p className="max-w-xs text-xs leading-5 text-muted-foreground"><LockKeyhole className="mr-1 inline h-3 w-3" /> Your contact details are only used for follow-up.</p><button disabled={createIssue.isPending} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50" type="submit" data-testid="button-submit-issue">{createIssue.isPending ? 'Analysing report...' : 'Submit report'} <Send className="h-4 w-4" /></button></div>{createIssue.isError && <p className="mt-4 text-sm font-semibold text-destructive" data-testid="status-submit-error">We could not submit this yet. Please check the details and try again.</p>}</form><div className="rounded-2xl border border-[#d9e5d9] bg-[#edf4ea] p-7"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#d4e8dc] text-primary"><Sparkles className="h-5 w-5" /></span><div><p className="font-display text-xl font-semibold">What happens next?</p><p className="mt-1 text-sm leading-6 text-[#5b7771]">Jansetu makes the first handoff visible as soon as you submit.</p></div></div><div className="mt-9 space-y-6">{[['01', 'We read the context', 'Your report is summarised into a concise brief.'], ['02', 'We find the right home', 'Category and location help route it to a suitable team.'], ['03', 'You get a reference', 'Use it to return to the issue and follow the next action.']].map(([number, title, copy]) => <div className="flex gap-4" key={number}><span className="font-mono text-xs font-bold text-[#d99e3d]">{number}</span><div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs leading-5 text-[#5b7771]">{copy}</p></div></div>)}</div></div></div>}</div></AppShell>;
}

function IssuesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const query = useListIssues({ mine: true });
  const issues = useMemo(() => ((query.data ?? []) as Issue[]).filter((issue) => (status === 'all' || issue.status === status) && `${issue.title} ${issue.reference} ${issue.location}`.toLowerCase().includes(search.toLowerCase())), [query.data, search, status]);
  return <AppShell><div className="mx-auto max-w-[1400px]"><SectionHeading eyebrow="Your civic record" title="My issues" copy="A single place for the concerns you have raised and the progress they are making." action={<Link href="/app/submit" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground" data-testid="link-issues-submit"><Plus className="h-4 w-4" /> New issue</Link>} /><div className="mb-6 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-4 top-3 h-4 w-4 text-muted-foreground" /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 w-full rounded-xl border border-input bg-card pl-11 pr-4 text-sm outline-none focus:ring-4 focus:ring-primary/10" placeholder="Search by issue, reference, or place" data-testid="input-search-issues" /></div><div className="relative"><Filter className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 w-full appearance-none rounded-xl border border-input bg-card pl-10 pr-10 text-sm outline-none sm:w-48" data-testid="select-issue-status"><option value="all">All statuses</option><option value="submitted">Submitted</option><option value="in_review">In review</option><option value="in_progress">In progress</option><option value="solved">Solved</option></select><ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" /></div></div>{query.isError ? <QueryError /> : query.isLoading ? <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div> : issues.length ? <div className="overflow-hidden rounded-2xl border border-card-border bg-card">{issues.map((issue) => <Link key={issue.id} href={`/app/issues/${issue.id}`} className="group flex flex-col gap-4 border-b border-border p-5 transition-colors last:border-b-0 hover:bg-muted/40 md:flex-row md:items-center" data-testid={`row-issue-${issue.id}`}><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-muted text-primary"><FileText className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{issue.reference}</span><StatusBadge status={issue.status} /><PriorityLabel priority={issue.priority} /></div><h3 className="mt-1 truncate text-sm font-bold">{issue.title}</h3><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{issue.location}</p></div><div className="flex items-center gap-8 md:text-right"><div><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Progress</p><p className="mt-1 text-sm font-bold">{issue.progress}%</p></div><div className="hidden w-28 md:block"><div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${issue.progress}%` }} /></div><p className="mt-1 text-[10px] text-muted-foreground">{formatDate(issue.updatedAt)}</p></div><ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" /></div></Link>)}</div> : <EmptyState icon={ListFilter} title={search || status !== 'all' ? 'No matching issues' : 'Your civic record starts here'} copy={search || status !== 'all' ? 'Try another search or clear the filter.' : 'Submit an issue and keep the whole journey in view.'} action={<Link href="/app/submit" className="text-sm font-bold text-primary" data-testid="link-issues-empty-submit">Submit an issue</Link>} />}</div></AppShell>;
}

function IssueDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const issueQuery = useGetIssue(id, { query: { queryKey: getGetIssueQueryKey(id), enabled: Number.isFinite(id) } });
  const update = useUpdateIssueStatus();
  const qc = useQueryClient();
  const issue = issueQuery.data;
  const [note, setNote] = useState('');
  const markSolved = () => { if (!issue) return; update.mutate({ id, data: { status: 'solved', note: note || 'Marked as solved by the reporting citizen.' } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getGetIssueQueryKey(id) }); qc.invalidateQueries({ queryKey: getListIssuesQueryKey({ mine: true }) }); setNote(''); } }); };
  return <AppShell><div className="mx-auto max-w-5xl">{issueQuery.isLoading ? <div className="space-y-4"><Skeleton className="h-12 w-2/3" /><Skeleton className="h-64" /></div> : issueQuery.isError || !issue ? <QueryError message="This issue is unavailable right now." /> : <><Link href="/app/issues" className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-primary" data-testid="link-back-issues">← Back to my issues</Link><div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="mb-3 flex flex-wrap items-center gap-2"><span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{issue.reference}</span><StatusBadge status={issue.status} /><PriorityLabel priority={issue.priority} /></div><h1 className="font-display text-4xl font-semibold tracking-tight">{issue.title}</h1><p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4 text-accent" />{issue.location} <span className="text-border">·</span> Submitted {formatDate(issue.createdAt)}</p></div><button onClick={markSolved} disabled={issue.status === 'solved' || update.isPending} className="inline-flex w-fit items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm font-bold text-primary disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-mark-solved"><CheckCircle2 className="h-4 w-4" />{issue.status === 'solved' ? 'Issue solved' : 'Mark as solved'}</button></div><div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]"><div className="space-y-6"><section className="rounded-2xl border border-card-border bg-card p-6"><p className="text-[11px] font-bold uppercase tracking-[.15em] text-primary">The brief</p><p className="mt-4 text-sm leading-7 text-muted-foreground">{issue.description}</p>{issue.aiSummary && <div className="mt-6 rounded-xl bg-[#edf4ea] p-4"><div className="flex gap-3"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div><p className="text-xs font-bold text-primary">Jansetu routing summary</p><p className="mt-1 text-sm leading-6 text-[#52736c]">{issue.aiSummary}</p></div></div></div>}</section><section className="rounded-2xl border border-card-border bg-card p-6"><div className="flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.15em] text-primary">Visible movement</p><h2 className="mt-1 font-display text-xl font-semibold">Progress timeline</h2></div><span className="font-display text-2xl font-semibold text-primary">{issue.progress}%</span></div><div className="mt-7 h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${issue.progress}%` }} /></div><div className="relative mt-9 space-y-7 border-l border-border pl-7">{issue.timeline?.map((item) => <div key={item.id} className="relative" data-testid={`timeline-item-${item.id}`}><span className="absolute -left-[35px] top-0.5 grid h-4 w-4 place-items-center rounded-full border-4 border-card bg-primary" /><p className="text-sm font-semibold">{item.message}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(item.createdAt)}</p></div>)}</div></section></div><aside className="space-y-6"><section className="rounded-2xl bg-[#174d4c] p-6 text-[#f7f1e3]"><p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#9bc1b6]">Next action</p><h2 className="mt-3 font-display text-2xl font-semibold leading-tight">{issue.nextAction}</h2><div className="mt-7 border-t border-[#ffffff20] pt-5"><p className="text-xs text-[#9fbbb0]">Assigned team</p><p className="mt-1 text-sm font-bold">{issue.assignedTeamName}</p><p className="mt-1 text-xs text-[#9fbbb0]">{issue.assignedUniversity}</p></div></section><section className="rounded-2xl border border-card-border bg-card p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-primary"><MessageSquareText className="h-5 w-5" /></span><div><h2 className="font-display text-lg font-semibold">Add context</h2><p className="text-xs text-muted-foreground">Help the team with a final note.</p></div></div><textarea value={note} onChange={(e) => setNote(e.target.value)} className="mt-5 min-h-24 w-full resize-y rounded-xl border border-input bg-background p-3 text-sm outline-none focus:ring-4 focus:ring-primary/10" placeholder="Optional note before marking solved" data-testid="input-detail-note" /><button onClick={markSolved} disabled={!note || update.isPending || issue.status === 'solved'} className="mt-3 w-full rounded-xl bg-muted px-4 py-3 text-sm font-bold text-foreground disabled:opacity-50" data-testid="button-detail-note">Send note & mark solved</button></section></aside></div></>}</div></AppShell>;
}

function TeamsPage() {
  const query = useListTeams();
  const teams = (query.data ?? []) as Team[];
  const [selected, setSelected] = useState<number | null>(null);
  const chosen = teams.find((team) => team.id === selected) ?? teams[0];
  return <AppShell><div className="mx-auto max-w-[1400px]"><SectionHeading eyebrow="The people behind progress" title="Teams & partners" copy="Local knowledge and practical capacity, made visible so issues can find the right hands." /><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{query.isLoading ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56" />) : query.isError ? <QueryError /> : teams.length ? teams.map((team) => <button key={team.id} onClick={() => setSelected(team.id)} className={`group rounded-2xl border p-6 text-left transition-all hover:-translate-y-1 hover:shadow-soft ${chosen?.id === team.id ? 'border-primary/40 bg-[#edf4ea]' : 'border-card-border bg-card'}`} data-testid={`card-team-${team.id}`}><div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl text-sm font-bold text-[#173a3b]" style={{ background: team.accent || '#e2b45f' }}>{initials(team.name)}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${team.availability === 'available' ? 'bg-emerald-100 text-emerald-800' : team.availability === 'busy' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>{team.availability.replace('_', ' ')}</span></div><h2 className="mt-6 font-display text-xl font-semibold">{team.name}</h2><p className="mt-1 text-xs font-semibold text-primary">{team.university}</p><p className="mt-3 text-sm leading-6 text-muted-foreground">{team.specialization}</p><div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs"><span className="text-muted-foreground">{team.members} members</span><span className="font-bold">{team.activeIssues}/{team.capacity} active</span></div><div className="mt-3 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (team.activeIssues / Math.max(team.capacity, 1)) * 100)}%` }} /></div></button>) : <EmptyState icon={Users} title="Teams are taking shape" copy="Partner teams will appear here as they join Jansetu." />}</div>{chosen && <TeamIssues team={chosen} />}</div></AppShell>;
}

function TeamIssues({ team }: { team: Team }) {
  const query = useListTeamIssues(team.id, { query: { queryKey: getListTeamIssuesQueryKey(team.id), enabled: Boolean(team.id) } });
  const issues = (query.data ?? []) as Issue[];
  return <section className="mt-8 rounded-2xl border border-card-border bg-card p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.15em] text-primary">Capacity view</p><h2 className="mt-1 font-display text-xl font-semibold">{team.name}'s active issues</h2></div><span className="text-xs text-muted-foreground">{team.activeIssues} active assignments</span></div>{query.isLoading ? <Skeleton className="h-16" /> : issues.length ? <div className="grid gap-3 md:grid-cols-2">{issues.map((issue) => <Link key={issue.id} href={`/app/issues/${issue.id}`} className="rounded-xl border border-border p-4 hover:bg-muted/40" data-testid={`team-issue-${issue.id}`}><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{issue.reference}</span><StatusBadge status={issue.status} /></div><p className="mt-2 text-sm font-bold">{issue.title}</p><p className="mt-1 text-xs text-muted-foreground">{issue.progress}% progress · {issue.location}</p></Link>)}</div> : <p className="text-sm text-muted-foreground">No assigned issues are visible for this team.</p>}</section>;
}

function ImpactPage() {
  const summaryQuery = useGetDashboardSummary();
  const activityQuery = useGetActivity({ limit: 20 });
  const summary = summaryQuery.data as DashboardSummary | undefined;
  const total = (summary?.submitted ?? 0) + (summary?.inProgress ?? 0) + (summary?.solved ?? 0);
  return <AppShell><div className="mx-auto max-w-[1200px]"><SectionHeading eyebrow="Proof of movement" title="Your impact" copy="Small reports become meaningful when we can see the pattern, the response, and the people behind it." action={<div className="flex items-center gap-2 rounded-xl bg-[#e5f1e6] px-3 py-2 text-xs font-bold text-primary"><Target className="h-4 w-4" /> Your civic footprint</div>} />{summaryQuery.isError ? <QueryError /> : <><div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-primary p-6 text-primary-foreground"><p className="text-xs font-semibold text-primary-foreground/70">Reports started</p><p className="mt-5 font-display text-5xl font-semibold">{summary?.submitted ?? 0}</p><p className="mt-2 text-xs text-primary-foreground/70">Issues you put into motion</p></div><div className="rounded-2xl border border-card-border bg-card p-6"><p className="text-xs font-semibold text-muted-foreground">Outcomes closed</p><p className="mt-5 font-display text-5xl font-semibold text-[#55816a]">{summary?.solved ?? 0}</p><p className="mt-2 text-xs text-muted-foreground">Solved with a visible result</p></div><div className="rounded-2xl border border-card-border bg-card p-6"><p className="text-xs font-semibold text-muted-foreground">Response rate</p><p className="mt-5 font-display text-5xl font-semibold text-[#c58b32]">{summary?.responseRate ?? 0}%</p><p className="mt-2 text-xs text-muted-foreground">Teams responding to reports</p></div></div><div className="mt-7 grid gap-6 lg:grid-cols-[1fr_.85fr]"><section className="rounded-2xl border border-card-border bg-card p-6"><p className="text-[11px] font-bold uppercase tracking-[.15em] text-primary">Where your attention goes</p><h2 className="mt-1 font-display text-xl font-semibold">Issue themes</h2><div className="mt-8 space-y-6">{(summary?.categoryBreakdown ?? []).map((item, i) => <div key={item.label}><div className="flex items-center justify-between text-sm font-bold"><span>{item.label}</span><span className="font-mono text-xs text-muted-foreground">{item.count} issues</span></div><div className="mt-2 h-3 rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${Math.max(12, total ? (item.count / total) * 100 : 12)}%`, background: ['#287d73', '#d99e3d', '#6a9ca0', '#74916a'][i % 4] }} /></div></div>)}</div></section><section className="rounded-2xl bg-[#f3e8cf] p-6"><p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#8f6a2c]">The human measure</p><h2 className="mt-1 font-display text-2xl font-semibold text-[#4b402a]">A clearer public record is a form of care.</h2><p className="mt-4 text-sm leading-7 text-[#74613a]">Every report helps teams notice patterns earlier, prioritise with context, and make the work of responding easier to see.</p><div className="mt-10 border-t border-[#d9c69d] pt-5"><p className="font-display text-4xl font-semibold text-[#8f6a2c]">{summary?.weeklyChange ? `+${summary.weeklyChange}%` : '—'}</p><p className="mt-1 text-xs text-[#8f7650]">change in response activity this week</p></div></section></div><section className="mt-7 rounded-2xl border border-card-border bg-card p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.15em] text-primary">A living record</p><h2 className="mt-1 font-display text-xl font-semibold">Recent moments of movement</h2></div><ActivityIcon className="h-5 w-5 text-accent" /></div>{activityQuery.isLoading ? <Skeleton className="h-24" /> : (activityQuery.data as Activity[] | undefined)?.length ? <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">{(activityQuery.data as Activity[]).slice(0, 8).map((item) => <div key={item.id} className="flex gap-3" data-testid={`impact-activity-${item.id}`}><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" /><div><p className="text-sm">{item.message}</p><p className="mt-1 text-xs text-muted-foreground">{item.issueReference} · {formatDate(item.createdAt)}</p></div></div>)}</div> : <p className="text-sm text-muted-foreground">Your impact timeline will grow with each report.</p>}</section></>}</div></AppShell>;
}

function ProtectedPage({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    return <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">Loading your Jansetu workspace…</div>;
  }
  if (!isSignedIn) {
    return <Redirect to="/" />;
  }
  return <>{children}</>;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/app" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { user } = useUser();
  const previousUserId = useRef<string | null | undefined>(undefined);
  const queryClient = useQueryClient();
  useEffect(() => {
    const userId = user?.id ?? null;
    if (previousUserId.current !== undefined && previousUserId.current !== userId) {
      queryClient.clear();
    }
    previousUserId.current = userId;
  }, [queryClient, user?.id]);
  return null;
}

function Router() {
  const [location, setLocation] = useLocation();
  const stripBase = (path: string) =>
    basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
  return (
    <ErrorBoundary resetKey={location}>
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/sign-in/*?" component={() => <ClerkAuthPage mode="sign-in" />} />
        <Route path="/sign-up/*?" component={() => <ClerkAuthPage mode="sign-up" />} />
        <Route path="/app">
          <ProtectedPage><Dashboard /></ProtectedPage>
        </Route>
        <Route path="/app/submit">
          <ProtectedPage><SubmitPage /></ProtectedPage>
        </Route>
        <Route path="/app/issues">
          <ProtectedPage><IssuesPage /></ProtectedPage>
        </Route>
        <Route path="/app/issues/:id">
          <ProtectedPage><IssueDetailPage /></ProtectedPage>
        </Route>
        <Route path="/app/teams">
          <ProtectedPage><TeamsPage /></ProtectedPage>
        </Route>
        <Route path="/app/impact">
          <ProtectedPage><ImpactPage /></ProtectedPage>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  if (!clerkPubKey) {
    throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in environment');
  }
  const stripBase = (path: string) =>
    basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: 'Welcome back to Jansetu',
            subtitle: 'Continue the work that matters to your community.',
          },
        },
        signUp: {
          start: {
            title: 'Join Jansetu',
            subtitle: 'Make progress visible from the first report.',
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Router />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return <WouterRouter base={basePath}><ClerkProviderWithRoutes /></WouterRouter>;
}