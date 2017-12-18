export class DataUtil {

    /**
     * Check if something is an object {}
     * @param obj The object in question
     * @returns True if an object, otherwise false
     */
    public static isObject(obj: any): boolean {
        return Object.prototype.toString.call(obj) == '[object Object]';
    }

    /**
     * Returns the name eg: /hello/there => there
     * @param path The path to get the name from
     * @returns The name from the path
     */
    public static getNameFromPath(path: string): string {
        let spl = DataUtil.formatPath(path).split('/');
        return spl[spl.length - 1];
    }

    /**
     * Will force the input parameter into an array if it is not an array
     *
     * @param obj The object to be forced into an array
     * @returns obj if it was originally an array, or [obj] otherwise
     */
    public static forceArray(obj: any): Array<any> {
        if (!Array.isArray(obj)) {
            return [obj];
        } else {
            return obj;
        }
    }

    /**
     * Will format the provided string into the correct DataSync path format
     *
     * @param path The input path
     * @returns A correctly formatted path
     */
    public static formatPath(path: string): string {
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        if (path.endsWith('/')) {
            path = path.substring(0, path.length - 1);
        }
        if (path == '') {
            path = '/';
        }
        return path;
    }

    /**
     * Will return the value referenced by rawPath
     *
     * @param obj The object to enter
     * @param rawPath The path to the value we are looking for
     *
     * @returns The value referenced by rawPath, or null if it does not exist
     */
    public static traverseObject(obj: any, rawPath: string): any {
        let path = DataUtil.formatPath(rawPath);

        let spl = path.length > 1 ? path.split('/').slice(1) : [];

        return DataUtil.traverseObjectWithArray(obj, spl);
    }

    /**
     * Helper method for traverseObject
     *
     * @param obj The object we are entering
     * @param pathArray An array of each component of the path
     *
     * @returns The value referenced by the pathArray, or null if it does not exist
     */
    private static traverseObjectWithArray(obj: any, pathArray: string[]): any {
        if (pathArray.length == 0) {
            if (!obj) {
                return null;
            } else {
                return obj;
            }
        }

        if (!DataUtil.isObject(obj)) {
            return null;
        }

        let curNode = pathArray[0];

        if (curNode in obj) {
            return DataUtil.traverseObjectWithArray(obj[curNode], pathArray.slice(1));
        }

        return null;
    }

    /**
     * Will return a memory reference to rawPath in obj
     * Will also initialize values that don't exist an override values that are non-objects
     *
     * @param obj The object to traverse
     * @param rawPath The path to the value we want a memory reference to
     *
     * @returns A memory reference to rawPath in obj, or null if invalid path
     */
    public static traverseObjectForReference(obj: any, rawPath: string): any {
        let path = DataUtil.formatPath(rawPath);

        let spl = path.length > 1 ? path.split('/').slice(1) : [];

        return DataUtil.traverseObjectForReferenceWithArray(obj, spl);
    }

    /**
     * Helper method for traverseObjectForReference
     *
     * @param obj The object we are entering
     * @param pathArray The components of the path
     *
     * @returns A memory reference to pathArray in obj, or null if invalid pathArray
     */
    private static traverseObjectForReferenceWithArray(obj: any, pathArray: string[]): any {
        if (pathArray.length == 0 || !DataUtil.isObject(obj)) {
            return null
        }

        if (pathArray.length == 1) {
            return obj;
        }

        let curNode = pathArray[0];

        if (!(curNode in obj) || !DataUtil.isObject(obj[curNode])) {
            obj[curNode] = {};
        }

        return DataUtil.traverseObjectForReferenceWithArray(obj[curNode], pathArray.slice(1));
    }

    public static randomString(len: number): string {
        let alpha = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

        let str = '';

        for (let i = 0; i < len; i++) {
            str += alpha.charAt(Math.floor(Math.random() * alpha.length));
        }

        return str;
    }
}