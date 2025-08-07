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
import "./resources-performance.css";
import { VideoSection, SupportMessage, CommunityWisdom, NewsletterSignup } from "./resources-sections";

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

// Single shared IntersectionObserver for all animations
let globalObserver: IntersectionObserver | null = null;
const observerCallbacks = new WeakMap<Element, () => void>();

const getGlobalObserver = () => {
  if (!globalObserver && typeof window !== "undefined") {
    globalObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const callback = observerCallbacks.get(entry.target);
            if (callback) {
              callback();
              globalObserver?.unobserve(entry.target);
              observerCallbacks.delete(entry.target);
            }
          }
        });
      },
      { threshold: 0.1, rootMargin: "50px" }
    );
  }
  return globalObserver;
};

// Optimized intersection hook using single observer
const useOptimizedIntersection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = getGlobalObserver();
    if (!observer) return;

    observerCallbacks.set(element, () => setIsVisible(true));
    observer.observe(element);

    return () => {
      observer.unobserve(element);
      observerCallbacks.delete(element);
    };
  }, []);

  return { ref, isVisible };
};

// Ultra-optimized ResourceCard with CSS animations
const ResourceCard = memo(
  ({ resource, index }: { resource: Resource; index: number }) => {
    const { ref, isVisible } = useOptimizedIntersection();

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
        communication: "tag-blue",
        conflict: "tag-amber",
        intimacy: "tag-rose",
        growth: "tag-green",
        crisis: "tag-red",
      };
      return colorMap[primaryTag || ""] || "tag-blue";
    }, [resource.tags]);

    return (
      <div
        ref={ref}
        className={`resource-card ${isVisible ? "visible" : ""} ${tagColorClass}`}
        style={{
          "--animation-delay": `${index * 30}ms`,
        } as React.CSSProperties}
      >
        {/* Simple glow effect - CSS only */}
        <div className="card-glow" />

        {/* Card container with containment */}
        <div className="card-content">
          {/* Top accent bar */}
          <div className="card-accent" />

          <div className="card-body">
            <div className="card-header">
              <div className={`card-icon ${tagColorClass}`}>
                <span>{getTypeIcon(resource.type)}</span>
              </div>
              <div className="card-title-group">
                <h3 className="card-title">{resource.title}</h3>
                {resource.source && (
                  <p className="card-source">Source: {resource.source}</p>
                )}
              </div>
            </div>

            <p className="card-description">{resource.description}</p>

            <div className="card-footer">
              <div className="card-tags">
                {resource.tags?.slice(0, 3).map((tag) => (
                  <span key={tag} className="tag">
                    {tag.charAt(0).toUpperCase() + tag.slice(1)}
                  </span>
                ))}

                {resource.difficulty && (
                  <span className="tag difficulty">
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
                className="card-link"
              >
                <span>Access Resource</span>
                <svg
                  className="link-icon"
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
      </div>
    );
  }
);

ResourceCard.displayName = "ResourceCard";

// Optimized category button with CSS animations
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
    const { ref, isVisible } = useOptimizedIntersection();

    return (
      <button
        ref={ref}
        onClick={onClick}
        className={`category-btn ${isActive ? "active" : ""} ${isVisible ? "visible" : ""} ${category.color}`}
        style={{
          "--animation-delay": `${index * 30}ms`,
        } as React.CSSProperties}
      >
        <span className="btn-background" />
        <span className="btn-content">
          <span className="btn-icon">{category.icon}</span>
          <span className="btn-text-full">{category.title}</span>
          <span className="btn-text-short">
            {category.id === "all" ? "All" : category.title.split(" ")[0]}
          </span>
          {isActive && <span className="btn-indicator" />}
        </span>
      </button>
    );
  }
);

CategoryButton.displayName = "CategoryButton";

