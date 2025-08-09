"use client";

import {
  useState,
  memo,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import Link from "next/link";

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

// Ultra-optimized ResourceCard with pure CSS animations
const ResourceCard = memo(
  ({ resource, index }: { resource: Resource; index: number }) => {
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

    const tagColorClass = useMemo(() => {
      const primaryTag = resource.tags?.[0];
      const colorMap: Record<string, string> = {
        communication: "from-blue-500 to-blue-600",
        conflict: "from-amber-500 to-amber-600",
        intimacy: "from-rose-500 to-rose-600",
        growth: "from-green-500 to-green-600",
        crisis: "from-red-500 to-red-600",
      };
      return colorMap[primaryTag || ""] || "from-blue-500 to-blue-600";
    }, [resource.tags]);

    return (
      <div
        className="group relative h-full resource-card cursor-pointer animate-fadeIn opacity-0"
        style={{
          animationDelay: `${Math.min(index * 50, 500)}ms`,
          animationFillMode: 'forwards',
          contain: "layout style paint",
          contentVisibility: "auto",
        }}
      >
        {/* Removed blur for performance */}
        <div
          className={`absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-150 bg-gradient-to-r ${tagColorClass}`}
        />

        <div className="relative h-full bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/20 hover:border-white/30 transition-all duration-200 group-hover:bg-white/15 flex flex-col">
          <div className={`h-1 bg-gradient-to-r ${tagColorClass} flex-shrink-0`} />

          <div className="p-5 sm:p-6 flex flex-col flex-grow">
            <div className="flex items-start mb-4 flex-shrink-0">
              <div
                className={`rounded-xl w-12 h-12 flex items-center justify-center mr-4 bg-gradient-to-br ${tagColorClass} shadow-lg flex-shrink-0`}
              >
                <span className="text-xl text-white">
                  {getTypeIcon(resource.type)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-white leading-tight mb-1 line-clamp-2">
                  {resource.title}
                </h3>
                {resource.source && (
                  <p className="text-xs sm:text-sm lg:text-base text-blue-300/70 truncate">
                    Source: {resource.source}
                  </p>
                )}
              </div>
            </div>

            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-white/80 mb-3 sm:mb-4 line-clamp-3 flex-grow leading-relaxed">
              {resource.description}
            </p>

            <div className="mt-auto space-y-3">
              <div className="flex flex-wrap gap-2">
                {resource.tags?.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-white/10 backdrop-blur-sm border border-white/30 text-white/90"
                  >
                    {tag.charAt(0).toUpperCase() + tag.slice(1)}
                  </span>
                ))}

                {resource.difficulty && (
                  <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-white/10 backdrop-blur-sm border border-white/30 text-white/90">
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
                className="inline-flex items-center text-sm sm:text-base lg:text-lg text-blue-300 hover:text-blue-200 font-medium transition-colors group/link cursor-pointer"
              >
                <span className="mr-1">Access Resource</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
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
      </div>
    );
  }
);

ResourceCard.displayName = "ResourceCard";

// Memoized category button with CSS animations
const CategoryButton = memo(
  ({
    category,
    isActive,
    onClick,
    index,
  }: {
    category: Category;
    isActive: boolean;
    onClick: () => void;
    index: number;
  }) => {
    return (
      <button
        onClick={onClick}
        className={`relative px-4 sm:px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 overflow-hidden group cursor-pointer animate-fadeIn opacity-0 ${
          isActive ? "text-white shadow-lg" : "text-white/80 hover:text-white"
        }`}
        style={{
          animationDelay: `${index * 30}ms`,
          animationFillMode: 'forwards',
        }}
      >
        <span
          className={`absolute inset-0 transition-opacity duration-200 ${
            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <span
            className={`absolute inset-0 bg-gradient-to-r ${category.color}`}
          />
        </span>

        <span
          className={`absolute inset-0 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full transition-opacity duration-200 ${
            isActive ? "opacity-0" : "opacity-100"
          }`}
        />

        <span className="relative flex items-center">
          <span className="mr-2 text-lg">{category.icon}</span>
          <span className="hidden sm:inline">{category.title}</span>
          <span className="inline sm:hidden">
            {category.id === "all" ? "All" : category.title.split(" ")[0]}
          </span>
          {isActive && (
            <span className="ml-2 h-2 w-2 bg-white rounded-full animate-scaleIn" />
          )}
        </span>
      </button>
    );
  }
);

CategoryButton.displayName = "CategoryButton";

// Optimized static background
const OptimizedBackground = memo(() => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
    <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-black" />
    <div className="absolute inset-0 bg-gradient-to-t from-blue-950/20 via-transparent to-purple-950/20" />
    
    {/* Static CSS-animated orbs */}
    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float" />
    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float-delayed" />
    <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-float-slow" />
  </div>
));

OptimizedBackground.displayName = "OptimizedBackground";

export default function ResourcesPageOptimized() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showEmergencySupport, setShowEmergencySupport] = useState<boolean>(false);
  const [showVideo, setShowVideo] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");

  // Debounce search input for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Categories - memoized
  const categories = useMemo<Category[]>(
    () => [
      {
        id: "all",
        title: "All Resources",
        description: "Browse our complete collection",
        icon: "🔍",
        color: "from-purple-500 to-purple-600",
      },
      {
        id: "communication",
        title: "Communication",
        description: "Tools to improve dialogue",
        icon: "💬",
        color: "from-blue-500 to-blue-600",
      },
      {
        id: "conflict",
        title: "Conflict Resolution",
        description: "Navigate disagreements",
        icon: "🤝",
        color: "from-amber-500 to-amber-600",
      },
      {
        id: "intimacy",
        title: "Intimacy & Connection",
        description: "Deepen emotional bonds",
        icon: "❤️",
        color: "from-rose-500 to-rose-600",
      },
      {
        id: "growth",
        title: "Personal Growth",
        description: "Individual development",
        icon: "🌱",
        color: "from-green-500 to-green-600",
      },
      {
        id: "crisis",
        title: "Crisis Support",
        description: "Immediate help",
        icon: "🆘",
        color: "from-red-500 to-red-600",
      },
    ],
    []
  );

  // Resources data - memoized
  const resources = useMemo<Resource[]>(
    () => [
      {
        id: "1",
        title: "The Gottman Institute: The Four Horsemen",
        description: "Learn to identify and counteract the four communication styles that can predict the end of a relationship.",
        type: "article",
        url: "https://www.gottman.com/blog/the-four-horsemen-recognizing-criticism-contempt-defensiveness-and-stonewalling/",
        source: "The Gottman Institute",
        tags: ["communication", "conflict"],
        difficulty: "beginner",
      },
      {
        id: "2",
        title: "Active Listening Exercise for Couples",
        description: "Practice truly hearing your partner with this guided step-by-step exercise for deeper understanding.",
        type: "exercise",
        url: "https://www.therapistaid.com/therapy-worksheet/active-listening",
        source: "TherapistAid",
        tags: ["communication"],
        difficulty: "beginner",
      },
      {
        id: "3",
        title: "Emotional Intelligence Assessment",
        description: "Discover your emotional intelligence patterns and how they affect your relationships.",
        type: "exercise",
        url: "https://www.psychologytoday.com/us/tests/personality/emotional-intelligence-test",
        source: "Psychology Today",
        tags: ["intimacy", "growth"],
        difficulty: "intermediate",
      },
      // Add more resources as needed
    ],
    []
  );

  // Optimized filter function with memoization
  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      const matchesCategory =
        activeCategory === "all" ||
        (resource.tags && resource.tags.includes(activeCategory));

      const searchLower = debouncedSearchQuery.toLowerCase();
      const matchesSearch =
        !searchLower ||
        resource.title.toLowerCase().includes(searchLower) ||
        resource.description.toLowerCase().includes(searchLower) ||
        (resource.source && resource.source.toLowerCase().includes(searchLower));

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

  return (
    <>
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
        
        @keyframes scaleIn {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -30px) scale(1.05);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.95);
          }
        }
        
        @keyframes float-delayed {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(-40px, 20px) scale(1.1);
          }
          66% {
            transform: translate(20px, -40px) scale(0.9);
          }
        }
        
        @keyframes float-slow {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(25px, 25px) scale(1.15);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
        
        .animate-float {
          animation: float 30s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 25s ease-in-out infinite;
          animation-delay: 5s;
        }
        
        .animate-float-slow {
          animation: float-slow 35s ease-in-out infinite;
          animation-delay: 10s;
        }
        
        /* Performance optimizations */
        .resource-card {
          contain-intrinsic-size: auto 300px;
        }
        
        @media (prefers-reduced-motion: reduce) {
          .animate-fadeIn,
          .animate-scaleIn,
          .animate-float,
          .animate-float-delayed,
          .animate-float-slow {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-black">
        {/* Optimized static background */}
        <OptimizedBackground />

        {/* Main content */}
        <div className="relative z-10 min-h-screen backdrop-blur-sm bg-gradient-to-b from-slate-900/60 via-slate-900/70 to-slate-900/80 py-12 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="max-w-7xl mx-auto text-center mb-16">
            <div className="relative">
              <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-bold mb-6 sm:mb-8 lg:mb-10 text-white animate-fadeIn">
                Therapy Resources
              </h1>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl text-white/90 max-w-3xl lg:max-w-4xl mx-auto mb-6 sm:mb-8 lg:mb-10 leading-relaxed font-light px-4 sm:px-6 lg:px-0 animate-fadeIn" style={{ animationDelay: '100ms' }}>
                Every relationship faces challenges. You're not alone, and
                reaching out for support is a sign of strength and courage.
              </p>

              {/* Emergency Support Button */}
              <button
                onClick={() => setShowEmergencySupport(!showEmergencySupport)}
                className="group relative inline-flex items-center px-8 py-4 sm:px-10 sm:py-5 text-base font-semibold rounded-full text-white overflow-hidden transition-all duration-200 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 shadow-lg hover:shadow-xl cursor-pointer animate-fadeIn"
                style={{ animationDelay: '200ms' }}
              >
                <span className="relative flex items-center">
                  <svg
                    className="h-5 w-5 mr-3"
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
                  {showEmergencySupport ? "Hide Emergency Help" : "Need Immediate Help?"}
                </span>
              </button>
            </div>

            {/* Emergency Support Panel - Lazy loaded */}
            {showEmergencySupport && (
              <div className="mt-8 max-w-5xl mx-auto animate-fadeIn">
                <div className="relative bg-gradient-to-r from-red-500/20 to-pink-500/20 backdrop-blur-sm rounded-3xl p-1 border border-red-400/30">
                  <div className="bg-slate-900/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8">
                    <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white mb-4 sm:mb-6">
                      Immediate Support Resources
                    </h2>
                    <p className="text-red-200 mb-6 sm:mb-8 text-sm sm:text-base md:text-lg lg:text-xl">
                      If you're in danger or experiencing a crisis, please use these resources for immediate help:
                    </p>
                    {/* Emergency resources content */}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="max-w-7xl mx-auto">
            {/* Category navigation */}
            <div className="mb-12">
              <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-white mb-4 sm:mb-6 pl-1 animate-fadeIn">
                Filter by category:
              </h2>
              <div className="flex flex-wrap gap-3 sm:gap-4">
                {categories.map((category, index) => (
                  <CategoryButton
                    key={category.id}
                    category={category}
                    isActive={activeCategory === category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    index={index}
                  />
                ))}
              </div>
            </div>

            {/* Search bar */}
            <div className="mb-8">
              <div className="relative group animate-fadeIn" style={{ animationDelay: '300ms' }}>
                <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-1 border border-white/20">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search resources by keyword, topic, or source..."
                    className="w-full px-6 py-4 bg-slate-900/60 backdrop-blur-sm rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                  />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200">
                    <svg
                      className="h-6 w-6"
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
                  </button>
                </div>
              </div>
            </div>

            {/* Resource grid */}
            {filteredResources.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredResources.map((resource, index) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 animate-fadeIn">
                <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-white mb-3">
                  No resources found
                </h3>
                <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/70 mb-6">
                  Try adjusting your search or category filter to find what you're looking for.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("all");
                  }}
                  className="inline-flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-full shadow-lg hover:shadow-xl transition-colors duration-200 cursor-pointer"
                >
                  Reset Search
                </button>
              </div>
            )}
          </div>

          {/* Lazy load video section */}
          <div className="max-w-6xl mx-auto my-16">
            {!showVideo ? (
              <button
                onClick={() => setShowVideo(true)}
                className="w-full relative bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 shadow-2xl overflow-hidden group cursor-pointer animate-fadeIn"
              >
                <div className="flex items-center justify-center">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center shadow-lg">
                    <svg
                      className="h-8 w-8 text-white ml-1"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <div className="ml-6 text-left">
                    <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white">
                      Featured Video Resource
                    </h2>
                    <p className="text-sm sm:text-base lg:text-lg text-blue-200/80">
                      Click to load essential viewing for couples
                    </p>
                  </div>
                </div>
              </button>
            ) : (
              <div className="relative bg-white/10 backdrop-blur-sm rounded-3xl p-1 border border-white/20 shadow-2xl overflow-hidden animate-fadeIn">
                <div className="relative bg-slate-900/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8">
                  <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white mb-4">
                    Featured Resource
                  </h2>
                  <div className="relative rounded-xl overflow-hidden shadow-2xl">
                    <div className="relative aspect-video">
                      <iframe
                        src="https://www.youtube.com/embed/uPh4-DU6MDU"
                        title="Transformative Relationship Insights"
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}