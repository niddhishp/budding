import { useAppStore } from "@/stores/appStore";
import { PanelLeft, PanelRight, Plus } from "lucide-react";
import { SproutMark } from "@/components/illustrations";
import { navItemsForChild } from "./navItems";
import { activeNavigation } from "@/lib/family-navigation";
import { useTodayDate } from "@/components/care/useTodayDate";

export function Sidebar() {
  const {
    currentPage,
    setPage,
    sidebarOpen,
    toggleSidebar,
    children,
    selectedChildId,
  } = useAppStore();
  const today = useTodayDate();
  const navItems = navItemsForChild(
    children.find((c) => c.id === selectedChildId),
    today,
  );

  return (
    <aside
      className={`fixed left-0 top-0 h-dvh flex flex-col bg-white border-r border-slate-200/60 z-40 transition-all duration-300 ${sidebarOpen ? "w-64" : "w-16"}`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 shrink-0 px-4 border-b border-slate-100">
        <button
          aria-label="Kahiye Today"
          onClick={() => setPage("dashboard")}
          className={`flex items-center gap-2.5 ${!sidebarOpen && "justify-center w-full"}`}
        >
          <SproutMark className="w-8 h-8 flex-shrink-0" />
          {sidebarOpen && (
            <span className="font-heading text-xl text-slate-900">kahiye</span>
          )}
        </button>
        {sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-lg hover:bg-slate-100"
            aria-label="Collapse sidebar"
          >
            <PanelLeft className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* Toggle button when collapsed */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="w-full flex justify-center py-3 hover:bg-slate-50 border-b border-slate-100"
          aria-label="Expand sidebar"
        >
          <PanelRight className="w-4 h-4 text-slate-400" />
        </button>
      )}

      {/* Nav Items */}
      <nav
        aria-label="Main"
        className="p-2 space-y-0.5 flex-1 min-h-0 overflow-y-auto"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNavigation(currentPage) === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-clay/10 text-clay"
                  : "text-slate-550 hover:bg-slate-50 hover:text-slate-700"
              } ${!sidebarOpen && "justify-center"}`}
              title={!sidebarOpen ? item.label : undefined}
            >
              <Icon
                className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? "text-clay" : ""}`}
              />
              {sidebarOpen && (
                <>
                  <span>{item.label}</span>
                  {item.highlight && (
                    <span className="ml-auto rounded-full bg-leaf/10 px-2 py-1 text-[10px] text-leaf">
                      For this age
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Child Selector (when expanded) */}
      {sidebarOpen && <ChildSelector />}
    </aside>
  );
}

function ChildSelector() {
  const { children, selectedChildId, selectChild, setAddingChild } =
    useAppStore();

  return (
    <div className="shrink-0 max-h-[30dvh] overflow-y-auto p-3 border-t border-slate-100 bg-white/80 backdrop-blur">
      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2 px-1">
        Your Children
      </p>
      <div className="space-y-1">
        {children.map((child) => (
          <button
            key={child.id}
            onClick={() => selectChild(child.id)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all ${
              selectedChildId === child.id
                ? "bg-slate-100"
                : "hover:bg-slate-50"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                selectedChildId === child.id
                  ? "bg-clay text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {child.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">
                {child.name}
              </p>
              <p className="text-[11px] text-slate-400">{child.age.label}</p>
            </div>
          </button>
        ))}
        <button
          onClick={() => setAddingChild(true)}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-sm text-slate-500 hover:bg-slate-50"
        >
          <div className="w-8 h-8 rounded-full border border-dashed border-slate-300 flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </div>
          Add a child
        </button>
      </div>
    </div>
  );
}
