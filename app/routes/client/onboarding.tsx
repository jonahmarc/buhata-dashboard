import { redirect, useLoaderData, useRevalidator } from "react-router";
import {
  CheckCircle,
  Circle,
  Clock,
  AlertTriangle,
  Upload,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { Topbar } from "~/components/layout/Topbar";
import { Button } from "~/components/ui/Button";
import { getStoredAuth } from "~/stores/authStore";
import {
  getOnboardingState,
  addAsset,
  type OnboardingState,
  type Asset,
} from "~/services/onboarding";

interface LoaderData {
  clientId: string;
  onboarding: OnboardingState | null;
  fetchError: boolean;
}

export async function clientLoader(): Promise<LoaderData | Response> {
  const auth = getStoredAuth();
  if (!auth?.token || auth.user?.role !== "client") return redirect("/login");

  const clientId = auth.user?.client_id;
  if (!clientId) {
    return { clientId: "", onboarding: null, fetchError: true };
  }

  try {
    const onboarding = await getOnboardingState(clientId);
    return { clientId, onboarding, fetchError: false };
  } catch {
    return { clientId, onboarding: null, fetchError: true };
  }
}

export function meta() {
  return [{ title: "Onboarding — Buhata" }];
}

// ── Build clock ────────────────────────────────────────────────────────────────

function BuildClock({
  elapsed_hours,
  started_at,
}: {
  elapsed_hours: number;
  started_at: string;
}) {
  const hrs = Math.floor(elapsed_hours);
  const mins = Math.round((elapsed_hours - hrs) * 60);
  const startDate = new Date(started_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber/20 bg-amber/5 px-4 py-3">
      <Clock className="h-5 w-5 text-amber shrink-0" />
      <div>
        <p className="text-sm font-semibold text-amber">
          Build in progress — {hrs}h {mins}m elapsed
        </p>
        <p className="text-xs text-amber/60">Started {startDate}</p>
      </div>
    </div>
  );
}

// ── Step indicator ─────────────────────────────────────────────────────────────

function Step({
  label,
  done,
  description,
}: {
  label: string;
  done: boolean;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      {done ? (
        <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-px" />
      ) : (
        <Circle className="h-5 w-5 text-cream/20 shrink-0 mt-px" />
      )}
      <div>
        <p
          className={`text-sm font-medium ${
            done ? "text-cream" : "text-cream/40"
          }`}
        >
          {label}
        </p>
        <p className="text-xs text-cream/30 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

// ── Asset list ─────────────────────────────────────────────────────────────────

const ASSET_TYPE_LABELS: Record<string, string> = {
  project_brief: "Project Brief",
  logo: "Logo",
  brand_guidelines: "Brand Guidelines",
  content: "Website Content",
  fonts: "Fonts",
  other: "Other",
};

function AssetRow({ asset }: { asset: Asset }) {
  const label = ASSET_TYPE_LABELS[asset.asset_type] ?? asset.asset_type;
  const isUrl = asset.url && asset.url.startsWith("http");

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-cream/5 last:border-0">
      <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-cream font-medium">{label}</p>
        {isUrl ? (
          <a
            href={asset.url!}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-amber/70 hover:text-amber truncate block"
          >
            {asset.url}
          </a>
        ) : (
          <p className="text-xs text-cream/35 truncate">
            {asset.filename ?? asset.url}
          </p>
        )}
      </div>
      <p className="text-xs text-cream/25 shrink-0">
        {new Date(asset.uploaded_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}
      </p>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

const QUESTIONNAIRE_FIELDS = [
  {
    key: "goals",
    label: "What is your website's primary goal?",
    placeholder:
      "e.g. Generate leads, showcase portfolio, sell products, provide information…",
  },
  {
    key: "audience",
    label: "Who is your target audience?",
    placeholder: "Describe your ideal visitor — age, industry, location, needs…",
  },
  {
    key: "brand_voice",
    label: "Describe your brand voice and tone",
    placeholder: "e.g. Professional, friendly, playful, minimalist…",
  },
  {
    key: "colors",
    label: "Brand colors or design preferences",
    placeholder: "Hex codes, general palette, or adjectives like 'dark and modern'…",
  },
  {
    key: "references",
    label: "Reference websites you like",
    placeholder: "List 1–3 URLs and what you like about them…",
  },
  {
    key: "notes",
    label: "Anything else for the team?",
    placeholder: "Technical requirements, must-have features, things to avoid…",
  },
];

export default function ClientOnboardingPage() {
  const { clientId, onboarding, fetchError } = useLoaderData() as LoaderData;
  const { revalidate } = useRevalidator();

  // Questionnaire state
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(QUESTIONNAIRE_FIELDS.map((f) => [f.key, ""]))
  );
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [briefSubmitted, setBriefSubmitted] = useState(
    () =>
      onboarding?.assets.some((a) => a.asset_type === "project_brief") ?? false
  );

  // Asset form state
  const [assetType, setAssetType] = useState("logo");
  const [assetUrl, setAssetUrl] = useState("");
  const [assetFilename, setAssetFilename] = useState("");
  const [useUrl, setUseUrl] = useState(true);
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);

  async function handleSubmitBrief(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) return;
    setBriefLoading(true);
    setBriefError(null);
    try {
      const payload = JSON.stringify(answers, null, 2);
      await addAsset(clientId, {
        asset_type: "project_brief",
        url: payload,
      });
      setBriefSubmitted(true);
      revalidate();
    } catch {
      setBriefError("Could not submit your brief. Please try again.");
    } finally {
      setBriefLoading(false);
    }
  }

  async function handleAddAsset(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) return;
    const value = useUrl ? assetUrl.trim() : assetFilename.trim();
    if (!value) return;
    setAssetLoading(true);
    setAssetError(null);
    try {
      await addAsset(clientId, {
        asset_type: assetType,
        ...(useUrl ? { url: value } : { filename: value }),
      });
      setAssetUrl("");
      setAssetFilename("");
      revalidate();
    } catch {
      setAssetError("Could not add asset. Please try again.");
    } finally {
      setAssetLoading(false);
    }
  }

  const nonBriefAssets =
    onboarding?.assets.filter((a) => a.asset_type !== "project_brief") ?? [];

  return (
    <div>
      <Topbar
        title="Onboarding"
        subtitle="Track your setup progress and submit your project brief"
      />

      <div className="p-6 space-y-4 max-w-2xl">
        {fetchError && (
          <div className="flex items-center gap-3 rounded-lg border border-terracotta/20 bg-terracotta/8 px-4 py-3 text-xs text-terracotta">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Could not load onboarding data. Please refresh or contact support.
          </div>
        )}

        {onboarding && (
          <>
            {/* Build clock */}
            {onboarding.is_build_started &&
              !onboarding.is_live &&
              onboarding.build_clock_elapsed_hours !== null && (
                <BuildClock
                  elapsed_hours={onboarding.build_clock_elapsed_hours}
                  started_at={onboarding.build_clock_started_at!}
                />
              )}

            {/* Progress checklist */}
            <div className="rounded-xl border border-cream/5 bg-navy/10 p-6">
              <h2 className="text-xs font-semibold text-cream uppercase tracking-wider mb-5">
                Progress
              </h2>
              <div className="space-y-4">
                <Step
                  label="Onboarding Finalized"
                  done={onboarding.is_finalized}
                  description="Your account has been finalized and billing is active."
                />
                <Step
                  label="Build Started"
                  done={onboarding.is_build_started}
                  description="Our team has started building your website."
                />
                <Step
                  label="Website Live"
                  done={onboarding.is_live}
                  description="Your website is live and your account is fully active."
                />
              </div>
            </div>

            {/* Project Brief questionnaire */}
            <div className="rounded-xl border border-cream/5 bg-navy/10 p-6">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-cream/40" />
                  <h2 className="text-xs font-semibold text-cream uppercase tracking-wider">
                    Project Brief
                  </h2>
                </div>
                {briefSubmitted && (
                  <span className="flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Submitted
                  </span>
                )}
              </div>
              <p className="text-xs text-cream/35 mb-5">
                Help our team understand your vision before we start building.
                {briefSubmitted &&
                  " You've already submitted a brief — you can resubmit to update it."}
              </p>

              <form onSubmit={handleSubmitBrief} className="space-y-4">
                {QUESTIONNAIRE_FIELDS.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-cream/60 mb-1.5">
                      {field.label}
                    </label>
                    <textarea
                      rows={3}
                      value={answers[field.key]}
                      onChange={(e) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      placeholder={field.placeholder}
                      className="w-full rounded-lg border border-cream/10 bg-navy/40 px-3 py-2 text-sm text-cream placeholder:text-cream/20 outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20 transition-colors resize-none"
                    />
                  </div>
                ))}

                {briefError && (
                  <p className="text-xs text-terracotta">{briefError}</p>
                )}

                <Button type="submit" loading={briefLoading}>
                  <FileText className="h-3.5 w-3.5" />
                  {briefSubmitted ? "Resubmit Brief" : "Submit Project Brief"}
                </Button>
              </form>
            </div>

            {/* Assets */}
            <div className="rounded-xl border border-cream/5 bg-navy/10 p-6">
              <div className="flex items-center gap-2 mb-1">
                <Upload className="h-4 w-4 text-cream/40" />
                <h2 className="text-xs font-semibold text-cream uppercase tracking-wider">
                  Assets
                </h2>
                <span className="text-xs text-cream/30">
                  ({nonBriefAssets.length} submitted)
                </span>
              </div>
              <p className="text-xs text-cream/35 mb-5">
                Submit your logo, brand guidelines, content, and any other files
                via a link (Google Drive, Dropbox, etc.) or filename.
              </p>

              {/* Existing assets */}
              {nonBriefAssets.length > 0 && (
                <div className="mb-5">
                  {nonBriefAssets.map((asset) => (
                    <AssetRow key={asset.id} asset={asset} />
                  ))}
                </div>
              )}

              {/* Add asset form */}
              <form onSubmit={handleAddAsset} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-cream/50 mb-1">
                      Asset type
                    </label>
                    <select
                      value={assetType}
                      onChange={(e) => setAssetType(e.target.value)}
                      className="h-9 w-full rounded-lg border border-cream/10 bg-navy/40 px-3 text-sm text-cream outline-none focus:border-amber/50 transition-colors appearance-none cursor-pointer"
                    >
                      <option value="logo">Logo</option>
                      <option value="brand_guidelines">Brand Guidelines</option>
                      <option value="content">Website Content</option>
                      <option value="fonts">Fonts</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-cream/50 mb-1">
                      Submit via
                    </label>
                    <div className="flex h-9 rounded-lg border border-cream/10 bg-navy/40 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setUseUrl(true)}
                        className={`flex-1 text-xs transition-colors ${
                          useUrl
                            ? "bg-amber/15 text-amber"
                            : "text-cream/40 hover:text-cream"
                        }`}
                      >
                        Link / URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setUseUrl(false)}
                        className={`flex-1 text-xs transition-colors ${
                          !useUrl
                            ? "bg-amber/15 text-amber"
                            : "text-cream/40 hover:text-cream"
                        }`}
                      >
                        Filename
                      </button>
                    </div>
                  </div>
                </div>

                {useUrl ? (
                  <input
                    type="url"
                    value={assetUrl}
                    onChange={(e) => setAssetUrl(e.target.value)}
                    placeholder="https://drive.google.com/…"
                    className="h-9 w-full rounded-lg border border-cream/10 bg-navy/40 px-3 text-sm text-cream placeholder:text-cream/25 outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20 transition-colors"
                  />
                ) : (
                  <input
                    type="text"
                    value={assetFilename}
                    onChange={(e) => setAssetFilename(e.target.value)}
                    placeholder="logo-primary.svg"
                    className="h-9 w-full rounded-lg border border-cream/10 bg-navy/40 px-3 text-sm text-cream placeholder:text-cream/25 outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20 transition-colors"
                  />
                )}

                {assetError && (
                  <p className="text-xs text-terracotta">{assetError}</p>
                )}

                <Button
                  type="submit"
                  size="sm"
                  loading={assetLoading}
                  disabled={useUrl ? !assetUrl.trim() : !assetFilename.trim()}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Add Asset
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
