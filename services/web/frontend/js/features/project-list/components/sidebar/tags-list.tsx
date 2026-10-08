import { sortBy } from "lodash";
import { useTranslation } from "react-i18next";
import { DotsThreeVertical, Plus, TagSimple } from "@phosphor-icons/react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import {
  UNCATEGORIZED_KEY,
  useProjectListContext,
} from "../../context/project-list-context";
import useTag from "../../hooks/use-tag";
import { getTagColor } from "../../util/tag";
import {
  OLDropdown,
  OLDropdownItem,
  OLDropdownMenu,
  OLDropdownToggle,
} from "@/shared/components/ol/ol-dropdown-menu";
import { useFeatureFlag } from "@/shared/context/split-test-context";
import MaterialIcon from "@/shared/components/material-icon";
import getMeta from "@/utils/meta";

const TAG_ACTION_MENU_WIDTH = 160;
const TAG_ACTION_MENU_HEIGHT = 84;
const TAG_ACTION_MENU_GAP = 8;
const TAG_ACTION_MENU_VIEWPORT_PADDING = 8;

type TagActionMenuPosition = {
  top: number;
  left: number;
};

function getTagActionMenuPosition(rect: DOMRect): TagActionMenuPosition {
  const preferredLeft = rect.right + TAG_ACTION_MENU_GAP;
  const fitsOnRight =
    preferredLeft + TAG_ACTION_MENU_WIDTH + TAG_ACTION_MENU_VIEWPORT_PADDING <=
    window.innerWidth;
  const left = fitsOnRight
    ? preferredLeft
    : Math.max(
        TAG_ACTION_MENU_VIEWPORT_PADDING,
        rect.left - TAG_ACTION_MENU_WIDTH - TAG_ACTION_MENU_GAP,
      );
  const maxTop = Math.max(
    TAG_ACTION_MENU_VIEWPORT_PADDING,
    window.innerHeight -
      TAG_ACTION_MENU_HEIGHT -
      TAG_ACTION_MENU_VIEWPORT_PADDING,
  );

  return {
    left,
    top: Math.min(Math.max(rect.top, TAG_ACTION_MENU_VIEWPORT_PADDING), maxTop),
  };
}

function UnderleafTagActions({
  tagId,
  tagName,
  renameLabel,
  deleteLabel,
  onRename,
  onDelete,
}: {
  tagId: string;
  tagName: string;
  renameLabel: string;
  deleteLabel: string;
  onRename: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onDelete: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<TagActionMenuPosition>({
    top: 0,
    left: 0,
  });
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = `tag-actions-${tagId}`;

  useEffect(() => {
    if (!isOpen) return;

    const updateMenuPosition = () => {
      const toggle = toggleRef.current;
      if (toggle) {
        setMenuPosition(
          getTagActionMenuPosition(toggle.getBoundingClientRect()),
        );
      }
    };

    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !toggleRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        toggleRef.current?.focus();
      }
    };

    updateMenuPosition();
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen]);

  const toggleMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!isOpen) {
      setMenuPosition(
        getTagActionMenuPosition(event.currentTarget.getBoundingClientRect()),
      );
    }
    setIsOpen((open) => !open);
  };

  const closeAndRun = (
    event: React.MouseEvent<HTMLButtonElement>,
    action: (event: React.MouseEvent<HTMLButtonElement>) => void,
  ) => {
    setIsOpen(false);
    action(event);
  };

  return (
    <>
      <div className={`tag-menu${isOpen ? " show" : ""}`}>
        <button
          ref={toggleRef}
          type="button"
          className="dropdown-toggle underleaf-tag-menu-toggle"
          aria-label={`Open actions for ${tagName}`}
          aria-expanded={isOpen}
          aria-controls={menuId}
          aria-haspopup="menu"
          data-testid="tag-dropdown-toggle"
          onClick={toggleMenu}
        >
          <DotsThreeVertical weight="bold" />
        </button>
      </div>
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            className="underleaf-tag-actions-menu"
            role="menu"
            style={menuPosition}
          >
            <button
              type="button"
              className="underleaf-tag-actions-item"
              role="menuitem"
              onClick={(event) => closeAndRun(event, onRename)}
            >
              {renameLabel}
            </button>
            <button
              type="button"
              className="underleaf-tag-actions-item"
              role="menuitem"
              onClick={(event) => closeAndRun(event, onDelete)}
            >
              {deleteLabel}
            </button>
          </div>,
          document.querySelector(".underleaf-app-shell") ?? document.body,
        )}
    </>
  );
}

