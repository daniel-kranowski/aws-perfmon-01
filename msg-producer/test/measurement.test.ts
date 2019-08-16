import { assert, expect } from 'chai';
import * as aka from 'aws-kinesis-agg';
import { EncodedPutRecord, EncodedPutRecordHandler, ErrorCallback, UserPutRecord } from 'aws-kinesis-agg';
import * as grm from '../lib/gen-random-message';
import { Measurement, initMeasurement, summarizeMeasurement } from '../lib/measurement';
import { PerfmonMessage } from '../lib/perfmon-message';
import * as kat from './kpl-agg.test';

// These measurements assume total msg size under 1 MB, i.e. only 1 call to encodedPutRecordHandler.

function curryMeasuringEncodedPutRecordHandler(measurement: Measurement): EncodedPutRecordHandler {
    return (encodedRecord: EncodedPutRecord, errorCallback: ErrorCallback): void => {
        kat.loggingEncodedPutRecordHandler(encodedRecord, errorCallback);
        measurement.protobufNumBytes = encodedRecord.data.length;
        measurement.base64NumChars = encodedRecord.data.toString('base64').length;
        console.log(summarizeMeasurement(measurement));
    };
}

describe('measurement', () => {

    const Under1KB = 650;
    const MaxMessageId = 1e6;
    
    it('shows me the wire size of PerfmonMessage', (done) => {
        const userMessages: PerfmonMessage[] = [
            grm.genRandomMessage(Under1KB, MaxMessageId),
            grm.genRandomMessage(Under1KB, MaxMessageId),
            grm.genRandomMessage(Under1KB, MaxMessageId),
        ];
        const partitionKey = "partitionKey-00001";
        console.log(`partitionKey: ${partitionKey}, length: ${partitionKey.length} chars.`);
        const userPutRecords: UserPutRecord[] = userMessages.map((message: PerfmonMessage, idx: number) => {
            const data = JSON.stringify(message);
            console.log(`userMessage[${idx}]: ${JSON.stringify(message, null, 4)
                } -> ${data.length} chars when stringified without whitespace.`);
            return { data, partitionKey };
        });
        console.log(`userPutRecords: ${JSON.stringify(userPutRecords, null, 4)}`);
        const measurement: Measurement = initMeasurement(userMessages.length, JSON.stringify(userMessages[0]).length);
        aka.aggregate(
            userPutRecords,
            curryMeasuringEncodedPutRecordHandler(measurement),
            kat.curryLoggingAfterAllPutHandler(done),
            kat.loggingErrorCallback);
    });

    function measureBatch(numMessages: number, msgSize: number, curryDone: (measurement: Measurement) => () => void) {
        const userMessages: PerfmonMessage[] = [...Array(numMessages).keys()].map((idx: number) => {
            return grm.genRandomMessage(msgSize, MaxMessageId);
        });
        console.log(`LOG: First userMessage is ${JSON.stringify(userMessages[0]).length} chars when stringified without whitespace.`);
        const partitionKey = "partitionKey-00001";
        const userPutRecords: UserPutRecord[] = userMessages.map((message: PerfmonMessage, idx: number) => {
            return { data: JSON.stringify(message), partitionKey };
        });
        const measurement: Measurement = initMeasurement(userMessages.length, JSON.stringify(userMessages[0]).length);
        aka.aggregate(
            userPutRecords,
            curryMeasuringEncodedPutRecordHandler(measurement),
            kat.curryLoggingAfterAllPutHandler(curryDone(measurement)),
            kat.loggingErrorCallback);

    }

    it('shows how to get base64 data close to 100 KB without going over', (done) => {
        measureBatch(100, Under1KB, (measurement: Measurement) => {
            return () => {
                expect(measurement.base64NumChars).to.be.lessThan(100 * 1024);
                done();
            }
        });
        /*
            Observation, with Under1KB = 650:

            Measurement:
                User Messages: 100 * 716 = 71600 = 69.9 K chars
                Protobuf:      72440 = 70.7 K bytes, 1.2% growth, 3 PUT payloads
                Base64:        96588 = 94.3 K chars, 34.9% growth
         */
    });

    it('shows how to get protobuf data close to 100 KB without going over', (done) => {
        measureBatch(100, 900, (measurement: Measurement) => {
            return () => {
                expect(measurement.protobufNumBytes).to.be.lessThan(100 * 1024);
                done();
            }
        });
        /*
            Observation, with msgSize = 900:

            Measurement:
                User Messages: 100 * 968 = 96800 = 94.5 K chars
                Protobuf:      97640 = 95.4 K bytes, 0.9% growth, 4 PUT payloads
                Base64:        130188 = 127.1 K chars, 34.5% growth
         */
    });


});