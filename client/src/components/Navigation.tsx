import { useAuth } from "@/_core/hooks/useAuth";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";
import {
    Bookmark,
    BriefcaseBusiness,
    ChevronRight,
    Clapperboard,
    Compass,
    HeartHandshake,
    Image as ImageIcon,
    LayoutDashboard,
    LogIn,
    LogOut,
    Menu,
    type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export type NavRole = "creator" | "brand";

type NavItem = {
    id: string;
    label: string;
    shortLabel?: string;
    icon: LucideIcon;
    href: string;
    match: (path: string) => boolean;
};

const startsWithSegment = (path: string, base: string) =>
    path === base || path.startsWith(`${base}/`);

export function workspaceItems(role: NavRole): NavItem[] {
    if (role === "creator") {
        return [
            {
                id: "creator",
                label: "Workspace",
                icon: LayoutDashboard,
                href: "/creator",
                match: p => p === "/creator",
            },
            {
                id: "portfolio",
                label: "Portfolio Studio",
                shortLabel: "Portfolio",
                icon: ImageIcon,
                href: "/creator/portfolio",
                match: p => p === "/creator/portfolio",
            },
            {
                id: "find-briefs",
                label: "Find briefs",
                shortLabel: "Briefs",
                icon: Compass,
                href: "/briefs",
                match: p => startsWithSegment(p, "/briefs"),
            },
            {
                id: "projects",
                label: "Projects",
                icon: Clapperboard,
                href: "/projects",
                match: p => startsWithSegment(p, "/projects"),
            },
            {
                id: "requests",
                label: "Requests",
                icon: HeartHandshake,
                href: "/requests",
                match: p => startsWithSegment(p, "/requests"),
            },
        ];
    }
    return [
        {
            id: "brand",
            label: "Overview",
            icon: LayoutDashboard,
            href: "/brand",
            match: p => p === "/brand",
        },
        {
            id: "discover",
            label: "Find creators",
            shortLabel: "Creators",
            icon: Compass,
            href: "/discover",
            match: p =>
                startsWithSegment(p, "/discover") ||
                (p.startsWith("/creator/") && p !== "/creator/portfolio"),
        },
        {
            id: "briefs",
            label: "My briefs",
            shortLabel: "Briefs",
            icon: BriefcaseBusiness,
            href: "/briefs",
            match: p => startsWithSegment(p, "/briefs"),
        },
        {
            id: "saved",
            label: "Saved creators",
            shortLabel: "Saved",
            icon: Bookmark,
            href: "/saved",
            match: p => p === "/saved",
        },
        {
            id: "projects",
            label: "Projects",
            icon: Clapperboard,
            href: "/projects",
            match: p => startsWithSegment(p, "/projects"),
        },
        {
            id: "requests",
            label: "Requests",
            icon: HeartHandshake,
            href: "/requests",
            match: p => startsWithSegment(p, "/requests"),
        },
    ];
}

function topItems(role: NavRole): NavItem[] {
    return [
        {
            id: "discover",
            label: "Discover",
            icon: Compass,
            href: "/discover",
            match: p =>
                startsWithSegment(p, "/discover") ||
                (p.startsWith("/creator/") && p !== "/creator/portfolio"),
        },
        {
            id: "briefs",
            label: "Briefs",
            icon: BriefcaseBusiness,
            href: "/briefs",
            match: p => startsWithSegment(p, "/briefs"),
        },
        {
            id: "workspace",
            label: role === "brand" ? "Brand workspace" : "Creator workspace",
            icon: LayoutDashboard,
            href: role === "brand" ? "/brand" : "/creator",
            match: p =>
                role === "brand"
                    ? p === "/brand" || p === "/saved" || startsWithSegment(p, "/requests")
                    : p === "/creator" ||
                    p === "/creator/portfolio" ||
                    startsWithSegment(p, "/requests"),
        },
    ];
}

export function showsWorkspaceChrome(path: string) {
    return path !== "/" && path !== "/404";
}

export function SkipLink() {
    return (
        <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[var(--navy)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
            Skip to content
        </a>
    );
}

function Logo() {
    return (
        <Link
            href="/"
            aria-label="GoCollabo home"
            className="focus-ring flex items-center gap-2 rounded-lg text-left"
        >
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--navy)] text-[var(--lime)]">
                <Clapperboard size={16} />
            </span>
            <span className="text-[15px] font-black tracking-[-.04em]">
                Go<span className="font-normal text-[#687087]">Collabo</span>
            </span>
        </Link>
    );
}

