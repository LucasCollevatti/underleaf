import {
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import classNames from "classnames";
import MaterialIcon from "@/shared/components/material-icon";
import ThemeToggle from "@/shared/components/sidebar/theme-toggle";
import { UnderleafBrand } from "./underleaf-brand";
import getMeta from "@/utils/meta";
import type { NavbarSessionUser } from "@/shared/components/types/navbar";
import { postJSON } from "@/infrastructure/fetch-json";
import { debugConsole } from "@/utils/debugging";
import type { GetProjectsResponseBody } from "../../../../../types/project/dashboard/api";
import {
  getProjectFilterCounts,
  type ProjectFilterCounts,
} from "@/features/project-list/util/project-counts";

export type UnderleafSidebarVariant =
  | "authenticated"
  | "unauthenticated"
  | "setup";

export type UnderleafPage =
  | "projects"
  | "admin"
  | "users"
  | "settings"
  | "system";

export type UnderleafSidebarProps = HTMLAttributes<HTMLElement> & {
  variant?: UnderleafSidebarVariant;
  activePage?: UnderleafPage;
  navigation?: ReactNode;
  footer?: ReactNode;
  resizeHandle?: ReactNode;
};

function UnderleafAccountSection({
  sessionUser,
  isAdmin,
}: {
  sessionUser: NavbarSessionUser;
  isAdmin: boolean;
}) {
  const { t } = useTranslation();
  const displayName = sessionUser.displayName || sessionUser.username;
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const closeMenu = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, [menuOpen]);

  return (
    <div className="underleaf-sidebar-account" ref={accountRef}>
      <button
        type="button"
        className="underleaf-sidebar-account-trigger"
        aria-label="Account menu"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        onClick={() => setMenuOpen((value) => !value)}
      >
        <span className="underleaf-sidebar-account-avatar">{initials}</span>
        <span className="underleaf-sidebar-account-copy">
          <span className="underleaf-sidebar-account-name">{displayName}</span>
          <span className="underleaf-sidebar-account-role">
            {isAdmin ? "Administrator" : "User"}
          </span>
        </span>
        <MaterialIcon type={menuOpen ? "expand_less" : "unfold_more"} />
      </button>
      {menuOpen && (
        <div className="underleaf-sidebar-account-menu" id={menuId}>
          <a className="underleaf-sidebar-account-menu-item" href="/user/settings">
            <MaterialIcon type="settings" />
            {t("account_settings")}
          </a>
          <form method="POST" action="/logout">
            <input type="hidden" name="_csrf" value={getMeta("ol-csrfToken")} />
            <button
              type="submit"
              className="underleaf-sidebar-account-menu-item underleaf-sidebar-account-menu-logout"
            >
              <MaterialIcon type="logout" />
              {t("log_out")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function ProjectCount({ value }: { value?: number }) {
  if (value === undefined) return null;

  return (
    <span className="underleaf-sidebar-item-count" aria-hidden="true">
      {value}
    </span>
  );
}

export function UnderleafSidebar({
  variant = "authenticated",
  activePage,
  navigation,
  footer,
  resizeHandle,
  className,
  ...props
}: UnderleafSidebarProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [projectCounts, setProjectCounts] = useState<
    ProjectFilterCounts | undefined
  >();
  const navigationId = useId();
  const navbar = getMeta("ol-navbar");
  const authenticated = variant === "authenticated";

  useEffect(() => {
    if (
      !authenticated ||
      !navbar?.sessionUser ||
      activePage !== "projects" ||
      navigation
    )
      return;

    let cancelled = false;
    postJSON<GetProjectsResponseBody>("/api/project", {
      body: { sort: { by: "lastUpdated", order: "desc" } },
    })
      .then((data) => {
        if (!cancelled) setProjectCounts(getProjectFilterCounts(data.projects));
      })
      .catch((error) => debugConsole.error(error));

    return () => {
      cancelled = true;
    };
  }, [activePage, authenticated, navigation, navbar?.sessionUser]);

  const link = (
    page: UnderleafPage,
    href: string,
    label: string,
    icon: string,
  ) => (
    <a
      key={page}
      href={href}
      className={classNames("ds-nav-page-switcher-item", {
        active: activePage === page,
      })}
      aria-current={activePage === page ? "page" : undefined}
    >
      <MaterialIcon type={icon} />
      <span className="ds-nav-page-switcher-item-label">{label}</span>
    </a>
  );

  const projectNavigation = authenticated && !navigation && (
    <div
      className={classNames("underleaf-sidebar-project-navigation", {
        "is-expanded": activePage === "projects",
      })}
    >
      {link("projects", "/project", t("projects"), "folder")}
      {activePage === "projects" && (
        <div className="underleaf-sidebar-project-children">
          <a className="ds-nav-page-switcher-item" href="/project?filter=owned">
            <span className="ds-nav-page-switcher-item-label">
              {t("your_projects")}
            </span>
            <ProjectCount value={projectCounts?.owned} />
          </a>
          <a
            className="ds-nav-page-switcher-item"
            href="/project?filter=shared"
          >
            <span className="ds-nav-page-switcher-item-label">
              {t("shared_with_you")}
            </span>
            <ProjectCount value={projectCounts?.shared} />
          </a>
          <a
            className="ds-nav-page-switcher-item"
            href="/project?filter=archived"
          >
            <span className="ds-nav-page-switcher-item-label">
              {t("archived_projects")}
            </span>
            <ProjectCount value={projectCounts?.archived} />
          </a>
          <a
            className="ds-nav-page-switcher-item"
            href="/project?filter=trashed"
          >
            <span className="ds-nav-page-switcher-item-label">
              {t("trash")}
            </span>
            <ProjectCount value={projectCounts?.trashed} />
          </a>
          <div className="underleaf-sidebar-tag-navigation">
            <p className="underleaf-sidebar-section-label">
              {t("organize_tags")}
            </p>
            <a className="ds-nav-page-switcher-item" href="/project">
              <MaterialIcon type="add" />
              <span className="ds-nav-page-switcher-item-label">
                {t("new_tag")}
              </span>
            </a>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <aside
      {...props}
      className={classNames(
        "project-list-sidebar-wrapper-react",
        "underleaf-sidebar",
        { "underleaf-sidebar-expanded": expanded },
        className,
      )}
    >
      <div className="underleaf-sidebar-brand">
        <a href={authenticated ? "/project" : "/"} aria-label="Underleaf">
          <UnderleafBrand variant="wordmark" />
        </a>
        <button
          type="button"
          className="underleaf-sidebar-menu btn btn-secondary"
          aria-label={t("menu")}
          aria-expanded={expanded}
          aria-controls={navigationId}
          onClick={() => setExpanded((value) => !value)}
        >
          <MaterialIcon type={expanded ? "close" : "menu"} />
        </button>
      </div>
      <div id={navigationId} className="underleaf-sidebar-sections">
        <nav className="underleaf-sidebar-navigation" aria-label={t("primary")}>
          {navigation ??
            (authenticated ? (
              projectNavigation
            ) : (
              <p className="underleaf-sidebar-description">
                {variant === "setup"
                  ? t("underleaf_setup_description")
                  : t("underleaf_guest_description")}
              </p>
            ))}
        </nav>
        <div className="ds-nav-sidebar-lower underleaf-sidebar-lower">
          {authenticated && navbar?.canDisplayAdminMenu && (
            <nav
              className="underleaf-sidebar-administration"
              aria-label={t("underleaf_administration")}
            >
              <p className="underleaf-sidebar-section-label">ADMIN</p>
              {link(
                "admin",
                "/admin",
                t("underleaf_administration"),
                "admin_panel_settings",
              )}
              {link("users", "/admin/users", t("underleaf_users"), "group")}
              {link(
                "system",
                "/status",
                t("underleaf_system"),
                "monitor_heart",
              )}
            </nav>
          )}
          {footer}
          <ThemeToggle />
          {authenticated && navbar?.sessionUser && (
            <UnderleafAccountSection
              sessionUser={navbar.sessionUser}
              isAdmin={Boolean(navbar.canDisplayAdminMenu)}
            />
          )}
        </div>
      </div>
      {resizeHandle}
    </aside>
  );
}
