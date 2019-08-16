resource "aws_iam_role" "lambdaExecutionRole" {
  assume_role_policy = "${data.aws_iam_policy_document.lambdaTrust.json}"
  name = "${var.project}-lambdaRole"
  tags = "${var.globalTags}"
}

resource "aws_iam_role_policy_attachment" "lambdaRolePolicyAttach" {
  role = "${aws_iam_role.lambdaExecutionRole.name}"
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

data "aws_iam_policy_document" "lambdaTrust" {
  statement {
    actions = [
      "sts:AssumeRole"
    ]
    effect = "Allow"
    principals {
      identifiers = [
        "lambda.amazonaws.com"
      ]
      type = "Service"
    }
  }
}
