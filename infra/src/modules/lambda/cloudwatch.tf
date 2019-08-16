// Lambda creates this log group automatically, but adding it here ensures
// that 'terraform destroy' will remove it afterwards.
resource "aws_cloudwatch_log_group" "cwLogGroupLambdaFn" {
  name = "/aws/lambda/${var.project}-msg-consumer"
}
