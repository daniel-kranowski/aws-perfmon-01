import { assert } from 'chai';
import * as crypto from 'crypto';
import * as sinon from 'sinon';
import { summarizeEncodedPutRecord } from '../lib/kinesis-client';
import * as aka from 'aws-kinesis-agg';
import {
    EncodedPutRecordHandler,
    EncodedPutRecord,
    ErrorCallback,
    UserPutRecord,
    AfterAllPutHandler,
    MaybeError,
    MaybeEitherPutRecord
} from 'aws-kinesis-agg';

const akaCommon = require('aws-kinesis-agg/lib/common');
if (process.env.DEBUG === 'true') {
    // Enables verbose output.
    akaCommon.debug = true;
}

/**
 * Example outputs:  'function foo',  'function <anon>',  'object'
 */
function functionAsString(f: Function): string {
    return `${typeof f}${(typeof f === 'function' && f.name) ? ` ${f.name}` : ' <anon>'}`;
}

/**
 * Just logs its inputs, for test purposes.
 * Real code would call Kinesis.putRecord(encodedRecord.data).
 */
export const loggingEncodedPutRecordHandler: EncodedPutRecordHandler = (encodedRecord: EncodedPutRecord, errorCallback: ErrorCallback): void => {
    console.log(`LOG: encodedPutRecordHandler(encodedRecord: ${summarizeEncodedPutRecord(encodedRecord)
        }, errorCallback: ${functionAsString(errorCallback)})`);
    if (akaCommon.debug) {
        const unabridged = encodedRecord.data.toString('base64');
        console.log(`LOG: Unabridged Encoded Put Data + Base64 (${unabridged.length} chars) BEGIN:\n${
            unabridged}\nLOG: Unabridged Encoded Put Data END`);
    }
};

/**
 * Returns a function that logs a message and calls a done function, for test purposes.
 */
export function curryLoggingAfterAllPutHandler(done: Function): AfterAllPutHandler {
    return (): void => {
        console.log(`LOG: afterAllPutHandler()`);
        done();
    }
}

/**
 * Just logs its inputs, for test purposes.
 */
export const loggingErrorCallback: ErrorCallback = (err: MaybeError, data: MaybeEitherPutRecord): void => {
    console.log(`LOG: errorCallback(err: ${err ? err.stack : err}, data: ${JSON.stringify(data)})`)
};

/**
 * The base64 encodings applied here are simply to produce "nicer" random data where all characters are printable.
 * It is separate from the final base64 encoding applied internally by Kinesis.putRecord().
 */
describe('kpl-agg test', () => {

    it('calls errorCallback if no user records', (done) => {
        const userPutRecords: UserPutRecord[] = [];
        aka.aggregate(userPutRecords, loggingEncodedPutRecordHandler, curryLoggingAfterAllPutHandler(done), loggingErrorCallback)
    });

    it('calls encodedPutRecordHandler once for small user inputs', (done) => {
        const spyEncodedPutRecordHandler = sinon.spy(loggingEncodedPutRecordHandler);
        const userPutRecords: UserPutRecord[] = [
            {
                data: '012345678901234567_A', // 20 chars
                partitionKey: 'p1',           // 2 chars
            },
            {
                data: '012345678901234567_B',
                partitionKey: 'p1',
            },
            {
                data: '012345678901234567_C',
                partitionKey: 'p1',
            },
        ];
        const alldone = () => {
            assert(spyEncodedPutRecordHandler.calledOnce);
            done();
        };
        aka.aggregate(userPutRecords, spyEncodedPutRecordHandler, curryLoggingAfterAllPutHandler(alldone), loggingErrorCallback);
        /*
           Observations:
             - With akaCommon.debug true, we see user records 0, 1, 2 are encoded to 30, 26, 26 bytes, "actual totalBytes=82".
             - EncodedPutRecord buffer length including 4-byte magic num and 16-byte checksum is "final totalBytes=102".
         */
    });

    it('calls encodedPutRecordHandler twice for large user inputs that will not all fit in a single 1 MB payload', (done) => {
        const spyEncodedPutRecordHandler = sinon.spy(loggingEncodedPutRecordHandler);
        const longString = crypto.randomBytes(350 * 1024).toString('base64'); // base64( 358,400 bytes ) = 477,868 chars
        const userPutRecords: UserPutRecord[] = [
            {
                data: longString,
                partitionKey: 'p1',
            },
            {
                data: longString,
                partitionKey: 'p1',
            },
            {
                data: longString,
                partitionKey: 'p1',
            },
        ];
        const alldone = () => {
            assert(spyEncodedPutRecordHandler.calledTwice);
            done();
        };
        aka.aggregate(userPutRecords, spyEncodedPutRecordHandler, curryLoggingAfterAllPutHandler(alldone), loggingErrorCallback)
        /*
           Observations:
             - When encoded, two but not three user records fit in under 1 MB.  So it calls encodedPutRecordHandler once
               with the first two encoded records, and again with the third.
             - With akaCommon.debug true, we see two final messages "over the wire":
                        actual totalBytes=955760
                        final totalBytes=955780
                        actual totalBytes=477882
                        final totalBytes=477902
         */
    });

    it('calls encodedPutRecordHandler once per user record when you cannot fit more than a single record into one 1 MB payload', (done) => {
        const spyEncodedPutRecordHandler = sinon.spy(loggingEncodedPutRecordHandler);
        const longString = crypto.randomBytes(500 * 1024).toString('base64'); // base64( 512,000 bytes) = 682,668 chars
        const userPutRecords: UserPutRecord[] = [
            {
                data: longString,
                partitionKey: 'p1',
            },
            {
                data: longString,
                partitionKey: 'p1',
            },
            {
                data: longString,
                partitionKey: 'p1',
            },
        ];
        const alldone = () => {
            assert(spyEncodedPutRecordHandler.calledThrice);
            done();
        };
        aka.aggregate(userPutRecords, spyEncodedPutRecordHandler, curryLoggingAfterAllPutHandler(alldone), loggingErrorCallback)
        /*
           Observations:
             - When encoded, each record is large enough to get its own invocation of the encodedPutRecordHandler.
             - With akaCommon.debug true, we see three final messages "over the wire":
                        actual totalBytes=682682
                        final totalBytes=682702
                        actual totalBytes=682682
                        final totalBytes=682702
                        actual totalBytes=682682
                        final totalBytes=682702
         */
    });

});