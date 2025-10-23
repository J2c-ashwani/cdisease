#!/bin/bash

echo "🔍 Verifying Backend Structure..."
backend_files=(
    "backend/app/main.py"
    "backend/app/models/chat_session.py"
    "backend/app/services/chat_service.py"
    "backend/app/api/v1/chat.py"
    "backend/app/constants/chat_questions.py"
)

for file in "${backend_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - MISSING"
    fi
done

echo ""
echo "🔍 Verifying Frontend Structure..."
frontend_files=(
    "frontend/src/features/chat/components/ChatBot.jsx"
    "frontend/src/features/chat/pages/ChatSession.jsx"
    "frontend/src/services/chatService.js"
    "frontend/src/hooks/useChat.js"
)

for file in "${frontend_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - MISSING"
    fi
done

echo ""
echo "📊 Backend file count: $(find backend/app -type f -name '*.py' | wc -l) Python files"
echo "📊 Frontend file count: $(find frontend/src -type f \( -name '*.jsx' -o -name '*.js' \) 2>/dev/null | wc -l) JS/JSX files"
