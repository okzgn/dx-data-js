/*
    NOTE: Set "noPropertyAccessFromIndexSignature" to "false" in "tsconfig.json" to allow the use of dot notation for DATAX entries (like "DATAX.entry").
*/

// ─── DATAX ───────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} IDATAXReactivityAdapterValue
 * @property {() => any} get
 * @property {(value: any) => void} set
 * @property {(fn: (value: any) => any) => void} update
 */

/**
 * @typedef {Object} IDATAXReactivityAdapter
 * @property {(initialValue?: any, options?: any) => IDATAXReactivityAdapterValue} create
 * @property {any} [options]
 */

/**
 * @typedef {Object} IDATAX
 * @property {(property: string, setHandler: (subProperty: string, value: any) => boolean | void, getHandler?: ((subProperty: string) => any) | null) => void} on
 * @property {(property: string) => void} off
 */

/**
 * @typedef {Object} IDATAUnsubscribe
 * @property {() => void} off
 */

/**
 * @typedef {Object} IDATA
 * @property {(name: string, fn_set?: ((value: any) => any) | null, fn_get?: ((value: any) => any) | null) => IDATAUnsubscribe} on
 * @property {(name: string) => void} off
 */

/**
 * @typedef {{ property: string, value: any, cache: WeakMap<object, any>, setHandler: Function, getHandler: Function|null, reactiveReference: IDATAXReactivityAdapterValue }} IDATAXContext
 */

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default vanilla reactivity adapter (no framework dependency).
 * @type {IDATAXReactivityAdapter}
 */
export const VanillaReactivityAdapter = {
    create: function(initialValue){
        let _value = initialValue;
        return {
            get: function(){ return _value; },
            set: function(value){ _value = value; },
            update: function(valueFn){ _value = valueFn(_value); }
        };
    }
};

/** @type {IDATAXReactivityAdapter} */
let ReactivityAdapter = VanillaReactivityAdapter;

/**
 * Sets a custom reactivity adapter for DATAX (e.g. Svelte stores, SolidJS signals).
 * @param {IDATAXReactivityAdapter} newAdapter
 */
export function DATAXReactivityAdapter(newAdapter){
    if(newAdapter && typeof newAdapter === 'object' && typeof newAdapter.create === 'function'){
        let adapterValue = newAdapter.create(null);
        if(typeof adapterValue.get === 'function' && typeof adapterValue.set === 'function' && typeof adapterValue.update === 'function'){
            ReactivityAdapter = newAdapter;
        }
        else {
            console.error('DATAX: Reactivity adapter failed, doesn\'t have: "get", "set" or "update" methods.');
        }
    }
    else {
        console.error('DATAX: Reactivity adapter error, doesn\'t have: "create" method or isn\'t an "object".');
    }
}

/** @type {Record<string, IDATAXContext>} */
const DATAX_ON = {};

/**
 * Creates a Proxy handler that intercepts get/set on a DATAX property's value.
 * @param {IDATAXContext} DATAXProperty
 * @returns {ProxyHandler<any>}
 */
function DATAXPropertyInterceptor(DATAXProperty){
    return {
        set: function(target, subProperty, value){
            if(DATAXProperty.setHandler.call(target, subProperty, value) !== false){
                target[subProperty] = value;
                DATAXProperty.reactiveReference.update(function(t){ return t; });
            }
            return true;
        },
        get: function(target, subProperty){
            let value = (typeof DATAXProperty.getHandler === 'function'
                ? DATAXProperty.getHandler.call(target, subProperty)
                : target[subProperty]);

            if(value !== null && typeof value === 'object'){
                if(!DATAX_ON[DATAXProperty.property].cache.has(value)){
                    DATAX_ON[DATAXProperty.property].cache.set(value, new Proxy(value, DATAXPropertyInterceptor(DATAXProperty)));
                }
                return DATAX_ON[DATAXProperty.property].cache.get(value);
            }

            return value;
        }
    };
}

/**
 * Wraps a DATAX property's value in a Proxy with its interceptor.
 * @param {string} property
 * @returns {Proxy}
 */
function DATAXPropertyWrapper(property){
    return new Proxy(DATAX_ON[property].value, DATAXPropertyInterceptor(DATAX_ON[property]));
}

/**
 * Reactive state store with support for custom reactivity adapters.
 * Properties are transparently wrapped in the adapter's reactive primitives.
 * @type {IDATAX}
 */
