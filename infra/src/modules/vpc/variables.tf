variable "az1" { }

variable "az2" { }

variable "az3" { }

variable "cidrBlock" { } // Expecting cidr string with "/16" suffix

variable "globalTags" {
  type = "map"
  default = {}
}

variable "project" { }

variable "rdsPort" { }

variable "region" { }

variable "whitelistCidr" {
  type = "list"
  default = []
}

variable "whitelistEnabled" {
  default = false
}