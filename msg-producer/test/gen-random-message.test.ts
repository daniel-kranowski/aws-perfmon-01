import { expect } from 'chai';
import * as grm from '../lib/gen-random-message';
import { PerfmonMessage } from '../lib/perfmon-message';

describe('gen-random-message', () => {

    it('genRandomDigitsAsString', () => {
        [1, 10, 100].forEach((numDigits: number) => {
            const str = grm.genRandomDigitsAsString(numDigits);
            console.log(`genRandomNumberAsString(${numDigits}): ${str}`);
            expect(str.length).to.equal(numDigits);
        });
    });

    it('genRandomAlphanum', () => {
        [1, 10, 100].forEach((numChars: number) => {
            const str = grm.genRandomAlphanum(numChars);
            console.log(`genRandomAlphanum(${numChars}): ${str}`);
            expect(str.length).to.equal(numChars);
        })
    });

    it('genRandomMessage', () => {
        [grm.MsgSizeMin, 1024].forEach((msgSize: number) => {
            const msg: PerfmonMessage = grm.genRandomMessage(msgSize, 1e6);
            console.log(`genRandomMessage(${msgSize}): ${JSON.stringify(msg, null, 4)}`);
            expect(msg.id.length).to.equal(grm.IdSize);
            expect(['CREATE', 'UPDATE', 'DELETE']).to.include(msg.action);
            const expectedFieldSize = grm.calcFieldSize(msgSize);
            expect(Math.abs(msg.fields.words.length - expectedFieldSize)).to.be.lessThan(1.0);
        });
    })
});