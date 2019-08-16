import {
    Context,
    KinesisStreamEvent,
    KinesisStreamHandler,
    KinesisStreamRecord
} from 'aws-lambda';
import { KinesisGetRecord } from 'aws-kinesis-agg';
import * as AWS from 'aws-sdk';
import * as AWSXRayCore from 'aws-xray-sdk-core';
import { CloudWatchMetricsClient } from './cwmetrics-client';
import { deaggregateAndProcess } from './deaggregator';
import { EnvConfig, parseEnv } from './env-config';
import { Persister } from './persister';
import { PersisterMysql } from './persister-mysql';

/*
   This statement instruments the current Lambda function invocation with X-Ray.
   It also takes effect on the api object returned from 'new CloudWatch()'
   in CloudWatchMetricsClient.
   (Requires the Lambda infrastructure has TracingConfig { Mode: Active }.)
 */
const capturedAWS = AWSXRayCore.captureAWS(AWS);

/**
 * Here the handler iterates through the latest array of kinesis records and sends them
 * iteratively to the deagg/process function.
 */
export const msgConsumer: KinesisStreamHandler = async (
    event: KinesisStreamEvent,
    context: Context,
) => {
    return new Promise<void>((resolve, reject) => {
        try {
            console.log(`handler invoked with ${event.Records.length} Kinesis records.`);
            const envConfig: EnvConfig = parseEnv(process.env);
            const persister: Persister = new PersisterMysql(envConfig);
            const cwmetricsClient: CloudWatchMetricsClient = new CloudWatchMetricsClient(envConfig);
            cwmetricsClient.enqueueMetricNumEventRec(event.Records.length);
            const successPromises: Array<Promise<boolean>> = [];
            event.Records.forEach((record: KinesisStreamRecord, index: number) => {
                const logPrefix = `kinesis record ${index}:`;
                try {
                    const kinesisGetRecord: KinesisGetRecord = {
                        data: record.kinesis.data,
                        explicitPartitionKey: record.kinesis.partitionKey,
                        partitionKey: record.kinesis.partitionKey,
                        sequenceNumber: record.kinesis.sequenceNumber,
                    };
                    deaggregateAndProcess(
                        kinesisGetRecord,
                        persister,
                        cwmetricsClient,
                        successPromises,
                        logPrefix,
                        envConfig.verbose);
                } catch (e) {
                    const errPrefix = `ERROR in ${logPrefix}:`;
                    console.log(errPrefix, e.stack);
                }
            });
            return Promise.all(successPromises).then((successes: boolean[]) => {
                cwmetricsClient.enqueueMetricNumUserRec(successes.length);
                const numSuccess: number = successes.reduce((num: number, val: boolean) => val ? num + 1 : num, 0);
                console.log(`handler finished persisting ${successes.length} deaggregated user records: ${numSuccess} success.`);
                const persisterPromise: Promise<void> = persister.end();
                const cloudwatchPromise: Promise<void> = cwmetricsClient.flushQueue();
                return Promise.all([persisterPromise, cloudwatchPromise])
                    .then(() => {
                        console.log(`Lambda function is done.`);
                        resolve();
                    });
            });
        }
        catch (e) {
            const errPrefix = `ERROR in main tick of lambda handler (event: ${JSON.stringify(event, null, 4)
                }, context: ${JSON.stringify(context, null, 4)}):`;
            console.log(errPrefix, e.stack);
            reject();
        }
    });
};
