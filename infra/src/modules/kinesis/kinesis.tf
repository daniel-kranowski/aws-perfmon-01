resource "aws_kinesis_stream" "kinesisStream" {
  name = "${var.project}-kinesisStream"
  shard_count = "${var.shardCount}"
  tags = "${var.globalTags}"
}

output "kinesisArn" {
  value = aws_kinesis_stream.kinesisStream.arn
}

output "kinesisStreamName" {
  value = aws_kinesis_stream.kinesisStream.name
}