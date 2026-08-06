"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, LogOut, User, Search, ChevronDown, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSessionContext } from "@/context/SessionContext";
import { useNavigationStore } from "@/store/navigation-store";
import { cn } from "@/lib/utils";
import { flattenNavItemsForSearch } from "@/lib/navigation";
import { resolveNavHref } from "@/lib/resolve-nav-href";
import { logout } from "@/services/auth";
import { ThemeSwitcher } from "@/common/components/theme-setting-modal";

const roleAvatarStyle: Record<string, string> = {
  ADMIN: "bg-red-100    text-red-700",
  PRINCIPAL: "bg-red-100    text-red-700",
  STAFF: "bg-blue-100   text-blue-700",
  STUDENT: "bg-emerald-100 text-emerald-700",
  PARENT: "bg-purple-100 text-purple-700",
};

const MAX_SEARCH_RESULTS = 8;

export function Topbar() {
  const router = useRouter();
  const { user } = useSessionContext();
  const { toggleSidebar, navItems } = useNavigationStore();

  const pages = useMemo(() => {
    return flattenNavItemsForSearch(navItems).map((page) => ({
      ...page,
      url: resolveNavHref(page.url, page.displayName, page.id) || page.url,
    }));
  }, [navItems]);

  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(-1);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const pagesLoading = navItems.length === 0;

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
        setActiveResultIndex(-1);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        if (searchTerm.trim().length > 0) setIsSearchOpen(true);
      }
    }
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [searchTerm]);

  const filteredPages = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (term.length === 0) return [];

    return pages
      .filter((page) => {
        const name = page.displayName.toLowerCase();
        const path = (page.breadcrumbPath ?? "").toLowerCase();
        const url = page.url.toLowerCase();
        return (
          name.includes(term) ||
          path.includes(term) ||
          url.includes(term.replace(/\s+/g, "-"))
        );
      })
      .slice(0, MAX_SEARCH_RESULTS);
  }, [pages, searchTerm]);

  const showSearchDropdown = isSearchOpen && searchTerm.trim().length > 0;

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchTerm(value);
      setActiveResultIndex(-1);
      setIsSearchOpen(value.trim().length > 0);
    },
    [],
  );

  const navigateTo = useCallback(
    (url: string, displayName?: string, id?: string) => {
      const resolved = resolveNavHref(url, displayName ?? "", id) || url;
      router.push(resolved);
      setSearchTerm("");
      setIsSearchOpen(false);
      setActiveResultIndex(-1);
      searchInputRef.current?.blur();
    },
    [router],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSearchDropdown) {
        if (e.key === "Escape") {
          setSearchTerm("");
          setIsSearchOpen(false);
        }
        return;
      }

      if (filteredPages.length === 0) {
        if (e.key === "Escape") {
          setSearchTerm("");
          setIsSearchOpen(false);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveResultIndex((prev) =>
            prev < filteredPages.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveResultIndex((prev) =>
            prev > 0 ? prev - 1 : filteredPages.length - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (activeResultIndex >= 0 && filteredPages[activeResultIndex]) {
            const page = filteredPages[activeResultIndex];
            navigateTo(page.url, page.displayName, page.id);
          } else if (filteredPages[0]) {
            navigateTo(
              filteredPages[0].url,
              filteredPages[0].displayName,
              filteredPages[0].id,
            );
          }
          break;
        case "Escape":
          setIsSearchOpen(false);
          setActiveResultIndex(-1);
          break;
      }
    },
    [activeResultIndex, filteredPages, navigateTo, showSearchDropdown],
  );

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "?";

  const avatarStyle =
    roleAvatarStyle[user?.userRole ?? ""] ?? "bg-cyan-100 text-cyan-700";

  const empLabel = user?.employeeId
    ? `EMP${String(user.employeeId).padStart(3, "0")}`
    : user?.userName
      ? user.userName
      : null;

  async function handleLogout() {
    await logout();
    window.location.href = "/login";
  }

  return (
    <header className="app-toolbar flex shrink-0 items-center gap-3 px-3 sm:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 text-black/80 hover:bg-black/10 hover:text-black md:hidden"
        onClick={toggleSidebar}
        aria-label="Toggle navigation sidebar"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </Button>

      {/* Angular: fa-graduation-cap (filled) + collegeName */}
      <div className="hidden min-w-0 max-w-[28%] items-center gap-2 md:flex lg:max-w-[32%]">
        <i
          className="fa fa-graduation-cap app-toolbar__clg-icon"
          aria-hidden="true"
        />
        <span
          className="app-toolbar__college"
          title={user?.collegeName ?? "University Campus"}
        >
          {user?.collegeName ?? "University Campus"}
        </span>
      </div>

      <div
        ref={searchContainerRef}
        className="relative ml-auto flex min-w-0 items-center sm:w-[280px]"
        role="combobox"
        aria-expanded={showSearchDropdown && filteredPages.length > 0}
        aria-haspopup="listbox"
        aria-owns="search-results-listbox"
      >
        <input
          ref={searchInputRef}
          type="search"
          role="searchbox"
          aria-label="Search pages"
          aria-autocomplete="list"
          aria-controls="search-results-listbox"
          aria-activedescendant={
            activeResultIndex >= 0
              ? `search-result-${activeResultIndex}`
              : undefined
          }
          placeholder="Search..."
          value={searchTerm}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchTerm.trim().length > 0) setIsSearchOpen(true);
          }}
          className={cn(
            "app-toolbar__search w-full pl-0 pr-8 text-black placeholder:text-[#848484]",
            "focus:outline-none",
          )}
        />
        {pagesLoading ? (
          <Loader2
            className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#9e9e9e]"
            aria-hidden="true"
          />
        ) : (
          <Search
            className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9e9e9e]"
            aria-hidden="true"
          />
        )}

        {showSearchDropdown && (
          <div
            id="search-results-listbox"
            role="listbox"
            aria-label="Search results"
            className="absolute top-full left-0 z-50 mt-1.5 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-card shadow-lg"
          >
            {filteredPages.length > 0 ? (
              filteredPages.map((page, index) => (
                <button
                  key={page.url}
                  id={`search-result-${index}`}
                  role="option"
                  aria-selected={index === activeResultIndex}
                  type="button"
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted",
                    index === activeResultIndex && "bg-muted",
                  )}
                  onPointerDown={(e) => {
                    e.preventDefault();
                  }}
                  onClick={() =>
                    navigateTo(page.url, page.displayName, page.id)
                  }
                >
                  <span className="block font-medium text-foreground">
                    {page.displayName}
                  </span>
                  {page.breadcrumbPath ? (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {page.breadcrumbPath}
                    </span>
                  ) : null}
                </button>
              ))
            ) : (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                No pages found
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <ThemeSwitcher />

        <button
          type="button"
          className="app-toolbar__notification hidden sm:inline-flex"
          aria-label="Mail"
        >
          <span className="material-icons" aria-hidden="true">
            mail_outline
          </span>
        </button>

        <button
          type="button"
          className="app-toolbar__notification relative"
          aria-label="Notifications"
        >
          <span className="material-icons" aria-hidden="true">
            notifications_none
          </span>
          <span
            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500"
            aria-hidden="true"
          />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#042956]/30"
              aria-label="User menu"
            >
              <Avatar className="h-[30px] w-[30px] shrink-0">
                <AvatarImage
                  src="/assets/images/avatars/default_Student.png"
                  alt=""
                />
                <AvatarFallback
                  className={cn("text-[11px] font-semibold", avatarStyle)}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="hidden text-left md:block">
                <p className="text-[13px] font-medium leading-tight text-black">
                  {user?.firstName} {user?.lastName}
                </p>
                {empLabel ? (
                  <p className="mt-0.5 text-[11px] leading-tight text-[#7b7667]">
                    ({empLabel})
                  </p>
                ) : null}
              </div>

              <ChevronDown
                className="hidden h-4 w-4 text-black/70 md:block"
                aria-hidden="true"
              />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="pb-1">
              <p className="text-[13px] font-semibold text-foreground">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] font-normal text-muted-foreground">
                {user?.roleName}
              </p>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              disabled
              className="cursor-not-allowed opacity-60"
            >
              <User className="mr-2 h-4 w-4" aria-hidden="true" />
              Profile
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 focus:bg-red-50 focus:text-red-700"
            >
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
