import { useState } from "react";
import { Menu, X, ChevronDown, Check } from "lucide-react";
import { m } from "../paraglide/messages.js";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export interface NavLink { label: string; href: string; current: boolean }

interface Props {
  links: NavLink[];
  locale: "en" | "zh-hk";
  localeHrefs: { en: string; "zh-hk": string };
  whatsapp: string;
  address: string;
  hours: string;
}

const LOCALES = [
  { id: "en", label: "English" },
  { id: "zh-hk", label: "繁體中文" },
] as const;

/**
 * The interactive parts of the header only. Desktop nav links stay plain <a> in Header.astro
 * so they cost nothing — this island covers the locale dropdown and the mobile menu.
 */
export default function Nav({ links, locale, localeHrefs, whatsapp, address, hours }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {/* Language: text labels, never flags — a flag denotes a country, not a language. */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" className="h-11 gap-2 px-3 text-xs tracking-[0.1em]">
              {locale === "en" ? "EN" : "中文"}
              <ChevronDown className="size-3" aria-hidden="true" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-33">
          {LOCALES.map((l) => (
            <DropdownMenuItem
              key={l.id}
              render={<a href={localeHrefs[l.id]} lang={l.id} />}
              className="justify-between gap-3"
            >
              {l.label}
              {l.id === locale && <Check className="size-3.5" aria-hidden="true" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button variant="outline" size="icon" className="size-11 md:hidden" aria-label="Menu">
              <Menu className="size-5" aria-hidden="true" />
            </Button>
          }
        />
        <SheetContent side="right" showCloseButton={false} className="w-full max-w-none gap-0 p-0 sm:max-w-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <SheetTitle className="font-hk text-lg tracking-[0.08em]">三和文儀公司</SheetTitle>
            <Button variant="outline" size="icon" className="size-11" onClick={() => setOpen(false)} aria-label="Close">
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <nav className="flex flex-col px-5">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                aria-current={l.current ? "page" : undefined}
                className="border-paper-200 border-b py-4 font-serif text-3xl font-light"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex flex-col gap-3 px-5 py-6">
            <p className="eyebrow">{m.footer_ask()}</p>
            <a
              href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
              className="bg-brand-500 text-paper-50 flex h-13 items-center justify-center text-xs tracking-[0.14em] uppercase"
            >
              WhatsApp {whatsapp}
            </a>
            <p className="text-paper-700 mt-2 text-sm leading-relaxed">
              {address}
              <br />
              <span className="text-paper-650">{hours}</span>
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
