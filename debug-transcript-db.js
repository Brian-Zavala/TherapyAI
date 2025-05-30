// Debug script to check transcript entries in database
// Run this in browser console on /dashboard/sessions page

async function debugTranscriptDB() {
  // Get all sessions from the page
  const sessionElements = document.querySelectorAll('[data-session-id]');
  
  if (sessionElements.length === 0) {
    console.log('No sessions found. Make sure you\'re on the sessions page.');
    return;
  }
  
  for (const element of sessionElements) {
    const sessionId = element.getAttribute('data-session-id');
    if (!sessionId) continue;
    
    console.log(`\n========================================`);
    console.log(`🔍 DEBUGGING SESSION: ${sessionId}`);
    console.log(`========================================`);
    
    try {
      // Fetch transcript entries for this session
      const response = await fetch(`/api/sessions/${sessionId}/transcript`);
      const data = await response.json();
      
      const entries = Array.isArray(data) ? data : data.entries;
      
      console.log(`📊 TOTAL ENTRIES: ${entries?.length || 0}`);
      
      if (entries && entries.length > 0) {
        // Count by speaker
        const userCount = entries.filter(e => e.speaker === 'user').length;
        const assistantCount = entries.filter(e => e.speaker === 'assistant').length;
        const otherCount = entries.filter(e => e.speaker !== 'user' && e.speaker !== 'assistant').length;
        
        console.log(`👤 USER MESSAGES: ${userCount}`);
        console.log(`🤖 ASSISTANT MESSAGES: ${assistantCount}`);
        console.log(`⚙️ OTHER MESSAGES: ${otherCount}`);
        
        // Show first few entries
        console.log(`\n📝 FIRST 5 ENTRIES:`);
        entries.slice(0, 5).forEach((entry, index) => {
          console.log(`${index + 1}. [${entry.speaker.toUpperCase()}] "${entry.text.substring(0, 80)}${entry.text.length > 80 ? '...' : ''}"`);
        });
        
        // If unbalanced, show the issue
        if (assistantCount < userCount / 2) {
          console.log(`\n🚨 POTENTIAL ISSUE: Too few assistant messages (${assistantCount}) compared to user messages (${userCount})`);
        }
      } else {
        console.log('❌ NO TRANSCRIPT ENTRIES FOUND');
      }
      
    } catch (error) {
      console.error(`❌ ERROR FETCHING TRANSCRIPT:`, error);
    }
  }
  
  console.log(`\n✅ DEBUG COMPLETE`);
}

// Auto-run the debug
debugTranscriptDB();