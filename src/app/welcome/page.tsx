"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Spotlight } from "@/components/ui/spotlight-new";
import GlassCard from "@/components/ui/glass-card";
import { useSession } from "next-auth/react";
import ButtonWithSound from "@/components/ButtonWithSound";
import ConfettiAnimation from "@/components/ui/confetti-animation";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import RelationshipAssessment from "@/components/RelationshipAssessment";
import OnboardingSuccessSplash from "@/components/OnboardingSuccessSplash";
import { usePersistentOnboarding } from "@/hooks/usePersistentOnboarding";
// Removed scroll-utils import - using direct container scrolling instead

interface FormStep {
  id: number;
  title: string;
  subtitle: string;
  fields: FormField[];
}

interface FormField {
  name: string;
  label: string;
  type: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  helperWords?: string[];
}

// Comprehensive relationship options for more precise family relationships
const relationshipOptions = [
  // Children
  { value: "son", label: "Son" },
  { value: "daughter", label: "Daughter" },
  { value: "child", label: "Child (non-binary)" },

  // Parents
  { value: "mother", label: "Mother" },
  { value: "father", label: "Father" },
  { value: "parent", label: "Parent (non-binary)" },

  // Siblings
  { value: "brother", label: "Brother" },
  { value: "sister", label: "Sister" },
  { value: "sibling", label: "Sibling (non-binary)" },

  // Grandparents
  { value: "grandmother", label: "Grandmother" },
  { value: "grandfather", label: "Grandfather" },
  { value: "grandparent", label: "Grandparent (non-binary)" },

  // Grandchildren
  { value: "grandson", label: "Grandson" },
  { value: "granddaughter", label: "Granddaughter" },
  { value: "grandchild", label: "Grandchild (non-binary)" },

  // Step-family
  { value: "stepson", label: "Stepson" },
  { value: "stepdaughter", label: "Stepdaughter" },
  { value: "stepchild", label: "Stepchild (non-binary)" },
  { value: "stepmother", label: "Stepmother" },
  { value: "stepfather", label: "Stepfather" },
  { value: "stepparent", label: "Stepparent (non-binary)" },
  { value: "stepbrother", label: "Stepbrother" },
  { value: "stepsister", label: "Stepsister" },
  { value: "stepsibling", label: "Stepsibling (non-binary)" },

  // Extended family
  { value: "aunt", label: "Aunt" },
  { value: "uncle", label: "Uncle" },
  { value: "cousin", label: "Cousin" },
  { value: "niece", label: "Niece" },
  { value: "nephew", label: "Nephew" },

  // Other relationships
  { value: "friend", label: "Close Friend" },
  { value: "other", label: "Other" },
];

