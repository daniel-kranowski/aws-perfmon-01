import * as AWS from 'aws-sdk';
import { Kinesis } from 'aws-sdk';
import {
    aggregate,
    EncodedPutRecordHandler,
    EncodedPutRecord,
    ErrorCallback,
    UserPutRecord,
    AfterAllPutHandler,
    MaybeError,
    MaybeEitherPutRecord
} from 'aws-kinesis-agg';
const akaCommon = require('aws-kinesis-agg/lib/common');
import { initMeasurement, Measurement, summarizeMeasurement } from './measurement';

export class KinesisClient {

    private kinesis: Kinesis = new AWS.Kinesis();
    constructor(
        private readonly verbose: boolean,
        private readonly streamName: string,
        private readonly dryRun: boolean,
    ) {
        akaCommon.debug = verbose;
    }

    aggregateAndSend(
        userPutRecords: UserPutRecord[],
        partitionKey: string,
        logPrefix: string,
    ): Promise<void>
    {
        const putPromises: Array<Promise<void>> = [];
        const measurement: Measurement = initRecordsMeasurement(userPutRecords);
        return new Promise((resolve, reject) => {
            aggregate(
                userPutRecords,
                this.curryEncodedPutRecordHandler(partitionKey, logPrefix, putPromises, measurement),
                this.curryAfterAllPutHandler(logPrefix, putPromises, resolve),
                curryErrorCallback(logPrefix, reject)
            );
        });
    }

    /**
     * Returns a handler function that will be invoked by the aggregator once per Kinesis payload.
     * If the original user records are under 1 MB, there will only be 1 payload.
     */
    private curryEncodedPutRecordHandler(
        partitionKey: string,
        logPrefix: string,
        putPromises: Array<Promise<void>>,
        measurement: Measurement,
    ): EncodedPutRecordHandler
    {
        return (encodedRecord: EncodedPutRecord, errorCallback: ErrorCallback): void =>
        {
            try {
                measurement.protobufNumBytes = encodedRecord.data.length;
                measurement.base64NumChars = encodedRecord.data.toString('base64').length;
                logPrefix = `${logPrefix} payload ${putPromises.length}:`;
                console.log(`${logPrefix} encodedRecord: ${summarizeEncodedPutRecord(encodedRecord)
                    }, ${summarizeMeasurement(measurement)}`);
                if (this.verbose) {
                    console.log(`${logPrefix} encodedRecord in base64: ${summarizeBase64PutRecord(encodedRecord)}`);
                }
                const data: Kinesis.Types.Data = encodedRecord.data;
                const params = {
                    Data: data,
                    PartitionKey: partitionKey,
                    StreamName: this.streamName
                };
                console.log(`${logPrefix} Kinesis.putRecord`);
                let putPromise: Promise<void>;
                if (this.dryRun) {
                    console.log(`${logPrefix} DRY RUN - not calling putRecord`);
                    putPromise = Promise.resolve();
                } else {
                    putPromise = this.kinesis.putRecord(params).promise()
                        .then((data: Kinesis.Types.PutRecordOutput) => {
                            if (this.verbose) {
                                console.log(`${logPrefix} PutRecordOutput.data: ${JSON.stringify(data)}\n`);
                            }
                        })
                        .catch(e => errorCallback(e, encodedRecord));
                }
                putPromises.push(putPromise);
            }
            catch (e) {
                errorCallback(e, encodedRecord);
            }
        };
    }

    /**
     * Returns a handler function that will be invoked by the aggregator after all payloads are sent.
     */
    private curryAfterAllPutHandler(
        logPrefix: string,
        putPromises: Array<Promise<void>>,
        resolve: any,
    ): AfterAllPutHandler
    {
        return (): void => {
            if (this.verbose) {
                console.log(`${logPrefix} after all put handler start: waiting on ${putPromises.length} payloads`);
            }
            Promise.all(putPromises).then(() => {
                if (this.verbose) {
                    console.log(`${logPrefix} after all put handler complete`);
                }
                resolve();
            });
        }
    }

}

/**
 * Briefly stringifies an encoded record with its data bytelength.
 */
export function summarizeEncodedPutRecord(record: EncodedPutRecord): string {
    let str = JSON.stringify(record);
    if (str.length > 100) {
        str = str.substring(0,100) + '...';
    }
    return `${Buffer.byteLength(record.data)} bytes of protobuf "data": ${str}`;
}

function summarizeBase64PutRecord(record: EncodedPutRecord): string {
    const unabridged = record.data.toString('base64');
    let str;
    if (unabridged.length > 100) {
        str = unabridged.substring(0,100) + '...';
    }
    else {
        str = unabridged;
    }
    return `${unabridged.length} bytes of base64 over the wire: ${str}`;
}

function curryErrorCallback(logPrefix: string, reject: any): ErrorCallback {
    return (err: MaybeError, data: MaybeEitherPutRecord): void =>
    {
        console.log(`ERROR in ${logPrefix} err: ${err ? err.stack : err}, data: ${JSON.stringify(data)})`);
        reject();
    };
}

function initRecordsMeasurement(userPutRecords: UserPutRecord[]): Measurement {
    let oneMsgNumChars = 0;
    if (userPutRecords.length > 0) {
        const record = userPutRecords[0];
        if (typeof record.data === 'string') {
            oneMsgNumChars = record.data.length;
        }
        else {
            throw new Error(`unexpected data type '${typeof record.data}' in user put record: ${record}`);
        }
    }
    return initMeasurement(userPutRecords.length, oneMsgNumChars);
}