export const DATAX = new Proxy(({
    /**
     * Removes the interceptor from a property, restoring direct access.
     * @param {string} property
     */
    off: function(property){
        if(DATAX_ON[property]){
            this[property] = DATAX_ON[property].value;
            delete DATAX_ON[property];
        }
        else {
            console.warn('DATAX: Property "' + property + '" doesn\'t exist.');
        }
    },

    /**
     * Registers set/get interceptors on an existing object property.
     * @param {string} property - Name of the DATAX property (must already exist and be an object).
     * @param {(subProperty: string, value: any) => boolean | void} setHandler - Called on every set. Return `false` to cancel the mutation.
     * @param {((subProperty: string) => any) | null} [getHandler] - Called on every get. Optional.
     */
    on: function(property, setHandler, getHandler = null){
        if(typeof DATAX_ON[property] !== 'undefined'){
            return console.error('DATAX: Property "' + property + '" already on.');
        }

        if(typeof setHandler !== 'function'){
            return console.error('DATAX: "setHandler" must be a function.');
        }

        let reactiveReference = this[property];

        if(typeof reactiveReference === 'undefined'){
            return console.error('DATAX: Property "' + property + '" doesn\'t exist.');
        }

        let currentValue = reactiveReference();
        if(currentValue === null || typeof currentValue !== 'object'){
            return console.warn('DATAX: "' + property + '" property isn\'t an object.');
        }

        DATAX_ON[property] = {
            property,
            value: currentValue,
            cache: new WeakMap(),
            setHandler,
            getHandler,
            reactiveReference
        };

        this[property] = currentValue;
    }
}), {
    get: function(target, property){
        if(typeof property === 'symbol'){ return undefined; }
        if(property === 'on' || property === 'off'){ return Reflect.get(target, property); }
        if(property in target){ return target[property].get; }
        return undefined;
    },
    set: function(target, property, value){
        if(typeof property === 'symbol'){ return false; }

        if(typeof target[property] === 'undefined'){
            target[property] = ReactivityAdapter.create(value);
        }
        else {
            let currentType = typeof (target[property].get());
            let newValueType = typeof value;

            if(DATAX_ON[property]){
                if(!value || newValueType !== 'object'){
                    console.warn('"' + String(property) + '" property is an object that can\'t be another type. Or use the "off" method to unlock it.');
                    return true;
                }
                if(value && newValueType === 'object'){
                    DATAX_ON[property].value = value;
                    DATAX_ON[property].cache = new WeakMap();
                    target[property].set(DATAXPropertyWrapper(property));
                    return true;
                }
            }

            if(newValueType === 'function' && currentType !== 'function'){
                target[property].update(value);
            }
            else {
                target[property].set(value);
            }
        }
        return true;
    }
});

export default DATAX;

// ─── DATA ─────────────────────────────────────────────────────────────────────

const DATA_REFERENCES = new Map();

/**
 * Simple state object with chainable get/set interceptors per property.
 * @type {IDATA}
 */
export const DATA = {};

Object.defineProperty(DATA, 'on', {
    /**
     * Registers get/set interceptors on a DATA property.
     * Can be called multiple times on the same property to stack interceptors.
     * @param {string} name - Property name.
     * @param {((value: any) => any) | null} [fn_set] - Interceptor called on set. Return a value to replace it.
     * @param {((value: any) => any) | null} [fn_get] - Interceptor called on get. Return a value to replace it.
     * @returns {IDATAUnsubscribe}
     */
    value: function setAndGetReaction(name, fn_set = null, fn_get = null){
        let _recently_set = DATA_REFERENCES.has(name);
        let _has_previous = !_recently_set && (name in DATA);
        let _already_set = _has_previous ? DATA[name] : null;

        if(!_recently_set){
            DATA_REFERENCES.set(name, { value: null, fns_set: [], fns_get: [] });
        }

        let property = DATA_REFERENCES.get(name);
        if(typeof fn_set === 'function'){ property.fns_set.push(fn_set); }
        if(typeof fn_get === 'function'){ property.fns_get.push(fn_get); }

        if(!_recently_set){
            Object.defineProperty(DATA, name, {
                set: function(value){
                    let _value = value;
                    for(let fn of property.fns_set){
                        const new_value = fn(_value);
                        if(new_value !== undefined){ _value = new_value; }
                    }
                    property.value = _value;
                },
                get: function(){
                    let _value = property.value;
                    for(let fn of property.fns_get){
                        const new_value = fn(_value);
                        if(new_value !== undefined){ _value = new_value; }
                    }
                    return _value;
                },
                enumerable: true,
                configurable: true
            });

            if(_has_previous){
                DATA[name] = _already_set;
            }
        }

        return {
            off: function(){
                if(typeof fn_set === 'function'){
                    let idx = property.fns_set.indexOf(fn_set);
                    if(idx > -1){ property.fns_set.splice(idx, 1); }
                }
                if(typeof fn_get === 'function'){
                    let idx = property.fns_get.indexOf(fn_get);
                    if(idx > -1){ property.fns_get.splice(idx, 1); }
                }
            }
        };
    },
    enumerable: true,
    writable: false,
    configurable: false
});

Object.defineProperty(DATA, 'off', {
    /**
     * Removes a property and all its interceptors from DATA.
     * @param {string} name
     */
    value: function setAndGetDeletion(name){
        if(DATA_REFERENCES.has(name)){
            delete DATA[name];
            DATA_REFERENCES.delete(name);
        } else {
            console.error('Property "' + name + '" wasn\'t declared.');
        }
    },
    enumerable: true,
    writable: false,
    configurable: false
});