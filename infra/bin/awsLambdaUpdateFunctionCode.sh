#!/bin/bash
# Starts a single-run task in the ECS cluster.
# Obtains aws ids by reading remote terraform state.

source bin/setTerraformEnvars.bash

cd src

TMP_STATE_FILE=/tmp/terraform.tfstate.$$
run_cmd bash -c "terraform show -json > $TMP_STATE_FILE"

FUNCTION_NAME=$(
  jq '.values.root_module.child_modules[] | select (.address | test("module.lambdaFunction")) | .resources[] | select (.address | test("aws_lambda_function.lambdaFunction")) | .values.function_name' $TMP_STATE_FILE -r)
ZIP_FILENAME=$(
  jq '.values.root_module.child_modules[] | select (.address | test("module.lambdaFunction")) | .resources[] | select (.address | test("aws_lambda_function.lambdaFunction")) | .values.filename' $TMP_STATE_FILE -r)

echo FUNCTION_NAME=$FUNCTION_NAME
echo ZIP_FILENAME=$ZIP_FILENAME
echo ""

if [[ ${ZIP_FILENAME:0:8} != "fileb://" ]]
then
  echo "Adding fileb:// prefix to ZIP_FILENAME"
  ZIP_FILENAME=fileb://${ZIP_FILENAME}
fi

run_cmd aws lambda update-function-code \
  --function-name $FUNCTION_NAME \
  --zip-file $ZIP_FILENAME \
  --no-publish

# May want to update lambda tags as well
