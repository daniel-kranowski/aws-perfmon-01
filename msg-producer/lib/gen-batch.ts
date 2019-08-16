/*
A "batch" of user put records all have the same partition key.
 */

import { genRandomMessage } from './gen-random-message';
import { PerfmonMessage } from './perfmon-message';
import { UserPutRecord } from 'aws-kinesis-agg';

export function genBatch(
    batchSize: number,
    msgSize: number,
    maxMessageId: number,
    partitionKey: string,
): UserPutRecord[]
{
    const batch: UserPutRecord[] = [];
    for (let msgNum = 0; msgNum < batchSize; ++msgNum) {
        const msg: PerfmonMessage = genRandomMessage(msgSize, maxMessageId);
        batch.push({
            data: JSON.stringify(msg),
            partitionKey,
        });
    }
    return batch;
}

export function describeBatch(batchNum: number, batch: UserPutRecord[]): string {
    let lines = [`batchNum ${batchNum}, ${batch.length} user put records:`];
    batch.forEach((msg: UserPutRecord, idx: number) => {
        lines.push(`  ${idx}: ${JSON.stringify(msg)}`)
    });
    return lines.join('\n');
}