function CountBadge({ count }: { count?: number }) {
    if (!count) return null;
    return (
        <span
            aria-label={`${count} awaiting your response`}
            className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--lime)] px-1.5 text-[11px] font-bold text-[var(--navy)]"
        >
            {count > 9 ? "9+" : count}
        </span>
    );
}

function RoleSwitch({
    role,
    onChange,
    disabled,
    live,
}: {
    role: NavRole;
    onChange: (role: NavRole) => void;
    disabled?: boolean;
    live: boolean;
}) {
    return (
        <div
            role="group"
            aria-label={live ? "Account type" : "Demo role"}
            className="flex items-center gap-1 rounded-full border border-[var(--line)] bg-white p-1 text-[11px]"
        >
            <span className="px-2 text-[#9299aa]">{live ? "Account" : "Demo as"}</span>
            {(["creator", "brand"] as const).map(r => (
                <button
                    key={r}
                    type="button"
                    disabled={disabled}
                    aria-pressed={role === r}
                    onClick={() => role !== r && onChange(r)}
                    className={`focus-ring rounded-full px-2.5 py-1.5 font-bold capitalize transition disabled:opacity-60 ${role === r
                            ? "bg-[var(--navy)] text-white"
                            : "text-[#697186] hover:text-[var(--ink)]"
                        }`}
                >
                    {r}
                </button>
            ))}
        </div>
    );
}

function useRoleControls(
    demoRole: string,
    setDemoRole: (role: string) => void
) {
    const auth = useAuth();
    const live = Boolean(auth.user);
    const role: NavRole = live
        ? auth.user?.accountType === "brand"
            ? "brand"
            : "creator"
        : demoRole === "brand"
            ? "brand"
            : "creator";
    const mutation = trpc.auth.setAccountType.useMutation({
        onSuccess: async ({ accountType }) => {
            await auth.refresh();
            toast.success(`Switched to ${accountType} workspace`);
        },
        onError: () => toast.error("Could not update account type"),
    });
    const change = (next: NavRole) => {
        if (live) mutation.mutate({ accountType: next });
        else setDemoRole(next);
    };
    const signOut = async () => {
        try {
            await auth.logout();
            toast.success("Signed out");
        } catch {
            toast.error("Could not sign out. Try again.");
        }
    };
    return { auth, live, role, change, signOut, switching: mutation.isPending };
}

