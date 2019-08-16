#!/bin/bash
# Run this from the infra/ folder.
# Reads infra/*.tfplan and spins up or alters infrastructure to be in agreement with the plan.
# Removes the tfplan when done, whether or not the apply succeeded.

if [[ "$(basename $(pwd))" != "infra" ]]
then
  echo "ERROR: Please run this from the infra/ folder." >&2
  exit 1
fi

source bin/setTerraformEnvars.bash

cd src

run_cmd terraform apply "$TFPLAN_FILE"

# Even if the apply had errors and needed to be run again, you would still
# need to re-plan before doing apply again.  The plan is a binary file,
# you can't read it and learn why it failed, so no reason to keep it.
rm -rf "$TFPLAN_FILE"
echo "Removed tfplan file $TFPLAN_FILE"

