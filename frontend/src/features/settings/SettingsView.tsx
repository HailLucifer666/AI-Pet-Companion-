import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "../../lib/api";
import { Badge, Button, Card, Spinner } from "../../components/ui";
import { ModelSelector } from "../../components/ModelSelector";
import { audioEngine } from "../../lib/audioEngine";

const RISK_NAMES = ["READ", "WRITE", "EXECUTE", "NETWORK_SENSITIVE"];

function SpotifyCard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.spotify,
    queryFn: api.spotifyStatus,
    retry: false,
  });
  const disconnect = useMutation({
    mutationFn: api.spotifyDisconnect,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.spotify }),
  });
  const callbackState = new URLSearchParams(window.location.search).get("spotify");

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display font-medium">Spotify</h2>
        {data?.connected && (
          <Badge tone={data.premium ? "ok" : "warn"}>
            {data.premium ? "Premium" : "Premium needed"}
          </Badge>
        )}
      </div>
      <p className="mt-0.5 text-xs text-ink-500">
        Lets the companion play and control your music (the{" "}
        <code className="rounded bg-ink-850 px-1">play_music</code> tool). Playback control needs
        Spotify Premium and an open device.
      </p>

      {isLoading ? (
        <div className="mt-3">
          <Spinner />
        </div>
      ) : !data?.configured ? (
        <p className="mt-3 text-sm text-ink-300">
          Add <code className="rounded bg-ink-850 px-1">SPOTIFY_CLIENT_ID</code> and{" "}
          <code className="rounded bg-ink-850 px-1">SPOTIFY_CLIENT_SECRET</code> to{" "}
          <code className="rounded bg-ink-850 px-1">.env</code>, add the redirect URI{" "}
          <code className="rounded bg-ink-850 px-1">http://127.0.0.1:8090/api/spotify/callback</code>{" "}
          to your Spotify app, then restart.
        </p>
      ) : data.connected ? (
        <div className="mt-3 flex items-center gap-3 text-sm">
          <span className="min-w-0 flex-1 truncate text-ink-300">
            Connected{data.display_name ? ` as ${data.display_name}` : ""}
            {data.active_device ? ` · ${data.active_device}` : ""}
          </span>
          <Button
            variant="ghost"
            onClick={() => disconnect.mutate()}
            disabled={disconnect.isPending}
          >
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="mt-3">
          <Button onClick={() => (window.location.href = "/api/spotify/login")}>
            Connect Spotify
          </Button>
          {callbackState === "error" && (
            <p className="mt-2 text-sm text-danger">Connection failed — please try again.</p>
          )}
        </div>
      )}
    </Card>
  );
}

export function SettingsView() {
  const { data, isLoading } = useQuery({ queryKey: queryKeys.settings, queryFn: api.settings });
  const [muted, setMuted] = useState(() => audioEngine.getMuted());
  const [volume, setVolume] = useState(() => audioEngine.getVolume());

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

      <SpotifyCard />

      <Card>
        <h2 className="font-display font-medium">Sound Settings</h2>
        <p className="mt-0.5 text-xs text-ink-500">
          Control volume and ambient sounds in the 3D Grove.
        </p>
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink-200">Mute Sounds</span>
            <button
              onClick={() => {
                const nextMuted = !muted;
                audioEngine.setMuted(nextMuted);
                setMuted(nextMuted);
              }}
              className={`rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
                muted
                  ? "bg-danger/20 border-danger text-danger"
                  : "bg-ink-900 border-ink-700 text-ink-300 hover:border-ink-500"
              }`}
            >
              {muted ? "Muted" : "Active"}
            </button>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-ink-400">
              <span>Volume</span>
              <span>{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => {
                const nextVol = parseFloat(e.target.value);
                audioEngine.setVolume(nextVol);
                setVolume(nextVol);
              }}
              className="w-full accent-claw-500 h-1.5 bg-ink-850 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-display font-medium">Active model</h2>
        <p className="mt-0.5 text-xs text-ink-500">
          What new messages use. <strong className="text-ink-300">Auto</strong> follows the
          resilient role chains below; picking one model pins it (no failover). The list is
          discovered live from your providers — no restart needed.
        </p>
        <div className="mt-3">
          <ModelSelector className="w-full max-w-md" />
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
