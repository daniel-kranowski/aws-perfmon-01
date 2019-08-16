import { UserGetRecord } from "aws-kinesis-agg";
import { CloudWatchMetricsClient } from './cwmetrics-client';
import { PerfmonMessage } from './perfmon-message';
import { Persister, PersisterConnection } from './persister';
import { QueryResult } from './persister-mysql';
import { MysqlError } from 'mysql';

const tableName = 'PerfmonMessage';

export type UserGetRecordConsumer = (
    userGetRecord: UserGetRecord,
    persister: Persister,
    cwmetricsClient: CloudWatchMetricsClient,
    logPrefix: string,
    verbose: boolean,
) => Promise<boolean>;   // True if consumer success.  Will not reject.

/**
 * Consumes a single user record (after deaggregation), by parsing and then persisting to the database.
 * Returns a promise to boolean: true if success, else false; does not reject.
 */
export const consumeUserMsg: UserGetRecordConsumer = (
    userGetRecord: UserGetRecord,
    persister: Persister,
    cwmetricsClient: CloudWatchMetricsClient,
    logPrefix: string,
    verbose: boolean,
): Promise<boolean> =>
{
    const userMsg: PerfmonMessage = parseUserGetRecord(userGetRecord, logPrefix, verbose);
    let txPromise: Promise<any>;
    if (userMsg.action === 'CREATE' || userMsg.action === 'UPDATE') {
        txPromise = upsertMessage(userMsg, persister, logPrefix);
    }
    else {
        txPromise = deleteMessage(userMsg, persister, logPrefix);
    }
    return saveCwMetrics(userMsg, txPromise, cwmetricsClient, logPrefix);
};

function parseUserGetRecord(
    userGetRecord: UserGetRecord,
    logPrefix: string,
    verbose: boolean,
): PerfmonMessage
{
    const decoded: string = Buffer.from(userGetRecord.data, 'base64').toString('utf8');
    const userMsg: PerfmonMessage = JSON.parse(decoded);
    if (verbose) {
        console.log(
            logPrefix,
            JSON.stringify(userGetRecord, null, 4),
            `-> decoded and parsed: ${JSON.stringify(userMsg, null, 4)}`);
    }
    else {
        console.log(logPrefix, JSON.stringify(userMsg, null, 4));
    }
    return userMsg;
}

async function upsertMessage(
    userMsg: PerfmonMessage,
    persister: Persister,
    logPrefix: string,
): Promise<any>
{
    const connection: PersisterConnection = await persister.connect(logPrefix);
    const txPromise: Promise<any> = persister.transaction(connection, logPrefix,
        async () => {
            const selectResult: QueryResult = await persister.query(
                connection,
                `SELECT * FROM ${tableName} WHERE Id = ?`,
                [userMsg.id],
                logPrefix,
            );
            if (selectResult.results.length === 0) {
                return persister.query(
                    connection,
                    `INSERT INTO ${tableName} (Id, Words, Numbers, Alpha) VALUES (?, ?, ?, ?)`,
                    [
                        userMsg.id,
                        userMsg.fields.words,
                        userMsg.fields.numbers,
                        userMsg.fields.alpha,
                    ],
                    logPrefix,
                );
            }
            else {
                return persister.query(
                    connection,
                    `UPDATE ${tableName} SET Words=?, Numbers=?, Alpha=? WHERE Id=?`,
                    [
                        userMsg.fields.words,
                        userMsg.fields.numbers,
                        userMsg.fields.alpha,
                        userMsg.id,
                    ],
                    logPrefix,
                );
            }
        });
    return disconnectAfterTx(persister, connection, txPromise);
}

async function deleteMessage(
    userMsg: PerfmonMessage,
    persister: Persister,
    logPrefix: string,
): Promise<any>
{
    const connection: PersisterConnection = await persister.connect(logPrefix);
    const txPromise: Promise<any> = persister.transaction(connection, logPrefix,
        async () => {
            return persister.query(
                connection,
                `DELETE FROM ${tableName} WHERE Id = ?`,
                [ userMsg.id ],
                logPrefix
            );
        });
    return disconnectAfterTx(persister, connection, txPromise);
}

function disconnectAfterTx(
    persister: Persister,
    connection: PersisterConnection,
    txPromise: Promise<any>,
): Promise<any>
{
    return txPromise
        .then((queryResult: QueryResult) => {
            persister.disconnect(connection);
            return queryResult;
        })
        .catch((err: MysqlError) => {
            persister.disconnect(connection);
            throw err;
        });
}

function saveCwMetrics(
    userMsg: PerfmonMessage,
    txPromise: Promise<any>,
    cwmetricsClient: CloudWatchMetricsClient,
    logPrefix: string,
): Promise<boolean>
{
    return txPromise
        .then((queryResult: any) => {
            cwmetricsClient.enqueueMetricPropDelay(userMsg.msgGenTimeMillis, logPrefix);
            // Persister has already logged the result object.
            return true;
        })
        .catch((error: any) => {
            cwmetricsClient.enqueueMetricPropDelay(userMsg.msgGenTimeMillis, logPrefix);
            // Persister has already logged the error object.
            return false;
        });

}