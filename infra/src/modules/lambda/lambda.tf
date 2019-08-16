resource "aws_lambda_function" "lambdaFunction" {
  environment {
    variables = "${var.envars}"
  }
  filename = "${var.zipFilename}"
  function_name = "${var.project}-msg-consumer"
  handler = "${var.handler}"
  memory_size = var.memorySize
  role = "${aws_iam_role.lambdaExecutionRole.arn}"
  runtime = "${var.runtime}"
  source_code_hash = "${filebase64sha256(var.zipFilename)}"
  timeout = "${var.timeout}"
  tags = "${var.globalTags}"
  tracing_config {
    mode = "Active"
  }
  vpc_config {
    security_group_ids = var.securityGroupIds
    subnet_ids = var.subnetIds
  }
}

resource "aws_lambda_event_source_mapping" "lambdaKinesisEventSource" {
  batch_size = "${var.batchSize}"
  event_source_arn = "${var.kinesisEventSourceArn}"
  function_name = "${aws_lambda_function.lambdaFunction.arn}"
  starting_position = "LATEST"
}

output "lambdaArn" {
  value = aws_lambda_function.lambdaFunction.arn
}