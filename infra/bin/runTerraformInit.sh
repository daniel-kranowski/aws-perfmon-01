#!/bin/bash
# Run this from the infra/ folder.
# Initializes infra/.terraform/ folder.

if [[ "$(basename $(pwd))" != "infra" ]]
then
  echo "ERROR: Please run this from the infra/ folder." >&2
  exit 1
fi

source bin/setTerraformEnvars.bash

cd src

run_cmd terraform init \
    -reconfigure \
    -force-copy=true \
    -input=false \
    -backend-config="region=$AWS_REGION" \
    -backend-config="bucket=$AWS_S3_BUCKET" \
    -backend-config="key=$AWS_S3_KEY"

