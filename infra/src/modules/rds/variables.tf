variable "az1" { }

variable "az2" { }

variable "az3" { }

variable "databaseName" { }

variable "globalTags" {
  type = "map"
  default = {}
}

variable "instanceClass" { }

variable "masterPassword" { }

variable "masterUsername" { }

variable "port" { }

variable "project" { }

variable "securityGroupId" { }

variable "subnetId1" { }

variable "subnetId2" { }

variable "subnetId3" { }

// Pre-set variables

variable "autoMinorVersionUpgrade" {
  default = true
}

variable "backupRetentionPeriod" {
  default = 1
}

variable "clusterParameterGroupName" {
  default = "default.aurora5.6"
}

variable "copyTagsToSnapshot" {
  default = true
}

variable "deletionProtection" {
  default = false
}

variable "engine" {
  default = "aurora" // 5.6
}

variable "engineVersion" {
  default = "5.6.mysql_aurora.1.19.2"
}

variable "monitoringInterval" {
  default = 60
  description = "RDS Enhanced Monitoring is enabled at the instance level, by setting monitoring_interval to a value greater than 0."
}

variable "parameterGroupName" {
  default = "default.aurora5.6"
}

variable "performanceInsightsEnabled" {
  default = true
  description = "RDS Performance Insights is enabled at the instance level, by setting performance_insights_enabled to true."
}

variable "preferredBackupWindow" {
  default = "07:00-09:00"
}

variable "preferredMaintenanceWindow" {
  default = "Mon:09:00-Mon:11:00"
}

variable "publiclyAccessible" {
  default = true
}

variable "skipFinalSnapshot" {
  default = true
}

variable "storageEncrypted" {
  default = false
}