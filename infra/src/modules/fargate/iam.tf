resource "aws_iam_role" "ecsTaskRole" {
  assume_role_policy = "${data.aws_iam_policy_document.ecsTasksTrust.json}"
  name = "${var.project}-ecsTaskRole"
  tags = "${var.globalTags}"
}

resource "aws_iam_role_policy_attachment" "ecsTaskRoleTask1PolicyAttach" {
  role = "${aws_iam_role.ecsTaskRole.name}"
  policy_arn = "${data.aws_iam_policy.AdministratorAccess.arn}"
}

resource "aws_iam_role" "ecsTaskExecutionRole" {
  assume_role_policy = "${data.aws_iam_policy_document.ecsTasksTrust.json}"
  name = "${var.project}-ecsTaskExecutionRole"
  tags = "${var.globalTags}"
}

resource "aws_iam_role_policy_attachment" "ecsTaskExecutionRolePolicyAttach" {
  role = "${aws_iam_role.ecsTaskExecutionRole.name}"
  policy_arn = "${data.aws_iam_policy.AmazonECSTaskExecutionRolePolicy.arn}"
}

data "aws_iam_policy" "AdministratorAccess" {
  arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

data "aws_iam_policy" "AmazonECSTaskExecutionRolePolicy" {
  arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "ecsTasksTrust" {
  statement {
    actions = [
      "sts:AssumeRole"
    ]
    effect = "Allow"
    principals {
      identifiers = [
        "ecs-tasks.amazonaws.com"
      ]
      type = "Service"
    }
  }
}
