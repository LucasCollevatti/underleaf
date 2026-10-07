import { useTranslation } from "react-i18next";
import classNames from "classnames";
import {
  Filter,
  useProjectListContext,
} from "../../context/project-list-context";
import TagsList from "./tags-list";
import ProjectsFilterMenu from "../projects-filter-menu";
import { Folder } from "@phosphor-icons/react";
import { ActivePage } from "../../util/navigation-state";
import MaterialIcon from "@/shared/components/material-icon";

type SidebarFilterProps = {
  filter: Filter;
  text: React.ReactNode;
  activePage: ActivePage;
  icon?: React.ReactNode;
  count?: number;
};

export function SidebarFilter({
  filter,
  text,
  icon,
  count,
  activePage,
}: SidebarFilterProps) {
  const { selectFilter } = useProjectListContext();

  return (
    <ProjectsFilterMenu filter={filter} activePage={activePage}>
      {(isActive) => (
        <li
          className={classNames(isActive && "active", {
            "underleaf-sidebar-project-root": !!icon,
            "underleaf-sidebar-project-child": !icon,
          })}
        >
          <button
            className={classNames("sidebar-filter-button", {
              "sidebar-filter-button-with-icon": !!icon,
            })}
            type="button"
            onClick={() => selectFilter(filter)}
          >
            {icon && <span className="icon">{icon}</span>}
            {count === undefined ? (
              text
            ) : (
              <>
                <span className="sidebar-filter-label">{text}</span>
                <span
                  className="underleaf-sidebar-item-count"
                  aria-hidden="true"
                >
                  {count}
                </span>
              </>
            )}
          </button>
        </li>
      )}
    </ProjectsFilterMenu>
  );
}

export default function SidebarFilters({
  activePage,
  underleaf = false,
}: {
  activePage: ActivePage;
  underleaf?: boolean;
}) {
  const { t } = useTranslation();
  const { projectCounts } = useProjectListContext();
  return (
    <ul
      className={classNames(
        "list-unstyled project-list-filters",
        underleaf && "underleaf-project-list-filters",
      )}
    >
      <SidebarFilter
        activePage={activePage}
        filter="all"
        text={t("projects")}
        icon={underleaf ? <MaterialIcon type="folder" /> : <Folder size={20} />}
      />
      <SidebarFilter
        activePage={activePage}
        filter="owned"
        text={t("your_projects")}
        count={underleaf ? projectCounts.owned : undefined}
      />
      <SidebarFilter
        activePage={activePage}
        filter="shared"
        text={t("shared_with_you")}
        count={underleaf ? projectCounts.shared : undefined}
      />
      <SidebarFilter
        activePage={activePage}
        filter="archived"
        text={t("archived_projects")}
        count={underleaf ? projectCounts.archived : undefined}
      />
      {underleaf && (
        <SidebarFilter
          activePage={activePage}
          filter="trashed"
          text={t("trash")}
          count={projectCounts.trashed}
        />
      )}
      <li aria-hidden="true">
        <hr />
      </li>
      <TagsList />
    </ul>
  );
}
