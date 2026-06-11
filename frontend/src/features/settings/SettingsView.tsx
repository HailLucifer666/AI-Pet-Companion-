import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "../../lib/api";
import { Badge, Card, Spinner } from "../../components/ui";

const RISK_NAMES = ["READ", "WRITE", "EXECUTE", "NETWORK_SENSITIVE"];

export function SettingsView() {
  const { data, isLoading } = useQuery({ queryKey: queryKeys.settings, queryFn: api.settings });

  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <header>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-ink-500">
          Keys live in <code className="rounded bg-ink-850 px-1">.env</code>, models and trust in{" "}
          <code className="rounded bg-ink-850 px-1">config.yaml</code>. Restart after edits.
        </p>
      </header>

      <Card>
        <h2 className="font-display font-medium">Providers</h2>
        <div className="mt-3 space-y-2">
          {Object.entries(data.providers).map(([name, p]) => (
            <div key={name} className="flex items-center gap-3 text-sm">
              <span className="w-24 font-medium">{name}</span>
              <span className="min-w-0 flex-1 truncate text-ink-500">{p.base_url}</span>
              {p.key_present ? (
                <Badge tone="ok">{p.key_env ? "key set" : "no key needed"}</Badge>
              ) : (
                <Badge tone="danger">missing {p.key_env}</Badge>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-display font-medium">Model roles</h2>
        <p className="mt-0.5 text-xs text-ink-500">Failover chains, tried top to bottom.</p>
        <div className="mt-3 space-y-3">
          {Object.entries(data.roles).map(([role, refs]) => (
            <div key={role} className="text-sm">
              <Badge tone="accent">{role}</Badge>
              <ol className="mt-1.5 space-y-0.5 pl-1">
                {refs.map((ref, i) => (
                  <li key={ref} className="text-ink-300">
                    <span className="mr-2 text-xs text-ink-500">{i + 1}.</span>
                    {ref}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-display font-medium">Trust</h2>
        <p className="mt-2 text-sm text-ink-300">
          Tools up to{" "}
          <Badge tone="warn">{RISK_NAMES[data.trust.max_auto_risk]}</Badge>{" "}
          run without approval. Higher-risk tools are refused until the approval flow lands
          (Phase 2).
        </p>
      </Card>
    </div>
  );
}
