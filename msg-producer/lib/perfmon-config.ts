export interface PerfmonConfig {
    batchSize: number;
    dryRun: boolean;
    initialSleep: number;
    intervalSleepMillis: number;
    maxMessageId: number;
    msgSize: number;
    numBatches: number;
    numIntervals: number;
    streamName: string;
    verbose: boolean;
}