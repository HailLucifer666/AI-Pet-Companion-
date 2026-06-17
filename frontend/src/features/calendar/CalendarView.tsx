import { useQuery } from "@tanstack/react-query";
import { Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";

import { api, queryKeys } from "../../lib/api";
import { EmptyState } from "../../components/ui";

export function CalendarView() {
  const { data } = useQuery({
    queryKey: queryKeys.events(""),
    queryFn: () => api.events(""),
  });

  const events = data?.events || [];

  return (
    <div className="flex h-full flex-col p-8 gap-6 overflow-y-auto min-h-0 flex-1">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-light text-ink-100 flex items-center gap-3">
          <CalendarIcon className="size-6 text-claw-400" />
          The Standing Stone
        </h1>
      </div>

      <div className="flex flex-col gap-4 min-h-0 overflow-y-auto pb-8">
        {events.length === 0 ? (
          <EmptyState
            icon={CalendarIcon}
            title="No events scheduled"
            description="The Standing Stone is silent. Events will appear here."
          />
        ) : (
          events.map((e) => {
            const start = new Date(e.start_iso);
            const end = new Date(e.end_iso);
            const isSameDay = start.toDateString() === end.toDateString();

            return (
              <div
                key={e.id}
                className="flex flex-col gap-2 p-5 rounded-ctl bg-ink-900/40 border border-ink-800 hover:border-claw-500/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-ink-100">{e.title}</h3>
                  <div className="flex flex-col items-end text-xs text-ink-400 text-right">
                    <span>{start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    <div className="flex items-center gap-1 mt-1 text-claw-400">
                      <Clock className="w-3 h-3" />
                      <span>
                        {start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} 
                        {isSameDay ? ` - ${end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : ''}
                      </span>
                    </div>
                  </div>
                </div>
                {e.description && (
                  <p className="text-sm text-ink-400 mt-2 leading-relaxed">
                    {e.description}
                  </p>
                )}
                {e.location && (
                  <div className="flex items-center gap-1 text-xs text-ink-300 font-medium bg-ink-800 w-fit px-2.5 py-1 rounded-full mt-3">
                    <MapPin className="w-3 h-3" />
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
