# AWS cost

Figures shown are based on region us-west-2, as of 2019.

## AWS at-rest cost

The primary contributors to the at-rest cost of this infrastructure are:

* RDS Aurora MySQL
    * db.r5.large $0.29/hr = $6.96/day.
    * This is the minimum size instance type required to run
      RDS Performance Insights.
    * The Terraform spins up a cluster with just 1 db instance.
      The config here does not have a variable to add more instances.
* NAT Gateway
    * $0.045/hr = $1.08/day.
    * One per Lambda subnet.
* Kinesis
    * $0.015/shard-hr
    * Terraform variable `kinesisShardCount`.

## Incremental cost of the experiment

The primary incremental cost of the experiment, in addition to the "at-rest"
hourly cost, would be Lambda duration + request cost, and Kinesis PUT payloads.

With requests and payloads less than a million, the costs appear to be
negligible.

### Counting Kinesis PUT payloads

We can count Kinesis PUT payloads based on the parameters of the experiment
which are set in `awsEcsRunTask.sh` (for `msg-producer`).  An example:

* `intervalSleepMillis`: 1000 (msg-producer wakes up 1x/sec)
* `numIntervals`: 3600 (1 hour)
* `batchSize`: 10 (this many user messages per shard per interval)
* `numBatches` = `kinesisShardCount`: 4
* `msgSize`: 100 bytes (therefore approx 10 x 100 = 1KB per batch, uses a single
25KB Kinesis PUT payload)

Total Kinesis PUT payloads = 3,600 x 4 = 14,400.  These are priced at
$0.14 per million, so incremental cost here is negligible.

#### msg-producer pseudocode

`msg-producer` runs as a Fargate task, invoked with `awsEcsRunTask.sh`.

* Periodically wake up after an interval of sleep
* For each interval:
    * For each Kinesis shard
        * Generate a batch of user messages, count = `batchSize`.
        * Aggregate the messages and put to Kinesis. 

### Counting Lambda duration (GB-sec)

Beyond the 400,000 GB-sec/mo which are free, additional Lambda duration
cost is $0.0000166667 per GB-sec.

Experimentally, with Lambda batchSize 1 (num Kinesis PUT payloads per Lambda
invocation) and msg-producer batchSize 2 (num user records per PUT payload),
I have seen average Lambda duration around 300 ms.

Example:

* Number of Kinesis PUT payloads = Num Lambda invocations: 14,400
* Lambda memory size: 128 MB
* Average Lambda duration: 300 ms 

Total Lambda duration cost = 14400 x (128 / 1024) x 0.300 = 540 GB-sec.  Would have
to run this experiment 400,000 / 540 = 741 times to exceed the monthly free duration.

## Additional costs not analyzed, not considered significant

* CloudWatch Logs storage: ECS, Lambda logs; RDS-EM RDSOSMetrics
* CloudWatch Metrics put
* Data transfer out
* ECR storage
* RDS storage
* S3 storage (terraform state)
* X-Ray traces stored, retrieved, scanned
