import { AWSError } from 'aws-sdk';
import * as CloudWatch from 'aws-sdk/clients/cloudwatch';
import { MetricDatum } from 'aws-sdk/clients/cloudwatch';
import { EnvConfig } from './env-config';

// https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_limits.html
const MetricDatumLimit = 20;

/**
 * Builds a queue of MetricData, then flushes it over the wire with PutMetricData.
 */
export class CloudWatchMetricsClient {

    private readonly cloudwatch: CloudWatch;
    private readonly customNamespace: string;
    private readonly customMetricNameNumEventRec: string;
    private readonly customMetricNameNumUserRec: string;
    private readonly customMetricNamePropDelay: string;
    private readonly queueMetricData: MetricDatum[];
    private readonly verbose: boolean;

    constructor(
        private readonly envConfig: EnvConfig,
    ) {
        /*
           Experiment shows that we do NOT need to do 'new capturedAWS.CloudWatch()'
           for X-Ray instrumentation to take effect when we call methods on this.cloudwatch.
           The use of 'captureAWS(AWS)' in handler.ts takes care of it everywhere.
           (Requires the Lambda infrastructure has TracingConfig { Mode: Active }.)
         */
        this.cloudwatch = new CloudWatch();

        this.customNamespace = envConfig.cwmetricsCustomNamespace;
        this.customMetricNameNumEventRec = envConfig.cwmetricsCustomMetricNameNumEventRec;
        this.customMetricNameNumUserRec = envConfig.cwmetricsCustomMetricNameNumUserRec;
        this.customMetricNamePropDelay = envConfig.cwmetricsCustomMetricNamePropDelay;
        this.queueMetricData = [];
        this.verbose = envConfig.verbose;
    }

    /**
     * Enqueues a custom metric for the total propagation delay along the path ECS -> Kinesis -> Lambda -> RDS,
     * for the user message that the caller has just now persisted into the database.
     *
     * The calculated delay is subject to clock skew error, based on the lack of synchronicity between
     * the system clocks of the ECS container and this Lambda.
     *
     * The queue will be flushed and put to CloudWatch in a later invocation of flushQueue.
     */
    enqueueMetricPropDelay(msgGenTimeMillis: number, logPrefix: string): void {
        const now: Date = new Date();
        const propDelay: number = now.getTime() - msgGenTimeMillis;
        this.queueMetricData.push(
            {
                MetricName: this.customMetricNamePropDelay,
                Timestamp: now,
                Unit: 'Milliseconds',
                Value: propDelay,
            }
        );
    }

    /**
     * Enqueues a custom metric for the number of event source records passed into this Lambda invocation.
     *
     * Since Kinesis is the event source, it is equal to the number of aggregated Kinesis records.
     * In many cases this value will be the same as the Kinesis metric GetRecords.Records,
     * but Lambda does not always invoke a function with all the records it has just polled
     * from Kinesis.
     *
     * The queue will be flushed and put to CloudWatch in a later invocation of flushQueue.
     */
    enqueueMetricNumEventRec(numEventRecords: number): void {
        const now: Date = new Date();
        this.queueMetricData.push(
            {
                MetricName: this.customMetricNameNumEventRec,
                Timestamp: now,
                Unit: 'Count',
                Value: numEventRecords,
            }
        );
    }

    /**
     * Enqueues a custom metric for the number of deaggregated user records.
     *
     * The queue will be flushed and put to CloudWatch in a later invocation of flushQueue.
     */
    enqueueMetricNumUserRec(numUserRecords: number): void {
        const now: Date = new Date();
        this.queueMetricData.push(
            {
                MetricName: this.customMetricNameNumUserRec,
                Timestamp: now,
                Unit: 'Count',
                Value: numUserRecords,
            }
        );
    }

    /**
     * Calls CloudWatch PutMetricData with all the metric results in the queue.
     *
     * Failures in PutMetricData will result in dropped metric datapoints.  We will not retry.
     *
     * Resolves a promise when done.
     */
    flushQueue(): Promise<void> {
        if (this.queueMetricData.length === 0) {
            console.log(`MetricData queue is empty, nothing to flush`);
            return Promise.resolve();
        }
        else {
            console.log(`Flushing ${this.queueMetricData.length} custom metric datapoints to CloudWatch`);
            const cloudwatchPromises: Array<Promise<void>> = [];
            for (let idx = 0; idx < this.queueMetricData.length; idx += MetricDatumLimit) {
                cloudwatchPromises.push(this.slicePutMetricData(idx));
            }
            return Promise.all(cloudwatchPromises)
                .then((ignoredResults: Array<void>) => {
                    this.queueMetricData.splice(0, this.queueMetricData.length);
                    return undefined;
                });
        }
    }

    private slicePutMetricData(idx: number): Promise<void> {
        const params: CloudWatch.Types.PutMetricDataInput = {
            MetricData: this.queueMetricData.slice(idx, idx + MetricDatumLimit),
            Namespace: this.customNamespace,
        };
        const rangeString = `${idx} to ${idx + params.MetricData.length - 1}`;
        console.log(`Flushing datapoints ${rangeString} to CloudWatch: PutMetricData(${
            this.verbose ? JSON.stringify(params, null, 4) : ''})`);
        return this.cloudwatch.putMetricData(params)
            .promise()
            .then((data: {}) => {
                console.log(`PutMetricData ${rangeString} was successful.`);
            })
            .catch((err: AWSError) => {
                console.log(`Error in PutMetricData ${rangeString}: ${JSON.stringify(err, null, 4)}`);
            });
    }
}