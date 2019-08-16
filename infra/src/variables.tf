// These should have been set by "terraform -var" or envars in the terraform sub-shell.

variable "az1" { }

variable "az2" { }

variable "az3" { }

variable "globalTags" {
  type = "map"
  default = {}
}

variable "project" { }

variable "rdsMasterPassword" { }

variable "region" { }


// The following have defaults, so the parent shell can set them only if desired.
// "rds" prefix is for AWS-specific variables, "db" prefix is for client-specific variables.

variable "cwmetricsCustomMetricNameNumEventRec" {
  default = "NumEventRecords"
}

variable "cwmetricsCustomMetricNameNumUserRec" {
  default = "NumUserRecords"
}

variable "cwmetricsCustomMetricNamePropDelay" {
  default = "SystemPropagationDelay"
}

variable "cwmetricsCustomNamespace" {
  default = "aws-perfmon-01-ns"
}

variable "dbConnectionLimit" {
  default = 10
  description = "Maximum concurrent database connections in the msg-consumer mysql client."
}

variable "dbQueryTimeout" {
  default = 1000
  description = "Milliseconds the msg-consumer mysql client will wait on a query."
}

variable "kinesisShardCount" {
  default = "4"
}

variable "lambdaBatchSize" {
  default = 1
  description = "Max num event records to pass to a Lambda function at invocation."
}

variable "lambdaMemorySize" {
  default = 128
  description = "Measured in MB"
}

variable "lambdaTimeout" {
  default = 30
  description = "Seconds before Lambda function self-terminates"
}

variable "rdsDatabaseName" {
  default = "msgdb"
}

variable "rdsInstanceClass" {
  default = "db.r5.large"  // Minimum db inst class supported for RDS-PI on Aurora MySQL
}

variable "rdsMasterUsername" {
  default = "master"
}

variable "rdsPort" {
  default = "3306"
}

variable "whitelistCidr" {
  type = "list"
  default = []
}

variable "whitelistEnabled" {
  default = false
}
