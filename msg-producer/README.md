# msg-producer

`msg-producer` is a command-line app that generates a finite sequence of
random messages and puts them on a Kinesis data stream at a specified frequency.

## How to build and test

The following compiles to the ./build dir, so you can run and test the app
locally:

```
cd msg-producer/
npm install
npm run patch
npm run build
npm run test     # or: DEBUG=true npm run test
```

We also have a Dockerfile and a template script to do a docker build and
push to an AWS ECR repository.  Customize the script first:

```
cp buildECR-template.sh buildECR.sh
vi buildECR.sh
```
Edit buildECR.sh and specify your AWS account information there.
Now you can use the script to build and push a docker image:

```
./buildECR.sh
```


## How to run

Prerequisites:

* Build, as described above.
* Set AWS credentials using envars like AWS_REGION, AWS_PROFILE.
* AWS Kinesis stream must already exist.

Now run the msg-producer, e.g. this example command:
```
node build/lib/index.js \
    --streamName foo \
    --numBatches 4 \
    --batchSize 45 \
    --msgSize 1000 \
    --intervalSleepMillis 1000 \
    --numIntervals 5
```

This example wakes up once per second, five times, then quits.  On each interval,
it does four batched aggregated writes to Kinesis.  Each batch has 45 messages,
initially 1000 bytes each, and the aggregated result is more than 45,000 bytes
due to protobuf encoding and aggregation formatting.  In fact it is 47 KB, so
for cost purposes it sends 2 x 25 KB PUT Payloads.  Each batch has its own
partitionKey, so the Kinesis stream should have four shards for optimal processing.

Add the `-v` option for more verbose output; or `--dryRun` to do everything except
the Kinesis.putRecord call.


## Message content

The message format is defined in `perfmon-message.ts`.

The `id` is randomly taken from a finite set of possible values, with the intention
that ids will get reused, so that we can see a sequence of `action` (create, update,
delete) simulating the lifetime of a single id.  (This gives the downstream msg-consumer
a variety of SQL tasks to perform.)

A message also has a set of `fields` with randomly generated data.  The field content
is not important, it is simply a vehicle for performance analysis.



## Analysis of message size

It would simplify the analysis for all messages to be the same size
in bytes.  However, we use
[kinesis-aggregation](https://github.com/awslabs/kinesis-aggregation/tree/master/node)
to aggregate messages and minimize the number of PUT payload units sent to
Kinesis, and the aggregation library transforms user data before it goes over
the wire.  Per the Kinesis standard
[aggregation format](https://github.com/awslabs/amazon-kinesis-producer/blob/master/aggregation-format.md)
the library adds a 4 byte magic number and 16 byte MD5 hash to the final payload
buffer, but the main payload (user data) is also transformed using a table/index
metaphor and a call to protobufjs.encode().  One should also bear in mind that JavaScript
[String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)
is UTF-16, meaning 2 bytes per character in the Basic Multilingual Plane, although
I think that after protobuf encoding the message is on average 1 byte per character.
Internally, Kinesis.putRecord does one last base64 encoding on the input data as the
last step before transport, which can add about 30% to payload size, but that does not
matter.  Per the reference
[API_PutRecord](https://docs.aws.amazon.com/kinesis/latest/APIReference/API_PutRecord.html),
only the protobuf size (plus partition key size) is subject to
[Kinesis limits](https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html).

So given all the above, we have a complicated formula for calculating payload size
based on a known size of user data.  For the purposes of test analysis, it may be
easier to achieve *known* size payloads over the wire simply by trial and error.
See measurement.test.ts.

