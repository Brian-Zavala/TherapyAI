"use client";

import {
  useState,
  useEffect,
  memo,
  lazy,
  Suspense,
  useMemo,
  useCallback,
  useRef,
} from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Check,
  X,
  SlidersHorizontal,
  Search as SearchIcon,
} from "lucide-react";

// Lazy load heavy components
const TherapeuticBokehBackground = lazy(
  () => import("@/components/ui/therapeutic-bokeh-background")
);

// Resource type definition
type Resource = {
  id: string;
  title: string;
  description: string;
  type: "article" | "video" | "exercise" | "book" | "podcast" | "community";
  url: string;
  source?: string;
  tags?: string[];
  difficulty?: "beginner" | "intermediate" | "advanced";
};

// Categories for organizing resources
type Category = {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
};

// Simple visibility hook - removed IntersectionObserver for performance
const useSimpleVisibility = () => {
  const [isVisible, setIsVisible] = useState(true); // Always visible, no complex observation
  return { isVisible };
};

// Ultra-optimized ResourceCard with simplified animations
const ResourceCard = memo(
  ({ resource, index }: { resource: Resource; index: number }) => {
    const { isVisible } = useSimpleVisibility();

    const getTypeIcon = useCallback((type: Resource["type"]) => {
      const icons: Record<Resource["type"], string> = {
        article: "📝",
        video: "🎥",
        exercise: "✏️",
        book: "📚",
        podcast: "🎧",
        community: "👥",
      };
      return icons[type] || "📝";
    }, []);

    // Per-category styling. Classes are written out statically so Tailwind's
    // JIT keeps every variant in the build.
    const tagStyle = useMemo(() => {
      const primaryTag = resource.tags?.[0];
      const styleMap: Record<
        string,
        {
          gradient: string;
          borderRest: string;
          borderHover: string;
          shadowHover: string;
          haloFrom: string;
          activeTint: string;
        }
      > = {
        communication: {
          gradient: "from-blue-500 to-blue-600",
          borderRest: "border-blue-400/15",
          borderHover:
            "group-hover:border-blue-400/60 group-focus-visible:border-blue-400/60",
          shadowHover: "group-hover:shadow-blue-500/25",
          haloFrom: "from-blue-500",
          activeTint: "active:bg-blue-500/10 active:border-blue-400/60",
        },
        conflict: {
          gradient: "from-amber-500 to-amber-600",
          borderRest: "border-amber-400/15",
          borderHover:
            "group-hover:border-amber-400/60 group-focus-visible:border-amber-400/60",
          shadowHover: "group-hover:shadow-amber-500/25",
          haloFrom: "from-amber-500",
          activeTint: "active:bg-amber-500/10 active:border-amber-400/60",
        },
        intimacy: {
          gradient: "from-rose-500 to-rose-600",
          borderRest: "border-rose-400/15",
          borderHover:
            "group-hover:border-rose-400/60 group-focus-visible:border-rose-400/60",
          shadowHover: "group-hover:shadow-rose-500/25",
          haloFrom: "from-rose-500",
          activeTint: "active:bg-rose-500/10 active:border-rose-400/60",
        },
        growth: {
          gradient: "from-emerald-500 to-emerald-600",
          borderRest: "border-emerald-400/15",
          borderHover:
            "group-hover:border-emerald-400/60 group-focus-visible:border-emerald-400/60",
          shadowHover: "group-hover:shadow-emerald-500/25",
          haloFrom: "from-emerald-500",
          activeTint: "active:bg-emerald-500/10 active:border-emerald-400/60",
        },
        crisis: {
          gradient: "from-red-500 to-red-600",
          borderRest: "border-red-400/15",
          borderHover:
            "group-hover:border-red-400/60 group-focus-visible:border-red-400/60",
          shadowHover: "group-hover:shadow-red-500/25",
          haloFrom: "from-red-500",
          activeTint: "active:bg-red-500/10 active:border-red-400/60",
        },
      };
      return styleMap[primaryTag || ""] || styleMap.communication;
    }, [resource.tags]);
    const tagColorClass = tagStyle.gradient;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.3) }}
        className="group relative h-full resource-card cursor-pointer"
        style={{
          contain: "layout style paint",
          contentVisibility: "auto",
          willChange: "auto",
        }}
      >
        {/* Category-tinted halo — visible on hover (desktop) and tap (touch) */}
        <div
          className={`pointer-events-none absolute -inset-px rounded-[1.55rem] opacity-0 group-hover:opacity-100 group-active:opacity-90 transition-opacity duration-200 bg-gradient-to-br ${tagStyle.haloFrom} to-transparent blur-md sm:blur-xl`}
          aria-hidden="true"
        />

        {/* Card surface: real bordered glass, lifts on hover, taps on touch */}
        <div
          className={`relative h-full rounded-[1.5rem] overflow-hidden flex flex-col bg-slate-900/40 backdrop-blur-xl border ${tagStyle.borderRest} ${tagStyle.borderHover} ${tagStyle.activeTint} shadow-[0_8px_24px_-12px_rgba(0,0,0,0.55)] group-hover:shadow-2xl ${tagStyle.shadowHover} group-hover:bg-slate-900/55 group-hover:-translate-y-0.5 group-active:translate-y-0 group-active:scale-[0.985] transition-[transform,border-color,background-color,box-shadow] duration-300 ease-out`}
        >
          {/* Top accent bar grows on hover */}
          <div
            className={`h-[3px] group-hover:h-[5px] transition-[height] duration-300 bg-gradient-to-r ${tagColorClass} flex-shrink-0`}
          />

          {/* Subtle top sheen — adds depth, hidden on small screens for perf */}
          <div
            className="pointer-events-none absolute inset-x-0 top-[3px] h-24 hidden sm:block opacity-60"
            aria-hidden="true"
            style={{
              background:
                "linear-gradient(to bottom, rgba(255,255,255,0.04), transparent)",
            }}
          />

          {/* Inner corner glints — illuminate slightly more on hover */}
          <div
            className="pointer-events-none absolute -top-px -left-px h-16 w-16 rounded-tl-[1.5rem] opacity-40 group-hover:opacity-80 transition-opacity duration-300"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(circle at top left, rgba(255,255,255,0.18), transparent 70%)",
            }}
          />

          <div className="relative p-5 sm:p-6 flex flex-col flex-grow">
            <div className="flex items-start mb-4 flex-shrink-0">
              <div
                className={`rounded-xl w-12 h-12 flex items-center justify-center mr-4 bg-gradient-to-br ${tagColorClass} shadow-lg flex-shrink-0`}
              >
                <span className="text-xl text-white">
                  {getTypeIcon(resource.type)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-white leading-tight mb-1 line-clamp-2">
                  {resource.title}
                </h3>
                {resource.source && (
                  <p className="text-xs sm:text-sm lg:text-base text-white/80 truncate font-medium">
                    {resource.source}
                  </p>
                )}
              </div>
            </div>

            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-white/85 mb-3 sm:mb-4 line-clamp-3 flex-grow leading-relaxed">
              {resource.description}
            </p>

            <div className="mt-auto space-y-3">
              <div className="flex flex-wrap gap-2">
                {resource.tags?.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-white/20 backdrop-blur-sm border border-white/40 text-white whitespace-nowrap"
                  >
                    {tag.charAt(0).toUpperCase() + tag.slice(1)}
                  </span>
                ))}

                {resource.difficulty && (
                  <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-white/20 backdrop-blur-sm border border-white/40 text-white">
                    {resource.difficulty === "beginner"
                      ? "🌱 Beginner"
                      : resource.difficulty === "intermediate"
                        ? "📈 Intermediate"
                        : "🚀 Advanced"}
                  </span>
                )}
              </div>

              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm sm:text-base lg:text-lg font-semibold transition-all duration-300 group/link cursor-pointer text-blue-400 hover:text-blue-300 whitespace-nowrap"
              >
                <span className="mr-1">Access Resource</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
);

