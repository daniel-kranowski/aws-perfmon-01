terraform {
  backend "s3" { }
}

// https://www.terraform.io/docs/providers/aws/index.html
// No need to specify region, profile, access keys here,
// assuming appropriate AWS envars exist during plan and apply.
provider "aws" {
  version = "2.19.0"
}

// For template_file
provider "template" {
  version = "2.1.2"
}

module "fargateCluster" {
  source = "./modules/fargate"

  globalTags = "${var.globalTags}"
  project = "${var.project}"
  region = "${var.region}"
  taskCommand = [
    "--batchSize", "45",
    "--initialSleep", "0",
    "--intervalSleepMillis", "1000",
    "--msgSize", "100",
    "--numBatches", "${var.kinesisShardCount}",
    "--numIntervals", "60",
    "--streamName", "${module.kinesisStream.kinesisStreamName}",
  ]
  taskCpu = 256
  taskMemory = 512
  taskImageUrl = "${aws_ecr_repository.ecrRepoMsgProducer.repository_url}" // Default tag is ":latest"
}

module "kinesisStream" {
  source = "./modules/kinesis"

  globalTags = "${var.globalTags}"
  project = "${var.project}"
  shardCount = "${var.kinesisShardCount}"
}

module "lambdaFunction" {
  source = "./modules/lambda"

  batchSize = "${var.lambdaBatchSize}"
  envars = "${merge(local.lambdaEnvars)}"
  globalTags = "${var.globalTags}"
  handler = "index.msgConsumer"
  kinesisEventSourceArn = "${module.kinesisStream.kinesisArn}"
  memorySize = var.lambdaMemorySize
  project = "${var.project}"
  runtime = "nodejs10.x"
  securityGroupIds = [ "${module.vpc.sgVpcId}", "${module.vpc.sgLambdaId}" ]
  subnetIds = [ "${module.vpc.subnetIdPrivate1}", "${module.vpc.subnetIdPrivate2}" ]
  timeout = "${var.lambdaTimeout}"
  zipFilename = "../../msg-consumer/dist/msg-consumer.zip"
}

locals {
  lambdaEnvars = "${map(
    "CWMETRICS_CUSTOM_METRIC_NAME_NUM_EVENT_REC", "${var.cwmetricsCustomMetricNameNumEventRec}",
    "CWMETRICS_CUSTOM_METRIC_NAME_NUM_USER_REC", "${var.cwmetricsCustomMetricNameNumUserRec}",
    "CWMETRICS_CUSTOM_METRIC_NAME_PROP_DELAY", "${var.cwmetricsCustomMetricNamePropDelay}",
    "CWMETRICS_CUSTOM_NAMESPACE", "${var.cwmetricsCustomNamespace}",
    "DB_CONNECTION_LIMIT", "${var.dbConnectionLimit}",
    "DB_ENDPOINT", "${module.rdsCluster.rdsClusterEndpoint}",
    "DB_NAME", "${var.rdsDatabaseName}",
    "DB_PASSWORD", "${var.rdsMasterPassword}",
    "DB_PORT", "${var.rdsPort}",
    "DB_QUERY_TIMEOUT", "${var.dbQueryTimeout}",
    "DB_USERNAME", "${var.rdsMasterUsername}",
    "VERBOSE", true
  )}"
}

module "rdsCluster" {
  source = "./modules/rds"

  az1 = "${var.az1}"
  az2 = "${var.az2}"
  az3 = "${var.az3}"
  databaseName = "${var.rdsDatabaseName}"
  globalTags = "${var.globalTags}"
  instanceClass = "${var.rdsInstanceClass}"
  masterPassword = "${var.rdsMasterPassword}"
  masterUsername = "${var.rdsMasterUsername}"
  port = "${var.rdsPort}"
  project = "${var.project}"
  securityGroupId = "${module.vpc.sgRdsId}"
  subnetId1 = "${module.vpc.subnetIdPublic1}"
  subnetId2 = "${module.vpc.subnetIdPublic2}"
  subnetId3 = "${module.vpc.subnetIdPublic3}"
}

module "vpc" {
  source = "./modules/vpc"

  az1 = "${var.az1}"
  az2 = "${var.az2}"
  az3 = "${var.az3}"
  cidrBlock = "10.30.0.0/16"
  project = "${var.project}"
  globalTags = "${var.globalTags}"
  rdsPort = "${var.rdsPort}"
  region = "${var.region}"
  whitelistCidr = "${var.whitelistCidr}"
  whitelistEnabled = "${var.whitelistEnabled}"
}
