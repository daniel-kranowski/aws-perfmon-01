declare module "aws-kinesis-agg" {

    /**
     * This is an application layer "Kinesis producer" record which you want aggregated
     * and encoded prior to Kinesis.putRecord.
     */
    interface UserPutRecord {
        data: string | NodeJS.TypedArray | DataView | ArrayBuffer | SharedArrayBuffer;
        partitionKey: string;
        explicitHashKey?: string;
    }

    /**
     * An EncodedPutRecord is an aggregation and encoding of many UserPutRecord.
     *
     * Its data is produced by protobufjs.encode() and may contain nonprintable chars.
     * Before sending it over the wire to Kinesis.putRecords, your encodedPutRecordHandler
     * needs to call .toString('base64') on this data, to make it suitable for http transfer.
     *
     * The UserPutRecords packed into this data buffer first have their keys converted
     * to an index (to save space, I presume) into a key table.  aggregateRecord() concats
     * all those, with the tables, and encodes the lot as a ProtoBuf.  Add a magic string
     * and an MD5 checksum, and the resulting Buffer is EncodedPutRecord.data.
     *
     * The partitionKey (and optional explicit hash key) here is taken from the FIRST key
     * seen in the UserPutRecords, see generateEncodedRecord().  Kinesis Producer Library
     * normally aggregates UserPutRecords if their partitionKeys would make them belong to
     * the same Shard, so the caller of this aggregate() function needs to be responsible
     * for only passing in UserPutRecords that should be aggregated on a single Shard.
     */
    interface EncodedPutRecord {
        data: Buffer;
        partitionKey: string;
        ExplicitHashKey?: string;
    }

    import { Kinesis } from 'aws-sdk';

    interface UserGetRecord {
        data: string; // Since KinesisGetRecord.data is string, this can only be string.
        partitionKey: Kinesis.Types.PartitionKey;
        explicitPartitionKey: Kinesis.Types.HashKey;
        sequenceNumber: Kinesis.Types.SequenceNumber;
        subSequenceNumber: number; // Not an official Kinesis record property.
    }

    /**
     * This is the aggregated and encoded "Kinesis consumer" record, obtained as the output
     * of Kinesis.getRecord (whose type is Kinesis.Types.Record), then transformed ever so
     * slightly for compatibility with the wants of kpl-deagg.js.
     *
     * Its data is in a wire format that is not directly human readable, including base64
     * encoding.  The processing that gets applied to this data: Buffer constructor removes
     * the initial base64, then protobufjs.decode() decodes some more, then aws-kinesis-agg
     * does the disaggregation and some re-formatting back to the original application data format.
     */
    interface KinesisGetRecord {
        data: string; // The only Buffer constructor with an 'encoding' arg expects string input, so this is not the full Kinesis.Types.Data.
        partitionKey: Kinesis.Types.PartitionKey;
        explicitPartitionKey: Kinesis.Types.HashKey;
        sequenceNumber: Kinesis.Types.SequenceNumber;
    }

    type MaybeError = Error | null;
    type MaybeEitherPutRecord = UserPutRecord | EncodedPutRecord | null;

    type ErrorCallback = (err: MaybeError, data: MaybeEitherPutRecord) => void;

    /**
     * The EncodedPutRecordHandler calls Kinesis.putRecord with the input encodedRecord.
     */
    type EncodedPutRecordHandler = (encodedRecord: EncodedPutRecord, errorCallback: ErrorCallback) => void;

    /**
     * This handler is called by aggregate() when all its work is completely done.
     */
    type AfterAllPutHandler = () => void;

    /**
     * During deaggregate(), this is called once at the very end (with no args), but is also
     * called iteratively for every userGetRecord where there is some kind of error during
     * disaggregation.
     */
    type AfterAllGetCallback = (err?: MaybeError, userGetRecord?: UserGetRecord) => void;

    /**
     * During deaggregateSync(), this is called once at the very end, with the full list of
     * disaggregated records; but is also called iteratively with the current list of user
     * records whenever there is some kind of error during disaggregation.
     */
    type AfterAllGetCallbackSync = (err: MaybeError, userGetRecords: UserGetRecord[]) => void;

    /**
     * During deaggregate(), this is called once per disaggregated user record.
     */
    type PerUserGetRecordCallback = (unused: null, userGetRecord: UserGetRecord) => void;

    /**
     * Aggregates N user records into M encoded records, where N >= M.
     * Calls the encodedPutRecordHandler every time a new encoded record is ready.
     * An encoded record is ready for Kinesis PUT.
     *
     * aggregate() is an asynchronous function that continues operating M ticks
     * into the future, then it calls afterAllPutHandler when all done.  So you might
     * need the after handler to call some kind of done() or resolve().
     *
     * aggregate() has no return value, because your handler args receive the results.
     */
    function aggregate(
        userPutRecords: UserPutRecord[],
        encodedPutRecordHandler: EncodedPutRecordHandler,
        afterAllPutHandler: AfterAllPutHandler,
        errorCallback: ErrorCallback,
        queueSize?: number
    ): void;


    /**
     * Disaggregates 1 Kinesis wire record (from Kinesis.getRecords).
     *
     * Specify a per-record callback, to handle each user record as soon as the disaggregator
     * makes it available.
     *
     * The "after all" callback is invoked with no args when all disaggregation is done,
     * but is also called iteratively with err args each time a user record has an error
     * during disaggregation.
     *
     * deaggregate() and deaggregateSync() are both inherently synchronous functions,
     * although you could pass async code in a handler argument.
     *
     * This function has no return value, because your handler args receive the results.
     */
    function deaggregate(
        kinesisGetRecord: KinesisGetRecord,
        computeChecksums: boolean,
        perUserGetRecordCallback: PerUserGetRecordCallback,
        afterAllGetCallback: AfterAllGetCallback
    ): void;

    /**
     * Disaggregates 1 Kinesis wire record (from Kinesis.getRecords).
     *
     * The "after all" callback is invoked with the full list of disaggregated records at the
     * very end.  It is also called iteratively with err args each time a user record has an
     * error during disaggregation.
     *
     * deaggregate() and deaggregateSync() are both inherently synchronous functions,
     * although you could pass async code in a handler argument.
     *
     * This function has no return value, because your handler args receive the results.
     */
    function deaggregateSync(
        kinesisGetRecord: KinesisGetRecord,
        computeChecksums: boolean,
        afterAllGetCallbackSync: AfterAllGetCallbackSync
    ): void;

}
