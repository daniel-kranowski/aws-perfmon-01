resource "aws_ecr_repository" "ecrRepoMsgProducer" {
  name = "${var.project}-msg-producer"
  tags = "${var.globalTags}"
}
