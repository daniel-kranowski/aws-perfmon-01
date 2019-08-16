import { PoolConnection } from 'mysql';

export type PersisterConnection = PoolConnection;

export class Persister {

    connect(logPrefix: string): Promise<PersisterConnection> {
        return Promise.reject('unimplemented in base class');
    }

    disconnect(connection: PersisterConnection): void {
        throw new Error('unimplemented in base class');
    }

    end(): Promise<void> {
        return Promise.reject('unimplemented in base class');
    }

    query(
        connection: PersisterConnection,
        sqlQuery: string,
        paramValues: any[],
        logPrefix: string,
    ): Promise<any>
    {
        throw new Error('unimplemented in base class');
    }

    transaction(
        connection: PersisterConnection,
        logPrefix: string,
        logic: () => Promise<any>, // function invoking multiple query() calls
    ): Promise<any>
    {
        throw new Error('unimplemented in base class');
    }
}