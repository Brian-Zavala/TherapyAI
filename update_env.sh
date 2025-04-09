# Script to add Vapi assistant IDs and voice IDs to .env.local
# Run this script with: bash update_env.sh

# Check if .env.local exists
if [ \! -f .env.local ]; then
  echo "Creating .env.local file..."
  touch .env.local
else
  echo "Appending to existing .env.local file..."
fi

# Add a section header
echo -e "\n# Vapi Assistant IDs" >> .env.local

# Add assistant IDs
echo "NEXT_PUBLIC_VAPI_COUPLE_ASSISTANT_ID=f6844388-f547-40af-994e-4edf076f7e9c" >> .env.local
echo "NEXT_PUBLIC_VAPI_INDIVIDUAL_ASSISTANT_ID=4a9d4d49-3294-4be7-9537-9537d503bfb4" >> .env.local
echo "NEXT_PUBLIC_VAPI_FAMILY_ASSISTANT_ID=a22ad88a-0a5b-455e-ab41-f8c6802092bb" >> .env.local

# Add voice IDs
echo -e "\n# Vapi Voice IDs" >> .env.local
echo "NEXT_PUBLIC_VAPI_MAYA_VOICE_ID=Crm8VULvkVs5ZBDa1lxm" >> .env.local
echo "NEXT_PUBLIC_VAPI_ELLIOT_VOICE_ID=Elliot" >> .env.local
echo "NEXT_PUBLIC_VAPI_JADA_VOICE_ID=oWAxZDx7w5VEj9dCyTzz" >> .env.local

echo "Environment variables added to .env.local successfully\!"