ResourceCard.displayName = "ResourceCard";

// Map "from-blue-500 to-blue-600" -> "bg-blue-500" for the small dot accent.
// Hue tokens are listed statically so Tailwind's JIT keeps them in the build.
const HUE_DOT: Record<string, string> = {
  purple: "bg-purple-400",
  blue: "bg-blue-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
  green: "bg-emerald-400",
  red: "bg-red-400",
};
const dotFromGradient = (color: string): string => {
  const match = color.match(/from-(\w+)-/);
  return (match && HUE_DOT[match[1]]) || "bg-white/50";
};

// Refined category dropdown — replaces the row of 6 colored pills.
const CategoryFilter = memo(
  ({
    categories,
    activeCategory,
    onChange,
    counts,
  }: {
    categories: Category[];
    activeCategory: string;
    onChange: (id: string) => void;
    counts: Record<string, number>;
  }) => {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const active =
      categories.find((c) => c.id === activeCategory) ?? categories[0];

    useEffect(() => {
      if (!open) return;
      const onClickOutside = (e: MouseEvent) => {
        if (
          wrapperRef.current &&
          !wrapperRef.current.contains(e.target as Node)
        ) {
          setOpen(false);
        }
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
      };
      document.addEventListener("mousedown", onClickOutside);
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("mousedown", onClickOutside);
        document.removeEventListener("keydown", onKey);
      };
    }, [open]);

    return (
      <div
        ref={wrapperRef}
        className="relative w-full sm:w-[300px] flex-shrink-0"
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="Filter resources by category"
          className="group w-full flex items-center gap-3 h-[60px] px-4 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 hover:bg-white/[0.07] hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-white/25 transition-all duration-200 cursor-pointer"
        >
          <span className="flex items-center justify-center h-9 w-9 rounded-xl bg-white/[0.04] border border-white/[0.08]">
            <SlidersHorizontal className="h-4 w-4 text-white/65" />
          </span>
          <span className="flex-1 text-left min-w-0">
            <span className="block text-[10px] uppercase tracking-[0.22em] text-white/40 font-medium leading-none mb-1.5">
              Category
            </span>
            <span className="flex items-center gap-2 min-w-0">
              <span
                className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${dotFromGradient(active.color)}`}
              />
              <span className="text-sm font-medium text-white truncate">
                {active.title}
              </span>
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 text-white/50 transition-transform duration-200 flex-shrink-0 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.985 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute z-50 left-0 right-0 sm:right-auto sm:w-[380px] mt-2 rounded-2xl bg-slate-950/95 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/60 overflow-hidden"
              role="listbox"
              aria-label="Categories"
              style={{ transformOrigin: "top left" }}
            >
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/45 font-medium">
                  Browse by topic
                </p>
                <span className="text-[10px] font-mono tabular-nums text-white/35">
                  {Object.values(counts).reduce((a, b) => a + b, 0) -
                    (counts.all ?? 0)}{" "}
                  tagged
                </span>
              </div>
              <ul className="max-h-[60vh] overflow-y-auto py-1.5">
                {categories.map((cat) => {
                  const isActive = cat.id === activeCategory;
                  const count = counts[cat.id] ?? 0;
                  return (
                    <li key={cat.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(cat.id);
                          setOpen(false);
                        }}
                        role="option"
                        aria-selected={isActive}
                        className={`group w-full flex items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
                          isActive
                            ? "bg-white/[0.05]"
                            : "hover:bg-white/[0.035]"
                        }`}
                      >
                        <span className="relative flex items-center justify-center h-9 w-9 rounded-xl bg-white/[0.04] border border-white/[0.07] flex-shrink-0 mt-0.5">
                          <span className="text-base leading-none">
                            {cat.icon}
                          </span>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-slate-950 ${dotFromGradient(cat.color)}`}
                          />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-white truncate">
                              {cat.title}
                            </span>
                            <span className="text-[10.5px] font-mono tabular-nums text-white/55 bg-white/[0.04] border border-white/[0.07] px-1.5 py-0.5 rounded-md leading-none">
                              {count}
                            </span>
                          </span>
                          <span className="block text-[11.5px] text-white/50 mt-1 leading-snug line-clamp-2">
                            {cat.description}
                          </span>
                        </span>
                        <Check
                          className={`h-4 w-4 mt-1 flex-shrink-0 transition-opacity ${
                            isActive
                              ? "text-blue-400 opacity-100"
                              : "opacity-0"
                          }`}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

