import { type HTMLAttributes, type ReactNode, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import classNames from "classnames";
import MaterialIcon from "@/shared/components/material-icon";
import ThemeToggle from "@/shared/components/sidebar/theme-toggle";
import { UnderleafBrand } from "./underleaf-brand";
import getMeta from "@/utils/meta";
import type { NavbarSessionUser } from "@/shared/components/types/navbar";

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
  const displayName = sessionUser.displayName || sessionUser.username;
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="underleaf-sidebar-account">
      <a href="/user/settings" aria-label="Account settings">
        <span className="underleaf-sidebar-account-avatar">{initials}</span>
        <span className="underleaf-sidebar-account-copy">
          <span className="underleaf-sidebar-account-name">{displayName}</span>
          <span className="underleaf-sidebar-account-role">
            {isAdmin ? "Administrator" : "User"}
          </span>
        </span>
        <MaterialIcon type="unfold_more" />
      </a>
    </div>
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
  const navigationId = useId();
  const navbar = getMeta("ol-navbar");
  const authenticated = variant === "authenticated";

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
    <div className="underleaf-sidebar-project-navigation">
      {link("projects", "/project", t("projects"), "folder")}
      <a className="ds-nav-page-switcher-item" href="/project?filter=owned">
        <span className="ds-nav-page-switcher-item-label">
          {t("your_projects")}
        </span>
      </a>
      <a className="ds-nav-page-switcher-item" href="/project?filter=shared">
        <span className="ds-nav-page-switcher-item-label">
          {t("shared_with_you")}
        </span>
      </a>
      <a className="ds-nav-page-switcher-item" href="/project?filter=archived">
        <span className="ds-nav-page-switcher-item-label">
          {t("archived_projects")}
        </span>
      </a>
      <a className="ds-nav-page-switcher-item" href="/project?filter=trashed">
        <span className="ds-nav-page-switcher-item-label">{t("trash")}</span>
      </a>
      <div className="underleaf-sidebar-tag-navigation">
        <p className="underleaf-sidebar-section-label">{t("organize_tags")}</p>
        <a className="ds-nav-page-switcher-item" href="/project">
          <MaterialIcon type="add" />
          <span className="ds-nav-page-switcher-item-label">
            {t("new_tag")}
          </span>
        </a>
      </div>
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
          {authenticated &&
            link(
              "settings",
              "/user/settings",
              t("account_settings"),
              "settings",
            )}
          {authenticated && navbar?.canDisplayAdminMenu && (
            <div className="underleaf-sidebar-administration">
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
            </div>
          )}
        </nav>
        <div className="ds-nav-sidebar-lower underleaf-sidebar-lower">
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
