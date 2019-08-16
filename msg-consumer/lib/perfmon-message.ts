export type PerfmonAction = "CREATE" | "UPDATE" | "DELETE";

export interface PerfmonFields {
    words: string;
    numbers: string;
    alpha: string;
}

/**
 * From the perspective of Kinesis, PerfmonMessage is the "user record" type.
 *
 * The contents of this message have no real business meaning, they are just an example
 * for the purpose of performance analysis.
 */
export interface PerfmonMessage {
    id: string;
    action: PerfmonAction;
    fields: PerfmonFields;
    msgGenTimeMillis: number;
}