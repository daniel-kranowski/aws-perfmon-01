# terraform: main

ECR, CloudWatch, and X-Ray configs are separate from the other modules
to make resource targeting easier during terraform destroy.  We'd like
to destroy Kinesis and the database immediately after the experiment runs,
since they cost money just to stay up, but we'd like to leave the logs
and performance diagnostics around longer, until manual analysis is done.