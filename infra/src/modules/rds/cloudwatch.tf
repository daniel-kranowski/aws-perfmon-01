// RDS-EM creates this log group automatically, but adding it here ensures
// that 'terraform destroy' will remove it afterwards.
resource "aws_cloudwatch_log_group" "cwLogGroupRdsEnhancedMonitoring" {
  name = "RDSOSMetrics"
}
