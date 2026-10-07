import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  UnderleafAppProviders,
  UnderleafAppShell,
} from "@/shared/components/underleaf/underleaf-app-shell";
import OLButton from "@/shared/components/ol/ol-button";
import OLForm from "@/shared/components/ol/ol-form";
import OLFormControl from "@/shared/components/ol/ol-form-control";
import OLFormGroup from "@/shared/components/ol/ol-form-group";
import OLFormLabel from "@/shared/components/ol/ol-form-label";
import ThemeToggle from "@/shared/components/sidebar/theme-toggle";
import { UnderleafBrand } from "@/shared/components/underleaf/underleaf-brand";
import { FetchError, postJSON } from "@/infrastructure/fetch-json";

type Step = "welcome" | "administrator" | "ready";
type Props = {
  page: "welcome" | "login";
  sessionExpired?: boolean;
  navigate?: (path: string) => void;
};

const defaultNavigate = (path: string) => window.location.assign(path);
const steps: Step[] = ["welcome", "administrator", "ready"];
const errorKeys: Record<string, string> = {
  invalid_username: "underleaf_invalid_username",
  invalid_password: "underleaf_invalid_password",
  too_short: "underleaf_invalid_password",
  too_long: "underleaf_invalid_password",
  invalid_character: "underleaf_invalid_password",
  username_taken: "underleaf_username_taken",
  password_mismatch: "underleaf_password_mismatch",
  setup_closed: "underleaf_setup_closed",
  setup_login_failed: "underleaf_setup_login_failed",
};

function UnderleafAnimatedMark() {
  return (
    <svg
      className="underleaf-auth-animated-mark"
      viewBox="320 318 615 663"
      role="img"
      aria-label="Underleaf"
    >
      <path
        className="underleaf-auth-mark-base"
        d="M326 327 H420 C500 327 550 385 550 452 V758 C550 805 578 842 622 846 C590 900 545 945 492 952 C395 930 326 840 326 730 Z"
      />
      <path
        className="underleaf-auth-mark-leaf"
        d="M929 323 V715 C929 860 805 975 625 975 C585 975 548 970 515 965 C575 945 612 905 645 848 C690 760 750 630 873 492 C770 572 690 690 603 838 V652 C603 505 735 425 929 323 Z"
      />
    </svg>
  );
}

function UnderleafLoginPromo() {
  const { t } = useTranslation();

  return (
    <div className="underleaf-auth-promo">
      <div className="underleaf-auth-promo-copy">
        <span className="underleaf-auth-eyebrow">
          {t("underleaf_auth_tagline_label", {
            defaultValue: "COLLABORATIVE LATEX",
          })}
        </span>
        <h2>
          {t("underleaf_auth_tagline", {
            defaultValue: "Write, compile and revise together.",
          })}
        </h2>
        <p>
          {t("underleaf_auth_tagline_intro", {
            defaultValue:
              "Your LaTeX projects stay where your team decides — with live preview and simultaneous editing.",
          })}
        </p>
      </div>

      <div className="underleaf-auth-workspace" aria-hidden="true">
        <div className="underleaf-auth-editor">
          <div className="underleaf-auth-editor-tabs">
            <span>main.tex</span>
            <span>refs.bib</span>
          </div>
          <div className="underleaf-auth-editor-code">
            <span>1</span>
            <code>
              <b>\section</b>
              {"{"}
              {t("underleaf_auth_editor_heading")}
              {"}"}
            </code>
            <span>2</span>
            <code>{t("underleaf_auth_editor_intro")}</code>
            <span>3</span>
            <code>
              <b>\[</b> e^{"{i\\pi}"} + 1 = 0 <b>\]</b>
            </code>
            <span>4</span>
            <code>
              {t("underleaf_auth_editor_result")}
              <i className="underleaf-auth-cursor" />
            </code>
          </div>
        </div>
        <div className="underleaf-auth-preview">
          <strong>1&nbsp;&nbsp;{t("underleaf_auth_editor_heading")}</strong>
          <span>{t("underleaf_auth_editor_intro")}</span>
          <em>
            e<sup>iπ</sup> + 1 = 0
          </em>
          <span>{t("underleaf_auth_editor_result")}</span>
          <small>• {t("underleaf_auth_compiled")}</small>
        </div>
      </div>

      <div className="underleaf-auth-promo-mark" aria-hidden="true">
        <UnderleafBrand variant="mark" colorScheme="dark" />
      </div>
    </div>
  );
}

