interface TestState {
    expectedValue: any;
    assertMem: boolean;
}

export class MyTester {

    private curState: TestState;
    private testName: string;

    constructor(private runTest: (...inputs) => any, private cloneIO = false,
        private formatInputs?: (inputs: any[]) => string) {
    }

    public setTestName(name: string): void {
        this.testName = name;
    }

    public expectWithMem(val: any): MyTester {
        return this.expect(val, true);
    }

    public expect(val: any, assertMem = false): MyTester {
        this.curState = {
            expectedValue: this.clone(val),
            assertMem: assertMem
        };
        return this;
    }

    private clone(obj): any {
        if (this.cloneIO) {
            return JSON.parse(JSON.stringify(obj));
        } else {
            return obj;
        }
    }

    private formatInputString(inputs): string {
        if (!!this.formatInputs) {
            return this.formatInputs(inputs);
        } else {
            let str = JSON.stringify(inputs);
            return str.substring(1, str.length - 1);
        }
    }

    public test(...rawInputs): MyTester {
        let inputs = this.clone(rawInputs);
        let state = this.curState;
        let pre = !!this.testName ? '(' + this.testName + ') ' : '';
        it(`${pre}should handle ${this.formatInputString(inputs)} ==${state.assertMem ? '=' : ''} ${JSON.stringify(state.expectedValue)}`, () => {
            let output = this.runTest(...inputs);

            if (state.expectedValue === null) {
                expect(output).toBeNull();
            } else if (state.expectedValue === undefined) {
                expect(output).toBeUndefined();
            } else if (state.assertMem) {
                expect(output).toBe(state.expectedValue);
            } else {
                expect(output).toEqual(state.expectedValue);
            }
        });
        return this;
    }

    public multitest(numArgs: number, ...tests): MyTester {
        for (let i = 0; i < tests.length; i += numArgs) {
            this.test(...tests.slice(i, i + numArgs));
        }
        return this;
    }
}