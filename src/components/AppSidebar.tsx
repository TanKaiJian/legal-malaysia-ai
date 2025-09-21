import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  Home, 
  MessageSquare, 
  FileSearch, 
  Settings,
  Scale,
  TestTube2
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "Home", url: "/", icon: Home },
  { title: "Document Analyzer", url: "/analyzer", icon: FileSearch },
  // { title: "Text Extraction Test", url: "/text-extraction-test", icon: TestTube2 },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-sidebar-accent text-sidebar-primary font-medium border-r-2 border-sidebar-primary" 
      : "hover:bg-sidebar-accent/50 text-sidebar-foreground";

  return (
    <Sidebar className="w-64 border-r border-sidebar-border bg-sidebar">
      <SidebarContent className="p-0">
        {/* Logo/Brand Section */}
        <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
            <Scale className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-sidebar-primary">MyLegal</h2>
            <p className="text-xs text-sidebar-foreground/70">AI Legal Assistant</p>
          </div>
        </div>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="px-4">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-none ${getNavCls({ isActive })}`}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Footer */}
        <div className="mt-auto p-4 border-t border-sidebar-border">
          <div className="text-xs text-sidebar-foreground/60 text-center">
            <p>For Kuala Lumpur, Malaysia</p>
            <p className="mt-1">Legal assistance powered by AI</p>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}