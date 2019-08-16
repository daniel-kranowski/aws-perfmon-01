import { assert, expect } from 'chai';
import * as sinon from 'sinon';
import * as aka from 'aws-kinesis-agg';
import {
    AfterAllGetCallback,
    AfterAllGetCallbackSync,
    KinesisGetRecord,
    MaybeError,
    PerUserGetRecordCallback,
    UserGetRecord
} from 'aws-kinesis-agg';

const akaCommon = require('aws-kinesis-agg/lib/common');
if (process.env.DEBUG === 'true') {
    // Enable for a tiny bit more verbosity.  kpl-deagg does not much use the 'debug' flag.
    akaCommon.debug = true;
}

/**
 * Returns a function that logs its inputs and saves actual decoded data, for test purposes.
 */
function curryLoggingPerUserGetRecordCallback(actualDecodedUserData: string[]): PerUserGetRecordCallback {
    return (unused: null, userGetRecord: UserGetRecord): void => {
        const decoded = Buffer.from(userGetRecord.data, 'base64').toString('utf8');
        actualDecodedUserData.push(decoded);
        console.log(`LOG: perUserGetRecordCallback(unused: ${JSON.stringify(unused)
                }, userGetRecord: ${JSON.stringify(userGetRecord, null, 4)})`
            + ` -> decoded .data: ${decoded}`);
    };
}

/**
 * Just logs its inputs, for test purposes.
 */
const loggingAfterAllGetCallback: AfterAllGetCallback = (err?: MaybeError, userGetRecord?: UserGetRecord): void => {
    let str = 'LOG: afterAllGetCallback(';
    if (err) {
        str += `err: ${JSON.stringify(err, null, 4)}`;
        if (userGetRecord) {
            str += `, userGetRecord: ${JSON.stringify(userGetRecord, null, 4)}`;
        }
    }
    str += ')';
    console.log(str);
};

/**
 * Returns a function that logs its inputs and saves actual decoded data, for test purposes.
 */
function curryLoggingAfterAllGetCallbackSync(actualDecodedUserData: string[]): AfterAllGetCallbackSync {
    return (err: MaybeError, userGetRecords: UserGetRecord[]): void => {
        console.log(`LOG: afterAllGetCallbackSync(err: ${JSON.stringify(err, null, 4)
            }, userGetRecords: ${JSON.stringify(userGetRecords, null, 4)})`);
        userGetRecords.forEach((userGetRecord: UserGetRecord, idx: number) => {
            const decoded = Buffer.from(userGetRecord.data, 'base64').toString('utf8');
            console.log(`LOG:  decoded [${idx}].data: ${decoded}`);
            actualDecodedUserData.push(decoded);
        });
    };
}

describe('kpl-deagg test', () => {

    const computeChecksums = true;

    const base64EncodedKinesisData = '84mawgoCcDEaGAgAGhQwMTIzNDU2Nzg5MDEyMzQ1NjdfQRoYCAAaFDAxMjM0NTY3ODkwMTIzNDU2N19CGhgIABoUMDEyMzQ1Njc4OTAxMjM0NTY3X0NHjL02iyRk3D+kO2UC2X6u';
    const expectedDecodedUserData = ['012345678901234567_A', '012345678901234567_B', '012345678901234567_C'];
    const kinesisGetRecord: KinesisGetRecord = {
        data: base64EncodedKinesisData,
        explicitPartitionKey: 'exp789',
        sequenceNumber: 'seq123',
        partitionKey: 'p1',
    };

    it('deaggregate() calls PerUserGetRecordCallback three times for payload with three user records', () => {
        const actualDecodedUserData: string[] = [];
        const loggingPerUserGetRecordCallback = curryLoggingPerUserGetRecordCallback(actualDecodedUserData);
        const spyPerUserGetRecordCallback = sinon.spy(loggingPerUserGetRecordCallback);
        aka.deaggregate(kinesisGetRecord, computeChecksums, spyPerUserGetRecordCallback, loggingAfterAllGetCallback);
        assert(spyPerUserGetRecordCallback.calledThrice);
        expect(actualDecodedUserData).to.deep.equal(expectedDecodedUserData);
    });

    it('deaggregateSync() gives three records to after-all-sync', () => {
        const actualDecodedUserData: string[] = [];
        const loggingAfterAllGetCallbackSync = curryLoggingAfterAllGetCallbackSync(actualDecodedUserData);
        const spyAfterAllGetCallbackSync = sinon.spy(loggingAfterAllGetCallbackSync);
        aka.deaggregateSync(kinesisGetRecord, computeChecksums, spyAfterAllGetCallbackSync);
        assert(spyAfterAllGetCallbackSync.calledOnce);
        expect(actualDecodedUserData).to.deep.equal(expectedDecodedUserData);
    });

});