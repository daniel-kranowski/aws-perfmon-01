#!/bin/bash
# After doing 'npm run build', try this to see how the msg-producer works.
# Add -v option for more verbosity.

node build/lib/index.js \
  --batchSize 4 \
  --dryRun \
  --initialSleep 500 \
  --msgSize 100 \
  --numBatches 2 \
  --streamName foo