export default function ResourcesOptimized() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showEmergencySupport, setShowEmergencySupport] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"search" | "results">("search");
  const [isMobile, setIsMobile] = useState(false);

  // Categories - memoized
  const categories = useMemo<Category[]>(
    () => [
      {
        id: "all",
        title: "All Resources",
        description: "Browse our complete collection",
        icon: "🔍",
        color: "cat-purple",
      },
      {
        id: "communication",
        title: "Communication",
        description: "Tools to improve dialogue",
        icon: "💬",
        color: "cat-blue",
      },
      {
        id: "conflict",
        title: "Conflict Resolution",
        description: "Navigate disagreements",
        icon: "🤝",
        color: "cat-amber",
      },
      {
        id: "intimacy",
        title: "Intimacy & Connection",
        description: "Deepen emotional bonds",
        icon: "❤️",
        color: "cat-rose",
      },
      {
        id: "growth",
        title: "Personal Growth",
        description: "Individual development",
        icon: "🌱",
        color: "cat-green",
      },
      {
        id: "crisis",
        title: "Crisis Support",
        description: "Immediate help",
        icon: "🆘",
        color: "cat-red",
      },
    ],
    []
  );

  // Resources - memoized
  const resources = useMemo<Resource[]>(
    () => [
      {
        id: "1",
        title: "The Gottman Institute: The Four Horsemen",
        description:
          "Learn to identify and counteract the four communication styles that can predict the end of a relationship.",
        type: "article",
        url: "https://www.gottman.com/blog/the-four-horsemen-recognizing-criticism-contempt-defensiveness-and-stonewalling/",
        source: "The Gottman Institute",
        tags: ["communication", "conflict"],
        difficulty: "beginner",
      },
      {
        id: "2",
        title: "Active Listening Exercise for Couples",
        description:
          "Practice truly hearing your partner with this guided step-by-step exercise for deeper understanding.",
        type: "exercise",
        url: "https://www.therapistaid.com/therapy-worksheet/active-listening",
        source: "TherapistAid",
        tags: ["communication"],
        difficulty: "beginner",
      },
      {
        id: "3",
        title: "Emotional Intelligence Assessment",
        description:
          "Discover your emotional intelligence patterns and how they affect your relationships.",
        type: "exercise",
        url: "https://www.psychologytoday.com/us/tests/personality/emotional-intelligence-test",
        source: "Psychology Today",
        tags: ["intimacy", "growth"],
        difficulty: "intermediate",
      },
      {
        id: "4",
        title: "The 5 Love Languages Online Quiz",
        description:
          "Find out how you and your partner express and receive love with this popular assessment.",
        type: "exercise",
        url: "https://5lovelanguages.com/quizzes/love-language",
        source: "The 5 Love Languages",
        tags: ["intimacy", "communication"],
        difficulty: "beginner",
      },
      {
        id: "5",
        title: "Nonviolent Communication Basics",
        description:
          "Learn the fundamentals of expressing needs and feelings without blame or criticism.",
        type: "article",
        url: "https://www.cnvc.org/learn-nvc/what-is-nvc",
        source: "Center for Nonviolent Communication",
        tags: ["communication", "conflict"],
        difficulty: "intermediate",
      },
      // Add more resources as needed...
    ],
    []
  );

  // Emergency resources - memoized
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

  // Filtered resources
  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      const matchesCategory =
        activeCategory === "all" ||
        (resource.tags && resource.tags.includes(activeCategory));

      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        resource.title.toLowerCase().includes(searchLower) ||
        resource.description.toLowerCase().includes(searchLower) ||
        (resource.source &&
          resource.source.toLowerCase().includes(searchLower));

      return matchesCategory && matchesSearch;
    });
  }, [resources, activeCategory, searchQuery]);

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

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Enable View Transitions API if available
  useEffect(() => {
    if ("startViewTransition" in document) {
      document.documentElement.classList.add("view-transitions");
    }
  }, []);

  return (
    <div className="resources-container">
      {/* Optimized background */}
      <Suspense fallback={<div className="background-fallback" />}>
        <div className="background-layer">
          <TherapeuticBokehBackground />
        </div>
      </Suspense>

      {/* Simplified gradient overlay */}
      <div className="gradient-overlay" />

      {/* Main content */}
      <div className="resources-content">
        {/* Mobile tabs */}
        {isMobile && (
          <div className="mobile-tabs">
            <div className="tabs-container">
              <button
                onClick={() => setActiveTab("search")}
                className={`tab ${activeTab === "search" ? "active" : ""}`}
              >
                <svg className="tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </button>
              <button
                onClick={() => setActiveTab("results")}
                className={`tab ${activeTab === "results" ? "active" : ""}`}
              >
                <svg className="tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Resources {filteredResources.length > 0 && `(${filteredResources.length})`}
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className={`header-section ${isMobile && activeTab === "results" ? "hidden" : ""}`}>
          <div className="header-content">
            <div className="header-blur" />
            <div className="header-text">
              <h1 className="page-title">
                <span>Therapy</span>
                <br />
                <span>Resources</span>
              </h1>
              <p className="page-subtitle">
                Every relationship faces challenges. You're not alone, and
                reaching out for support is a{" "}
                <span className="highlight">sign of strength</span> and courage.
              </p>
            </div>

            {/* Emergency Support Button */}
            <button
              onClick={handleEmergencySupportToggle}
              className="emergency-btn"
            >
              <svg className="emergency-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {showEmergencySupport ? "Hide Emergency Help" : "Need Immediate Help?"}
            </button>
          </div>

          {/* Emergency Support Panel */}
          {showEmergencySupport && (
            <div className="emergency-panel">
              <div className="emergency-content">
                <h2 className="emergency-title">
                  <svg className="emergency-icon-large" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Immediate Support Resources
                </h2>
                <p className="emergency-subtitle">
                  If you're in danger or experiencing a crisis, please use these resources for immediate help:
                </p>

                <div className="emergency-grid">
                  {emergencyResources.map((resource, index) => (
                    <div
                      key={index}
                      className="emergency-card"
                      style={{ "--animation-delay": `${index * 100}ms` } as React.CSSProperties}
                    >
                      <h3>{resource.title}</h3>
                      <p className="emergency-phone">{resource.phone}</p>
                      <a href={resource.website} target="_blank" rel="noopener noreferrer" className="emergency-link">
                        Visit Website
                        <svg className="link-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                      <p className="emergency-description">{resource.description}</p>
                    </div>
                  ))}
                </div>

                <div className="emergency-warning">
                  <svg className="warning-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>
                    <strong>In case of immediate danger:</strong> Call emergency services (911 in the US) if you or someone you know is in immediate danger.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Featured Video Section */}
        <VideoSection />

        {/* Main content area */}
        <div className="main-content">
          <div className={`${isMobile ? (activeTab === "search" ? "block" : "hidden") : "block"}`}>
            {/* Category navigation */}
            <div className="categories-section">
              <h2 className="section-title">Filter by category:</h2>
              <div className="categories-grid">
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
            <div className="search-section">
              <div className="search-container">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search resources by keyword, topic, or source..."
                  className="search-input"
                />
                <button
                  className="search-button"
                  onClick={() => {
                    if (isMobile && filteredResources.length > 0) {
                      setActiveTab("results");
                    }
                  }}
                >
                  <svg className="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Resource grid */}
          <div className={`${isMobile ? (activeTab === "results" ? "block" : "hidden") : "block"}`}>
            {isMobile && activeTab === "results" && (
              <div className="results-header">
                <button
                  onClick={() => setActiveTab("search")}
                  className="back-button"
                >
                  <svg className="back-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Search
                </button>
                <span className="results-count">
                  {filteredResources.length} {filteredResources.length === 1 ? "result" : "results"}
                </span>
              </div>
            )}

            {filteredResources.length > 0 ? (
              <div className="resources-grid">
                {filteredResources.map((resource, index) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className="no-results">
                <div className="no-results-content">
                  <span className="no-results-icon">🔍</span>
                  <h3>No resources found</h3>
                  <p>Try adjusting your search or category filter to find what you're looking for.</p>
                  <button onClick={handleResetSearch} className="reset-button">
                    <svg className="reset-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset Search
                  </button>
                </div>
              </div>
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
  );
}