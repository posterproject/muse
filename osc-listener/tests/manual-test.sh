#!/bin/bash

# This script performs a series of curl commands to test the session management functionality
# of the OSC listener server. It's a manual alternative to the Jest integration tests.

SERVER="http://localhost:3001"
GREEN="\033[0;32m"
RED="\033[0;31m"
BLUE="\033[0;34m"
YELLOW="\033[1;33m"
NC="\033[0m" # No Color

# Function to display results
show_result() {
  echo -e "${BLUE}Command:${NC} $1"
  echo -e "${YELLOW}Response:${NC}"
  echo "$2" | jq '.'
  echo ""
}

echo -e "${GREEN}Starting OSC Listener Session Management Tests${NC}"
echo -e "Ensure the server is running with: npm run server\n"

# 1. Check initial status (server not running)
echo -e "${GREEN}1. Checking server status (should be not running)${NC}"
RESPONSE=$(curl -s $SERVER/api/status)
show_result "curl $SERVER/api/status" "$RESPONSE"

# 2. Start the server
echo -e "${GREEN}2. Starting the server with first client${NC}"
RESPONSE=$(curl -s -X POST $SERVER/api/start -d '{"localAddress": "0.0.0.0", "localPort": 9005, "updateRate": 1}' -H "Content-Type: application/json")
show_result "curl -X POST $SERVER/api/start -d '{\"localAddress\": \"0.0.0.0\", \"localPort\": 9005, \"updateRate\": 1}' -H \"Content-Type: application/json\"" "$RESPONSE"

# Extract session ID
SESSION_ID_1=$(echo $RESPONSE | jq -r '.sessionId')
echo -e "Session ID 1: $SESSION_ID_1"

# 3. Check status (server running)
echo -e "${GREEN}3. Checking server status (should be running)${NC}"
RESPONSE=$(curl -s $SERVER/api/status)
show_result "curl $SERVER/api/status" "$RESPONSE"

# 4. Try to start again with different config
echo -e "${GREEN}4. Trying to start with a different config (should be ignored)${NC}"
RESPONSE=$(curl -s -X POST $SERVER/api/start -d '{"localAddress": "127.0.0.1", "localPort": 9006, "updateRate": 2}' -H "Content-Type: application/json")
show_result "curl -X POST $SERVER/api/start -d '{\"localAddress\": \"127.0.0.1\", \"localPort\": 9006, \"updateRate\": 2}' -H \"Content-Type: application/json\"" "$RESPONSE"

# Extract second session ID
SESSION_ID_2=$(echo $RESPONSE | jq -r '.sessionId')
echo -e "Session ID 2: $SESSION_ID_2"

# 5. Check status (server running with 2 sessions)
echo -e "${GREEN}5. Checking server status (should show 2 sessions)${NC}"
RESPONSE=$(curl -s $SERVER/api/status)
show_result "curl $SERVER/api/status" "$RESPONSE"

# 6. Stop first client
echo -e "${GREEN}6. Stopping first client (server should keep running)${NC}"
RESPONSE=$(curl -s -X POST $SERVER/api/stop -d "{\"sessionId\": \"$SESSION_ID_1\"}" -H "Content-Type: application/json")
show_result "curl -X POST $SERVER/api/stop -d '{\"sessionId\": \"$SESSION_ID_1\"}' -H \"Content-Type: application/json\"" "$RESPONSE"

# 7. Check status (server running with 1 session)
echo -e "${GREEN}7. Checking server status (should show 1 session)${NC}"
RESPONSE=$(curl -s $SERVER/api/status)
show_result "curl $SERVER/api/status" "$RESPONSE"

# 8. Stop second client
echo -e "${GREEN}8. Stopping second client (server should stop)${NC}"
RESPONSE=$(curl -s -X POST $SERVER/api/stop -d "{\"sessionId\": \"$SESSION_ID_2\"}" -H "Content-Type: application/json")
show_result "curl -X POST $SERVER/api/stop -d '{\"sessionId\": \"$SESSION_ID_2\"}' -H \"Content-Type: application/json\"" "$RESPONSE"

# 9. Check status (server should be stopped)
echo -e "${GREEN}9. Checking server status (should be not running)${NC}"
RESPONSE=$(curl -s $SERVER/api/status)
show_result "curl $SERVER/api/status" "$RESPONSE"

# 10. Try to stop again (should return already stopped)
echo -e "${GREEN}10. Trying to stop again (should say already stopped)${NC}"
RESPONSE=$(curl -s -X POST $SERVER/api/stop -H "Content-Type: application/json")
show_result "curl -X POST $SERVER/api/stop -H \"Content-Type: application/json\"" "$RESPONSE"

echo -e "${GREEN}Tests completed${NC}" 