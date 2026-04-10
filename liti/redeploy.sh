#!/bin/bash

# Redeploy LITI with fixed history data format
# This script deploys the updated api_external.py with proper data structure

echo "🚀 Redeploying LITI with history data format fix..."

cd "$(dirname "$0")"

# Deploy to Cloud Run with both secrets
gcloud run deploy liti-workeron \
  --source . \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-secrets=OPENROUTER_API_KEY=openrouter-api-key:latest,WORKERON_API_KEY=workeron-api-key:latest

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🧪 Testing API..."
echo ""

# Test health check
curl https://liti-workeron-585551708702.europe-west1.run.app/api/health
echo ""
echo ""

# Test analyze endpoint
curl -X POST https://liti-workeron-585551708702.europe-west1.run.app/api/analyze-candidate \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Candidate",
    "email": "test@example.com",
    "resume": "Experienced software engineer with 5+ years in Python, JavaScript, and team leadership. Strong problem-solving skills and excellent communication abilities.",
    "interview_transcript": "During the interview, the candidate demonstrated excellent communication skills and deep technical knowledge. Shows strong leadership potential.",
    "vacancy": "Senior Software Engineer",
    "api_key": "workeron_api_key_2026_secure"
  }'

echo ""
echo ""
echo "✅ All done! LITI is ready to use."
