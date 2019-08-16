#!/bin/bash
# Run this from the infra/ folder.
# Destroys any running infrastructure managed by the terraform configs.
# The actual 'destroy' cmd below will ask "Do you really want to destroy?"

if [[ "$(basename $(pwd))" != "infra" ]]
then
  echo "ERROR: Please run this from the infra/ folder." >&2
  exit 1
fi

source bin/setTerraformEnvars.bash

cd src

run_cmd terraform destroy

