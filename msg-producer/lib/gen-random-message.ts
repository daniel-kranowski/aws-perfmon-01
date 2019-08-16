import { PerfmonMessage } from './perfmon-message';

// All sizes here are a NUMBER OF JAVASCRIPT CHARACTERS.

export const IdSize = 16;
export const ActionSize = 6;
export const TimeMillisSize = 8; // JS number is 64-bit
export const MsgSizeMin = IdSize + ActionSize + TimeMillisSize + 3;
export const MsgSizeMax = 1024 * 1024; // Kinesis max payload is 1 MiB
export const MaxTokenSize = 1000;

const scales = [ 1e0, 1e1, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10 ];

function rangeCheck(num: number, minInclusive: number, maxInclusive: number): void {
    if (!(minInclusive <= num && num <= maxInclusive)) {
        throw new Error(`Number ${num} must be between ${minInclusive} and ${maxInclusive}.`);
    }
}

/**
 * Returns an string of length numDigits, consisting of random digits 0 to 9, with leading zeros, e.g. "01234567".
 */
export function genRandomDigitsAsString(numDigits: number): string {
    rangeCheck(numDigits, 1, MaxTokenSize);
    const numDigitsPerIteration = numDigits < scales.length ? numDigits : scales.length - 1;
    const scale = scales[numDigitsPerIteration];
    let str = '';
    while (str.length < numDigits) {
        str += genRandomPositiveIntegerWithLeadingZeros(numDigitsPerIteration, scale);
    }
    return str;
}

function genRandomDigitsPlusSpace(numDigits: number): string {
    return genRandomDigitsAsString(numDigits) + ' ';
}

export function genRandomAlphanum(numChars: number): string {
    rangeCheck(numChars, 1, MaxTokenSize);
    let str = '';
    while (str.length < numChars) {
        str += Math.random().toString(36).substring(2); // Random [a-z0-9] string up to 10 chars long.
    }
    return str.substring(0, numChars);
}

function genRandomAlphanumPlusSpace(numChars: number): string {
    return genRandomAlphanum(numChars) + ' ';
}

/**
 * Returns a random number from 0 (inclusive) to maxExclusive.
 */
function genRandomPositiveInteger(maxExclusive: number): number {
    if (maxExclusive <= 0) {
        throw new Error(`maxNumber ${maxExclusive} must be positive nonzero`);
    }
    return Math.floor(Math.random() * maxExclusive) % maxExclusive;
}

function genRandomPositiveIntegerWithLeadingZeros(numDigits: number, maxExclusive: number): string {
    return ("" + genRandomPositiveInteger(maxExclusive)).padStart(numDigits, "0");
}

/**
 * Calls a word generator function repeatedly until the concatenated result is the desired final size.
 */
function genStringIterativelyToFinalSize(
    genWordFn: () => string,
    finalSize: number,
): string {
    rangeCheck(finalSize, 1, MaxTokenSize);
    let str = '';
    while (str.length < finalSize) {
        str += genWordFn();
    }
    return str.substring(0, finalSize);
}

export function calcFieldSize(msgSize: number): number {
    return Math.round((msgSize - IdSize - ActionSize - TimeMillisSize)/3);
}

export function genRandomMessage(msgSize: number, maxMessageId: number): PerfmonMessage {
    rangeCheck(msgSize, MsgSizeMin, MsgSizeMax);
    const id = genRandomPositiveIntegerWithLeadingZeros(IdSize, maxMessageId);
    const actionNum = genRandomPositiveInteger(3);
    const action = actionNum === 0 ? 'CREATE' : (actionNum === 1 ? 'UPDATE' : 'DELETE');
    const fieldSize = calcFieldSize(msgSize);
    const words: string = genStringIterativelyToFinalSize(() => genRandomAlphanumPlusSpace(8), fieldSize);
    const numbers: string = genStringIterativelyToFinalSize(() => genRandomDigitsPlusSpace(8), fieldSize);
    const alpha: string = genRandomAlphanum(fieldSize).toUpperCase();
    const msgGenTimeMillis: number = new Date().getTime();
    return {
        id,
        action,
        fields: {
            words,
            numbers,
            alpha
        },
        msgGenTimeMillis: msgGenTimeMillis
    };
}