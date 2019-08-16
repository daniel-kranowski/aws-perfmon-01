/**
 * For calculating the number of characters in an array of user messages, and how it expands in size
 * after aggregation and protobuf encoding, and expands further with final base64 encoding.
 *
 * User PUT record is { message, partitionKey }, but the aggregation library replaces the partitionKey
 * field with a table index during the encoding process, presumably to reduce total size.
 *
 * JavaScript uses UTF-16 to represent strings (2 bytes per character), but the protobuf is more like
 * 1 byte per character.
 *
 * Per the reference API_PutRecord, the 1 MB limit applies to the binary protobuf blob (plus partition
 * key), not the larger base64 encoding used in transport.
 */
export interface Measurement {
    numUserMsgs: number;
    oneUserMsgNumChars: number; // Excludes the size of partition key
    totalUserMsgNumChars: number;
    protobufNumBytes: number;
    base64NumChars: number;
}

export function initMeasurement(numMessages: number, oneMsgNumChars: number): Measurement {
    return {
        numUserMsgs: numMessages,
        oneUserMsgNumChars: oneMsgNumChars,
        totalUserMsgNumChars: numMessages * oneMsgNumChars,
        protobufNumBytes: 0,
        base64NumChars: 0,
    }
}

interface AnnotatedMeasurement {
    totalUserMsgNumKiloChars: string;
    protobufNumKiloBytes: string;
    base64NumKiloChars: string;
    protobufGrowthOverUserMsgs: string;
    base64GrowthOverUserMsgs: string;
    numPutPayloads: string;
}

function calcAnnotatedMeasurement(measurement: Measurement): AnnotatedMeasurement {
    return {
        totalUserMsgNumKiloChars: (measurement.totalUserMsgNumChars / 1024).toFixed(1),
        protobufNumKiloBytes: (measurement.protobufNumBytes / 1024).toFixed(1),
        base64NumKiloChars: (measurement.base64NumChars / 1024).toFixed(1),
        protobufGrowthOverUserMsgs: (100.0 * (measurement.protobufNumBytes - measurement.totalUserMsgNumChars) / measurement.totalUserMsgNumChars).toFixed(1),
        base64GrowthOverUserMsgs: (100.0 * (measurement.base64NumChars - measurement.totalUserMsgNumChars) / measurement.totalUserMsgNumChars).toFixed(1),
        numPutPayloads: '' + Math.ceil(measurement.protobufNumBytes / (25 * 1024)),
    }
}

export function summarizeMeasurement(measurement: Measurement): string {
    const annotated = calcAnnotatedMeasurement(measurement);
    let str = 'Measurement:\n';
    str += `    User Messages: ${measurement.numUserMsgs} * ${measurement.oneUserMsgNumChars} = ${measurement.totalUserMsgNumChars} = ${annotated.totalUserMsgNumKiloChars} K chars\n`;
    str += `    Protobuf:      ${measurement.protobufNumBytes} = ${annotated.protobufNumKiloBytes} K bytes, ${annotated.protobufGrowthOverUserMsgs}% growth, ${annotated.numPutPayloads} PUT payloads\n`;
    str += `    Base64:        ${measurement.base64NumChars} = ${annotated.base64NumKiloChars} K chars, ${annotated.base64GrowthOverUserMsgs}% growth\n`;
    return str;
}