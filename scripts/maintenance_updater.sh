#!/bin/bash

# --- CONFIGURATION ---
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$REPO_DIR/scripts/maintenance.log"
UPDATE_INTERVAL=900 # 15 minutes

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

log_message "Maintenance service started."

while true; do
    cd "$REPO_DIR"
    
    # Check for internet connection
    if ping -c 1 github.com &> /dev/null; then
        log_message "Checking for updates..."
        
        # Pull updates using reset to avoid merge conflicts
        git fetch --all >> "$LOG_FILE" 2>&1
        git reset --hard origin/main >> "$LOG_FILE" 2>&1
        
        if [ $? -eq 0 ]; then
            log_message "Update successful / No new updates."
        else
            log_message "Update failed. Check Git status."
        fi
    else
        log_message "No internet connection. Retrying later."
    fi
    
    sleep $UPDATE_INTERVAL
done
