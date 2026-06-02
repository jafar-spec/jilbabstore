#!/bin/bash

# Ensure we are in the project root
cd /Users/jafarsalama/jilbabstore

# Read .env.local and push each variable to Vercel Production
cat .env.local | grep -v '^#' | grep -v '^$' | while read -r line; do
  key=$(echo "$line" | cut -d '=' -f 1)
  value=$(echo "$line" | cut -d '=' -f 2-)
  
  # Remove surrounding single or double quotes
  value=$(echo "$value" | sed -e "s/^'//" -e "s/'$//" -e 's/^"//' -e 's/"$//')
  
  if [ -n "$key" ]; then
    echo "Pushing $key to Vercel Production..."
    echo -n "$value" | npx -y vercel@latest env add $key production --scope jilbabstore
  fi
done

echo "All environment variables pushed to Vercel!"