export default function TagsList() {
  const { t } = useTranslation();
  const isSharedWorkspaceEnabled = useFeatureFlag("shared-workspace");
  const isUnderleaf = getMeta("ol-ExposedSettings")?.underleaf;
  const {
    tags,
    projectsPerTag,
    untaggedProjectsCount,
    selectedTagId,
    selectTag,
  } = useProjectListContext();
  const {
    handleSelectTag,
    openCreateTagModal,
    handleEditTag,
    handleDeleteTag,
    CreateTagModal,
    EditTagModal,
    DeleteTagModal,
  } = useTag();

  const tagItems = sortBy(tags, (tag) => tag.name?.toLowerCase()).map((tag) => {
    return (
      <li
        className={`tag ${selectedTagId === tag._id ? "active" : ""}`}
        key={tag._id}
      >
        <button
          type="button"
          className="tag-name"
          translate="no"
          onClick={(e) =>
            handleSelectTag(e as unknown as React.MouseEvent, tag._id)
          }
        >
          <span
            className="tag-color-indicator"
            style={{
              color: getTagColor(tag),
            }}
          >
            {isUnderleaf ? null : (
              <TagSimple weight="fill" className="tag-list-icon" />
            )}
          </span>
          <span className="name">{tag.name}</span>
          <span className="underleaf-sidebar-item-count">
            ({projectsPerTag[tag._id].length})
          </span>
        </button>

        {isUnderleaf ? (
          <UnderleafTagActions
            tagId={tag._id}
            tagName={tag.name}
            renameLabel={t("rename")}
            deleteLabel={t("delete")}
            onRename={(event) => handleEditTag(event, tag._id)}
            onDelete={(event) => handleDeleteTag(event, tag._id)}
          />
        ) : (
          <OLDropdown align="end" className="tag-menu">
            <OLDropdownToggle
              aria-label={t("open_action_menu", { name: tag.name })}
              id={`${tag._id}-dropdown-toggle`}
              data-testid="tag-dropdown-toggle"
            >
              <DotsThreeVertical weight="bold" />
            </OLDropdownToggle>
            <OLDropdownMenu className="dropdown-menu-sm-width">
              <OLDropdownItem
                as="li"
                className="tag-action"
                onClick={(e) => handleEditTag(e, tag._id)}
              >
                {t("edit")}
              </OLDropdownItem>
              <OLDropdownItem
                as="li"
                className="tag-action"
                onClick={(e) => handleDeleteTag(e, tag._id)}
              >
                {t("delete")}
              </OLDropdownItem>
            </OLDropdownMenu>
          </OLDropdown>
        )}
      </li>
    );
  });

  if (tags.length > 0) {
    tagItems.push(
      <li
        className={`tag untagged ${
          selectedTagId === UNCATEGORIZED_KEY ? "active" : ""
        }`}
        key={UNCATEGORIZED_KEY}
      >
        <button
          type="button"
          className="tag-name"
          onClick={() => selectTag(UNCATEGORIZED_KEY)}
        >
          <span className="name fst-italic">{t("uncategorized")}</span>
          <span className="underleaf-sidebar-item-count">
            ({untaggedProjectsCount})
          </span>
        </button>
      </li>,
    );
  }

  const modals = (
    <>
      <CreateTagModal id="create-tag-modal" />
      <EditTagModal id="edit-tag-modal" />
      <DeleteTagModal id="delete-tag-modal" />
    </>
  );

  return (
    <>
      {isUnderleaf ? (
        <>
          <li
            className="dropdown-header underleaf-sidebar-tags-header"
            data-testid="organize-projects"
          >
            <span>{isSharedWorkspaceEnabled ? t("your_tags") : "TAGS"}</span>
            <button
              type="button"
              onClick={openCreateTagModal}
              aria-label={t("new_tag")}
            >
              <MaterialIcon type="add" />
            </button>
          </li>
          <li className="underleaf-sidebar-tags-scroll">
            <ul className="underleaf-sidebar-tags-list list-unstyled">
              {tagItems}
            </ul>
          </li>
        </>
      ) : (
        <>
          <li
            className="dropdown-header"
            aria-hidden="true"
            data-testid="organize-projects"
          >
            {isSharedWorkspaceEnabled ? t("your_tags") : t("organize_tags")}
          </li>
          <li className="tag">
            <button
              type="button"
              className="tag-name"
              onClick={openCreateTagModal}
            >
              <Plus weight="bold" />
              <span className="name">{t("new_tag")}</span>
            </button>
          </li>
          {tagItems}
        </>
      )}
      {modals}
    </>
  );
}
