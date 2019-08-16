resource "aws_iam_role" "rdsEnhancedMonitoringRole" {
  assume_role_policy = "${data.aws_iam_policy_document.rdsMonitoringTrust.json}"
  name = "${var.project}-rdsEnhancedMonitoringRole"
  tags = "${var.globalTags}"
}

resource "aws_iam_role_policy_attachment" "rdsEnhancedMonitoringRolePolicyAttach" {
  role = "${aws_iam_role.rdsEnhancedMonitoringRole.name}"
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

data "aws_iam_policy_document" "rdsMonitoringTrust" {
  statement {
    actions = [
      "sts:AssumeRole"
    ]
    effect = "Allow"
    principals {
      identifiers = [
        "monitoring.rds.amazonaws.com"
      ]
      type = "Service"
    }
  }
}