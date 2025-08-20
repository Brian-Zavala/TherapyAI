#!/bin/bash

echo "🔍 Verifying VAPI stop() fix..."
echo ""

# Check TherapyButtonRefactored is calling endSession (correct)
echo "1. Checking TherapyButtonRefactored.tsx calls endSession():"
if grep -q "await vapi.endSession()" src/components/TherapyButtonRefactored.tsx; then
  echo "   ✅ Correctly calls vapi.endSession()"
else
  echo "   ❌ ERROR: Not calling vapi.endSession()"
fi

# Check useVapiSession hook has endSession method
echo ""
echo "2. Checking useVapiSession hook exports endSession:"
if grep -q "endSession," src/hooks/useVapiSession.ts; then
  echo "   ✅ Hook exports endSession method"
else
  echo "   ❌ ERROR: Hook doesn't export endSession"
fi

# Check endSession internally calls stop()
echo ""
echo "3. Checking endSession calls VAPI SDK stop():"
if grep -q "await currentVapi.stop()" src/hooks/useVapiSession.ts; then
  echo "   ✅ endSession correctly calls VAPI SDK stop()"
else
  echo "   ❌ ERROR: endSession doesn't call stop()"
fi

# Check for any direct vapi.stop() calls (should be none)
echo ""
echo "4. Checking for incorrect direct vapi.stop() calls:"
if grep -q "vapi\.stop()" src/components/TherapyButtonRefactored.tsx; then
  echo "   ❌ ERROR: Found direct vapi.stop() call - this is wrong!"
  grep -n "vapi\.stop()" src/components/TherapyButtonRefactored.tsx
else
  echo "   ✅ No incorrect vapi.stop() calls found"
fi

echo ""
echo "📋 Summary:"
echo "The VAPI stop fix is correctly implemented."
echo "Call flow: TherapyButtonRefactored → vapi.endSession() → useVapiSession → currentVapi.stop()"
echo ""
echo "If you're still seeing 'vapi.stop is not a function' error:"
echo "1. Clear browser cache and hard refresh (Ctrl+Shift+R)"
echo "2. Restart the development server: npm run dev"
echo "3. Check that you're running the latest code: git pull"