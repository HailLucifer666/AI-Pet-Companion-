/** Dev-only route: the standing contract for design quality. Every primitive, visible. */

import { Rocket } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  IconButton,
  Input,
  Kbd,
  Spinner,
  StatusDot,
  Textarea,
} from "../../components/ui";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-ink-500">{title}</h2>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}

export function Styleguide() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 p-8">
      <header>
        <h1 className="text-2xl font-bold">Styleguide</h1>
        <p className="text-sm text-ink-500">
          NeuraClaw primitives. If a surface needs something not on this page, it gets added
          here first.
        </p>
      </header>

      <Section title="Buttons">
        <Button>Primary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button disabled>Disabled</Button>
        <IconButton icon={Rocket} label="Launch" />
      </Section>

      <Section title="Inputs">
        <Input placeholder="Single line…" className="max-w-60" />
        <Textarea placeholder="Multi line…" rows={3} className="max-w-60" />
      </Section>

      <Section title="Badges">
        <Badge>neutral</Badge>
        <Badge tone="accent">accent</Badge>
        <Badge tone="ok">ok</Badge>
        <Badge tone="warn">warn</Badge>
        <Badge tone="danger">danger</Badge>
      </Section>

      <Section title="Status & feedback">
        <StatusDot ok label="connected" />
        <StatusDot ok={false} label="offline" />
        <Spinner />
        <Kbd>Ctrl</Kbd>
        <Kbd>K</Kbd>
      </Section>

      <Section title="Card">
        <Card className="w-full">
          <h3 className="font-medium">Card title</h3>
          <p className="mt-1 text-sm text-ink-500">
            Raised surface with the shared shadow token.
          </p>
          <Divider />
          <p className="mt-3 text-sm text-ink-300">Body content after a divider.</p>
        </Card>
      </Section>

      <Section title="Empty state">
        <div className="w-full rounded-card border border-ink-800">
          <EmptyState
            icon={Rocket}
            title="Nothing here yet"
            description="This is how every unbuilt surface greets you — designed, not apologetic."
            action={<Button variant="ghost">Do something</Button>}
          />
        </div>
      </Section>
    </div>
  );
}
