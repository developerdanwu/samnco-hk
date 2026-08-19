import { useState } from "react";
import { m } from "../paraglide/messages.js";
import { getLocale } from "../paraglide/runtime.js";
import { Button } from "@/components/ui/button";

// Scaffold probe: proves a React island hydrates, resolves the right locale with no
// threading, and renders a shadcn/Base UI component with our tokens. Deleted in issue 19.
export default function LocaleProbe() {
  const [n, setN] = useState(0);
  return (
    <div id="probe" data-locale={getLocale()} className="bg-paper-100 border-border border p-4">
      <p id="probe-hours" className="eyebrow">{m.footer_hours()}</p>
      <p id="probe-name" className="font-serif text-3xl">{m.meta_title_home()}</p>
      <p className="text-muted-foreground text-sm">{m.hours_ph()}</p>
      <Button onClick={() => setN(n + 1)}>clicked {n}</Button>
    </div>
  );
}
