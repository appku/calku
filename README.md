# AppKu&trade; CalKu
AppKu&trade; CalKu is a powerful expression engine built for power-users that developers can leverage to enhance their
applications. CalKu turns syntactic text into a chain of operations and functions that can run against objects and 
compute a resulting value. The functionality is similar to "formulas" seen in spreadsheet applications, but tailored
to operate on complex objects with depth and arrays.

It's simple to learn, and easy to use. 

For developers, here's a few examples to show how easy it is to get started:

```js
import calku from '@appku/calku';

/**
 * In CalKu, the `value` function evaluates the expression against an object (optional), 
 * and returns the resulting value.
 * In this first example, we'll pass the expression '{message} & "world"' to CalKu along
 * with the object `{ message: 'hello' }` in order to concatenate the message and the word
 * "hello" into "hello world".
 */
let output = calku.value('{message} & "world"', { message: 'hello' });
console.log(output); // "hello world"

//you can also express math
output = calku.value('10 + 5 - 12 / 3 * 2');
console.log(output); // 7

//or logical comparisons
output = calku.value('false AND true OR (true AND false)');
console.log(output); // false

//and even functions with a more complex object...
output = calku.value(
    'SUM(1, 2, 3) + {invoice.qty} + {products:1.price}', 
    { 
        name: 'John', 
        invoice: { currency: 'usd', qty: 3 }
        products: [
            { title: 'apple', price: 0.75 },
            { title: 'blueberries', price: 1.50 },
            { title: 'orange', price: 0.85 }
        ]
    }
);
console.log(output); // 10.5
```

## Documentation


### Types Supported
CalKu is a unique expression engine that supports all types in the JSON specification, as well as date/time values and
comments. It includes robust timezone support to ensure date/time expressions are processed as-expected. Other types
may be present in target objects, but they are not supported in built-in operations or functions (though you may add 
your own).

| JavaScript Type | Built-in Support |
|:-:|:-:|
| `Boolean` | Yes |
| `Date` | Yes |
| `Number` | Yes |
| `String` | Yes |
| `Array` | Yes |
| `Object` | Yes |

The CalKu engine is semi-forgiving- `null` values are often treated as `0`'s or blank strings in order for the 
expression to evaluate to a user-facing value.

All built-in operations and functions that support array arguments use a maximum recursion depth of `3`. This means
that functions, such as `COUNT` will traverse into array items that are also arrays, and so on, to a total of `3` deep.

### List of Operators
Operators are symbols that are expressed between two values and result in a new value. For example, in the expression 
`4 < 5`, the `<` character is the operator, instructing the expression to get a `true` or `false` value by comparing 
and checking that `4` is less than `5`. Subsequent operations can follow any resulting value creating a chain of 
evaluation, i.e. an expression!

In this table you will find a listing of all *built-in* and supported operators in CalKu. It is possible to add your 
own custom operators as well, see: [Adding Custom Operators](#adding-custom-operators).

<table width="100%">
    <thead>
        <tr>
            <th>Name</th>
            <th align="right">Symbols</th>
            <th>Arguments</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>CONCATENATE</td>
            <td align="center"><code>&amp;</code></td>
            <td>
                <dl>
                    <dt>#1 Left of symbol</dt>
                    <dd>All Types Supported</dd>
                    <dt>#2 Right of symbol</dt>
                    <dd>All Types Supported</dd>
                </dl>
            </td>
        </tr>
        <tr>
            <td colspan="4">
                <em>Example:</em>
                <code>"Hello" & 1000 & "'s of worlds!"</code><br />
                <small>Result: <code>"Hello 1000's of worlds!"</code></small>
            </td>
        </tr>
    </tbody>
</table>

### List of Functions

### Advanced

#### Adding Custom Operators

#### Adding Custom Functions