function UnderleafAuthRail({
  setup,
  navigation,
}: {
  setup: boolean;
  navigation?: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <aside className="underleaf-auth-rail">
      <div className="underleaf-auth-rail-header">
        <a href={setup ? "/" : "/login"} aria-label="Underleaf">
          <UnderleafBrand variant="wordmark" colorScheme="dark" />
        </a>
        {setup && (
          <span className="underleaf-auth-rail-version">SELF-HOSTED LATEX</span>
        )}
      </div>

      {setup ? (
        <div className="underleaf-auth-rail-setup">
          {navigation}
          <p className="underleaf-auth-rail-note">
            {t("underleaf_setup_description")}
          </p>
        </div>
      ) : (
        <UnderleafLoginPromo />
      )}

      <div className="underleaf-auth-rail-footer">
        <span>UNDERLEAF · 1.0.0</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}

export default function UnderleafAuthPage(props: Props) {
  return (
    <UnderleafAppProviders>
      <AuthContent {...props} />
    </UnderleafAppProviders>
  );
}

function AuthContent({
  page,
  sessionExpired,
  navigate = defaultNavigate,
}: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("welcome");
  const [busy, setBusy] = useState(false);
  const inflight = useRef(false);
  const [error, setError] = useState("");
  const [offerLogin, setOfferLogin] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const setup = page === "welcome";

  useEffect(() => {
    if (!setup) return;
    headingRef.current?.focus();
    if (step === "ready") {
      const timer = window.setTimeout(() => navigate("/project"), 1200);
      return () => window.clearTimeout(timer);
    }
  }, [setup, step, navigate]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inflight.current) return;
    const fields = new FormData(event.currentTarget);
    const password = String(fields.get("password") ?? "");
    if (setup && password !== fields.get("confirmPassword")) {
      setError(t("underleaf_password_mismatch"));
      return;
    }
    inflight.current = true;
    setBusy(true);
    setError("");
    setOfferLogin(false);
    try {
      const body: Record<string, string> = {
        username: String(fields.get("username") ?? ""),
        password,
      };
      if (setup) {
        body.displayName = String(fields.get("displayName") ?? "");
        body.confirmPassword = String(fields.get("confirmPassword") ?? "");
      }
      const response = await postJSON<{
        redir?: string;
        message?: { text?: string };
      }>(setup ? "/welcome" : "/login", { body });
      // The inherited login endpoint can return an error message with HTTP 200.
      if (!response.redir) {
        setError(response.message?.text || t("underleaf_auth_error"));
      } else if (setup) {
        setStep("ready");
      } else {
        navigate(response.redir);
      }
    } catch (cause) {
      const failure = cause instanceof FetchError ? cause : undefined;
      const code = failure?.data?.code;
      setOfferLogin(code === "setup_closed" || code === "setup_login_failed");
      const statusKey =
        failure?.response?.status === 429
          ? "underleaf_auth_rate_limited"
          : failure?.response?.status === 403
            ? "underleaf_auth_session_error"
            : "underleaf_auth_error";
      setError(t(errorKeys[code] || statusKey));
    } finally {
      inflight.current = false;
      setBusy(false);
    }
  }

  const navigation = setup ? (
    <div className="underleaf-setup-navigation">
      <p className="underleaf-setup-label">{t("underleaf_setup")}</p>
      <ol className="underleaf-setup-steps">
        {steps.map((item, index) => (
          <li key={item} aria-current={step === item ? "step" : undefined}>
            <span className="underleaf-step-dot" aria-hidden="true">
              {index < steps.indexOf(step) ? "✓" : step === item ? "●" : "○"}
            </span>
            {t(`underleaf_step_${item}`)}
          </li>
        ))}
      </ol>
    </div>
  ) : undefined;

  const heading = !setup
    ? "underleaf_welcome_back"
    : step === "welcome"
      ? "underleaf_welcome"
      : step === "administrator"
        ? "underleaf_create_administrator"
        : "underleaf_ready";

  return (
    <UnderleafAppShell
      variant={setup ? "setup" : "unauthenticated"}
      pageClassName={`underleaf-auth-shell ${
        setup ? "underleaf-auth-shell-setup" : "underleaf-auth-shell-login"
      }`}
      sidebar={<UnderleafAuthRail setup={setup} navigation={navigation} />}
    >
      <main
        id="main-content"
        className={`underleaf-auth-main ${
          setup ? "underleaf-auth-main-setup" : "underleaf-auth-main-login"
        }`}
      >
        {!setup && (
          <div className="underleaf-auth-content-brand" aria-hidden="true">
            <UnderleafBrand variant="wordmark" />
          </div>
        )}
        <section
          className={`underleaf-auth-panel ${
            setup && (step === "welcome" || step === "ready")
              ? "underleaf-auth-panel-welcome"
              : ""
          } ${error ? "underleaf-auth-panel-error" : ""}`}
          aria-labelledby="underleaf-auth-heading"
        >
          {setup && (step === "welcome" || step === "ready") && (
            <div className="underleaf-auth-hero-mark" aria-hidden="true">
              <UnderleafAnimatedMark />
              <span>{t("underleaf_setup")}</span>
            </div>
          )}
          <h1 id="underleaf-auth-heading" ref={headingRef} tabIndex={-1}>
            {t(heading)}
          </h1>
          {setup && step === "welcome" ? (
            <>
              <p>{t("underleaf_welcome_intro")}</p>
              <OLButton
                className="underleaf-auth-cta"
                onClick={() => setStep("administrator")}
              >
                {t("underleaf_get_started")}
              </OLButton>
            </>
          ) : setup && step === "ready" ? (
            <>
              <p role="status">{t("underleaf_ready_intro")}</p>
              <OLButton
                className="underleaf-auth-cta"
                onClick={() => navigate("/project")}
              >
                {t("underleaf_open_projects")}
              </OLButton>
            </>
          ) : (
            <>
              {setup && <p>{t("underleaf_administrator_intro")}</p>}
              {!setup && sessionExpired && (
                <p className="alert alert-info" role="status">
                  {t("underleaf_login_session_expired")}
                </p>
              )}
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}
              {offerLogin ? (
                <a className="btn btn-primary underleaf-auth-cta" href="/login">
                  {t("log_in")}
                </a>
              ) : (
                <OLForm
                  onSubmit={submit}
                  aria-busy={busy}
                  className="underleaf-auth-form"
                >
                  {setup && (
                    <OLFormGroup
                      controlId="underleaf-display-name"
                      className="underleaf-auth-form-group"
                    >
                      <OLFormLabel>{t("underleaf_display_name")}</OLFormLabel>
                      <OLFormControl
                        name="displayName"
                        type="text"
                        autoComplete="name"
                        maxLength={255}
                        disabled={busy}
                      />
                    </OLFormGroup>
                  )}
                  <OLFormGroup
                    controlId="underleaf-username"
                    className="underleaf-auth-form-group"
                  >
                    <OLFormLabel>{t("underleaf_username")}</OLFormLabel>
                    <OLFormControl
                      name="username"
                      type="text"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      required
                      maxLength={32}
                      minLength={setup ? 3 : undefined}
                      autoFocus={!setup}
                      disabled={busy}
                      aria-describedby={
                        setup ? "underleaf-username-help" : undefined
                      }
                    />
                    {setup && (
                      <p
                        id="underleaf-username-help"
                        className="underleaf-auth-help"
                      >
                        {t("underleaf_username_help")}
                      </p>
                    )}
                  </OLFormGroup>
                  <OLFormGroup
                    controlId="underleaf-password"
                    className="underleaf-auth-form-group"
                  >
                    <OLFormLabel>{t("password")}</OLFormLabel>
                    <OLFormControl
                      name="password"
                      type="password"
                      autoComplete={setup ? "new-password" : "current-password"}
                      required
                      maxLength={setup ? 72 : undefined}
                      disabled={busy}
                    />
                  </OLFormGroup>
                  {setup && (
                    <OLFormGroup
                      controlId="underleaf-confirm-password"
                      className="underleaf-auth-form-group"
                    >
                      <OLFormLabel>
                        {t("underleaf_confirm_password")}
                      </OLFormLabel>
                      <OLFormControl
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        required
                        maxLength={72}
                        disabled={busy}
                      />
                    </OLFormGroup>
                  )}
                  <OLButton
                    type="submit"
                    className="underleaf-auth-submit"
                    isLoading={busy}
                  >
                    {t(setup ? "underleaf_create_administrator" : "log_in")}
                  </OLButton>
                </OLForm>
              )}
            </>
          )}
        </section>
      </main>
    </UnderleafAppShell>
  );
}
