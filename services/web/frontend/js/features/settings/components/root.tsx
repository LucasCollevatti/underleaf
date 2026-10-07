import { useTranslation } from "react-i18next";
import AccountInfoSection from "./account-info-section";
import PasswordSection from "./password-section";
import SessionsSection from "./sessions-section";
import { UserProvider } from "../../../shared/context/user-context";
import useWaitForI18n from "../../../shared/hooks/use-wait-for-i18n";
import useScrollToIdOnLoad from "../../../shared/hooks/use-scroll-to-id-on-load";
import ThemeToggle from "@/shared/components/sidebar/theme-toggle";
import {
  UnderleafAppProviders,
  UnderleafAppShell,
} from "@/shared/components/underleaf/underleaf-app-shell";

function SettingsPageRoot() {
  const { isReady } = useWaitForI18n();
  useScrollToIdOnLoad();

  return (
    <UnderleafAppProviders>
      <UnderleafAppShell
        activePage="settings"
        pageClassName="underleaf-settings-page"
      >
        <UserProvider>{isReady && <SettingsPageContent />}</UserProvider>
      </UnderleafAppShell>
    </UnderleafAppProviders>
  );
}

function SettingsPageContent() {
  const { t } = useTranslation();
  return (
    <main id="main-content" className="underleaf-settings-main">
      <header className="underleaf-settings-heading">
        <h1>{t("account_settings")}</h1>
      </header>
      <div className="underleaf-settings-grid">
        <section
          className="underleaf-settings-card"
          aria-labelledby="update-account-info"
        >
          <AccountInfoSection />
        </section>
        <section
          className="underleaf-settings-card"
          aria-label={t("change_password")}
        >
          <PasswordSection />
        </section>
        <section
          className="underleaf-settings-card"
          aria-labelledby="appearance-heading"
        >
          <h2 id="appearance-heading">{t("appearance")}</h2>
          <ThemeToggle />
        </section>
        <section className="underleaf-settings-card" aria-label={t("sessions")}>
          <SessionsSection />
        </section>
      </div>
    </main>
  );
}

export default SettingsPageRoot;
