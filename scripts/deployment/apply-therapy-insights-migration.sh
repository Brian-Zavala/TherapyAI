#!/bin/bash

echo "🔄 Applying TherapyInsight model migration..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
npm run prisma:generate

# Push schema changes to database
echo "🗄️ Pushing schema changes to database..."
npm run prisma:db:push

echo "✅ Migration complete!"

# Optional: Open Prisma Studio to verify
echo ""
echo "To verify the changes, you can run:"
echo "  npm run prisma studio"
echo ""
echo "Look for the TherapyInsight model in the data browser."