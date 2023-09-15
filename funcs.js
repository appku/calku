/**
 * Funcs should always receive the object being evaluated as the first argument,
 * and all reference argument tokens within it's evaluated argument group.
 */


export default [
    {
        symbol: 'COUNT',
        args: 1,
        func: function(target, argTokens, ...args) {
            if (Array.isArray(args[0])) {
                return args[0].length;
            }
            return 0;
        }
    }
];