CategoryFilter.displayName = "CategoryFilter";

// Removed CSS layer styles - moved to external CSS file for better performance

export default function ResourcesOptimized() {
  // State for active category filter
  const [activeCategory, setActiveCategory] = useState<string>("all");
  // State for search query
  const [searchQuery, setSearchQuery] = useState<string>("");
  // Debounced search query for performance
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");
  // State for emergency support visibility
  const [showEmergencySupport, setShowEmergencySupport] =
    useState<boolean>(false);
  // State for mobile tab management
  const [activeTab, setActiveTab] = useState<"search" | "results">("search");
  const [isMobile, setIsMobile] = useState(false);
  // Auto-load video section
  const [showVideo, setShowVideo] = useState(true);

  // Categories for relationship resources - memoized
  const categories = useMemo<Category[]>(
    () => [
      {
        id: "all",
        title: "All Resources",
        description:
          "Browse our complete collection of relationship support materials",
        icon: "🔍",
        color: "from-purple-500 to-purple-600",
      },
      {
        id: "communication",
        title: "Communication",
        description:
          "Tools to improve dialogue and understanding between partners",
        icon: "💬",
        color: "from-blue-500 to-blue-600",
      },
      {
        id: "conflict",
        title: "Conflict Resolution",
        description: "Strategies for navigating disagreements in healthy ways",
        icon: "🤝",
        color: "from-amber-500 to-amber-600",
      },
      {
        id: "intimacy",
        title: "Intimacy & Connection",
        description: "Resources for deepening emotional and physical bonds",
        icon: "❤️",
        color: "from-rose-500 to-rose-600",
      },
      {
        id: "growth",
        title: "Personal Growth",
        description: "Support for individual development within relationships",
        icon: "🌱",
        color: "from-green-500 to-green-600",
      },
      {
        id: "crisis",
        title: "Crisis Support",
        description: "Immediate help for couples facing serious challenges",
        icon: "🆘",
        color: "from-red-500 to-red-600",
      },
    ],
    []
  );

  // Resources with verified 2025 URLs - memoized
  const resources = useMemo<Resource[]>(
    () => [
      {
        id: "1",
        title: "Gottman Love Notes: Weekly Relationship Tips",
        description:
          "Get expert relationship advice, research-based tips, and monthly couples exercises delivered to your inbox.",
        type: "article",
        url: "https://www.gottman.com/couples/",
        source: "The Gottman Institute",
        tags: ["communication", "growth"],
        difficulty: "beginner",
      },
      {
        id: "2",
        title: "21 Couples Therapy Worksheets & Activities",
        description:
          "Evidence-based worksheets, exercises, and activities designed by psychologists to strengthen your relationship.",
        type: "exercise",
        url: "https://positivepsychology.com/couples-therapy-worksheets-activities/",
        source: "Positive Psychology",
        tags: ["communication", "intimacy"],
        difficulty: "intermediate",
      },
      {
        id: "3",
        title: "The Paper Exercise - Breakthrough Tool",
        description:
          "A powerful therapeutic technique to reduce reactivity, improve clarity, and create deeper breakthroughs in your relationship.",
        type: "exercise",
        url: "https://www.couplesinstitute.com/couples-therapy-tools-the-paper-exercise/",
        source: "Couples Institute",
        tags: ["conflict", "communication"],
        difficulty: "advanced",
      },
      {
        id: "4",
        title: "Hold Me Tight - EFT Conversation Exercise",
        description:
          "Dr. Sue Johnson's emotionally focused therapy approach that emphasizes emotional bonds over just communication.",
        type: "exercise",
        url: "https://yung-sidekick.com/blog/17-proven-couples-therapy-exercises-that-actually-work-in-2025",
        source: "EFT Resources",
        tags: ["intimacy", "communication"],
        difficulty: "intermediate",
      },
      {
        id: "5",
        title: "Relationship Worksheets Collection",
        description:
          "Free downloadable worksheets for fair fighting, communication, conflict resolution, and relationship building.",
        type: "exercise",
        url: "https://www.therapistaid.com/therapy-worksheets/relationships/none",
        source: "Therapist Aid",
        tags: ["communication", "conflict"],
        difficulty: "beginner",
      },
      {
        id: "6",
        title: "Best Online Couples Therapy 2025",
        description:
          "Compare top-rated online therapy platforms with various price points and specializations for couples.",
        type: "article",
        url: "https://www.healthline.com/health/mental-health/therapy-for-couples",
        source: "Healthline",
        tags: ["growth", "communication"],
        difficulty: "beginner",
      },
      {
        id: "7",
        title: "33 Couples Therapy Exercises & Activities",
        description:
          "Comprehensive guide with questions designed to strengthen relationships and deepen emotional connection.",
        type: "exercise",
        url: "https://www.carepatron.com/guides/couples-therapy-exercises",
        source: "CarePatron",
        tags: ["intimacy", "growth"],
        difficulty: "intermediate",
      },
      {
        id: "8",
        title: "Marriage Counseling Toolkit: 30 Worksheets",
        description:
          "Science-based exercises and interventions created by experts using the latest positive psychology research.",
        type: "exercise",
        url: "https://positivepsychology.com/marriage-counseling/",
        source: "Positive Psychology Toolkit",
        tags: ["conflict", "communication"],
        difficulty: "intermediate",
      },
      {
        id: "9",
        title: "Interactive Relationship Tools & Guides",
        description:
          "Free therapy resources including worksheets, treatment guides, and interactive tools for couples.",
        type: "exercise",
        url: "https://www.therapistaid.com/tools/relationships",
        source: "Therapist Aid",
        tags: ["communication", "growth"],
        difficulty: "beginner",
      },
      {
        id: "10",
        title: "Where Should We Begin? Podcast",
        description:
          "Real couples anonymously share their stories in therapy with relationship expert Esther Perel.",
        type: "podcast",
        url: "https://whereweshouldbegin.estherperel.com/",
        source: "Esther Perel",
        tags: ["intimacy", "communication", "growth"],
        difficulty: "beginner",
      },
      {
        id: "11",
        title: "Hold Me Tight: EFT for Couples",
        description:
          "Based on Dr. Sue Johnson's Emotionally Focused Therapy approach to building secure attachment.",
        type: "book",
        url: "https://iceeft.com/what-is-eft/",
        source: "ICEEFT",
        tags: ["intimacy", "communication"],
        difficulty: "intermediate",
      },
      {
        id: "12",
        title: "National Domestic Violence Hotline",
        description:
          "Immediate support for anyone experiencing domestic violence or abuse in their relationship.",
        type: "community",
        url: "https://www.thehotline.org/",
        source: "National Domestic Violence Hotline",
        tags: ["crisis"],
        difficulty: "beginner",
      },
      {
        id: "13",
        title: "Couples Communication Exercises",
        description:
          "Free downloadable worksheets to practice effective communication skills.",
        type: "exercise",
        url: "https://positivepsychology.com/communication-exercises-couples/",
        source: "PositivePsychology.com",
        tags: ["communication"],
        difficulty: "beginner",
      },
      {
        id: "14",
        title: "Self-Compassion Practices for Relationship Healing",
        description:
          "Learn how self-compassion can transform your relationship dynamics.",
        type: "article",
        url: "https://self-compassion.org/the-three-elements-of-self-compassion-2/",
        source: "Dr. Kristin Neff",
        tags: ["growth", "intimacy"],
        difficulty: "intermediate",
      },
      {
        id: "15",
        title: "Relationship Help: When to Seek Support",
        description:
          "Understanding when and how to find professional help for your relationship.",
        type: "article",
        url: "https://www.apa.org/topics/healthy-relationships",
        source: "American Psychological Association",
        tags: ["crisis", "growth"],
        difficulty: "beginner",
      },
    ],
    []
  );

  // Per-category resource counts for the dropdown badges
  const resourceCounts = useMemo(() => {
    const counts: Record<string, number> = { all: resources.length };
    for (const c of categories) {
      if (c.id === "all") continue;
      counts[c.id] = resources.filter((r) => r.tags?.includes(c.id)).length;
    }
    return counts;
  }, [resources, categories]);

  // Emergency support resources - memoized
  const emergencyResources = useMemo(
    () => [
      {
        title: "National Domestic Violence Hotline",
        phone: "1-800-799-SAFE (7233)",
        website: "https://www.thehotline.org/",
        description: "24/7 support for anyone experiencing domestic violence",
      },
      {
        title: "Crisis Text Line",
        phone: "Text HOME to 741741",
        website: "https://www.crisistextline.org/",
        description: "Text-based mental health support and crisis intervention",
      },
      {
        title: "SAMHSA's National Helpline",
        phone: "1-800-662-HELP (4357)",
        website: "https://www.samhsa.gov/find-help/national-helpline",
        description: "Treatment referral for mental health and substance use",
      },
    ],
    []
  );

  // Memoized filter function with debounced search
  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      // Filter by category
      const matchesCategory =
        activeCategory === "all" ||
        (resource.tags && resource.tags.includes(activeCategory));

      // Filter by search query (using debounced value)
      const searchLower = debouncedSearchQuery.toLowerCase();
      const matchesSearch =
        !searchLower ||
        resource.title.toLowerCase().includes(searchLower) ||
        resource.description.toLowerCase().includes(searchLower) ||
        (resource.source &&
          resource.source.toLowerCase().includes(searchLower));

      return matchesCategory && matchesSearch;
    });
  }, [resources, activeCategory, debouncedSearchQuery]);

  // Callbacks
  const handleCategoryChange = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    []
  );

  const handleEmergencySupportToggle = useCallback(() => {
    setShowEmergencySupport((prev) => !prev);
  }, []);

  const handleResetSearch = useCallback(() => {
    setSearchQuery("");
    setActiveCategory("all");
    if (isMobile) setActiveTab("search");
  }, [isMobile]);

  // Change to results tab when search is performed on mobile
  useEffect(() => {
    if (isMobile && searchQuery && filteredResources.length > 0) {
      setActiveTab("results");
    }
  }, [searchQuery, filteredResources.length, isMobile]);

  // Check if it's mobile view on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkMobile();

    // Add event listener for window resize
    window.addEventListener("resize", checkMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Debounce search input for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <>
      {/* Inline CSS for animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }

        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        /* Performance optimizations */
        .resource-card {
          contain-intrinsic-size: auto 300px;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-fadeIn,
          .animate-pulse {
            animation: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-black">
        {/* Therapeutic Background - static, no parallax */}
        <Suspense fallback={<div className="absolute inset-0 bg-slate-900" />}>
          <div className="absolute inset-0">
            <TherapeuticBokehBackground />
          </div>
        </Suspense>

        {/* Static gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/10 to-pink-900/20" />

        {/* Main overlay for content readability */}
        <div className="relative z-10 min-h-screen backdrop-blur-lg bg-gradient-to-b from-slate-900/60 via-slate-900/70 to-slate-900/80 pt-20 sm:pt-24 pb-12 px-4 sm:px-6 lg:px-8">
          {/* Mobile tabs */}
          {isMobile && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="sticky top-0 z-20 bg-black/30 backdrop-blur-xl border-b border-white/20 mb-6 -mx-4 px-4 py-3 rounded-b-xl"
            >
              <div className="flex rounded-lg bg-black/40 backdrop-blur-md p-1 shadow-xl border border-white/20">
                <button
                  onClick={() => setActiveTab("search")}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer ${
                    activeTab === "search"
                      ? "bg-white/20 backdrop-blur-md text-blue-300 shadow-lg border border-white/30"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <span className="flex items-center justify-center">
                    <svg
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    Search
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("results")}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer ${
                    activeTab === "results"
                      ? "bg-white/20 backdrop-blur-md text-blue-300 shadow-lg border border-white/30"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <span className="flex items-center justify-center">
                    <svg
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                    Resources{" "}
                    {filteredResources.length > 0 &&
                      `(${filteredResources.length})`}
                  </span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Header with supportive message */}
          <div
            className={`max-w-7xl mx-auto text-center mb-16 ${isMobile && activeTab === "results" ? "hidden" : ""}`}
          >
            <motion.div initial="hidden" animate="visible" className="relative">
              {/* Simple background blur effect */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.3 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="absolute inset-0 -top-20 -bottom-20 bg-blue-500 blur-3xl"
              />

              <div className="relative">
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-bold mb-6 sm:mb-8 lg:mb-10"
                >
                  <span className="text-white block lg:inline">Therapy</span>
                  <span className="text-white block lg:inline lg:ml-4">
                    Resources
                  </span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl text-white/90 max-w-3xl lg:max-w-4xl mx-auto mb-6 sm:mb-8 lg:mb-10 leading-relaxed font-light px-4 sm:px-6 lg:px-0"
                >
                  Everyone faces challenges. You're not alone, and reaching out
                  for support is a{" "}
                  <span className="text-white font-semibold">
                    sign of strength
                  </span>{" "}
                  and courage.
                </motion.p>
              </div>

              {/* Emergency Support Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-8 inline-block"
              >
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleEmergencySupportToggle}
                  className="group relative inline-flex items-center px-8 py-4 sm:px-10 sm:py-5 text-base font-semibold rounded-full text-white overflow-hidden transition-colors duration-200 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 shadow-lg hover:shadow-xl cursor-pointer"
                >
                  <span className="relative flex items-center">
                    <svg
                      className="h-5 w-5 mr-3 animate-pulse"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    {showEmergencySupport
                      ? "Hide Emergency Help"
                      : "Need Immediate Help?"}
                  </span>
                </motion.button>
              </motion.div>
            </motion.div>

            {/* Emergency Support Panel */}
            <AnimatePresence>
              {showEmergencySupport && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="mt-8 max-w-5xl mx-auto overflow-hidden"
                >
                  <div className="relative bg-gradient-to-r from-red-500/20 to-pink-500/20 backdrop-blur-xl rounded-3xl p-1 border border-red-400/30">
                    <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-6 sm:p-8">
                      <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white mb-4 sm:mb-6 flex items-center justify-center sm:justify-start">
                        <svg
                          className="h-8 w-8 text-red-500 mr-3 animate-pulse"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                        Immediate Support Resources
                      </h2>
                      <p className="text-red-200 mb-6 sm:mb-8 text-sm sm:text-base md:text-lg lg:text-xl">
                        If you're in danger or experiencing a crisis, please use
                        these resources for immediate help:
                      </p>

                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {emergencyResources.map((resource, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.3 }}
                            className="relative bg-white/10 backdrop-blur-md p-5 rounded-xl border border-white/20 hover:border-red-400/50 transition-all duration-200"
                          >
                            <h3 className="font-bold text-base sm:text-lg lg:text-xl text-white mb-2">
                              {resource.title}
                            </h3>
                            <p className="font-mono text-red-300 text-sm sm:text-base lg:text-lg my-2 sm:my-3">
                              {resource.phone}
                            </p>
                            <a
                              href={resource.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-sm sm:text-base text-blue-300 hover:text-blue-200 font-medium mb-3 transition-colors cursor-pointer"
                            >
                              Visit Website
                              <svg
                                className="ml-1 h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                            </a>
                            <p className="text-xs sm:text-sm lg:text-base text-white/70">
                              {resource.description}
                            </p>
                          </motion.div>
                        ))}
                      </div>

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="mt-8 p-5 bg-red-500/20 backdrop-blur-sm rounded-xl border border-red-400/30"
                      >
                        <p className="text-white flex items-start">
                          <svg
                            className="h-6 w-6 mr-3 text-red-400 flex-shrink-0 mt-0.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          <span>
                            <strong className="text-red-300">
                              In case of immediate danger:
                            </strong>
                            <span className="text-white/90">
                              {" "}
                              Call emergency services (911 in the US) if you or
                              someone you know is in immediate danger.
                            </span>
                          </span>
                        </p>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Featured Video Section - Auto-loaded */}
          <VideoSection />

          <div className="max-w-7xl mx-auto">
            <div
              className={`${isMobile ? (activeTab === "search" ? "block" : "hidden") : "block"}`}
            >
              {/* Refined filter toolbar — replaces gradient pill row */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="mb-10"
              >
                <div className="flex items-center justify-between mb-3 sm:mb-4 px-1">
                  <h2 className="text-[11px] sm:text-xs uppercase tracking-[0.22em] font-medium text-white/45">
                    Refine library
                  </h2>
                  {(activeCategory !== "all" || searchQuery) && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={handleResetSearch}
                      className="group inline-flex items-center gap-1.5 text-[10.5px] sm:text-[11px] uppercase tracking-[0.18em] text-white/45 hover:text-white transition-colors cursor-pointer"
                    >
                      Reset
                      <X className="h-3 w-3 transition-transform group-hover:rotate-90" />
                    </motion.button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <CategoryFilter
                    categories={categories}
                    activeCategory={activeCategory}
                    onChange={handleCategoryChange}
                    counts={resourceCounts}
                  />

                  <div className="relative flex-1 min-w-0">
                    <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      placeholder="Search resources by keyword, topic, or source…"
                      aria-label="Search resources"
                      className="w-full h-[60px] pl-11 pr-12 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 text-sm text-white placeholder:text-white/40 hover:bg-white/[0.07] hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-white/25 transition-all duration-200"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        aria-label="Clear search"
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center rounded-lg bg-white/[0.06] hover:bg-white/[0.14] text-white/60 hover:text-white transition-colors cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Active filter chips */}
                <AnimatePresence>
                  {(activeCategory !== "all" || debouncedSearchQuery) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-white/35">
                          Filtering by
                        </span>
                        {activeCategory !== "all" && (() => {
                          const cat = categories.find(
                            (c) => c.id === activeCategory
                          );
                          if (!cat) return null;
                          return (
                            <button
                              onClick={() => setActiveCategory("all")}
                              className="group inline-flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 hover:border-white/25 hover:bg-white/[0.07] transition-colors cursor-pointer"
                              aria-label={`Remove ${cat.title} filter`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${dotFromGradient(cat.color)}`}
                              />
                              <span className="text-xs text-white/85">
                                {cat.title}
                              </span>
                              <span className="grid place-items-center h-5 w-5 rounded-full bg-white/[0.06] group-hover:bg-white/[0.16] transition-colors">
                                <X className="h-3 w-3 text-white/65" />
                              </span>
                            </button>
                          );
                        })()}
                        {debouncedSearchQuery && (
                          <button
                            onClick={() => setSearchQuery("")}
                            className="group inline-flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 hover:border-white/25 hover:bg-white/[0.07] transition-colors cursor-pointer"
                            aria-label="Clear search filter"
                          >
                            <SearchIcon className="h-3 w-3 text-white/55" />
                            <span className="text-xs text-white/85 max-w-[160px] truncate">
                              &ldquo;{debouncedSearchQuery}&rdquo;
                            </span>
                            <span className="grid place-items-center h-5 w-5 rounded-full bg-white/[0.06] group-hover:bg-white/[0.16] transition-colors">
                              <X className="h-3 w-3 text-white/65" />
                            </span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {filteredResources.length > 0 && isMobile && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4"
                  >
                    <motion.button
                      onClick={() => setActiveTab("results")}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl text-sm font-medium flex items-center justify-center shadow-lg transition-all duration-200 cursor-pointer"
                    >
                      <span>View {filteredResources.length} results</span>
                      <svg
                        className="ml-1 h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14 5l7 7m0 0l-7 7m7-7H3"
                        />
                      </svg>
                    </motion.button>
                  </motion.div>
                )}
              </motion.div>
            </div>

            {/* Resource grid with content-visibility */}
            <div
              className={`${isMobile ? (activeTab === "results" ? "block" : "hidden") : "block"}`}
            >
              {isMobile && activeTab === "results" && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 flex items-center justify-between bg-white/10 backdrop-blur-xl rounded-xl p-3 border border-white/20"
                >
                  <motion.button
                    onClick={() => setActiveTab("search")}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center text-blue-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <svg
                      className="mr-1 h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                      />
                    </svg>
                    Back to Search
                  </motion.button>
                  <span className="text-sm text-white/70">
                    {filteredResources.length}{" "}
                    {filteredResources.length === 1 ? "result" : "results"}
                  </span>
                </motion.div>
              )}

              {filteredResources.length > 0 ? (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
                  style={{ contain: "layout", willChange: "contents" }}
                >
                  {filteredResources.map((resource, index) => (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      index={index}
                    />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="text-center py-12 bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 relative overflow-hidden"
                >
                  <div className="relative text-5xl mb-6">
                    <span className="relative z-10">🔍</span>
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-white mb-3">
                      No resources found
                    </h3>
                    <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/70 mb-6">
                      Try adjusting your search or category filter to find what
                      you're looking for.
                    </p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleResetSearch}
                    className="inline-flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-full shadow-lg hover:shadow-xl transition-colors duration-200 cursor-pointer"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Reset Search
                  </motion.button>
                </motion.div>
              )}
            </div>
          </div>

          {/* Support message */}
          <SupportMessage />

          {/* Community wisdom section */}
          <CommunityWisdom />

          {/* Newsletter signup */}
          <NewsletterSignup />
        </div>
      </div>
    </>
  );
}

// Memoized Video Section Component
const VideoSection = memo(() => {
  return (
    <div className="max-w-6xl mx-auto mb-16">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative group"
      >
        {/* Glass card container */}
        <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-1 border border-white/20 shadow-2xl overflow-hidden">
          <div className="relative bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 sm:p-8">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center mr-4 shadow-lg">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M23 7l-7 5 7 5V7z" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white">
                    Featured Resource
                  </h2>
                  <p className="text-sm sm:text-base lg:text-lg text-blue-200/80">
                    Essential viewing for you{" "}
                  </p>
                </div>
              </div>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/90 leading-relaxed">
                Discover powerful insights on mental health symptoms and causes
                through this transformative talk that has helped millions of
                people like you worldwide.
              </p>
            </div>

            {/* Video container */}
            <div className="relative rounded-xl overflow-hidden shadow-2xl">
              <div className="relative aspect-video">
                <iframe
                  src="https://www.youtube.com/embed/uPh4-DU6MDU?rel=0&modestbranding=1&preload=1"
                  title="Transformative Relationship Insights"
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="eager"
                />
              </div>
            </div>

            {/* Video details */}
            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <h3 className="font-semibold text-blue-300 mb-1">Key Topics</h3>
                <ul className="text-sm text-white/70 space-y-1">
                  <li className="flex items-center">
                    <span className="text-green-400 mr-2">✓</span> Mental health
                    explained
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-400 mr-2">✓</span>Building
                    confidence and self-esteem
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-400 mr-2">✓</span>Gained
                    knowledge
                  </li>
                </ul>
              </div>
              <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <h3 className="font-semibold text-blue-300 mb-1">
                  Perfect For
                </h3>
                <ul className="text-sm text-white/70 space-y-1">
                  <li className="flex items-center">
                    <span className="text-blue-400 mr-2">•</span>Anyone at any
                    stage
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-400 mr-2">•</span>
                    experienced or new to therapy
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-400 mr-2">•</span>Anyone seeking
                    growth
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
});

VideoSection.displayName = "VideoSection";

// Memoized Support Message Component
const SupportMessage = memo(() => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="max-w-4xl mx-auto mt-16 mb-16"
    >
      <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-1 border border-white/20 shadow-2xl overflow-hidden">
        <div className="relative bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 sm:p-8">
          <div className="text-center">
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-white mb-3 flex items-center justify-center"
            >
              <svg
                className="h-6 w-6 mr-2 text-blue-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                />
              </svg>
              Need Personalized Support?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="text-white/80 mb-6 text-xs sm:text-sm md:text-base lg:text-lg"
            >
              While these resources are helpful, sometimes you need professional
              guidance tailored to your unique situation. Our trained therapists
              are ready to support you and your partner.
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4"
            >
              <motion.div whileTap={{ scale: 0.98 }}>
                <Link
                  href="/schedule"
                  className="group relative inline-flex justify-center items-center px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base font-medium rounded-xl text-white bg-blue-500 hover:bg-blue-600 transition-colors duration-200 shadow-lg hover:shadow-blue-500/25 cursor-pointer"
                >
                  <span className="relative flex items-center">
                    <svg
                      className="mr-2 h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Schedule a Session
                  </span>
                </Link>
              </motion.div>
              <motion.div whileTap={{ scale: 0.98 }}>
                <Link
                  href="/dashboard/therapy"
                  className="group relative inline-flex justify-center items-center px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base font-medium rounded-xl text-white border border-white/30 backdrop-blur-sm hover:bg-white/10 transition-colors duration-200 cursor-pointer"
                >
                  <span className="flex items-center">
                    <svg
                      className="mr-2 h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 107.072 0m-9.9 2.828a9 9 0 0112.728 0"
                      />
                    </svg>
                    Start Voice Session
                  </span>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

SupportMessage.displayName = "SupportMessage";

// Memoized Community Wisdom Component
const CommunityWisdom = memo(() => {
  const wisdomItems = useMemo(
    () => [
      {
        icon: "❤️‍🩹",
        title: "Healing Takes Time",
        quote:
          "Rebuilding trust is a process, not an event. Be patient with yourselves and each other as you heal.",
        source: "From a couple married 27 years",
        color: "bg-blue-500",
      },
      {
        icon: "🌱",
        title: "Growth Together",
        quote:
          "The strongest relationships aren't those without problems, but those where couples grow by facing challenges together.",
        source: "From couples therapy group",
        color: "bg-gradient-to-r from-green-500 to-blue-500",
      },
      {
        icon: "🔄",
        title: "Daily Practice",
        quote:
          "Small daily acts of appreciation and connection matter more than grand gestures. Consistency builds security.",
        source: "Relationship counselors",
        color: "bg-amber-500",
      },
    ],
    []
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="max-w-5xl mx-auto mt-16 mb-16"
    >
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-center text-white mb-6 sm:mb-8 flex items-center justify-center"
      >
        <svg
          className="h-6 w-6 mr-2 text-blue-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v13m0-13h4m-4 0H8m4-6.5v.5m0 7v.5m0-8.75C11.667 2.732 11 2.232 10 2h4c-.667.732-1 1.232-1 1.75z"
          />
        </svg>
        Community Wisdom
      </motion.h2>
      <motion.div
        initial="hidden"
        animate="visible"
        className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6"
      >
        {wisdomItems.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: Math.min(index * 0.05, 0.2) }}
            className="relative bg-white/10 backdrop-blur-xl p-5 rounded-2xl border border-white/20 hover:border-white/30 transition-colors duration-200 group cursor-pointer"
          >
            <div className="relative">
              <div className="flex items-center mb-3">
                <div
                  className={`h-9 w-9 rounded-full ${item.color} flex items-center justify-center text-white mr-3 shadow-lg`}
                >
                  {item.icon}
                </div>
                <h3 className="font-semibold text-sm sm:text-base lg:text-lg text-white">
                  {item.title}
                </h3>
              </div>
              <p className="text-white/80 text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed">
                &ldquo;{item.quote}&rdquo;
              </p>
              <p className="text-white/60 mt-3 text-xs sm:text-sm italic">
                — {item.source}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
});

CommunityWisdom.displayName = "CommunityWisdom";

// Memoized Newsletter Signup Component
const NewsletterSignup = memo(() => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="max-w-4xl mx-auto mt-16 mb-16"
    >
      <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-1 border border-white/20 shadow-2xl overflow-hidden">
        <div className="relative bg-slate-900/80 backdrop-blur-md rounded-2xl px-5 py-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="sm:w-7/12 mb-5 sm:mb-0 text-center sm:text-left"
            >
              <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white mb-2">
                Weekly Relationship Insights
              </h3>
              <p className="text-white/70 text-xs sm:text-sm lg:text-base">
                Join our community for expert tips and supportive guidance.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="sm:w-5/12 w-full"
            >
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  placeholder="Your email"
                  className="px-3 py-2 sm:px-4 sm:py-2 rounded-xl bg-white/10 backdrop-blur-sm text-white placeholder-white/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200 w-full"
                />
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-medium transition-colors duration-200 whitespace-nowrap shadow-lg cursor-pointer"
                >
                  Subscribe
                </motion.button>
              </div>
              <p className="text-xs sm:text-sm text-white/60 mt-2 text-center sm:text-left">
                We respect your privacy. Unsubscribe anytime.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

NewsletterSignup.displayName = "NewsletterSignup";
