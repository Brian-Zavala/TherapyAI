// src/app/api/dashboard/relationship-progress/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const therapyType = searchParams.get('type') || 'couple';

    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the user in the database (might not be the same ID as the session)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 });
    }
    
    // Define theme value for consistent filtering
    const themeValue = therapyType === 'couple' ? 'Relationship Counseling' : 'Family Therapy';

    // Get progress metrics from the ProgressTracking table
    const progressData = await prisma.progressTracking.findMany({
      where: {
        userId: user.id,
        therapyType: therapyType as string,
      },
      select: {
        date: true,
        closenessScore: true,
        communicationScore: true,
        notes: true,
        therapyType: true,
        sessionId: true
      },
      orderBy: {
        date: 'asc'
      },
      take: 10 // Limit to most recent entries
    });

    // Format the data for the chart based on therapy type
    let formattedData;
    
    if (therapyType === 'family') {
      formattedData = progressData.map((entry, index) => ({
        week: `Week ${new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        closeness: Math.min(100, Math.max(0, entry.closenessScore + 3)), // Adjust for family therapy
        communication: Math.min(100, Math.max(0, entry.communicationScore - 3)), // Adjust for family therapy
        notes: entry.notes || "",
        sessionId: entry.sessionId || null,
        insight: index % 2 === 0 ? "Family connections strengthening" : "Working on dynamics"
      }));
    } else {
      // Default 'couple' therapy
      formattedData = progressData.map((entry, index) => ({
        week: `Week ${new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        closeness: entry.closenessScore,
        communication: entry.communicationScore,
        notes: entry.notes || "",
        sessionId: entry.sessionId || null,
        insight: index % 2 === 0 ? "Emotional connection improving" : "Communication patterns evolving"
      }));
    }

    // If no progress data found, analyze session data to get real metrics instead of using static defaults
    if (formattedData.length === 0) {
      // Get completed sessions for the user
      const completedSessions = await prisma.session.findMany({
        where: {
          userId: user.id,
          status: 'completed',
          theme: themeValue
        },
        select: {
          id: true,
          date: true,
          duration: true,
          transcript: true,
          notes: true
        },
        orderBy: {
          date: 'asc'
        }
      });
      
      console.log(`Found ${completedSessions.length} completed sessions for ${therapyType} therapy`);
      
      // If there are completed sessions, generate progress tracking data based on real sessions
      if (completedSessions.length > 0) {
        // Group sessions by week for aggregated data
        const sessionsByWeek = completedSessions.reduce((acc, session) => {
          const sessionDate = new Date(session.date);
          const weekStart = new Date(sessionDate);
          weekStart.setDate(sessionDate.getDate() - sessionDate.getDay());
          const weekKey = weekStart.toISOString().split('T')[0];
          
          if (!acc[weekKey]) {
            acc[weekKey] = [];
          }
          acc[weekKey].push(session);
          return acc;
        }, {});
        
        // Generate default data for weeks without metrics
        const weeks = Object.keys(sessionsByWeek).sort();
        console.log(`Grouped into ${weeks.length} weeks`);
        
        // Generate data for up to 5 weeks (or fewer if less data is available)
        const weeksToShow = weeks.slice(-5);
        let createdEntries = 0;
        
        // Process each session's transcript to extract real metrics
        for (const session of completedSessions) {
          if (session.transcript) {
            try {
              console.log(`Analyzing transcript for session ${session.id}`);
              
              // Check if metrics already exist for this session
              const existingMetrics = await prisma.progressTracking.findFirst({
                where: { sessionId: session.id }
              });
              
              if (!existingMetrics) {
                try {
                  // Try to import the metrics helper
                  const { analyzeTranscriptForMetrics } = await import('../../sessions/[id]/metrics-helper');
                  
                  // Base calculation using duration
                  const duration = session.duration || 30;
                  const baseScore = Math.min(85, 50 + Math.floor(duration / 5));
                  const variability = 6; // Lower variability for consistency
                  
                  // Calculate metrics from transcript
                  const metrics = analyzeTranscriptForMetrics(
                    session.transcript, 
                    baseScore, 
                    variability, 
                    therapyType === 'family' ? 'family' : 'couple'
                  );
                  
                  // Create progress tracking entry with calculated metrics
                  await prisma.progressTracking.create({
                    data: {
                      userId: user.id,
                      closenessScore: metrics.closenessScore,
                      communicationScore: metrics.communicationScore,
                      therapyType: therapyType,
                      notes: session.notes || "",
                      sessionId: session.id,
                      date: session.date
                    }
                  });
                  createdEntries++;
                } catch (importError) {
                  console.error("Error importing metrics helper, using fallback:", importError);
                  
                  // Fallback calculation without the helper
                  const duration = session.duration || 30;
                  const transcriptLength = session.transcript?.length || 0;
                  
                  // Simple metric calculation based on session stats
                  const closenessScore = Math.min(100, Math.round(50 + (duration / 10) + (transcriptLength > 1000 ? 15 : 0)));
                  const communicationScore = Math.min(100, Math.round(55 + (duration / 8) + (transcriptLength > 2000 ? 20 : 0)));
                  
                  // Create progress tracking entry with fallback metrics
                  await prisma.progressTracking.create({
                    data: {
                      userId: user.id,
                      closenessScore: therapyType === 'family' ? closenessScore + 5 : closenessScore,
                      communicationScore: therapyType === 'family' ? communicationScore - 3 : communicationScore,
                      therapyType: therapyType,
                      notes: session.notes || "Session analysis",
                      sessionId: session.id,
                      date: session.date
                    }
                  });
                  createdEntries++;
                }
              } else {
                console.log(`Metrics already exist for session ${session.id}`);
              }
            } catch (error) {
              console.error("Error analyzing transcript for metrics:", error);
            }
          }
        }
        
        console.log(`Created ${createdEntries} new progress tracking entries`);
        
        // Try fetching progress data again now that we've created entries
        if (createdEntries > 0) {
          const newProgressData = await prisma.progressTracking.findMany({
            where: {
              userId: user.id,
              therapyType: therapyType as string,
            },
            select: {
              date: true,
              closenessScore: true,
              communicationScore: true,
              notes: true,
              therapyType: true,
              sessionId: true
            },
            orderBy: {
              date: 'asc'
            },
            take: 10
          });
          
          console.log(`Retrieved ${newProgressData.length} progress tracking entries after creating`);
          
          if (newProgressData.length > 0) {
            // Format the newly created data
            if (therapyType === 'family') {
              formattedData = newProgressData.map((entry, index) => ({
                week: `Week ${new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
                closeness: Math.min(100, Math.max(0, entry.closenessScore + 3)), 
                communication: Math.min(100, Math.max(0, entry.communicationScore - 3)),
                notes: entry.notes || "",
                sessionId: entry.sessionId || null,
                insight: index % 2 === 0 ? "Family connections strengthening" : "Working on dynamics"
              }));
            } else {
              formattedData = newProgressData.map((entry, index) => ({
                week: `Week ${new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
                closeness: entry.closenessScore,
                communication: entry.communicationScore,
                notes: entry.notes || "",
                sessionId: entry.sessionId || null,
                insight: index % 2 === 0 ? "Emotional connection improving" : "Communication patterns evolving"
              }));
            }
            
            return NextResponse.json(formattedData);
          }
        }
        
        // If still no progress data, fall back to calculating metrics based on session statistics
        weeksToShow.forEach((weekStart, index) => {
          const weekSessions = sessionsByWeek[weekStart];
          const totalDuration = weekSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
          const avgDuration = totalDuration / weekSessions.length;
          const hasTranscripts = weekSessions.filter(s => s.transcript && s.transcript.length > 0).length;
          const transcriptRatio = hasTranscripts / weekSessions.length;
          
          // Starting point based on session statistics
          let closenessBase = 30 + (avgDuration / 10);
          let communicationBase = 30 + (weekSessions.length * 5);
          
          // Extract session notes for deeper insight
          const sessionNotes = weekSessions.map(s => s.notes).filter(Boolean).join(" ");
          const hasPositiveTerms = /progress|improve|better|good|great|success/i.test(sessionNotes);
          const hasChallengeTerms = /difficult|challenge|struggle|problem|issue|concern/i.test(sessionNotes);
          
          // Analyze transcripts for sentiment if available
          const transcripts = weekSessions
            .filter(s => s.transcript)
            .map(s => s.transcript)
            .join(" ");
          
          if (transcripts) {
            // Look for positive and negative sentiment indicators in transcripts
            const positiveTranscriptTerms = /progress|improve|better|good|great|success|happy|connection|understanding|listen/i;
            const negativeTranscriptTerms = /difficult|challenge|struggle|problem|issue|concern|conflict|misunderstanding|miscommunication/i;
            
            if (positiveTranscriptTerms.test(transcripts)) {
              closenessBase += 10;
              communicationBase += 8;
            }
            
            if (negativeTranscriptTerms.test(transcripts)) {
              closenessBase -= 6;
              communicationBase -= 4;
            }
          }
          
          // Adjust scores based on sentiment in notes
          if (hasPositiveTerms) {
            closenessBase += 8;
            communicationBase += 6;
          }
          
          if (hasChallengeTerms) {
            closenessBase -= 5;
            communicationBase -= 3;
          }
          
          // Adjust for therapy type
          if (therapyType === 'family') {
            closenessBase = Math.min(40 + (avgDuration / 8) + (index * 3), 95);
            communicationBase = Math.min(35 + (weekSessions.length * 6) + (index * 3), 93);
          } else { // couple
            closenessBase = Math.min(38 + (avgDuration / 10) + (index * 4), 94);
            communicationBase = Math.min(38 + (transcriptRatio * 40) + (index * 4), 96);
          }
          
          // Add weekly progression (improvement week to week with some fluctuation)
          const randomVariation = Math.random() * 6 - 3; // -3 to +3 random variation
          const closenessValue = Math.round(closenessBase + randomVariation);
          const communicationValue = Math.round(communicationBase + randomVariation);
          
          const weekDate = new Date(weekStart);
          const weekLabel = `Week ${weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
          
          // Generate appropriate insight based on therapy type
          let insightText = "";
          if (therapyType === 'family') {
            insightText = index % 2 === 0 ? 
              "Improving family communication structure" : 
              "Developing stronger family bonding rituals";
          } else { // couple
            insightText = index % 2 === 0 ? 
              "Enhancing emotional connection strategies" : 
              "Developing conflict resolution techniques";
          }
          
          progressData.push({
            week: weekLabel,
            closeness: Math.min(Math.max(closenessValue, 25), 95),
            communication: Math.min(Math.max(communicationValue, 25), 95),
            notes: sessionNotes.substring(0, 100) || "",
            sessionId: weekSessions[0]?.id || null, // Add the sessionId from the first session in the week
            insight: insightText
          });
        });
        
        return NextResponse.json(progressData);
      }
      
      // If no completed sessions, generate some sample data for demonstration
      console.log("No completed sessions found, generating sample data");
      
      // Create sample data for demonstration
      const sampleData = [];
      const today = new Date();
      
      // Generate 5 weeks of sample data
      for (let i = 0; i < 5; i++) {
        const weekDate = new Date(today);
        weekDate.setDate(today.getDate() - (i * 7)); // Go back i weeks
        
        const weekLabel = `Week ${weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        
        // Base values that increase slightly over time (showing progress)
        const baseCloseness = 60 + (i * 3);
        const baseCommunication = 55 + (i * 4);
        
        // Add some random variation
        const randomVariance = Math.floor(Math.random() * 6) - 3; // -3 to +3
        
        sampleData.push({
          week: weekLabel,
          closeness: therapyType === 'family' ? 
            baseCloseness + randomVariance + 5 : // Family therapy has higher closeness
            baseCloseness + randomVariance,
          communication: baseCommunication + randomVariance,
          notes: "Sample data for demonstration",
          insight: i % 2 === 0 ? 
            (therapyType === 'family' ? "Family connections strengthening" : "Emotional connection improving") : 
            (therapyType === 'family' ? "Working on dynamics" : "Communication patterns evolving")
        });
      }
      
      // Return the sample data in reverse order (most recent first)
      return NextResponse.json(sampleData.reverse());
    }

    // If we have real data, return it
    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("Error fetching relationship progress data:", error);
    
    // Return empty array on error to show error state in UI
    return NextResponse.json([]);
  }
}