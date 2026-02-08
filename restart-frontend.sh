#!/usr/bin/env bash

# Load nvm if it exists
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd /home/x1/PM_NET/apps/CORE_UI/frontend

# Kill existing frontend process
pkill -f "next dev" 2>/dev/null || true
sleep 1

# Start frontend in new terminal
gnome-terminal --title="CORE_UI_Frontend" -- bash -c "npm run dev; echo; echo '[Process exited] Press Enter to close...'; read"

echo "Frontend restarted in new terminal window"