export function Topbar({
    demoRole,
    setDemoRole,
    onLogin,
    pendingRequests,
}: {
    demoRole: string;
    setDemoRole: (role: string) => void;
    onLogin: () => void;
    pendingRequests?: number;
}) {
    const [location] = useLocation();
    const path = location.split("?")[0];
    const [open, setOpen] = useState(false);
    const { auth, live, role, change, signOut, switching } = useRoleControls(
        demoRole,
        setDemoRole
    );
    const items = topItems(role);
    const mobileItems = [
        ...items,
        ...workspaceItems(role).filter(
            w =>
                !items.some(i => i.href === w.href) &&
                w.id !== "creator" &&
                w.id !== "brand"
        ),
    ];

    useEffect(() => {
        setOpen(false);
    }, [path]);

    return (
        <header className="nav-shell sticky top-0 z-30">
            <div className="mx-auto flex h-[70px] max-w-[1440px] items-center justify-between gap-4 px-5 lg:px-10">
                <Logo />

                <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
                    {items.map(item => {
                        const active = item.match(path);
                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                aria-current={active ? "page" : undefined}
                                className={`focus-ring relative rounded-full px-3.5 py-2 text-sm font-semibold transition ${active
                                        ? "bg-[#eef0f7] text-[var(--ink)]"
                                        : "text-[#687087] hover:bg-[#f3f4f9] hover:text-[var(--ink)]"
                                    }`}
                            >
                                {item.label}
                                {item.id === "workspace" && role === "creator" && (
                                    <span className="ml-2 inline-flex align-middle">
                                        <CountBadge count={pendingRequests} />
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="flex items-center gap-2">
                    <div className="hidden md:block">
                        {!auth.loading && (
                            <RoleSwitch
                                role={role}
                                onChange={change}
                                disabled={switching}
                                live={live}
                            />
                        )}
                    </div>
                    {auth.user ? (
                        <button
                            type="button"
                            onClick={signOut}
                            className="focus-ring hidden items-center gap-2 rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-semibold hover:border-[#b6bdd0] md:inline-flex"
                        >
                            Log out
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onLogin}
                            className="focus-ring inline-flex items-center gap-2 rounded-full bg-[var(--navy)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d2948]"
                        >
                            <LogIn size={15} /> Log in
                        </button>
                    )}
                    <button
                        type="button"
                        aria-label="Open menu"
                        aria-expanded={open}
                        onClick={() => setOpen(true)}
                        className="focus-ring rounded-full border border-[var(--line)] p-2.5 md:hidden"
                    >
                        <Menu size={18} />
                    </button>
                </div>
            </div>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent
                    side="right"
                    className="w-[300px] gap-0 p-0 sm:max-w-[300px]"
                >
                    <SheetHeader className="border-b border-[var(--line)] p-5">
                        <SheetTitle className="text-base">Menu</SheetTitle>
                        <SheetDescription className="text-xs">
                            {live
                                ? `Signed in as ${auth.user?.name || auth.user?.email || "GoCollabo user"}`
                                : "Browsing in demo mode (sample data)"}
                        </SheetDescription>
                    </SheetHeader>
                    <nav aria-label="Mobile" className="flex-1 overflow-y-auto p-3">
                        {mobileItems.map(item => {
                            const active = item.match(path);
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    aria-current={active ? "page" : undefined}
                                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${active
                                            ? "bg-[#eef0f7] text-[var(--ink)]"
                                            : "text-[#687087] hover:bg-[#f3f4f9]"
                                        }`}
                                >
                                    <Icon size={16} />
                                    {item.label}
                                    {item.id === "requests" && role === "creator" && (
                                        <CountBadge count={pendingRequests} />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                    <div className="space-y-3 border-t border-[var(--line)] p-4">
                        {!auth.loading && (
                            <RoleSwitch
                                role={role}
                                onChange={change}
                                disabled={switching}
                                live={live}
                            />
                        )}
                        {auth.user && (
                            <button
                                type="button"
                                onClick={signOut}
                                className="focus-ring flex w-full items-center justify-center gap-2 rounded-full border border-[var(--line)] px-4 py-2.5 text-sm font-semibold"
                            >
                                <LogOut size={15} /> Log out
                            </button>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </header>
    );
}

export function SideRail({
    role,
    pendingRequests,
}: {
    role: NavRole;
    pendingRequests?: number;
}) {
    const [location] = useLocation();
    const path = location.split("?")[0];
    const items = workspaceItems(role);
    return (
        <aside className="hidden w-[220px] shrink-0 border-r border-[var(--line)] bg-[#f5f6fa] px-4 py-6 md:block">
            <nav
                aria-label={role === "brand" ? "Brand workspace" : "Creator workspace"}
                className="sticky top-[94px]"
            >
                <div className="eyebrow mb-4 px-3">
                    {role === "brand" ? "Brand" : "Creator"}
                </div>
                <ul className="space-y-1">
                    {items.map(item => {
                        const Icon = item.icon;
                        const active = item.match(path);
                        return (
                            <li key={item.id}>
                                <Link
                                    href={item.href}
                                    aria-current={active ? "page" : undefined}
                                    className={`focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${active
                                            ? "bg-white text-[var(--navy)] shadow-[0_4px_15px_rgba(16,20,35,.05)]"
                                            : "text-[#7d8598] hover:bg-white/70 hover:text-[var(--ink)]"
                                        }`}
                                >
                                    <Icon size={16} />
                                    {item.label}
                                    {item.id === "requests" && role === "creator" && (
                                        <CountBadge count={pendingRequests} />
                                    )}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </aside>
    );
}

export function MobileTabBar({
    role,
    pendingRequests,
}: {
    role: NavRole;
    pendingRequests?: number;
}) {
    const [location] = useLocation();
    const path = location.split("?")[0];
    const items = workspaceItems(role);
    return (
        <nav
            aria-label="Workspace"
            className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        >
            <ul
                className="grid"
                style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
            >
                {items.map(item => {
                    const Icon = item.icon;
                    const active = item.match(path);
                    const showBadge =
                        item.id === "requests" && role === "creator" && !!pendingRequests;
                    return (
                        <li key={item.id}>
                            <Link
                                href={item.href}
                                aria-current={active ? "page" : undefined}
                                className={`focus-ring relative flex flex-col items-center gap-1 px-1 py-2.5 text-[10.5px] font-bold ${active ? "text-[var(--navy)]" : "text-[#8a92a7]"
                                    }`}
                            >
                                <span
                                    className={`relative flex h-7 w-12 items-center justify-center rounded-full transition ${active ? "bg-[var(--lime)]" : ""
                                        }`}
                                >
                                    <Icon size={17} />
                                    {showBadge && (
                                        <span
                                            aria-label={`${pendingRequests} awaiting your response`}
                                            className="absolute right-1 top-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#0B0D12]"
                                        />
                                    )}
                                </span>
                                {item.shortLabel ?? item.label}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}

type Crumb = { label: string; href?: string };

export function crumbsFor(path: string, role: NavRole): Crumb[] | null {
    if (path === "/creator/portfolio") return null;
    if (path.startsWith("/creator/")) {
        return [
            { label: "Discover", href: "/discover" },
            { label: "Creator profile" },
        ];
    }
    if (path === "/briefs/new") {
        return [
            { label: role === "brand" ? "My briefs" : "Briefs", href: "/briefs" },
            { label: "New brief" },
        ];
    }
    if (/^\/briefs\/[^/]+\/edit$/.test(path)) {
        return [{ label: "My briefs", href: "/briefs" }, { label: "Edit brief" }];
    }
    return null;
}

export function Breadcrumbs({ path, role }: { path: string; role: NavRole }) {
    const crumbs = crumbsFor(path, role);
    if (!crumbs) return null;
    return (
        <nav
            aria-label="Breadcrumb"
            className="mx-auto max-w-[1440px] px-5 pt-5 lg:px-10"
        >
            <ol className="flex items-center gap-1.5 text-xs font-semibold text-[#8991a2]">
                {crumbs.map((crumb, i) => (
                    <li key={crumb.label} className="flex items-center gap-1.5">
                        {i > 0 && <ChevronRight size={12} aria-hidden />}
                        {crumb.href ? (
                            <Link
                                href={crumb.href}
                                className="focus-ring rounded hover:text-[var(--ink)]"
                            >
                                {crumb.label}
                            </Link>
                        ) : (
                            <span aria-current="page" className="text-[var(--ink)]">
                                {crumb.label}
                            </span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}

export function useRouteChangeEffects(path: string) {
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
        document.getElementById("main-content")?.focus({ preventScroll: true });
    }, [path]);
}