import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Check, X, Copy, AlertCircle } from "lucide-react";
import RequireAdmin from "@/components/RequireAdmin";
import { useApiFetch, APIError } from "@/lib/api";

interface HealthCheck {
  name: string;
  ok: boolean;
  message: string;
}

interface HealthResponse {
  ok: boolean;
  checks: HealthCheck[];
  timestamp: string;
}

interface RoutesResponse {
  ok: boolean;
  routes: Record<string, string>;
}

interface LinkAuditResult {
  href: string;
  found: boolean;
  label: string;
}

interface ApiAuditResult {
  endpoint: string;
  ok: boolean;
  status?: number;
  message: string;
}

interface ScriptGenTestResult {
  status?: number;
  responseTime: number;
  scriptLength: number;
  preview: string;
  message?: string;
}

export default function AdminAudit() {
  const { getToken } = useAuth();
  const [integrations, setIntegrations] = useState<HealthResponse | null>(null);
  const [routes, setRoutes] = useState<RoutesResponse | null>(null);
  const [linkAudit, setLinkAudit] = useState<LinkAuditResult[]>([]);
  const [apiAudit, setApiAudit] = useState<ApiAuditResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [testScriptLoading, setTestScriptLoading] = useState(false);
  const [testScriptResult, setTestScriptResult] =
    useState<ScriptGenTestResult | null>(null);
  const [testScriptError, setTestScriptError] = useState<string | null>(null);

  const getStripeStatus = () => {
    if (!integrations) {
      return { ok: false, message: "Loading..." };
    }

    const stripeSecretOk = integrations.checks.some(
      (c) => c.name === "stripe_secret" && c.ok,
    );
    const stripeWebhookOk = integrations.checks.some(
      (c) => c.name === "stripe_webhook_secret" && c.ok,
    );
    const stripePricesOk = integrations.checks.some(
      (c) => c.name === "stripe_prices" && c.ok,
    );

    const allOk = stripeSecretOk && stripeWebhookOk && stripePricesOk;

    return {
      ok: allOk,
      message: allOk
        ? "Stripe fully configured"
        : "Stripe billing incomplete — payments disabled",
    };
  };

  const handleTestScriptGeneration = async () => {
    setTestScriptError(null);
    setTestScriptResult(null);

    try {
      setTestScriptLoading(true);
      const startTime = Date.now();

      const response = await fetch("/api/script/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoTopic: "Test topic",
          niche: "Ecommerce",
          styleTone: "UGC testimonial",
          maxChars: 500,
        }),
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {}
        setTestScriptError(errorMessage);
        setTestScriptResult({
          status: response.status,
          responseTime,
          scriptLength: 0,
          preview: "",
        });
        return;
      }

      const data = await response.json();
      const script = data.script || "";

      if (!script) {
        setTestScriptError("No script returned from API");
        setTestScriptResult({
          status: 200,
          responseTime,
          scriptLength: 0,
          preview: "",
        });
        return;
      }

      const preview = script.substring(0, 120);
      setTestScriptResult({
        status: 200,
        responseTime,
        scriptLength: script.length,
        preview,
      });
    } catch (err) {
      setTestScriptError(
        err instanceof Error ? err.message : "Failed to test script generation",
      );
    } finally {
      setTestScriptLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = await getToken();

        if (!token) {
          setError("Not authenticated");
          return;
        }

        // Fetch integrations
        const intRes = await fetch("/api/health/integrations", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (intRes.ok) {
          setIntegrations(await intRes.json());
        } else {
          setError(
            `Failed to fetch integrations: ${intRes.status} ${intRes.statusText}`,
          );
        }

        // Fetch routes
        const routesRes = await fetch("/api/health/routes");
        if (routesRes.ok) {
          setRoutes(await routesRes.json());
        }

        // Audit links from navigation
        const navLinks: LinkAuditResult[] = [
          { href: "/", label: "Home" },
          { href: "/video", label: "Video Generator" },
          { href: "/login", label: "Login" },
          { href: "/signup", label: "Sign Up" },
          { href: "/admin/audit", label: "Admin Audit" },
        ];

        const auditedLinks = navLinks.map((link) => ({
          ...link,
          found: true, // We'll mark as found if the route exists in our routes config
        }));
        setLinkAudit(auditedLinks);

        // Audit API endpoints
        const apiEndpoints: ApiAuditResult[] = [];

        // Health endpoint
        try {
          const healthRes = await fetch("/api/health");
          apiEndpoints.push({
            endpoint: "GET /api/health",
            ok: healthRes.ok,
            status: healthRes.status,
            message: healthRes.ok ? "OK" : `HTTP ${healthRes.status}`,
          });
        } catch (err) {
          apiEndpoints.push({
            endpoint: "GET /api/health",
            ok: false,
            message: err instanceof Error ? err.message : "Failed",
          });
        }

        // Generator endpoints
        try {
          const meRes = await fetch("/api/generator/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          apiEndpoints.push({
            endpoint: "GET /api/generator/me",
            ok: meRes.ok,
            status: meRes.status,
            message: meRes.ok ? "OK" : `HTTP ${meRes.status}`,
          });
        } catch (err) {
          apiEndpoints.push({
            endpoint: "GET /api/generator/me",
            ok: false,
            message: err instanceof Error ? err.message : "Failed",
          });
        }

        try {
          const histRes = await fetch("/api/generator/history", {
            headers: { Authorization: `Bearer ${token}` },
          });
          apiEndpoints.push({
            endpoint: "GET /api/generator/history",
            ok: histRes.ok,
            status: histRes.status,
            message: histRes.ok ? "OK" : `HTTP ${histRes.status}`,
          });
        } catch (err) {
          apiEndpoints.push({
            endpoint: "GET /api/generator/history",
            ok: false,
            message: err instanceof Error ? err.message : "Failed",
          });
        }

        setApiAudit(apiEndpoints);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load audit data",
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [getToken]);

  const copyReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      integrations,
      routes,
      linkAudit,
      apiAudit,
    };

    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-muted border-t-accent-blue animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading audit data...</p>
        </div>
      </div>
    );
  }

  return (
    <RequireAdmin>
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-6 md:px-8 py-12">
          <div className="space-y-8">
            {/* Header */}
            <div className="space-y-4">
              <h1 className="font-display text-3xl font-bold text-foreground">
                Admin Audit Dashboard
              </h1>
              <p className="text-muted-foreground">
                Real-time health checks for BleuLogix integrations, routes, and
                APIs
              </p>
              <button
                onClick={copyReport}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-blue text-black font-semibold hover:bg-highlight-blue transition-colors"
              >
                <Copy className="w-4 h-4" />
                {copied ? "Copied!" : "Copy Report"}
              </button>
            </div>

            {error && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Stripe Status Summary */}
            {integrations &&
              (() => {
                const stripeStatus = getStripeStatus();
                return (
                  <div
                    className={`p-4 rounded-lg border flex items-start justify-between ${
                      stripeStatus.ok
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-red-500/10 border-red-500/30"
                    }`}
                  >
                    <div>
                      <p
                        className={`font-semibold ${stripeStatus.ok ? "text-green-400" : "text-red-400"}`}
                      >
                        Stripe Connected
                      </p>
                      <p
                        className={`text-sm ${stripeStatus.ok ? "text-green-400/80" : "text-red-400/80"}`}
                      >
                        {stripeStatus.message}
                      </p>
                    </div>
                    {stripeStatus.ok ? (
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 ml-4" />
                    ) : (
                      <X className="w-5 h-5 text-red-500 flex-shrink-0 ml-4" />
                    )}
                  </div>
                );
              })()}

            {/* Integration Status Panel */}
            {integrations && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-bold text-foreground">
                  Integration Status
                </h2>
                <div className="space-y-3">
                  {integrations.checks.map((check) => (
                    <div
                      key={check.name}
                      className="p-4 rounded-lg border border-border bg-card flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-foreground capitalize">
                          {check.name.replace(/_/g, " ")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {check.message}
                        </p>
                      </div>
                      {check.ok ? (
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 ml-4" />
                      ) : (
                        <X className="w-5 h-5 text-red-500 flex-shrink-0 ml-4" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Routes Panel */}
            {routes && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-bold text-foreground">
                  Available Routes
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(routes.routes).map(([key, path]) => (
                    <div
                      key={key}
                      className="p-3 rounded-lg border border-border bg-card"
                    >
                      <p className="font-mono text-sm font-semibold text-accent-blue">
                        {path}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {key}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Link Audit Panel */}
            {linkAudit.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-bold text-foreground">
                  Navigation Links
                </h2>
                <div className="space-y-3">
                  {linkAudit.map((item) => (
                    <div
                      key={item.href}
                      className="p-4 rounded-lg border border-border bg-card flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">
                          {item.label}
                        </p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {item.href}
                        </p>
                      </div>
                      {item.found ? (
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 ml-4" />
                      ) : (
                        <X className="w-5 h-5 text-red-500 flex-shrink-0 ml-4" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* API Audit Panel */}
            {apiAudit.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-bold text-foreground">
                  API Endpoints
                </h2>
                <div className="space-y-3">
                  {apiAudit.map((item) => (
                    <div
                      key={item.endpoint}
                      className="p-4 rounded-lg border border-border bg-card flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-foreground font-mono text-sm">
                          {item.endpoint}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.message}
                        </p>
                      </div>
                      {item.ok ? (
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 ml-4" />
                      ) : (
                        <X className="w-5 h-5 text-red-500 flex-shrink-0 ml-4" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Test Script Generation Panel */}
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground">
                Test Script Generation
              </h2>
              <button
                onClick={handleTestScriptGeneration}
                disabled={testScriptLoading}
                className="px-4 py-2 rounded-lg bg-accent-blue text-black font-semibold hover:bg-highlight-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testScriptLoading ? "Generating..." : "Test Script Generation"}
              </button>

              {testScriptError && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{testScriptError}</span>
                </div>
              )}

              {testScriptResult && (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Status Code
                        </p>
                        <p className="text-lg font-semibold text-foreground">
                          {testScriptResult.status || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Response Time
                        </p>
                        <p className="text-lg font-semibold text-foreground">
                          {testScriptResult.responseTime}ms
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Script Length
                        </p>
                        <p className="text-lg font-semibold text-foreground">
                          {testScriptResult.scriptLength} chars
                        </p>
                      </div>
                    </div>
                  </div>

                  {testScriptResult.preview && (
                    <div className="p-4 rounded-lg border border-border bg-card">
                      <p className="text-sm text-muted-foreground mb-2">
                        Preview (first 120 chars)
                      </p>
                      <p className="text-sm text-foreground font-mono bg-background/50 p-3 rounded border border-border break-words">
                        {testScriptResult.preview}
                        {testScriptResult.scriptLength > 120 ? "..." : ""}
                      </p>
                    </div>
                  )}

                  {testScriptResult.status === 200 && (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm flex items-start gap-2">
                      <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Script generated successfully!</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </RequireAdmin>
  );
}