const formSteps: FormStep[] = [
  {
    id: 1,
    title: "Welcome! Let's get to know you",
    subtitle: "Tell us a bit about yourself",
    fields: [
      {
        name: "nickname",
        label: "What should we call you?",
        type: "text",
        placeholder: "Your preferred name",
        required: true,
      },
      {
        name: "age",
        label: "Your age",
        type: "number",
        placeholder: "Your age",
        required: true,
      },
      {
        name: "pronouns",
        label: "Your pronouns",
        type: "select",
        options: [
          { value: "he/him", label: "He/Him" },
          { value: "she/her", label: "She/Her" },
          { value: "they/them", label: "They/Them" },
          { value: "other", label: "Other" },
        ],
      },
    ],
  },
  {
    id: 2,
    title: "Your relationships",
    subtitle: "Tell us about your loved ones",
    fields: [
      {
        name: "relationshipStatus",
        label: "Relationship status (if applicable)",
        type: "select",
        options: [
          { value: "Single", label: "Single" },
          { value: "Dating", label: "Dating" },
          { value: "Engaged", label: "Engaged" },
          { value: "Married", label: "Married" },
          { value: "Divorced", label: "Divorced" },
          { value: "Widowed", label: "Widowed" },
          { value: "Separated", label: "Separated" },
          { value: "Other", label: "Other" },
        ],
      },
      {
        name: "partnerName",
        label: "Partner's name (if applicable)",
        type: "text",
        placeholder: "Their name",
        required: false,
      },
      {
        name: "partnerAge",
        label: "Partner's age (if applicable)",
        type: "number",
        placeholder: "Their age",
        required: false,
      },
      {
        name: "hasFamily",
        label: "Do you have family?",
        type: "family_toggle",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
      {
        name: "familyMemberCount",
        label: "How many family members would you like to add?",
        type: "select",
        options: [
          { value: "1", label: "1 family member" },
          { value: "2", label: "2 family members" },
          { value: "3", label: "3 family members" },
          { value: "4", label: "4 family members" },
          { value: "5", label: "5 family members" },
          { value: "6", label: "6 family members" },
          { value: "7", label: "7 family members" },
        ],
      },
      {
        name: "familyMember1",
        label: "Family member 1",
        type: "text",
        placeholder: "Name",
        required: false,
      },
      {
        name: "familyMember1Relation",
        label: "Relationship to you",
        type: "select",
        options: relationshipOptions,
        required: false,
      },
      {
        name: "familyMember1Age",
        label: "Age of family member 1",
        type: "number",
        placeholder: "Age",
        required: false,
      },
      {
        name: "familyMember2",
        label: "Family member 2",
        type: "text",
        placeholder: "Name",
        required: false,
      },
      {
        name: "familyMember2Relation",
        label: "Relationship to you",
        type: "select",
        options: relationshipOptions,
        required: false,
      },
      {
        name: "familyMember2Age",
        label: "Age of family member 2",
        type: "number",
        placeholder: "Age",
        required: false,
      },
      {
        name: "familyMember3",
        label: "Family member 3",
        type: "text",
        placeholder: "Name",
        required: false,
      },
      {
        name: "familyMember3Relation",
        label: "Relationship to you",
        type: "select",
        options: relationshipOptions,
        required: false,
      },
      {
        name: "familyMember3Age",
        label: "Age of family member 3",
        type: "number",
        placeholder: "Age",
        required: false,
      },
      {
        name: "familyMember4",
        label: "Family member 4",
        type: "text",
        placeholder: "Name",
        required: false,
      },
      {
        name: "familyMember4Relation",
        label: "Relationship to you",
        type: "select",
        options: relationshipOptions,
        required: false,
      },
      {
        name: "familyMember4Age",
        label: "Age of family member 4",
        type: "number",
        placeholder: "Age",
        required: false,
      },
      {
        name: "familyMember5",
        label: "Family member 5",
        type: "text",
        placeholder: "Name",
        required: false,
      },
      {
        name: "familyMember5Relation",
        label: "Relationship to you",
        type: "select",
        options: relationshipOptions,
        required: false,
      },
      {
        name: "familyMember5Age",
        label: "Age of family member 5",
        type: "number",
        placeholder: "Age",
        required: false,
      },
      {
        name: "familyMember6",
        label: "Family member 6",
        type: "text",
        placeholder: "Name",
        required: false,
      },
      {
        name: "familyMember6Relation",
        label: "Relationship to you",
        type: "select",
        options: relationshipOptions,
        required: false,
      },
      {
        name: "familyMember6Age",
        label: "Age of family member 6",
        type: "number",
        placeholder: "Age",
        required: false,
      },
      {
        name: "familyMember7",
        label: "Family member 7",
        type: "text",
        placeholder: "Name",
        required: false,
      },
      {
        name: "familyMember7Relation",
        label: "Relationship to you",
        type: "select",
        options: relationshipOptions,
        required: false,
      },
      {
        name: "familyMember7Age",
        label: "Age of family member 7",
        type: "number",
        placeholder: "Age",
        required: false,
      },
    ],
  },
  {
    id: 3,
    title: "Your therapy goals",
    subtitle: "What brings you here today?",
    fields: [
      {
        name: "goals",
        label: "What would you like to work on? (Select all that apply)",
        type: "multiselect",
        options: [
          { value: "anxiety", label: "Anxiety & Panic" },
          { value: "depression", label: "Depression & Mood" },
          { value: "relationships", label: "Relationship Issues" },
          { value: "communication", label: "Communication Skills" },
          { value: "conflict", label: "Conflict Resolution" },
          { value: "intimacy", label: "Intimacy & Connection" },
          { value: "trust", label: "Trust & Betrayal" },
          { value: "stress", label: "Stress Management" },
          { value: "self-esteem", label: "Self-esteem & Confidence" },
          { value: "grief", label: "Grief & Loss" },
          { value: "trauma", label: "Trauma & PTSD" },
          { value: "family-dynamics", label: "Family Dynamics" },
          { value: "parenting", label: "Parenting Challenges" },
          { value: "work-life", label: "Work-Life Balance" },
          { value: "addiction", label: "Addiction & Recovery" },
          { value: "anger", label: "Anger Management" },
          { value: "life-transitions", label: "Life Transitions" },
          { value: "other", label: "Other" },
        ],
      },
    ],
  },
  {
    id: 4,
    title: "Your preferences",
    subtitle: "Help us personalize your experience",
    fields: [
      {
        name: "sessionTime",
        label: "When do you prefer to have sessions?",
        type: "select",
        options: [
          { value: "morning", label: "Morning (6 AM - 12 PM)" },
          { value: "afternoon", label: "Afternoon (12 PM - 5 PM)" },
          { value: "evening", label: "Evening (5 PM - 9 PM)" },
          { value: "flexible", label: "Flexible" },
        ],
      },
      {
        name: "preferredDays",
        label: "Which days work best for you? (Select all that apply)",
        type: "multiselect",
        options: [
          { value: "monday", label: "Monday" },
          { value: "tuesday", label: "Tuesday" },
          { value: "wednesday", label: "Wednesday" },
          { value: "thursday", label: "Thursday" },
          { value: "friday", label: "Friday" },
          { value: "saturday", label: "Saturday" },
          { value: "sunday", label: "Sunday" },
        ],
      },
      {
        name: "sessionFrequency",
        label: "How often would you like to have sessions?",
        type: "select",
        options: [
          { value: "daily", label: "Daily" },
          { value: "weekly", label: "Weekly" },
          { value: "biweekly", label: "Every two weeks" },
          { value: "monthly", label: "Monthly" },
          { value: "as-needed", label: "As needed" },
        ],
      },
      {
        name: "recurringSession",
        label: "Would you like to set up recurring sessions?",
        type: "select",
        options: [
          { value: "yes", label: "Yes, I prefer regular sessions" },
          { value: "no", label: "No, I'll schedule as I go" },
        ],
      },
      {
        name: "communicationStyle",
        label: "How do you prefer to communicate?",
        type: "select",
        options: [
          { value: "direct", label: "Direct and straightforward" },
          { value: "gentle", label: "Gentle and supportive" },
          { value: "balanced", label: "Balanced approach" },
        ],
      },
      {
        name: "phone",
        label: "Phone number (for SMS notifications)",
        type: "tel",
        placeholder: "(555) 123-4567",
        required: false,
      },
      {
        name: "notificationPrefs",
        label: "How would you like to receive session reminders?",
        type: "multiselect",
        options: [
          { value: "email", label: "Email reminders" },
          { value: "sms", label: "SMS text reminders" },
          { value: "none", label: "No reminders" },
        ],
        required: true,
      },
      {
        name: "smsConsent",
        label: "SMS Consent Agreement",
        type: "consent",
        placeholder: "By checking this box, I consent to receive automated text messages from TherapyAI at the phone number provided. Message and data rates may apply. Reply STOP to opt out at any time. Reply HELP for help.",
        required: false,
      },
      {
        name: "reminderTiming",
        label: "When would you like to receive reminders?",
        type: "select",
        options: [
          { value: "1day", label: "24 hours before" },
          { value: "2days", label: "48 hours before" },
          { value: "1week", label: "1 week before" },
          { value: "both", label: "Both 24 hours and 1 hour before" },
        ],
      },
    ],
  },
  {
    id: 5,
    title: "Tell us about yourself",
    subtitle: "Help your AI therapist understand you better",
    fields: [
      {
        name: "aboutYourself",
        label: "What would you like your AI therapist to know about you?",
        type: "enhanced_textarea",
        placeholder: "Share anything that helps us understand you better - your background, experiences, hopes, or what brings you here...",
        helperWords: [
          // Starting therapy & initial concerns
          "I've been feeling concerned about myself lately and think it's time to talk to someone.",
          "I'm here because I can't manage it on my own anymore, and I want professional support.",
          "I've never done therapy before, but I'm willing to try because things aren't getting better on their own.",
          "I'm feeling down today, and recently I went through something that really affected me.",
          
          // Mental health struggles
          "I've been experiencing difficulty falling asleep and staying asleep, and my mood has been depressed most days.",
          "I've been struggling with the same patterns in my relationships and don't know how to break them.",
          "My thoughts keep racing, and I can't seem to quiet my mind.",
          "I feel like I'm constantly overwhelmed and nothing I do helps me feel better.",
          
          // Life events & current situation
          "I lost someone important to me, and I don't know how to process this grief.",
          "My relationship ended recently, and I'm struggling to understand what went wrong.",
          "I've been going through a major life transition and want someone to help me cope with the change.",
          "Something happened in my past that I've never talked about, and it's affecting me now.",
          
          // Goals & personal growth
          "I want to work on expressing my emotions more openly instead of keeping everything inside.",
          "I need to learn how to say no without feeling guilty all the time.",
          "I want to understand why I keep repeating the same unhealthy patterns in my relationships.",
          "I'd like to build more confidence and stop being so hard on myself.",
          "I want to work on setting better boundaries with my family and friends.",
          
          // Personal challenges
          "I feel like I'm always taking care of everyone else but neglecting my own needs.",
          "I've been experiencing panic attacks, and they're starting to interfere with my daily life.",
          "I struggle with perfectionism, and it's exhausting trying to do everything perfectly.",
          "I find it hard to trust people, and I think it's keeping me from having close relationships.",
          "I've been feeling disconnected from myself and don't know who I am anymore.",
          "I want to heal from my past so it stops affecting my present and future relationships.",
        ],
      },
      {
        name: "additionalNotes",
        label: "Anything else you'd like us to know?",
        type: "textarea",
        placeholder: "Feel free to share any additional information...",
      },
    ],
  },
  {
    id: 6,
    title: "Relationship Assessment",
    subtitle: "Help us understand your communication dynamics better",
    fields: [], // We'll use a custom component for this step
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const {
    currentStep,
    formData,
    selectedOptions,
    assessmentResults,
    isLoaded,
    setCurrentStep,
    setFormData,
    setSelectedOptions,
    setAssessmentResults,
    clearOnboardingState,
    hasExistingProgress,
  } = usePersistentOnboarding();
  const [loading, setLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showSplashScreen, setShowSplashScreen] = useState(false);

  useEffect(() => {
    // Redirect immediately if unauthenticated
    if (status === "unauthenticated") {
      router.replace("/auth/login");
      return;
    }

    // If authenticated, check onboarding status
    if (status === "authenticated" && session?.user?.email) {
      // Check localStorage first as a quick check
      const localOnboardingKey = `onboarding_completed_${session.user.email}`;
      const localOnboardingCompleted = localStorage.getItem(localOnboardingKey);

      if (localOnboardingCompleted === "true") {
        // Double-check with backend, but don't block on errors
        fetch("/api/user/profile")
          .then((res) => {
            if (res.status === 401) {
              // Stale session - clear local storage and redirect to login
              console.log("Stale session detected, clearing cache and redirecting to login");
              localStorage.removeItem(localOnboardingKey);
              router.replace("/auth/login");
              return null;
            }
            return res.json();
          })
          .then((data) => {
            if (!data) return; // Handle case where we redirected due to 401
            
            // Check if user hasn't seen intro yet
            if (!data.hasSeenIntro) {
              router.replace("/intro");
              return;
            }
            if (data.onboardingCompleted || data.onboardingData) {
              router.replace("/");
            } else {
              // Local storage says completed but backend doesn't, clear local storage
              localStorage.removeItem(localOnboardingKey);
              setCheckingOnboarding(false);
            }
          })
          .catch((error) => {
            console.error("Error checking onboarding status:", error);
            // On error, redirect to login to be safe
            router.replace("/auth/login");
          });
      } else {
        // No local storage record, check backend
        fetch("/api/user/profile")
          .then((res) => {
            if (res.status === 401) {
              // Stale session - redirect to login
              console.log("Stale session detected, redirecting to login");
              router.replace("/auth/login");
              return;
            }
            if (!res.ok && res.status !== 500) {
              throw new Error(`Error fetching profile: ${res.status}`);
            }
            return res.json();
          })
          .then((data) => {
            if (!data) return; // Handle case where we redirected due to 401
            
            // Check if user hasn't seen intro yet
            if (!data.hasSeenIntro) {
              router.replace("/intro");
              return;
            }
            if (data.onboardingCompleted) {
              // Update local storage
              localStorage.setItem(localOnboardingKey, "true");
              router.replace("/");
            } else {
              setCheckingOnboarding(false);
            }
          })
          .catch((error) => {
            console.error("Error fetching profile:", error);
            // On error, redirect to login to be safe
            router.replace("/auth/login");
          });
      }
    }
  }, [status, router, session]);

  // Handle scroll to top when step changes - immediate and reliable
  useEffect(() => {
    // Find the scrollable container and scroll it to top
    const scrollContainer = document.querySelector(
      ".welcome-page .overflow-y-auto"
    );
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }

    // Also try to scroll the window as fallback
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [currentStep]);

  // Scroll to top when component mounts (user navigated to this page)
  useEffect(() => {
    // Find the scrollable container and scroll it to top
    const scrollContainer = document.querySelector(
      ".welcome-page .overflow-y-auto"
    );
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }

    // Also try to scroll the window as fallback
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const handleInputChange = (name: string, value: string) => {
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleMultiSelectChange = (name: string, value: string) => {
    const current = selectedOptions[name] || [];
    let updated: string[];

    if (current.includes(value)) {
      updated = current.filter((v) => v !== value);
    } else {
      updated = [...current, value];
    }

    setSelectedOptions((prevOptions) => ({ ...prevOptions, [name]: updated }));
    setFormData((prevData) => ({ ...prevData, [name]: updated }));
  };

  // Check if the current step has all required fields filled
  const isCurrentStepValid = () => {
    if (currentStep === 0) {
      // Step 1 (index 0)
      // Check if nickname and age are filled (trim whitespace and check for meaningful values)
      const nickname = formData.nickname?.trim();
      const age = formData.age?.toString().trim();
      const isValid =
        !!(nickname && nickname.length > 0) && !!(age && parseInt(age) > 0);
      return isValid;
    }
    return true; // Other steps don't have validation yet
  };

  const handleNext = async () => {
    if (!isCurrentStepValid()) {
      // Show tooltip if step 1 is not valid
      setShowTooltip(true);
      // Hide tooltip after 3 seconds
      setTimeout(() => {
        setShowTooltip(false);
      }, 3000);
      return;
    }

    // Scroll the container to top
    const scrollContainer = document.querySelector(
      ".welcome-page .overflow-y-auto"
    );
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }

    if (currentStep < formSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = async () => {
    if (currentStep > 0) {
      // Scroll the container to top
      const scrollContainer = document.querySelector(
        ".welcome-page .overflow-y-auto"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = 0;
      }
      setCurrentStep(currentStep - 1);
    }
  };

  // Handler for assessment results
  const handleAssessmentResults = (results: any[]) => {
    setAssessmentResults(results);

    // Convert assessment results to the format expected by the API
    const assessmentData = results.reduce(
      (acc, item) => {
        acc[`${item.category}Score`] = Math.round(item.average * 20); // Scale to 0-100
        return acc;
      },
      {} as Record<string, number>
    );

    // Add assessment data to form data
    setFormData((prevData) => ({
      ...prevData,
      assessmentResults: assessmentData,
    }));
  };

  // Handler for users not in a relationship who want to skip assessment
  const handleSkipAssessment = () => {
    // Set empty assessment results with zero scores
    const emptyResults = {
      communicationScore: 0,
      trustScore: 0,
      intimacyScore: 0,
      conflictScore: 0,
    };

    // Add empty assessment data to form data
    setFormData((prevData) => ({
      ...prevData,
      assessmentResults: emptyResults,
      relationshipStatus: prevData.relationshipStatus || "Single",
      skipAssessmentReason: "Not in a relationship",
    }));

    // Set assessment results to a non-empty array so the button becomes enabled
    setAssessmentResults([{ category: "skipped", average: 0 }]);
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Save user preferences to the database
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      // Always consider onboarding successful if we get a response (even 500)
      // This prevents users from getting stuck in onboarding due to database issues
      if (response.ok || response.status === 500) {
        // Mark onboarding as completed in localStorage
        if (session?.user?.email) {
          const localOnboardingKey = `onboarding_completed_${session.user.email}`;
          localStorage.setItem(localOnboardingKey, "true");

          // Also store the form data locally as backup
          localStorage.setItem(
            `onboarding_data_${session.user.email}`,
            JSON.stringify(formData)
          );
        }

        // If assessment results exist, also save them separately
        if (assessmentResults.length > 0) {
          try {
            const assessmentResponse = await fetch(
              "/api/dashboard/save-assessment",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  date: new Date().toISOString(),
                  results: formData.assessmentResults,
                }),
              }
            );

            if (!assessmentResponse.ok) {
              console.error(
                "Error saving assessment results, but continuing anyway"
              );
            }
          } catch (assessmentError) {
            console.error("Error saving assessment:", assessmentError);
            // Continue anyway
          }
        }

        // Clear persistent onboarding state since we're completing
        clearOnboardingState();

        // Show confetti animation
        setShowConfetti(true);

        // Show splash screen instead of immediately redirecting
        setTimeout(() => {
          setShowSplashScreen(true);
        }, 1000);
      } else {
        // Only show error for non-500 errors
        console.error("Unexpected error during onboarding:", response.status);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      // Even on network errors, complete onboarding to prevent user from being stuck
      if (session?.user?.email) {
        const localOnboardingKey = `onboarding_completed_${session.user.email}`;
        localStorage.setItem(localOnboardingKey, "true");
        localStorage.setItem(
          `onboarding_data_${session.user.email}`,
          JSON.stringify(formData)
        );
      }

      // Clear persistent onboarding state even on error
      clearOnboardingState();

      // Show success anyway
      setShowConfetti(true);
      setTimeout(() => {
        setShowSplashScreen(true);
      }, 1000);
    }
  };

  // Handle completion of splash screen
  const handleSplashComplete = () => {
    router.push("/");
  };

  const progress = ((currentStep + 1) / formSteps.length) * 100;

  // Show loading state while checking authentication, onboarding status, or loading persistent state
  if (status === "loading" || checkingOnboarding || !isLoaded) {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50">
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="text-center w-full max-w-sm">
            <motion.div
              className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-full relative overflow-hidden"
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.8, 1, 0.8],
                background: [
                  "linear-gradient(135deg, #9333ea 0%, #ec4899 100%)", // purple-pink
                  "linear-gradient(135deg, #8b5cf6 0%, #f472b6 100%)", // purple-500 to pink-500
                  "linear-gradient(135deg, #2563eb 0%, #0891b2 100%)", // blue-cyan
                  "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)", // blue-500 to cyan-500
                  "linear-gradient(135deg, #16a34a 0%, #0d9488 100%)", // green-teal
                  "linear-gradient(135deg, #22c55e 0%, #14b8a6 100%)", // green-500 to teal-500
                  "linear-gradient(135deg, #9333ea 0%, #ec4899 100%)", // back to start
                ],
              }}
              transition={{
                scale: {
                  duration: 2,
                  repeat: Infinity,
                  ease: [0.4, 0.0, 0.2, 1],
                },
                opacity: {
                  duration: 2,
                  repeat: Infinity,
                  ease: [0.4, 0.0, 0.2, 1],
                },
                background: {
                  duration: 8,
                  repeat: Infinity,
                  ease: [0.4, 0.0, 0.2, 1],
                },
              }}
            >
              {/* Inner spinning element for extra visual interest */}
              <motion.div
                className="absolute inset-2 rounded-full bg-gradient-to-r from-white/20 to-white/5"
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </motion.div>
            <motion.p
              className="text-white/80 text-base sm:text-lg font-medium"
              animate={{
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: [0.4, 0.0, 0.2, 1],
              }}
            >
              Onboarding...
            </motion.p>
          </div>
        </div>
      </div>
    );
  }

  // Show splash screen after form submission
  if (showSplashScreen) {
    return (
      <OnboardingSuccessSplash
        userData={formData}
        onComplete={handleSplashComplete}
      />
    );
  }

  return (
    <div className="bg-gray-900 welcome-page">
      {/* Light overlay to make background less dark - fixed positioning to cover entire page */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-blue-900/20 pointer-events-none" />
      <ConfettiAnimation trigger={showConfetti} />

      <div className="relative z-10 px-4 pt-8 pb-8">
        {/* Global tooltip that appears when user tries to proceed without filling required fields */}
        {showTooltip && currentStep === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed z-50 top-10 left-1/2 transform -translate-x-1/2 px-6 py-4 bg-red-600 border-2 border-red-400 text-white text-center text-sm sm:text-base font-bold rounded-lg shadow-2xl shadow-red-600/30 max-w-[95vw] sm:max-w-max mx-auto backdrop-blur-sm"
          >
            <div className="flex items-center justify-center">
              <span className="text-lg mr-2">⚠️</span>
              <span>Please fill out your name and age to continue</span>
            </div>
          </motion.div>
        )}

        <GlassCard className="w-full max-w-2xl mx-auto">
          {/* Progress bar and step indicators */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-white/70 mb-4">
              <span>
                Step {currentStep + 1} of {formSteps.length}
              </span>
              <span>{Math.round(progress)}% complete</span>
            </div>

            {/* Step indicators */}
            <div className="flex items-center justify-center mb-4 px-2 max-w-full overflow-hidden">
              {formSteps.map((step, index) => (
                <div key={step.id} className="flex items-center min-w-0">
                  <motion.div
                    className={`w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-200 flex-shrink-0 ${
                      index < currentStep
                        ? "bg-green-500 border-green-400"
                        : index === currentStep
                          ? "bg-blue-500 border-blue-400"
                          : "bg-white/10 border-white/20"
                    }`}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: index <= currentStep ? 1 : 0.8 }}
                    transition={{ duration: 0.2, type: "tween" }}
                  >
                    {index < currentStep ? (
                      <CheckCircleIcon className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 text-white" />
                    ) : (
                      <span className="text-white font-medium text-xs xs:text-sm sm:text-base leading-none">
                        {index + 1}
                      </span>
                    )}
                  </motion.div>
                  {index < formSteps.length - 1 && (
                    <div className="w-3 xs:w-4 sm:w-6 md:w-8 h-1 bg-white/20 mx-0.5 xs:mx-1 sm:mx-1.5 flex-shrink-0 rounded-full relative overflow-hidden">
                      {/* Subtle glow for active line */}
                      {index === currentStep && (
                        <motion.div
                          className="absolute inset-0 h-1 rounded-full bg-cyan-400/30 blur-sm"
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.3, 0.6, 0.3],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                      )}

                      {/* Base progress fill with smooth transition */}
                      <motion.div
                        className={`absolute inset-0 h-full rounded-full ${
                          index < currentStep
                            ? "bg-gradient-to-r from-green-400 to-green-500"
                            : "bg-transparent"
                        }`}
                        initial={{ width: 0 }}
                        animate={{
                          width: index < currentStep ? "100%" : "0%",
                          boxShadow:
                            index < currentStep
                              ? "0 0 8px rgba(34, 197, 94, 0.4)"
                              : "none",
                        }}
                        transition={{
                          duration: 0.5,
                          type: "spring",
                          damping: 25,
                          stiffness: 200,
                        }}
                      />

                      {/* Enhanced sparkle effects - now with proper pixel-based movement */}
                      {index === currentStep && (
                        <>
                          {/* Large sparkle - travels full visual distance */}
                          <motion.div
                            className="absolute top-1/2 left-0 w-1.5 h-1.5 bg-white rounded-full shadow-lg"
                            style={{
                              transform: "translateY(-50%)",
                              willChange: "transform",
                            }}
                            animate={{
                              x: [-20, 80],
                              scale: [0, 1.2, 1.2, 1.2, 0],
                              opacity: [0, 0.4, 1, 1, 0],
                            }}
                            transition={{
                              duration: 4.0,
                              repeat: Infinity,
                              ease: "easeInOut",
                              times: [0, 0.15, 0.4, 0.85, 1],
                            }}
                          />

                          {/* Medium sparkle - cyan with offset timing */}
                          <motion.div
                            className="absolute top-1/2 left-0 w-1 h-1 bg-cyan-300 rounded-full shadow-md"
                            style={{
                              transform: "translateY(-50%)",
                              willChange: "transform",
                            }}
                            animate={{
                              x: [-16, 76],
                              scale: [0, 1.5, 1.5, 1.5, 0],
                              opacity: [0, 0.5, 0.9, 0.9, 0],
                            }}
                            transition={{
                              duration: 4.5,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 1.0,
                              times: [0, 0.2, 0.4, 0.8, 1],
                            }}
                          />

                          {/* Small sparkle - purple with extended path */}
                          <motion.div
                            className="absolute top-1/2 left-0 w-1 h-1 bg-purple-300 rounded-full"
                            style={{
                              transform: "translateY(-50%)",
                              willChange: "transform",
                            }}
                            animate={{
                              x: [-24, 84],
                              scale: [0, 1, 1, 1, 0],
                              opacity: [0, 0.3, 0.7, 0.7, 0],
                            }}
                            transition={{
                              duration: 5.0,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 2.0,
                              times: [0, 0.25, 0.4, 0.75, 1],
                            }}
                          />

                          {/* Accent sparkle - quick white burst */}
                          <motion.div
                            className="absolute top-1/2 left-0 w-0.5 h-0.5 bg-white rounded-full shadow-sm"
                            style={{
                              transform: "translateY(-50%)",
                              willChange: "transform",
                            }}
                            animate={{
                              x: [-12, 72],
                              scale: [0, 1.3, 1.3, 0],
                              opacity: [0, 0.6, 0.8, 0],
                            }}
                            transition={{
                              duration: 3.5,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 0.5,
                            }}
                          />

                          {/* Trailing sparkle - blue flow */}
                          <motion.div
                            className="absolute top-1/2 left-0 w-0.5 h-0.5 bg-blue-300 rounded-full"
                            style={{
                              transform: "translateY(-50%)",
                              willChange: "transform",
                            }}
                            animate={{
                              x: [-18, 78],
                              scale: [0, 1.1, 1.1, 0],
                              opacity: [0, 0.4, 0.6, 0],
                            }}
                            transition={{
                              duration: 4.2,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 3.0,
                            }}
                          />

                          {/* Micro sparkle - subtle blue accent */}
                          <motion.div
                            className="absolute top-1/2 left-0 w-0.5 h-0.5 bg-blue-200 rounded-full"
                            style={{
                              transform: "translateY(-50%)",
                              willChange: "transform",
                            }}
                            animate={{
                              x: [-14, 74],
                              scale: [0, 0.9, 0.9, 0],
                              opacity: [0, 0.5, 0.5, 0],
                            }}
                            transition={{
                              duration: 5.5,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 1.5,
                            }}
                          />

                          {/* Distributed sparkles for even coverage */}
                          {/* Left section sparkles */}
                          <motion.div
                            className="absolute top-1/2 w-0.5 h-0.5 bg-white rounded-full shadow-sm"
                            style={{
                              transform: "translateY(-50%)",
                              willChange: "transform",
                            }}
                            animate={{
                              x: [-8, 25],
                              y: [0, -2, 1, 0],
                              scale: [0, 1.2, 0.8, 0],
                              opacity: [0, 0.8, 0.4, 0],
                            }}
                            transition={{
                              duration: 2.2,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 0.2,
                            }}
                          />

                          <motion.div
                            className="absolute top-1/2 w-0.5 h-0.5 bg-white/80 rounded-full"
                            style={{
                              transform: "translateY(-50%)",
                              willChange: "transform",
                            }}
                            animate={{
                              x: [-5, 28],
                              y: [0, 2, -1, 0],
                              scale: [0, 0.9, 1.1, 0],
                              opacity: [0, 0.6, 0.7, 0],
                            }}
                            transition={{
                              duration: 2.8,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 1.1,
                            }}
                          />

                          {/* Center-left sparkles */}
                          <motion.div
                            className="absolute top-1/2 w-0.5 h-0.5 bg-white/90 rounded-full"
                            style={{
                              transform: "translateY(-50%)",
                              willChange: "transform",
                            }}
                            animate={{
                              x: [15, 48],
                              y: [0, -3, 2, 0],
                              scale: [0, 1.3, 0.7, 0],
                              opacity: [0, 0.9, 0.5, 0],
                            }}
                            transition={{
                              duration: 2.5,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 0.7,
                            }}
                          />

                          <motion.div
                            className="absolute top-1/2 w-0.5 h-0.5 bg-white/70 rounded-full"
                            style={{
                              transform: "translateY(-50%)",
                              willChange: "transform",
                            }}
                            animate={{
                              x: [18, 51],
                              y: [0, 1, -2, 0],
                              scale: [0, 0.8, 1.0, 0],
                              opacity: [0, 0.5, 0.8, 0],
                            }}
                            transition={{
                              duration: 3.1,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 1.8,
                            }}
                          />

                          {/* Center-right sparkles */}
                          <motion.div
                            className="absolute top-1/2 w-0.5 h-0.5 bg-white rounded-full shadow-white/40 shadow-sm"
                            style={{
                              transform: "translateY(-50%)",
                              willChange: "transform",
                            }}
                            animate={{
                              x: [40, 73],
                              y: [0, -1, 3, 0],
                              scale: [0, 1.1, 0.9, 0],
                              opacity: [0, 0.7, 0.3, 0],
                            }}
                            transition={{
                              duration: 2.6,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 0.4,
                            }}
                          />

                          <motion.div
                            className="absolute top-1/2 w-0.5 h-0.5 bg-white/85 rounded-full"
                            style={{
                              transform: "translateY(-50%)",
                              willChange: "transform",
                            }}
                            animate={{
                              x: [43, 76],
                              y: [0, 2, -1, 0],
                              scale: [0, 0.7, 1.2, 0],
                              opacity: [0, 0.4, 0.9, 0],
                            }}
                            transition={{
                              duration: 2.9,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 1.5,
                            }}
                          />

                          {/* Right section sparkles */}
                          <motion.div
                            className="absolute top-1/2 w-0.5 h-0.5 bg-white/75 rounded-full"
                            style={{
                              transform: "translateY(-50%)",
                              willChange: "transform",
                            }}
                            animate={{
                              x: [65, 88],
                              y: [0, -2, 1, 0],
                              scale: [0, 1.0, 0.8, 0],
                              opacity: [0, 0.6, 0.5, 0],
                            }}
                            transition={{
                              duration: 2.4,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 0.9,
                            }}
                          />

                          {/* Gap fillers - shorter distance movements */}
                          <motion.div
                            className="absolute top-1/2 w-0.5 h-0.5 bg-white/60 rounded-full"
                            style={{
                              transform: "translateY(-50%)",
                              willChange: "transform",
                            }}
                            animate={{
                              x: [8, 24],
                              y: [0, 1, -1, 0],
                              scale: [0, 0.9, 0.7, 0],
                              opacity: [0, 0.4, 0.6, 0],
                            }}
                            transition={{
                              duration: 1.8,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 0.6,
                            }}
                          />

                          <motion.div
                            className="absolute top-1/2 w-0.5 h-0.5 bg-white/65 rounded-full"
                            style={{
                              transform: "translateY(-50%)",
                              willChange: "transform",
                            }}
                            animate={{
                              x: [30, 46],
                              y: [0, -1, 2, 0],
                              scale: [0, 0.8, 1.0, 0],
                              opacity: [0, 0.5, 0.4, 0],
                            }}
                            transition={{
                              duration: 1.9,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 1.3,
                            }}
                          />

                          <motion.div
                            className="absolute top-1/2 w-0.5 h-0.5 bg-white/55 rounded-full"
                            style={{
                              transform: "translateY(-50%)",
                              willChange: "transform",
                            }}
                            animate={{
                              x: [52, 68],
                              y: [0, 2, -1, 0],
                              scale: [0, 0.7, 0.9, 0],
                              opacity: [0, 0.3, 0.7, 0],
                            }}
                            transition={{
                              duration: 2.0,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 0.1,
                            }}
                          />

                          {/* Continuous flow sparkles */}
                          <motion.div
                            className="absolute top-1/2 w-0.5 h-0.5 bg-white/50 rounded-full"
                            style={{
                              transform: "translateY(-50%)",
                              willChange: "transform",
                            }}
                            animate={{
                              x: [-5, 85],
                              y: [0, -1, 2, -1, 0],
                              scale: [0, 0.6, 0.8, 0.5, 0],
                              opacity: [0, 0.3, 0.5, 0.2, 0],
                            }}
                            transition={{
                              duration: 4.0,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 2.0,
                            }}
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, type: "tween" }}
            >
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 text-center">
                {formSteps[currentStep].title}
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-white/70 mb-8 text-center">
                {formSteps[currentStep].subtitle}
              </p>

              <div className="space-y-6">
                {currentStep === formSteps.length - 1 ? (
                  // Render the RelationshipAssessment component for the last step
                  <RelationshipAssessment
                    onResultsSubmit={handleAssessmentResults}
                    onClose={() => {}} // Empty function since we don't want to close
                  />
                ) : (
                  // Render regular form fields for all other steps
                  formSteps[currentStep].fields.map((field) => {

                      // Hide partner fields for statuses where no current partner exists
                      if (
                        (field.name === "partnerName" ||
                          field.name === "partnerAge") &&
                        ["Single", "Divorced", "Widowed"].includes(
                          formData.relationshipStatus
                        )
                      ) {
                        return null;
                      }

                      // Hide family member count field if hasFamily is not "yes"
                      if (
                        field.name === "familyMemberCount" &&
                        formData.hasFamily !== "yes"
                      ) {
                        return null;
                      }


                      // Hide family member fields if hasFamily is not "yes" or if the field exceeds the selected count
                      if (
                        field.name.startsWith("familyMember") &&
                        field.name !== "familyMemberCount" &&
                        formData.hasFamily === "yes"
                      ) {
                        // Extract the family member number from the field name (e.g., "familyMember1" -> 1)
                        const memberNumber = parseInt(
                          field.name.match(/\d+/)?.[0] || "0"
                        );
                        const selectedCount = parseInt(
                          formData.familyMemberCount || "0"
                        );

                        // Hide if no count is selected yet or if this field is beyond the selected count
                        if (
                          !formData.familyMemberCount ||
                          memberNumber > selectedCount
                        ) {
                          return null;
                        }
                      } else if (
                        field.name.startsWith("familyMember") &&
                        field.name !== "familyMemberCount" &&
                        formData.hasFamily !== "yes"
                      ) {
                        return null;
                      }


                      return (
                        <div key={field.name}>
                          <label className="block text-white mb-2">
                            {field.label}
                            {field.required && (
                              <span
                                className={`ml-1 text-lg font-bold ${
                                  showTooltip &&
                                  ((field.name === "nickname" &&
                                    !formData.nickname?.trim()) ||
                                    (field.name === "age" &&
                                      (!formData.age ||
                                        parseInt(formData.age.toString()) <=
                                          0)))
                                    ? "text-red-400 animate-bounce"
                                    : "text-blue-400"
                                }`}
                              >
                                *
                              </span>
                            )}
                          </label>
                          {/* Field-specific validation messages */}
                          {showTooltip &&
                            field.required &&
                            field.name === "nickname" &&
                            !formData.nickname?.trim() && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="mb-2 text-red-400 text-sm font-medium flex items-center"
                              >
                                <span className="mr-1">⚠️</span>
                                <span>Name is required</span>
                              </motion.div>
                            )}
                          {showTooltip &&
                            field.required &&
                            field.name === "age" &&
                            (!formData.age ||
                              parseInt(formData.age.toString()) <= 0) && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="mb-2 text-red-400 text-sm font-medium flex items-center"
                              >
                                <span className="mr-1">⚠️</span>
                                <span>Valid age is required</span>
                              </motion.div>
                            )}

                          {field.type === "text" && (
                            <motion.input
                              type="text"
                              name={field.name}
                              placeholder={field.placeholder}
                              value={formData[field.name] || ""}
                              onChange={(e) =>
                                handleInputChange(field.name, e.target.value)
                              }
                              animate={{
                                borderColor:
                                  field.name === "nickname" &&
                                  showTooltip &&
                                  !formData.nickname?.trim()
                                    ? ["#ef4444", "#dc2626", "#ef4444"] // Red pulsing animation
                                    : undefined,
                              }}
                              transition={{
                                duration: 1,
                                repeat:
                                  field.name === "nickname" &&
                                  showTooltip &&
                                  !formData.nickname?.trim()
                                    ? Infinity
                                    : 0,
                                ease: "easeInOut",
                              }}
                              className={`w-full px-4 py-3 bg-white/10 backdrop-blur-md border-2 rounded-xl text-white placeholder-white/50 focus:outline-none transition-all ${
                                field.name === "nickname" &&
                                showTooltip &&
                                !formData.nickname?.trim()
                                  ? "border-red-500 focus:border-red-400 shadow-lg shadow-red-500/25"
                                  : "border-white/20 focus:border-blue-400"
                              }`}
                            />
                          )}

                          {field.type === "tel" && (
                            <motion.input
                              type="tel"
                              name={field.name}
                              placeholder={field.placeholder}
                              value={formData[field.name] || ""}
                              onChange={(e) =>
                                handleInputChange(field.name, e.target.value)
                              }
                              className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-blue-400 transition-all"
                            />
                          )}

                          {field.type === "number" && (
                            <motion.input
                              type="number"
                              name={field.name}
                              placeholder={field.placeholder}
                              value={formData[field.name] || ""}
                              onChange={(e) =>
                                handleInputChange(field.name, e.target.value)
                              }
                              animate={{
                                borderColor:
                                  field.name === "age" &&
                                  showTooltip &&
                                  (!formData.age ||
                                    parseInt(formData.age.toString()) <= 0)
                                    ? ["#ef4444", "#dc2626", "#ef4444"] // Red pulsing animation
                                    : undefined,
                              }}
                              transition={{
                                duration: 1,
                                repeat:
                                  field.name === "age" &&
                                  showTooltip &&
                                  (!formData.age ||
                                    parseInt(formData.age.toString()) <= 0)
                                    ? Infinity
                                    : 0,
                                ease: "easeInOut",
                              }}
                              className={`w-full px-4 py-3 bg-white/10 backdrop-blur-md border-2 rounded-xl text-white placeholder-white/50 focus:outline-none transition-all ${
                                field.name === "age" &&
                                showTooltip &&
                                (!formData.age ||
                                  parseInt(formData.age.toString()) <= 0)
                                  ? "border-red-500 focus:border-red-400 shadow-lg shadow-red-500/25"
                                  : "border-white/20 focus:border-blue-400"
                              }`}
                              min="1"
                              max="120"
                            />
                          )}

                          {field.type === "select" && (
                              <motion.select
                                name={field.name}
                                value={formData[field.name] || ""}
                                onChange={(e) =>
                                  handleInputChange(field.name, e.target.value)
                                }
                                className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400 transition-all appearance-none cursor-pointer"
                              >
                              <option
                                value=""
                                className="bg-gray-900 text-gray-400"
                              >
                                Select an option
                              </option>
                              {field.options?.map((option) => (
                                <option
                                  key={option.value}
                                  value={option.value}
                                  className="bg-gray-900 text-white"
                                >
                                  {option.label}
                                </option>
                              ))}
                            </motion.select>
                          )}

                          {field.type === "multiselect" && (
                            <div className="grid grid-cols-2 gap-3">
                              {field.options?.map((option) => {
                                const isSelected = selectedOptions[
                                  field.name
                                ]?.includes(option.value);
                                return (
                                  <motion.button
                                    key={option.value}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() =>
                                      handleMultiSelectChange(
                                        field.name,
                                        option.value
                                      )
                                    }
                                    className={`relative px-4 py-2 rounded-xl border transition-all ${
                                      isSelected
                                        ? "bg-blue-500/30 border-blue-400 text-white"
                                        : "bg-white/10 border-white/20 text-white/70 hover:bg-white/20"
                                    }`}
                                  >
                                    <span className="relative z-10 flex items-center justify-center">
                                      {option.label}
                                      {isSelected && (
                                        <motion.div
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          transition={{ duration: 0.1 }}
                                          className="ml-2"
                                        >
                                          <CheckCircleIcon className="w-5 h-5 text-green-400" />
                                        </motion.div>
                                      )}
                                    </span>
                                  </motion.button>
                                );
                              })}
                            </div>
                          )}

                          {field.type === "textarea" && (
                            <motion.textarea
                              name={field.name}
                              placeholder={field.placeholder}
                              value={formData[field.name] || ""}
                              onChange={(e) =>
                                handleInputChange(field.name, e.target.value)
                              }
                              rows={4}
                              className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-blue-400 transition-all resize-none"
                            />
                          )}

                          {field.type === "family_toggle" && (
                            <div className="flex gap-4">
                              {field.options?.map((option) => {
                                const isSelected =
                                  formData[field.name] === option.value;
                                return (
                                  <motion.button
                                    key={option.value}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() =>
                                      handleInputChange(
                                        field.name,
                                        option.value
                                      )
                                    }
                                    className={`flex-1 px-6 py-4 rounded-xl border-2 transition-all font-medium cursor-pointer ${
                                      isSelected
                                        ? "bg-blue-500/30 border-blue-400 text-white shadow-lg shadow-blue-500/25"
                                        : "bg-white/10 border-white/20 text-white/70 hover:bg-white/20 hover:border-white/30"
                                    }`}
                                  >
                                    <span className="flex items-center justify-center">
                                      {option.label}
                                      {isSelected && (
                                        <motion.div
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          transition={{ duration: 0.1 }}
                                          className="ml-2"
                                        >
                                          <CheckCircleIcon className="w-5 h-5 text-green-400" />
                                        </motion.div>
                                      )}
                                    </span>
                                  </motion.button>
                                );
                              })}
                            </div>
                          )}

                          {field.type === "enhanced_textarea" && (
                            <div className="space-y-4">
                              {/* Helper sentences section */}
                              <div className="space-y-4">
                                <div className="text-white/70 text-xs sm:text-sm space-y-1">
                                  <p className="font-medium text-sm sm:text-base">Click any sentence that resonates with you:</p>
                                  <p className="text-white/50 text-xs sm:text-sm">These can help you find the words to express yourself. Feel free to use them as-is or modify them.</p>
                                </div>
                                
                                {/* Categorized helper sentences */}
                                <div className="space-y-4 sm:space-y-6">
                                  {/* Initial Concerns */}
                                  <div className="space-y-2">
                                    <h4 className="text-white/60 text-[10px] sm:text-xs uppercase tracking-wider font-semibold">Starting Points</h4>
                                    <div className="space-y-2">
                                      {(field as any).helperWords?.slice(0, 4).map((sentence: string, index: number) => (
                                        <motion.button
                                          key={index}
                                          type="button"
                                          whileHover={{ scale: 1.01 }}
                                          whileTap={{ scale: 0.99 }}
                                          onClick={() => {
                                            const currentText = formData[field.name] || "";
                                            const newText = currentText
                                              ? currentText.trim().endsWith(".")
                                                ? currentText + " " + sentence
                                                : currentText + ". " + sentence
                                              : sentence;
                                            handleInputChange(field.name, newText);
                                          }}
                                          className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-white/80 hover:text-white text-xs sm:text-sm transition-all"
                                        >
                                          {sentence}
                                        </motion.button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Mental Health */}
                                  <div className="space-y-2">
                                    <h4 className="text-white/60 text-[10px] sm:text-xs uppercase tracking-wider font-semibold">Current Struggles</h4>
                                    <div className="space-y-2">
                                      {(field as any).helperWords?.slice(4, 8).map((sentence: string, index: number) => (
                                        <motion.button
                                          key={index + 4}
                                          type="button"
                                          whileHover={{ scale: 1.01 }}
                                          whileTap={{ scale: 0.99 }}
                                          onClick={() => {
                                            const currentText = formData[field.name] || "";
                                            const newText = currentText
                                              ? currentText.trim().endsWith(".")
                                                ? currentText + " " + sentence
                                                : currentText + ". " + sentence
                                              : sentence;
                                            handleInputChange(field.name, newText);
                                          }}
                                          className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-white/80 hover:text-white text-xs sm:text-sm transition-all"
                                        >
                                          {sentence}
                                        </motion.button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Life Events */}
                                  <div className="space-y-2">
                                    <h4 className="text-white/60 text-[10px] sm:text-xs uppercase tracking-wider font-semibold">Life Events</h4>
                                    <div className="space-y-2">
                                      {(field as any).helperWords?.slice(8, 12).map((sentence: string, index: number) => (
                                        <motion.button
                                          key={index + 8}
                                          type="button"
                                          whileHover={{ scale: 1.01 }}
                                          whileTap={{ scale: 0.99 }}
                                          onClick={() => {
                                            const currentText = formData[field.name] || "";
                                            const newText = currentText
                                              ? currentText.trim().endsWith(".")
                                                ? currentText + " " + sentence
                                                : currentText + ". " + sentence
                                              : sentence;
                                            handleInputChange(field.name, newText);
                                          }}
                                          className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-white/80 hover:text-white text-xs sm:text-sm transition-all"
                                        >
                                          {sentence}
                                        </motion.button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Goals */}
                                  <div className="space-y-2">
                                    <h4 className="text-white/60 text-[10px] sm:text-xs uppercase tracking-wider font-semibold">Goals & Growth</h4>
                                    <div className="space-y-2">
                                      {(field as any).helperWords?.slice(12, 17).map((sentence: string, index: number) => (
                                        <motion.button
                                          key={index + 12}
                                          type="button"
                                          whileHover={{ scale: 1.01 }}
                                          whileTap={{ scale: 0.99 }}
                                          onClick={() => {
                                            const currentText = formData[field.name] || "";
                                            const newText = currentText
                                              ? currentText.trim().endsWith(".")
                                                ? currentText + " " + sentence
                                                : currentText + ". " + sentence
                                              : sentence;
                                            handleInputChange(field.name, newText);
                                          }}
                                          className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-white/80 hover:text-white text-xs sm:text-sm transition-all"
                                        >
                                          {sentence}
                                        </motion.button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Personal Challenges */}
                                  <div className="space-y-2">
                                    <h4 className="text-white/60 text-[10px] sm:text-xs uppercase tracking-wider font-semibold">Personal Challenges</h4>
                                    <div className="space-y-2">
                                      {(field as any).helperWords?.slice(17).map((sentence: string, index: number) => (
                                        <motion.button
                                          key={index + 17}
                                          type="button"
                                          whileHover={{ scale: 1.01 }}
                                          whileTap={{ scale: 0.99 }}
                                          onClick={() => {
                                            const currentText = formData[field.name] || "";
                                            const newText = currentText
                                              ? currentText.trim().endsWith(".")
                                                ? currentText + " " + sentence
                                                : currentText + ". " + sentence
                                              : sentence;
                                            handleInputChange(field.name, newText);
                                          }}
                                          className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-white/80 hover:text-white text-xs sm:text-sm transition-all"
                                        >
                                          {sentence}
                                        </motion.button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Textarea */}
                              <div className="space-y-2">
                                <label className="text-white/60 text-xs sm:text-sm">Your story (feel free to edit or write your own):</label>
                                <motion.textarea
                                  name={field.name}
                                  placeholder={field.placeholder}
                                  style={{ fontSize: 'inherit' }}
                                  value={formData[field.name] || ""}
                                  onChange={(e) =>
                                    handleInputChange(field.name, e.target.value)
                                  }
                                  rows={6}
                                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-blue-400 transition-all resize-none text-sm sm:text-base"
                                />
                              </div>
                            </div>
                          )}

                          {field.type === "consent" && (
                            <div className="space-y-4">
                              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                                <p className="text-white/80 text-sm leading-relaxed">
                                  {field.placeholder}
                                </p>
                              </div>
                              <motion.label
                                className="flex items-start gap-3 cursor-pointer"
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                              >
                                <motion.input
                                  type="checkbox"
                                  name={field.name}
                                  checked={formData[field.name] === "true"}
                                  onChange={(e) =>
                                    handleInputChange(field.name, e.target.checked ? "true" : "false")
                                  }
                                  className="mt-0.5 w-5 h-5 text-blue-500 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
                                />
                                <span className="text-white/90 text-sm font-medium">
                                  I agree to receive SMS notifications
                                </span>
                              </motion.label>
                            </div>
                          )}
                        </div>
                      );
                  })
                )}
              </div>

              {/* Navigation buttons */}
              <div
                className={`flex ${currentStep === formSteps.length - 1 && assessmentResults.length === 0 ? "flex-col sm:flex-row sm:justify-between" : "justify-between"} mt-8 w-full`}
              >
                <ButtonWithSound
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  className={`px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base rounded-xl font-medium transition-all ${
                    currentStep === 0
                      ? "bg-white/5 text-white/30 cursor-not-allowed"
                      : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                  } ${currentStep === formSteps.length - 1 && assessmentResults.length === 0 ? "w-full sm:w-auto" : ""}`}
                >
                  Back
                </ButtonWithSound>

                {/* Show "Not in a relationship" button only on assessment step and when assessment is not completed */}
                {currentStep === formSteps.length - 1 &&
                  assessmentResults.length === 0 && (
                    <ButtonWithSound
                      onClick={handleSkipAssessment}
                      className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base text-white rounded-xl font-medium transition-all transform hover:scale-105 w-full sm:w-auto bg-red-500 hover:bg-red-600 order-last"
                    >
                      Not in a relationship
                    </ButtonWithSound>
                  )}

                {/* Next/Complete button container */}
                <div
                  className={`relative ${currentStep === formSteps.length - 1 && assessmentResults.length === 0 ? "w-full sm:w-auto order-2 mt-3 sm:mt-0" : ""}`}
                >
                  {/* Tooltip moved outside the button for better visibility */}

                  {/* Only show Next/Complete button if not on assessment step or if assessment is completed */}
                  {(currentStep !== formSteps.length - 1 ||
                    assessmentResults.length > 0) && (
                    <ButtonWithSound
                      onClick={handleNext}
                      disabled={
                        loading || (currentStep === 0 && !isCurrentStepValid())
                      }
                      className={`px-4 sm:px-8 py-2 sm:py-3 text-sm sm:text-base ${
                        currentStep === 0 && !isCurrentStepValid()
                          ? "bg-gray-600 hover:bg-gray-600 cursor-not-allowed border-2 border-red-500/50 shadow-red-500/20 shadow-lg"
                          : "bg-blue-500 hover:bg-blue-600"
                      } text-white rounded-xl font-medium transition-all ${
                        currentStep === 0 && !isCurrentStepValid()
                          ? ""
                          : "transform hover:scale-105"
                      } ${
                        currentStep === formSteps.length - 1 &&
                        assessmentResults.length === 0
                          ? "w-full sm:w-auto"
                          : ""
                      }`}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Saving...
                        </span>
                      ) : currentStep === formSteps.length - 1 ? (
                        "Complete Onboarding"
                      ) : (
                        "Next"
                      )}
                    </ButtonWithSound>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </GlassCard>
      </div>
    </div>
  );
}
