// ECS won't spinup the Log Group, we must specify it.
resource "aws_cloudwatch_log_group" "cwLogGroupMsgProducer" {
  name = "/ecs/${var.project}-msg-producer"
}
