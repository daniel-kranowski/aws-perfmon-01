import captureMySQL = require('aws-xray-sdk-mysql');
import * as mysql from 'mysql';
import { Connection, FieldInfo, MysqlError, Pool, PoolConnection } from 'mysql';
import { EnvConfig } from './env-config';
import { Persister } from './persister';

/*
   This statement instruments the mysql client with X-Ray.
 */
const capturedMySQL = captureMySQL(mysql);
const { createPool } = capturedMySQL;

export interface QueryResult { // Used only when there are no errors
    results?: any;
    fields?: FieldInfo[];
}

export class PersisterMysql extends Persister {

    private pool: Pool;
    private readonly verbose: boolean;

    // Remember to call pool.end() when done with the Persister object.
    constructor(
        private readonly envConfig: EnvConfig,
    ) {
        super();
        this.pool = createPool({
            acquireTimeout: envConfig.dbQueryTimeout,
            connectionLimit: envConfig.dbConnectionLimit,
            connectTimeout: envConfig.dbQueryTimeout,
            database: envConfig.dbName,
            host: envConfig.dbEndpoint,
            password: envConfig.dbPassword,
            user: envConfig.dbUsername
        });
        this.verbose = envConfig.verbose;
    }


    // Remember to call disconnect() when done with the PoolConnection object, including exception cases.
    connect(logPrefix: string): Promise<PoolConnection> {
        return new Promise((resolve, reject) => {
            this.pool.getConnection((poolError: MysqlError, connection: PoolConnection): void => {
                if (poolError) {
                    console.log(`${logPrefix} Error in pool.getConnection: ${JSON.stringify(poolError, null, 4)}`);
                    reject(poolError);
                }
                else {
                    resolve(connection);
                }
            });
        });
    }

    disconnect(connection: PoolConnection): void {
        connection.release();
    }

    query(
        connection: Connection,
        sqlQuery: string,
        paramValues: any[],
        logPrefix: string,
    ): Promise<QueryResult> // If rejection then type is MysqlError
    {
        if (this.verbose) {
            console.log(`${logPrefix} sqlQuery: ${sqlQuery}, paramValues: ${JSON.stringify(paramValues)}`);
        }
        return new Promise((resolve, reject) => {
            connection.query(
                {
                    sql: sqlQuery,
                    timeout: this.envConfig.dbQueryTimeout,
                    values: paramValues,
                },
                (queryError: MysqlError | null, results?: any, fields?: FieldInfo[]): void => {
                    if (queryError) {
                        console.log(`${logPrefix} Error in connection.query("${sqlQuery}"): ${JSON.stringify(queryError, null, 4)}`);
                        reject(queryError);
                    }
                    else {
                        if (this.verbose) {
                            console.log(`${logPrefix} results of successful query "${sqlQuery}": ${JSON.stringify(results, null, 4)}`);
                        }
                        resolve({results, fields});
                    }
                }
            );
        });
    }

    /**
     * Wraps the sql logic() inside a db transaction.  The logic should contain invocations of
     * our local query() method.
     *
     * Does not return a QueryResult.  The logic should be responsible for inspecting its own QueryResults.
     *
     * aws-xray-sdk-mysql instrumentation has a blind spot around the mysql client convenience method
     * mysql.beginTransaction().  It will not send sub-segments to X-Ray if you use the convenience method,
     * so we're just using query() instead.
     */
    transaction(connection: Connection, logPrefix: string, logic: () => Promise<any>): Promise<any> {
        return this.query(
            connection, 'START TRANSACTION',[], logPrefix
        ).then((queryResult: QueryResult) => {
            return logic();
        }).then((queryResult: QueryResult) => {
            return this.query(connection, 'COMMIT',[], logPrefix);
        }).catch((err: MysqlError) => {
            return this.query(connection, 'ROLLBACK',[], logPrefix)
                .then((queryResult: QueryResult) => {
                    throw err; // If rollback succeeded, throw err from above commit, logic, or start transaction.
                });
                // Rollback could also throw its own nested error.
        });
    }

    end(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.pool) {
                this.pool.end((err: MysqlError): void => {
                    if (err) {
                        console.log(`Error in pool.end: ${err.stack}`);
                    } else {
                        console.log(`pool.end()`);
                    }
                    resolve();
                });
            }
            else {
                console.log('pool was not initialized, no need to end');
                resolve();
            }
        });
    }
}