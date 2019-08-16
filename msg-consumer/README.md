# msg-consumer

`msg-consumer` is a Lambda function whose event source is a Kinesis stream.
For each event, it performs some minimal processing and persists the result
to an RDS database.

## How to build and test

To build the app locally:
```
cd msg-consumer/
npm install
npm run build
```

To create the uploadable lambda zip:
```
npm run dist
```

## Note regarding deaggregation

Since the producer app used
[kinesis-aggregation](https://github.com/awslabs/kinesis-aggregation/tree/master/node)
to aggregate multiple messages into a single Kinesis PUT, here the consumer
app uses the same library to deaggregate the Kinesis event blob back into
its original constituent user messages.

