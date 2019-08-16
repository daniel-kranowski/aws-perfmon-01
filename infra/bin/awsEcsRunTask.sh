#!/bin/bash
# Starts a single-run task in the ECS cluster.
# Obtains aws ids by reading remote terraform state.

source bin/setTerraformEnvars.bash

cd src

TMP_STATE_FILE=/tmp/terraform.tfstate.$$
run_cmd bash -c "terraform show -json > $TMP_STATE_FILE"

CLUSTER_NAME=$(
  jq '.values.root_module.child_modules[] | select (.address | test("module.fargateCluster")) | .resources[] | select (.address | test("aws_ecs_cluster.ecsCluster")) | .values.name' $TMP_STATE_FILE -r)
CLUSTER_TAGS=$(
  jq '.values.root_module.child_modules[] | select (.address | test("module.fargateCluster")) | .resources[] | select (.address | test("aws_ecs_cluster.ecsCluster")) | .values.tags | [ to_entries[] | { "key": .key, "value": .value } ]' $TMP_STATE_FILE -c)
TASK_DEFINITION_NAME=$(
  jq '.values.root_module.child_modules[] | select (.address | test("module.fargateCluster")) | .resources[] | select (.address | test("aws_ecs_task_definition.ecsTask1")) | .values.family' $TMP_STATE_FILE -r)
TASK_SUBNET_ID=$(
  jq '.values.root_module.child_modules[] | select (.address | test("module.vpc")) | .resources[] | select (.address | test("aws_subnet.subnetPublic1")) | .values.id' $TMP_STATE_FILE -r)
SG_TASK_ID=$(
  jq '.values.root_module.child_modules[] | select (.address | test("module.vpc")) | .resources[] | select (.address | test("aws_security_group.sgTask")) | .values.id' $TMP_STATE_FILE -r)
SG_VPC_ID=$(
  jq '.values.root_module.child_modules[] | select (.address | test("module.vpc")) | .resources[] | select (.address | test("aws_default_security_group.sgVpc")) | .values.id' $TMP_STATE_FILE -r)

echo CLUSTER_NAME=$CLUSTER_NAME
echo CLUSTER_TAGS=$CLUSTER_TAGS
echo TASK_DEFINITION_NAME=$TASK_DEFINITION_NAME
echo TASK_SUBNET_ID=$TASK_SUBNET_ID
echo SG_TASK_ID=$SG_TASK_ID
echo SG_VPC_ID=$SG_VPC_ID
echo ""

ENABLE_OVERRIDES=1
OPT_OVERRIDES=
OPT_OVERRIDES_SWITCH=
if [[ $ENABLE_OVERRIDES = 1 ]]
then
  CONTAINER_NAME=$(
    jq '.values.root_module.child_modules[] | select (.address | test("module.fargateCluster")) | .resources[] | select (.address | test("aws_ecs_task_definition.ecsTask1")) | .values.container_definitions' $TMP_STATE_FILE -r | jq '.[0].name' -r)
  KINESIS_SHARD_COUNT=$(
    jq '.values.root_module.child_modules[] | select (.address | test("module.kinesisStream")) | .resources[] | select (.address | test("aws_kinesis_stream.kinesisStream")) | .values.shard_count' $TMP_STATE_FILE -r)
  KINESIS_STREAM_NAME=$(
    jq '.values.root_module.child_modules[] | select (.address | test("module.kinesisStream")) | .resources[] | select (.address | test("aws_kinesis_stream.kinesisStream")) | .values.name' $TMP_STATE_FILE -r)
  echo CONTAINER_NAME=$CONTAINER_NAME
  echo KINESIS_SHARD_COUNT=$KINESIS_SHARD_COUNT
  echo KINESIS_STREAM_NAME=$KINESIS_STREAM_NAME
  echo ""

  OPT_OVERRIDES_SWITCH=--overrides
  OPT_OVERRIDES='{
    "containerOverrides": [
      {
        "command": [
          "--batchSize", "2",
          "--initialSleep", "0",
          "--intervalSleepMillis", "1000",
          "--msgSize", "100",
          "--numBatches", "'$KINESIS_SHARD_COUNT'",
          "--numIntervals", "3600",
          "--streamName", "'$KINESIS_STREAM_NAME'",
          "--verbose"
        ],
        "name": "'$CONTAINER_NAME'"
      }
    ]
  }'
fi

run_cmd aws ecs run-task \
  --cluster $CLUSTER_NAME \
  --task-definition $TASK_DEFINITION_NAME \
  --count 1 \
  --launch-type FARGATE \
  --network-configuration '{
      "awsvpcConfiguration": {
        "subnets": ["'$TASK_SUBNET_ID'"],
        "securityGroups": ["'$SG_TASK_ID'", "'$SG_VPC_ID'"],
        "assignPublicIp": "ENABLED"
      }
    }' \
   --tags "$CLUSTER_TAGS" \
   --enable-ecs-managed-tags \
   $OPT_OVERRIDES_SWITCH "$OPT_OVERRIDES"
