"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import "./resources-performance.css";

// Optimized Video Section Component
export const VideoSection = memo(() => {
  return (
    <div className="video-section">
      <div className="video-card">
        <div className="video-content">
          <div className="video-header">
            <div className="video-icon-wrapper">
              <svg className="video-icon" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23 7l-7 5 7 5V7z" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
            <div className="video-title-group">
              <h2 className="video-title">Featured Resource</h2>
              <p className="video-subtitle">Essential viewing for couples</p>
            </div>
          </div>
          <p className="video-description">
            Discover powerful insights on building lasting relationships
            through this transformative talk that has helped millions of
            couples worldwide.
          </p>

          <div className="video-container">
            <div className="video-wrapper">
              <iframe
                src="https://www.youtube.com/embed/uPh4-DU6MDU"
                title="Transformative Relationship Insights"
                className="video-iframe"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>

          <div className="video-details">
            <div className="video-detail-card">
              <h3 className="detail-title">Key Topics</h3>
              <ul className="detail-list">
                <li><span className="check-icon">✓</span>Communication strategies</li>
                <li><span className="check-icon">✓</span>Building trust & intimacy</li>
                <li><span className="check-icon">✓</span>Conflict resolution</li>
              </ul>
            </div>
            <div className="video-detail-card">
              <h3 className="detail-title">Perfect For</h3>
              <ul className="detail-list">
                <li><span className="bullet">•</span>Couples at any stage</li>
                <li><span className="bullet">•</span>Relationship counselors</li>
                <li><span className="bullet">•</span>Anyone seeking growth</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

VideoSection.displayName = "VideoSection";

// Optimized Support Message Component
export const SupportMessage = memo(() => {
  return (
    <div className="support-section">
      <div className="support-card">
        <div className="support-content">
          <h2 className="support-title">
            <svg className="support-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
            Need Personalized Support?
          </h2>
          <p className="support-text">
            While these resources are helpful, sometimes you need professional
            guidance tailored to your unique situation. Our trained therapists
            are ready to support you and your partner.
          </p>
          <div className="support-actions">
            <Link href="/schedule" className="action-btn primary">
              <svg className="action-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Schedule a Session
            </Link>
            <Link href="/dashboard/therapy" className="action-btn secondary">
              <svg className="action-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 107.072 0m-9.9 2.828a9 9 0 0112.728 0" />
              </svg>
              Start Voice Session
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
});

SupportMessage.displayName = "SupportMessage";

// Optimized Community Wisdom Component
export const CommunityWisdom = memo(() => {
  const wisdomItems = useMemo(
    () => [
      {
        icon: "❤️‍🩹",
        title: "Healing Takes Time",
        quote:
          "Rebuilding trust is a process, not an event. Be patient with yourselves and each other as you heal.",
        source: "From a couple married 27 years",
        color: "wisdom-blue",
      },
      {
        icon: "🌱",
        title: "Growth Together",
        quote:
          "The strongest relationships aren't those without problems, but those where couples grow by facing challenges together.",
        source: "From couples therapy group",
        color: "wisdom-green",
      },
      {
        icon: "🔄",
        title: "Daily Practice",
        quote:
          "Small daily acts of appreciation and connection matter more than grand gestures. Consistency builds security.",
        source: "Relationship counselors",
        color: "wisdom-amber",
      },
    ],
    []
  );

  return (
    <div className="wisdom-section">
      <h2 className="wisdom-title">
        <svg className="wisdom-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M12 8v13m0-13h4m-4 0H8m4-6.5v.5m0 7v.5m0-8.75C11.667 2.732 11 2.232 10 2h4c-.667.732-1 1.232-1 1.75z" />
        </svg>
        Community Wisdom
      </h2>
      <div className="wisdom-grid">
        {wisdomItems.map((item, index) => (
          <div
            key={index}
            className={`wisdom-card ${item.color}`}
            style={{ "--animation-delay": `${index * 100}ms` } as React.CSSProperties}
          >
            <div className="wisdom-header">
              <div className="wisdom-icon-wrapper">
                {item.icon}
              </div>
              <h3 className="wisdom-item-title">{item.title}</h3>
            </div>
            <p className="wisdom-quote">&ldquo;{item.quote}&rdquo;</p>
            <p className="wisdom-source">— {item.source}</p>
          </div>
        ))}
      </div>
    </div>
  );
});

CommunityWisdom.displayName = "CommunityWisdom";

// Optimized Newsletter Signup Component
export const NewsletterSignup = memo(() => {
  return (
    <div className="newsletter-section">
      <div className="newsletter-card">
        <div className="newsletter-content">
          <div className="newsletter-text">
            <h3 className="newsletter-title">Weekly Relationship Insights</h3>
            <p className="newsletter-subtitle">
              Join our community for expert tips and supportive guidance.
            </p>
          </div>
          <div className="newsletter-form">
            <div className="form-group">
              <input
                type="email"
                placeholder="Your email"
                className="email-input"
              />
              <button className="subscribe-btn">Subscribe</button>
            </div>
            <p className="privacy-text">
              We respect your privacy. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

NewsletterSignup.displayName = "NewsletterSignup";