#!/bin/bash
# Run this from the infra/ folder.
# Runs any arbitrary terraform command with the convenience of
# preloading the AWS authentication in the envars file.

if [[ "$(basename $(pwd))" != "infra" ]]
then
  echo "ERROR: Please run this from the infra/ folder." >&2
  exit 1
fi

source bin/setTerraformEnvars.bash

cd src

run_cmd terraform $@
