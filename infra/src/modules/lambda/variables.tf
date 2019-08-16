variable "batchSize" { }

variable "envars" {
  type = "map"
  default = {}
}

variable "globalTags" {
  type = "map"
  default = {}
}

variable "handler" { }

variable "kinesisEventSourceArn" { }

variable "memorySize" { }

variable "project" { }

variable "runtime" { }

variable "securityGroupIds" {
  type = "list"
  default = []
}

variable "subnetIds" {
  type = "list"
  default = []
}

variable "timeout" { }

variable "zipFilename" { }