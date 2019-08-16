#!/bin/bash
# Uses the mysql client binary to connect to the RDS Aurora cluster on its public IP.
# Obtains connection info by reading remote terraform state.

which mysql 2>&1 > /dev/null
if [[ $? != 0 ]]
then
  echo "mysql command-line client is missing from your PATH, you must install it."
  exit 1
fi

source bin/setTerraformEnvars.bash

cd src

TMP_STATE_FILE=/tmp/terraform.tfstate.$$
run_cmd bash -c "terraform show -json > $TMP_STATE_FILE"

DB_ENDPOINT=$(
  jq '.values.root_module.child_modules[] | select (.address | test("module.rdsCluster")) | .resources[] | select (.address | test("aws_rds_cluster.rdsCluster")) | .values.endpoint' $TMP_STATE_FILE -r)
DB_NAME=$(
  jq '.values.root_module.child_modules[] | select (.address | test("module.rdsCluster")) | .resources[] | select (.address | test("aws_rds_cluster.rdsCluster")) | .values.database_name' $TMP_STATE_FILE -r)
DB_PASSWORD=$(
  jq '.values.root_module.child_modules[] | select (.address | test("module.rdsCluster")) | .resources[] | select (.address | test("aws_rds_cluster.rdsCluster")) | .values.master_password' $TMP_STATE_FILE -r)
DB_PORT=$(
  jq '.values.root_module.child_modules[] | select (.address | test("module.rdsCluster")) | .resources[] | select (.address | test("aws_rds_cluster.rdsCluster")) | .values.port' $TMP_STATE_FILE -r)
DB_USERNAME=$(
  jq '.values.root_module.child_modules[] | select (.address | test("module.rdsCluster")) | .resources[] | select (.address | test("aws_rds_cluster.rdsCluster")) | .values.master_username' $TMP_STATE_FILE -r)

echo DB_ENDPOINT=$DB_ENDPOINT
echo DB_NAME=$DB_NAME
echo DB_PORT=$DB_PORT
echo DB_USERNAME=$DB_USERNAME
echo ""

SQL_SCRIPT=../../database/createTable.sql

run_cmd bash -c "mysql -u $DB_USERNAME -p"$DB_PASSWORD" -D $DB_NAME -h $DB_ENDPOINT -P $DB_PORT < $SQL_SCRIPT"

echo "Result: $?"
