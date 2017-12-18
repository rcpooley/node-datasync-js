import {DataSocket} from "../src/datasocket";

export function dataSocketTester(socket: DataSocket) {
    return {
        assertHasListeners(val: boolean, event?: string) {
            expect(socket.tag.hasListeners(event)).toBe(val);
        }
    };
}