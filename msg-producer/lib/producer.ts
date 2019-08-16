import { UserPutRecord } from 'aws-kinesis-agg';
import { genBatch, describeBatch } from './gen-batch';
import { KinesisClient } from './kinesis-client';
import { PerfmonConfig } from './perfmon-config';

/**
 * Produces batches of user records, aggregates them, and sends them to Kinesis.
 */
export class Producer {
    private intervalNum = -1; // Active interval numbers are 0-based
    private kinesisClient: KinesisClient;
    constructor(
        private readonly config: PerfmonConfig,
    ) {
        this.kinesisClient = new KinesisClient(this.config.verbose, this.config.streamName, this.config.dryRun);
    }

    private produceBatch(batchNum: number): Promise<void> {
        const partitionKey = '' + batchNum;
        const batch: UserPutRecord[] = genBatch(
            this.config.batchSize,
            this.config.msgSize,
            this.config.maxMessageId,
            partitionKey,
        );
        if (this.config.verbose) {
            console.log(`intervalNum ${this.intervalNum}, ` + describeBatch(batchNum, batch));
        }
        const logPrefix = `intervalNum ${this.intervalNum}, batchNum ${batchNum}:`;
        return this.kinesisClient.aggregateAndSend(batch, partitionKey, logPrefix);
    }

    private produceBatches(): Promise<void[]> {
        const promises: Array<Promise<void>> = [];
        for (let batchNum = 0; batchNum < this.config.numBatches; ++batchNum) {
            promises.push(this.produceBatch(batchNum));
        }
        return Promise.all(promises);
    }

    /**
     * Executes a production interval, by producing records and sending to Kinesis.
     * Returns a promise that resolves when the interval work is complete; errors are internally caught.
     */
    interval(): Promise<void> {
        ++this.intervalNum;
        return this.produceBatches()
            .then(() => undefined) // void[] to void
            .catch((e: Error) => {
                const errPrefix = `ERROR in intervalNum ${this.intervalNum}:`;
                console.log(errPrefix, e.stack);
            });
    }
}