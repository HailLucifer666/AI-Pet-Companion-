import { useQuery } from "@tanstack/react-query";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

import { api, queryKeys } from "../../lib/api";

export function CalendarView() {
  const { data } = useQuery({
    queryKey: queryKeys.events(""),
    queryFn: () => api.events(""),
  });

  const events = data?.events || [];

  return (
    <div className="flex h-full flex-col p-6 text-token-text gap-6 overflow-y-auto">
      <div className="flex items-center gap-3">
        <CalendarIcon className="w-6 h-6 text-token-primary" />
        <h1 className="text-2xl font-light">Calendar</h1>
      </div>

      <div className="flex flex-col gap-4">
        {events.length === 0 ? (
          <div className="text-sm text-token-text-muted italic p-4 border border-dashed border-token-border rounded-lg text-center">
            No upcoming events.
          </div>
        ) : (
          events.map((e) => {
            const start = new Date(e.start_iso);
            const end = new Date(e.end_iso);
            const isSameDay = start.toDateString() === end.toDateString();

            return (
              <div
                key={e.id}
                className="flex flex-col gap-2 p-4 rounded-lg bg-token-surface border border-token-border hover:border-token-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-medium">{e.title}</h3>
                  <div className="flex flex-col items-end text-xs text-token-text-muted text-right">
                    <span>{start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>
                        {start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} 
                        {isSameDay ? ` - ${end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : ''}
                      </span>
                    </div>
                  </div>
                </div>
                {e.description && (
                  <p className="text-sm text-token-text-muted mt-1 leading-relaxed">
                    {e.description}
                  </p>
                )}
                {e.location && (
                  <div className="text-xs text-token-text-muted font-medium bg-token-surface-raised w-fit px-2 py-0.5 rounded mt-1">
                    {e.location}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
