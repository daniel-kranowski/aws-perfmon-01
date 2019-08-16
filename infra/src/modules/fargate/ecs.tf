resource "aws_ecs_cluster" "ecsCluster" {
  name = "${var.project}-fargate"
  tags = "${var.globalTags}"
}

resource "aws_ecs_task_definition" "ecsTask1" {
  family = "${var.project}-task1"
  container_definitions = "${data.template_file.ecsTaskContainerDefinitions.rendered}"
  cpu = "${var.taskCpu}"
  execution_role_arn = "${aws_iam_role.ecsTaskExecutionRole.arn}"
  memory = "${var.taskMemory}"
  network_mode = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  task_role_arn = "${aws_iam_role.ecsTaskRole.arn}"
  tags = "${var.globalTags}"
}

data "template_file" "ecsTaskContainerDefinitions" {
  template = "${file("${path.module}/container-definition.json-tpl")}"
  vars = {
    cloudwatchLogGroup = "${aws_cloudwatch_log_group.cwLogGroupMsgProducer.name}"
    project = "${var.project}"
    region = "${var.region}"
    taskCommand = "${jsonencode(var.taskCommand)}"
    taskImageUrl = "${var.taskImageUrl}"
  }
}

# Not declaring an aws_ecs_service, since the cluster is only for a single run task
# that we will launch later with a bash script.