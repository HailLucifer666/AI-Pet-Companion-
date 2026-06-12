/** Dev-only route: the standing contract for design quality. Every primitive, visible. */

import { useState } from "react";
import { motion } from "motion/react";
import { Rocket } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Dialog,
  Divider,
  EmptyState,
  IconButton,
  Input,
  Kbd,
  Popover,
  Select,
  Skeleton,
  Spinner,
  StatusDot,
  Textarea,
  Tooltip,
  toast,
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
  const [role, setRole] = useState("primary");
  const [dialogOpen, setDialogOpen] = useState(false);

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
        <Select
          ariaLabel="Model role"
          value={role}
          onValueChange={setRole}
          options={[
            { value: "primary", label: "primary" },
            { value: "cheap", label: "cheap" },
            { value: "local", label: "local" },
          ]}
          className="w-40"
        />
      </Section>

      <Section title="Overlays">
        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          trigger={<Button variant="ghost">Open dialog</Button>}
          title="Confirm something"
          description="This is the overlay plane — layered above the page with its own shadow."
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setDialogOpen(false)}>Confirm</Button>
            </>
          }
        >
          Body content lives here, on the raised overlay surface.
        </Dialog>
        <Popover trigger={<Button variant="ghost">Open popover</Button>}>
          <p className="max-w-52">A floating overlay anchored to its trigger, with arrow-free edge.</p>
        </Popover>
        <Tooltip label="A styled tooltip — no native title" side="top">
          <Button variant="ghost">Hover me</Button>
        </Tooltip>
      </Section>

      <Section title="Toasts">
        <Button
          onClick={() =>
            toast({
              title: "Memory forgotten",
              description: "Demo of the undoable-delete toast.",
              action: { label: "Undo", onClick: () => toast({ title: "Restored" }) },
            })
          }
        >
          Fire toast
        </Button>
        <Button
          variant="ghost"
          onClick={() => toast({ title: "Quietly noted", description: "No action, auto-dismiss." })}
        >
          Plain toast
        </Button>
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

      <Section title="Skeletons">
        <div className="w-full space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-2/3" />
        </div>
      </Section>

      <Section title="Elevation">
        <div className="grid w-full grid-cols-3 gap-3">
          <div className="rounded-card border border-ink-800 bg-ink-950 p-4 text-xs text-ink-500">
            page
          </div>
          <div className="surface-raised rounded-card p-4 text-xs text-ink-300">raised</div>
          <div className="surface-overlay rounded-overlay p-4 text-xs text-ink-300">overlay</div>
        </div>
      </Section>

      <Section title="Motion — list stagger + hover lift">
        <div className="flex w-full flex-wrap gap-3">
          {["plan", "stream", "tool", "persist"].map((t, i) => (
            <motion.div
              key={t}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -3 }}
              className="surface-raised rounded-card px-4 py-3 text-sm text-ink-300"
            >
              {t}
            </motion.div>
          ))}
        </div>
      </Section>

      <Section title="Card">
        <Card className="w-full">
          <h3 className="font-medium">Card title</h3>
          <p className="mt-1 text-sm text-ink-500">
            Raised surface with inner highlight border and the shared shadow token.
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
