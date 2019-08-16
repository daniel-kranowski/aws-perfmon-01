import * as yargs from 'yargs';
import { IntervalRunner } from './interval-runner';
import { PerfmonConfig } from './perfmon-config';
import { Producer } from './producer';

console.log(process.argv.join(' '));

const argv = yargs
    .usage(
        'MESSAGE PRODUCER\n'
        + '$0 --streamName <name>\n'
        + '\n'
        + 'At periodic intervals, this app produces several batches of messages\n'
        + '("user records"), and for each batch it aggregates the messages using\n'
        + 'aws-kinesis-agg, and sends each result to Kinesis.putRecord with a\n'
        + 'partition key equal to the batch number.\n'
        + '\n'
        + 'Generated user messages are fixed-size.  The aggregation library does\n'
        + 'some minor reformatting and applies protobuf encoding, so the result is\n'
        + 'binary and possibly nonprintable.  Aggregated blobs greater than the\n'
        + 'Kinesis payload limit of 1 MiB are split into multiple payloads.  Base64\n'
        + 'encoding for transport, performed internally by Kinesis.putRecord, does\n'
        + 'not count against the 1 MiB limit.\n'
        + '\n'
        + 'When the intervals are done, the program terminates.'
    )
    .help('h')
    .alias('h', 'help')
    .option('batchSize', {
        default: 25,
        describe: 'Number of messages ("user records") to produce per batch.',
        type: 'number',
    })
    .option('dryRun', {
        default: false,
        describe: 'If true, this app will not actually connect to a Kinesis stream.  It will perform all intervals,' +
            ' generate all messages, and log output - but it will not PUT the messages.',
        type: 'boolean',
    })
    .option('initialSleep', {
        default: 0,
        describe: 'Number of milliseconds to sleep before the first interval.',
        type: 'number',
    })
    .option('intervalSleepMillis', {
        default: 1000,
        describe: 'Number of milliseconds to sleep between intervals.',
        type: 'number',
    })
    .option('maxMessageId', {
        default: 100,
        describe: 'Messages will have an id from 0 to maxMessageId.  Choosing a lower max leads to a situation where ' +
            'ids are reused more often, which may be more "interesting" from the perspective of downstream consumer ' +
            'behavior.',
        type: 'number',
    })
    .option('msgSize', {
        default: 900,
        describe: 'Number of characters of data to generate for a user message.',
        type: 'number',
    })
    .option('numBatches', {
        default: 4,
        describe: 'Number of message batches to produce in an interval.  Each batch is separately aggregated and ' +
            'submitted to Kinesis with partition key equal to the batch number.',
        type: 'number',
    })
    .option('numIntervals', {
        default: 5,
        describe: 'Number of intervals of operation, before the app completes.',
        type: 'number',
    })
    .option('streamName', {
        demandOption: true,
        describe: 'We will connect to this stream, in the AWS region specified by envar AWS_REGION and/or AWS_PROFILE.',
        type: 'string',
    })
    .option('v', {
        alias: 'verbose',
        describe: 'Enables verbose output.',
        type: 'boolean',
    })
    .argv;

const config: PerfmonConfig = {
    batchSize: yargs.argv.batchSize as number,
    dryRun: yargs.argv.dryRun as boolean,
    initialSleep: yargs.argv.initialSleep as number,
    intervalSleepMillis: yargs.argv.intervalSleepMillis as number,
    maxMessageId: yargs.argv.maxMessageId as number,
    msgSize: yargs.argv.msgSize as number,
    numBatches: yargs.argv.numBatches as number,
    numIntervals: yargs.argv.numIntervals as number,
    streamName: yargs.argv.streamName as string,
    verbose: yargs.argv.verbose as boolean,
};

function msgProducerDone() {
    console.log(`msg-producer is done`);
}

function runIntervals() {
    const producer = new Producer(config);
    const runner = new IntervalRunner(() => producer.interval(), config.intervalSleepMillis,
        config.numIntervals, msgProducerDone);
    runner.start();
}

if (config.initialSleep > 0) {
    console.log(`Initial sleep: ${config.initialSleep} ms`);
}

setTimeout(runIntervals, config.initialSleep);
