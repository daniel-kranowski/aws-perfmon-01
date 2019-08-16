#!/bin/bash
# Run this from the infra/ folder.
# Analyzes infra/src/ terraform config and writes infra/*.tfplan

if [[ "$(basename $(pwd))" != "infra" ]]
then
  echo "ERROR: Please run this from the infra/ folder." >&2
  exit 1
fi

source bin/setTerraformEnvars.bash

cd src

if [ -e "$TFPLAN_FILE" ]
then
  echo "Removing old tfplan file $TFPLAN_FILE"
  rm -rf "$TFPLAN_FILE"
fi

run_cmd terraform plan -out="$TFPLAN_FILE"
