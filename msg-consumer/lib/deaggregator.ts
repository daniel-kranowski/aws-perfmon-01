import {
    AfterAllGetCallback,
    deaggregate,
    KinesisGetRecord,
    MaybeError,
    PerUserGetRecordCallback,
    UserGetRecord
} from 'aws-kinesis-agg';
import { consumeUserMsg, UserGetRecordConsumer } from './consumer';
import { CloudWatchMetricsClient } from './cwmetrics-client';
import { Persister } from './persister';

/**
 * Deaggregates the kinesis record into multiple user records, and performs some processing on each
 * user record (invokes the consumer).
 *
 * Returns an array of promises to boolean, by adding to the `promises` argument, one
 * per deaggregated user record, set to true if record processing was successful.
 */
export function deaggregateAndProcess(
    kinesisGetRecord: KinesisGetRecord,
    persister: Persister,
    cwmetricsClient: CloudWatchMetricsClient,
    promises: Array<Promise<boolean>>,
    logPrefix: string,
    verbose: boolean
): void
{
    console.log(`${logPrefix} calling deaggregate`);
    const computeChecksums = true;
    deaggregate(
        kinesisGetRecord,
        computeChecksums,
        curryPerUserGetRecordCallback(consumeUserMsg, persister, cwmetricsClient, promises, logPrefix, verbose),
        curryAfterAllGetCallback(logPrefix)
    );
}

function curryPerUserGetRecordCallback(
    consumer: UserGetRecordConsumer,
    persister: Persister,
    cwmetricsClient: CloudWatchMetricsClient,
    promises: Array<Promise<boolean>>,
    logPrefix: string,
    verbose: boolean
): PerUserGetRecordCallback
{
    let userRecordNum = 0;
    return (unused: null, userGetRecord: UserGetRecord): void => {
        const indexLogPrefix = `${logPrefix} user record ${userRecordNum++}:`;
        const promise: Promise<boolean> = consumer(userGetRecord, persister, cwmetricsClient, indexLogPrefix, verbose);
        promises.push(promise);
        // Errors thrown in the current tick are caught inside deaggregate().
        // Errors thrown in a future tick should be caught inside the consumer, it claims not to reject.
    };
}

function curryAfterAllGetCallback(
    logPrefix: string
): AfterAllGetCallback
{
    let userRecordNum = 0;
    return (err?: MaybeError, userGetRecord?: UserGetRecord): void => {
        logPrefix = `${logPrefix} user record ${userRecordNum++}:`;
        if (err) {
            let errmsg = `ERROR in ${logPrefix} ${JSON.stringify(err, null, 4)}`;
            if (userGetRecord) {
                errmsg += `, failure at user record: ${JSON.stringify(userGetRecord, null, 4)}`;
            }
            console.log(errmsg);
        }
        else {
            console.log(`${logPrefix} deaggregation main tick completed ok`);
        }
    };
}
