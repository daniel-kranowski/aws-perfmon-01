/**
 * Runs a function 'fn' a specified number of times, using setInterval.  After the last time,
 * it calls clearInterval and calls the 'done' function.
 *
 * Errors are non-fatal, it continues calling the fn.
 */
export class IntervalRunner {

    static NO_ACTIVE_INTERVAL = -1;
    private intervalID: any;
    private currentNum: number = IntervalRunner.NO_ACTIVE_INTERVAL; // Zero-based

    constructor(
        private readonly fn: () => void,
        private readonly milliseconds: number,
        private readonly numIntervals: number,
        private readonly done: () => void,
    ) {
        if (milliseconds <= 0) {
            throw new Error(`milliseconds: ${milliseconds}, should be a positive number`);
        }
        if (numIntervals <= 0) {
            throw new Error(`numIntervals: ${numIntervals}, should be a positive number`);
        }
    }

    private fnWrapper() {
        ++this.currentNum;
        console.log(`Interval ${this.currentNum} starting`);
        try {
            this.fn();
            // If "this.fn()" is async, then it continues executing on the next JS tick.
            // It must internally catch any future exceptions.
        }
        catch (e) {
            console.error(`Caught Error in intervalNum ${this.currentNum}`);
            console.error(e.stack);
        }
        if (this.currentNum >= this.numIntervals - 1) {
            clearInterval(this.intervalID);
            console.log(`Interval ${this.currentNum} is the last interval`);
            this.currentNum = IntervalRunner.NO_ACTIVE_INTERVAL;
            this.done();
        }
    }

    start() {
        if (this.currentNum >= 0) {
            throw new Error(`currentNum: ${this.currentNum}, already started`);
        }
        this.intervalID = setInterval(() => this.fnWrapper(), this.milliseconds);
    }

    // Currently no need for "stop()"
}