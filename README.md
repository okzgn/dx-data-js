# DX Data

Reactive state management for JavaScript & TypeScript. ESM only.

Comes with two tools:

- **DATAX** — A proxy-based store where every property is transparently reactive. Supports swappable adapters for Vanilla, Angular, or any other framework. Ideal for objects you want to intercept deeply.
- **DATA** — A lightweight object where you can attach get/set middleware to any property.

---

## 🚀 Installation

Install the package via NPM:

```bash
npm install dx-data
```

---

## 📖 DATAX

### Basic usage

```js
import DATAX from 'dx-data';

// Set a value
DATAX.user = { name: 'Ana', age: 30 };

// Read it
console.log(DATAX.user.name); // 'Ana'

// Update it
DATAX.user.name = 'Luis';
```

### Intercept a property with `.on()`

Lets you react to any get or set on a property's sub-properties.

```js
DATAX.on('user',
    function(subProperty, value) {
        // Called on every set
        console.log('Changed:', subProperty, '→', value);
    },
    function(subProperty) {
        // Called on every get (optional)
        console.log('Read:', subProperty);
    }
);

DATAX.user.name = 'Carlos'; // → Changed: name → Carlos
```

The `setHandler` can return `false` to cancel the mutation:

```js
DATAX.on('user', function(subProperty, value) {
    if(subProperty === 'age' && value < 0) return false; // blocked
});
```

### Stop intercepting with `.off()`

```js
DATAX.off('user');
```

### Custom reactivity adapter

By default DATAX uses a plain vanilla adapter. You can swap it for any reactive primitive — for example Angular signals:

```js
import { IDATAXReactivityAdapter, IDATAXProperty, DATAXReactivityAdapter } from 'dx-data';
import { signal, WritableSignal } from '@angular/core';

export const AngularReactivityAdapter: IDATAXReactivityAdapter = {
    options: { equal: function(){ return false; } },
    create: function(initialValue, options){
        const sig: WritableSignal<any> = signal(initialValue, (initialValue && typeof initialValue === 'object' ? this.options : options));
        return {
            get: sig,
            set: sig.set,
            update: sig.update
        };
    }
};

// To set the adapter globally
DATAXReactivityAdapter(AngularReactivityAdapter);

// To define state property type definitions
declare module 'dx-data' {
    export interface IDATA {
        appName:string;
        appVersion:string;
        appSupportEmail:string;
        appSupportPhone:string;
        mainTitle:string;
        history:any[];
        defaultUser:{ [key: string]: any };
        defaultPlace:{ [key: string]: any };
    }

    export interface IDATAX {
        lang: IDATAXProperty<string>;
        user: IDATAXProperty<{ [key: string]: any }>;
        signedUser: IDATAXProperty<boolean>;
        place: IDATAXProperty<{ [key: string]: any }>;
        logo: IDATAXProperty<string>;
        tabs: IDATAXProperty<boolean>;
        AIAssistantQuestion: IDATAXProperty<string>;
    }
}
```

After this, every DATAX property will automatically act as an Angular signal, removing the need for explicit `set` or `update` calls; instead, you can simply use `DATAX.property()`.

---

## 📖 DATA

### Basic usage

```js
import { DATA } from 'dx-data';

DATA.count = 0;
console.log(DATA.count); // 0
```

### Attach interceptors with `.on()`

```js
const sub = DATA.on('count',
    (value) => {
        // Called on every set — return a value to replace it
        console.log('Setting count to', value);
        return value < 0 ? 0 : value; // clamp to 0
    },
    (value) => {
        // Called on every get — return a value to replace it (optional)
        return value * 2;
    }
);

DATA.count = -5;
console.log(DATA.count); // 0 (clamped) * 2 = 0
DATA.count = 3;
console.log(DATA.count); // 3 * 2 = 6
```

You can stack multiple interceptors on the same property:

```js
DATA.on('count', (value) => {
    console.log('Another interceptor:', value);
});
```

### Unsubscribe a specific interceptor

```js
const sub = DATA.on('count', (value) => value * 2);

sub.off(); // only this interceptor is removed
```

### Remove a property entirely with `.off()`

```js
DATA.off('count'); // removes property and all interceptors
```

---

## TypeScript

All types are available via the `.d.ts` included in the package:

```ts
import type { IDATA, IDATAX, IDATAXReactivityAdapter, IDATAUnsubscribe } from 'dx-data';
```

> Add `"noPropertyAccessFromIndexSignature": false` to your `tsconfig.json` to use dot notation on DATAX properties without type errors.

---

## 📝 License

MIT License.

Copyright © 2026 [OKZGN](https://okzgn.com)