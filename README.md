# aws-perfmon-01

This is a demonstration of several AWS performance monitoring
techniques, using an example ECS/Kinesis/Lambda/RDS architecture
as the test subject for monitoring purposes.

The performance monitoring techniques:

* AWS CloudWatch Metrics and Logs
* AWS X-Ray
* AWS RDS Enhanced Monitoring & Performance Insights

The subject architecture:

* ECS compute instance: `msg-producer`, generates messages and
writes them to Kinesis.
* Kinesis stream
* Lambda function: `msg-consumer`, its event source is Kinesis,
and it "consumes" the messages by persisting them to the RDS
database.
* RDS Aurora MySQL

## How to build and run this project

### prerequisites

* You will need credentials for an AWS account, and an existing S3 bucket
for terraform state.
* Opt-in your AWS root account to the new ECS format for ARN and resource IDs
([AWS blog](https://aws.amazon.com/blogs/compute/migrating-your-amazon-ecs-deployment-to-the-new-arn-and-resource-id-format-2/):
this step is no longer needed after Jan 1, 2020).
* You need these executables on your PATH: node, terraform, aws, docker, jq,
and any mysql client.  (This was developed with node 10.15.3, terraform 0.12.4,
aws-cli 1.16.200, docker 18.09.4.)


### typescript builds

Build the producer and consumer apps:

```
cd msg-producer/
npm install
npm run patch
npm run build

cd msg-consumer/
npm install
npm run build
npm run dist
```
See more information in ./msg-producer/README.md and ./msg-consumer/README.md.

### terraform deployment

Customize the terraform environment with your AWS credentials:

```
cd infra/bin/
cp setTerraformEnvars-template.bash setTerraformEnvars.bash
vi setTerraformEnvars.bash
```

Edit `setTerraformEnvars.bash` and specify your AWS credentials
and so forth as documented there.

Now deploy the infrastructure with terraform:

```
cd infra/
bin/runTerraformInit.sh
bin/runTerraformPlan.sh
bin/runTerraformApply.sh
```

### docker push

The producer app is built as a docker image.

Customize the docker environment with your AWS credentials:
```
cd msg-producer/
cp buildECR-template.sh buildECR.sh
vi buildECR.sh
```

Edit `buildECR.sh` and specify your AWS account information there.

Now run the script to connect to ECR, build and push the docker
image for the producer app:

```
./buildECR.sh
```

### database schema setup

```
cd infra/
bin/mysqlCreateTable.sh
```

### run the experiment

The experiment runs as a one-time ECS task (the `msg-producer`).

```
cd infra/
bin/awsEcsRunTask.sh
```

Messages flow through the subject architecture and are captured
by the performance monitoring instrumentation.

### terraform teardown

When the project run is complete, at your leisure you can teardown
the AWS resources and stop getting billed for them.

```
cd infra
bin/runTerraformDestroy.sh
```

