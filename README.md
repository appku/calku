# AppKu&trade; CalKu
AppKu&trade; CalKu is a powerful expression engine that turns text into evaluated operations that can run against 
objects and arrays, perform computation, and return a resulting value. The functionality is similar to "formulas" seen in
spreadsheet applications, but tailored to operate on complex objects with depth and arrays.

It's simple to learn, and easy to use. 

Here's a few quick examples to show how easy it is to get started:

```js
import calku from '@appku/calku';

/**
 * In CalKu, the `value` function evaluates the expression against an object (optional), and returns the resulting value.
 * In this first example, we'll pass the expression '{message} & "world"' to CalKu along with the object `{ message: 'hello' }` in order to concatenate the message and the word "hello" into "hello world".
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
*Coming soon.*

### List of Operators

### List of Functions

### Advanced

#### Adding Custom Operators

#### Adding Custom Functions