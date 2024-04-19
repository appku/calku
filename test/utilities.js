export default {
    structuredClone: (v) => { //polyfill for jest stupidity.
        let clone = Object.assign({}, v);
        return clone;
    },
    prettyPrint: (v) => {
        if (v === Infinity) {
            return 'Infinity';
        } else if (Number.isNaN(v)) {
            return 'NaN';
        } else if (v === Error || v instanceof Error) {
            return 'Error';
        } else if (v === Date || v instanceof Date) {
            return `Date(${v.toISOString()})`;
        }
        return JSON.stringify(v);
    }
};
