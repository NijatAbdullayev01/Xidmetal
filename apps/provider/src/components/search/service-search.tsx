'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { FolderOpen, Loader2, Search, Tag, Wrench } from 'lucide-react';
import type { CategorySummary, ServiceSummary } from '@xidmetal/shared';
import { api } from '@/lib/api';
import {
  buildServiceSearchHref,
  getTaxonomySuggestions,
  mapServicesToSuggestions,
  mergeSuggestions,
  type SearchSuggestion,
} from '@/lib/search';
import { buttonStyles } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ServiceSearchProps {
  categories: CategorySummary[];
  /** İlkin dəyər (məs. /services?q=) */
  initialQuery?: string;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  /** Nəticə səhifəsində eyni query ilə qalmaq üçün */
  syncUrlOnSubmit?: boolean;
}

const DEBOUNCE_MS = 220;
const MIN_LIVE_QUERY = 2;

export function ServiceSearch({
  categories,
  initialQuery = '',
  placeholder = 'Hansı xidmətə ehtiyacınız var?',
  className,
  autoFocus = false,
  syncUrlOnSubmit = false,
}: ServiceSearchProps) {
  const router = useRouter();
  const listboxId = useId();
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [liveServices, setLiveServices] = useState<ServiceSummary[]>([]);
  const [loadingLive, setLoadingLive] = useState(false);
  const [isPending, startTransition] = useTransition();

  const categorySlugById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.slug])),
    [categories],
  );

  const taxonomySuggestions = useMemo(
    () => getTaxonomySuggestions(query, categories, 8),
    [query, categories],
  );

  const serviceSuggestions = useMemo(
    () => mapServicesToSuggestions(query, liveServices, categorySlugById, 5),
    [query, liveServices, categorySlugById],
  );

  const suggestions = useMemo(() => {
    const merged = mergeSuggestions(taxonomySuggestions, serviceSuggestions, 10);
    // Vizual qrup sırası: növ → kateqoriya → elan (klaviatura ilə eyni)
    return [
      ...merged.filter((item) => item.kind === 'serviceType'),
      ...merged.filter((item) => item.kind === 'category'),
      ...merged.filter((item) => item.kind === 'service'),
    ];
  }, [taxonomySuggestions, serviceSuggestions]);

  const showPanel = open && query.trim().length > 0;

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < MIN_LIVE_QUERY) {
      setLiveServices([]);
      setLoadingLive(false);
      return;
    }

    setLoadingLive(true);
    debounceRef.current = setTimeout(() => {
      void api
        .services({ search: trimmed, limit: '8' })
        .then((response) => {
          setLiveServices(response.items);
        })
        .catch(() => {
          setLiveServices([]);
        })
        .finally(() => {
          setLoadingLive(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const navigateTo = useCallback(
    (href: string) => {
      setOpen(false);
      setActiveIndex(-1);
      startTransition(() => {
        router.push(href);
      });
    },
    [router],
  );

  const submitQuery = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        navigateTo('/services');
        return;
      }

      // Exact taxonomy hit → birbaşa dəqiq səhifəyə
      const exact = getTaxonomySuggestions(trimmed, categories, 1)[0];
      if (exact && exact.score >= 95) {
        navigateTo(exact.href);
        return;
      }

      const href = buildServiceSearchHref(trimmed);
      if (syncUrlOnSubmit) {
        navigateTo(href);
        return;
      }
      navigateTo(href);
    },
    [categories, navigateTo, syncUrlOnSubmit],
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      navigateTo(suggestions[activeIndex].href);
      return;
    }
    submitQuery(query);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showPanel && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      if (query.trim()) setOpen(true);
      return;
    }

    if (!showPanel) {
      if (event.key === 'Escape') {
        inputRef.current?.blur();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % Math.max(suggestions.length, 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) =>
        prev <= 0 ? Math.max(suggestions.length - 1, 0) : prev - 1,
      );
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) {
      event.preventDefault();
      navigateTo(suggestions[activeIndex].href);
    }
  };

  const typesGroup = suggestions.filter((item) => item.kind === 'serviceType');
  const categoriesGroup = suggestions.filter((item) => item.kind === 'category');
  const servicesGroup = suggestions.filter((item) => item.kind === 'service');

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <form
        role="search"
        onSubmit={onSubmit}
        className="flex flex-col gap-2 rounded-xl border border-border bg-card p-2 shadow-lg sm:flex-row sm:items-center sm:gap-3"
      >
        <div className="relative flex min-w-0 flex-1 items-center">
          <Search
            className="ml-2 h-5 w-5 shrink-0 text-muted-foreground sm:ml-3"
            aria-hidden
          />
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            name="q"
            value={query}
            autoFocus={autoFocus}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={placeholder}
            aria-label="Xidmət axtarışı"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={showPanel}
            aria-activedescendant={
              activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
            }
            role="combobox"
            className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm outline-none placeholder:text-muted-foreground sm:px-3"
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => {
              if (query.trim()) setOpen(true);
            }}
            onKeyDown={onKeyDown}
          />
          {loadingLive || isPending ? (
            <Loader2
              className="mr-2 h-4 w-4 shrink-0 animate-spin text-muted-foreground"
              aria-hidden
            />
          ) : null}
        </div>
        <button
          type="submit"
          className={cn(
            buttonStyles('default', 'md'),
            'w-full justify-center sm:w-auto sm:shrink-0',
          )}
        >
          Axtar
        </button>
      </form>

      {showPanel ? (
        <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          <div
            id={listboxId}
            role="listbox"
            aria-label="Axtarış təklifləri"
          >
            {suggestions.length === 0 && !loadingLive ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm font-medium text-foreground">Uyğun təklif tapılmadı</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  «Axtar» düyməsi ilə bütün nəticələrə baxın
                </p>
              </div>
            ) : suggestions.length === 0 && loadingLive ? (
              <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Axtarılır…
              </div>
            ) : (
              <div className="max-h-[min(24rem,70vh)] overflow-y-auto overscroll-contain py-1">
                {typesGroup.length > 0 ? (
                  <SuggestionSection label="Xidmət növləri">
                    {typesGroup.map((item) => {
                      const index = suggestions.indexOf(item);
                      return (
                        <SuggestionRow
                          key={item.id}
                          item={item}
                          index={index}
                          listboxId={listboxId}
                          active={activeIndex === index}
                          onHover={() => setActiveIndex(index)}
                          onSelect={() => navigateTo(item.href)}
                        />
                      );
                    })}
                  </SuggestionSection>
                ) : null}

                {categoriesGroup.length > 0 ? (
                  <SuggestionSection label="Kateqoriyalar">
                    {categoriesGroup.map((item) => {
                      const index = suggestions.indexOf(item);
                      return (
                        <SuggestionRow
                          key={item.id}
                          item={item}
                          index={index}
                          listboxId={listboxId}
                          active={activeIndex === index}
                          onHover={() => setActiveIndex(index)}
                          onSelect={() => navigateTo(item.href)}
                        />
                      );
                    })}
                  </SuggestionSection>
                ) : null}

                {servicesGroup.length > 0 ? (
                  <SuggestionSection label="Aktiv xidmətlər">
                    {servicesGroup.map((item) => {
                      const index = suggestions.indexOf(item);
                      return (
                        <SuggestionRow
                          key={item.id}
                          item={item}
                          index={index}
                          listboxId={listboxId}
                          active={activeIndex === index}
                          onHover={() => setActiveIndex(index)}
                          onSelect={() => navigateTo(item.href)}
                        />
                      );
                    })}
                  </SuggestionSection>
                ) : null}
              </div>
            )}
          </div>

          <div className="border-t border-border bg-muted/40 px-3 py-2">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => submitQuery(query)}
            >
              <Search className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">
                Bütün nəticələr: <span className="font-medium text-foreground">«{query.trim()}»</span>
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SuggestionSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div role="group" aria-label={label}>
      <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <ul role="presentation">{children}</ul>
    </div>
  );
}

function SuggestionRow({
  item,
  index,
  listboxId,
  active,
  onHover,
  onSelect,
}: {
  item: SearchSuggestion;
  index: number;
  listboxId: string;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  const Icon =
    item.kind === 'category' ? FolderOpen : item.kind === 'serviceType' ? Tag : Wrench;

  return (
    <li role="option" id={`${listboxId}-option-${index}`} aria-selected={active}>
      <button
        type="button"
        className={cn(
          'flex w-full min-h-11 touch-manipulation items-start gap-3 px-3 py-2.5 text-left transition-colors',
          active ? 'bg-brand/15' : 'hover:bg-muted/70',
        )}
        onMouseEnter={onHover}
        onClick={onSelect}
      >
        <span
          className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            active ? 'bg-brand/25 text-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">
            {item.label}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {item.description}
          </span>
        </span>
      </button>
    </li>
  );
}
