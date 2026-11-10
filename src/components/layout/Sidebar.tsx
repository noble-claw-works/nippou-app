import { NavLink } from "react-router-dom";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

interface SidebarProps {
  items: NavItem[];
  collapsed: boolean;
  onToggle: () => void;
}

/**
 * PC サイドバー。展開（w-56=224px）⇔ レール（w-16=64px）をトグルできる。
 * 折りたたみ状態は親（AppShell）で localStorage に永続化する。
 */
export function Sidebar({ items, collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={`hidden lg:flex lg:flex-col bg-white border-r border-gray-200 flex-shrink-0 transition-[width] duration-200 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Logo */}
      <div
        className={`py-4 border-b border-gray-100 ${collapsed ? "px-0 text-center" : "px-4"}`}
      >
        {collapsed ? (
          <span className="text-xl" title="305-hrl-nippou-app">
            📋
          </span>
        ) : (
          <span className="text-base font-bold text-gray-900">
            📋 305-hrl-nippou-app
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                collapsed ? "justify-center" : ""
              } ${
                isActive
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`
            }
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && item.label}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle (bottom) */}
      <div className="border-t border-gray-100 p-2">
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "サイドメニューを展開" : "サイドメニューを折りたたむ"}
          title={collapsed ? "展開" : "折りたたむ"}
          className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors ${
            collapsed ? "justify-center" : ""
          }`}
        >
          {collapsed ? (
            <ChevronsRight className="w-4 h-4 flex-shrink-0" />
          ) : (
            <>
              <ChevronsLeft className="w-4 h-4 flex-shrink-0" />
              折りたたむ
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
