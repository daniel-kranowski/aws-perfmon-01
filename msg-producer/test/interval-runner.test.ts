import { assert, expect } from 'chai';
import * as sinon from 'sinon';
import { IntervalRunner } from '../lib/interval-runner';

describe('interval-runner', () => {

    function makeLogFn(): () => void {
        let value = 100;
        return () => {
            console.log(`Fn has value ${value++}`);
        }
    }

    it('calls the fn N times with the expected delay', (done) => {
        const spyFn = sinon.spy(makeLogFn());
        const startTime = new Date().getTime();
        const milliseconds = 100;
        const numIntervals = 3;
        const alldone = () => {
            expect(spyFn.callCount).to.equal(numIntervals);
            const delay = new Date().getTime() - startTime;
            expect(delay).to.be.greaterThan(milliseconds * numIntervals);
            done();
        };
        const runner = new IntervalRunner(spyFn, milliseconds, numIntervals, alldone);
        runner.start();
    });

    it('fn error on 2nd try, but still called 3 times', (done) => {
        const stubFn = sinon.stub();
        stubFn.onCall(1).throws(new Error('Stub says Halp!')); // 0-based call num
        const startTime = new Date().getTime();
        const milliseconds = 100;
        const numIntervals = 3;
        const alldone = () => {
            expect(stubFn.callCount).to.equal(numIntervals);
            const delay = new Date().getTime() - startTime;
            expect(delay).to.be.greaterThan(milliseconds * numIntervals);
            done();
        };
        const runner = new IntervalRunner(stubFn, milliseconds, numIntervals, alldone);
        runner.start();
    });

});