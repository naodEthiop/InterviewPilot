import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Mic,
  History,
  BarChart3,
  FileText,
  GraduationCap,
  Settings,
  LogOut,
  Sparkles,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth, signOut } from "@/hooks/use-auth";

type NavItem = {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
};

const PRIMARY: NavItem[] = [
  { label: "Home", to: "/dashboard", icon: LayoutDashboard },
  { label: "New Interview", to: "/setup", icon: Mic },
  { label: "History", to: "/history", icon: History },
  { label: "Reports", to: "/reports", icon: BarChart3 },
];

const LIBRARY: NavItem[] = [
  { label: "Resumes", to: "/resumes", icon: FileText },
  { label: "Learn", to: "/learn", icon: GraduationCap },
];

const FOOTER_NAV: NavItem[] = [
  { label: "Settings", to: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const current = location.pathname;

  const isActive = (to: string) =>
    to === "/dashboard"
      ? current === "/dashboard" || current === "/"
      : current === to || current.startsWith(`${to}/`);

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Guest";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link
          to="/dashboard"
          className="flex items-center gap-2.5 px-2 py-2 group"
        >
          <div className="size-8 shrink-0 rounded-lg bg-gradient-brand grid place-items-center shadow-sm shadow-brand/30 transition-transform group-hover:scale-105">
            <Sparkles className="size-4 text-white" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight group-data-[collapsible=icon]:hidden">
            VOCALIST
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {PRIMARY.map((item) => (
                <NavLink key={item.to} item={item} active={isActive(item.to)} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Library</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {LIBRARY.map((item) => (
                <NavLink key={item.to} item={item} active={isActive(item.to)} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          {FOOTER_NAV.map((item) => (
            <NavLink key={item.to} item={item} active={isActive(item.to)} />
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={displayName} className="cursor-default">
              <div className="size-6 rounded-md bg-brand/15 text-brand grid place-items-center text-[10px] font-bold">
                {initials}
              </div>
              <span className="truncate text-sm">{displayName}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sign out" onClick={() => signOut()}>
              <LogOut className="size-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
        <Link to={item.to}>
          <Icon className="size-4" />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
