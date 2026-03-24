export interface IDATAXReactivityAdapter {
    create: (initialValue?: any, options?: any) => { 
        get: () => any, 
        set: (v: any) => void, 
        update: (fn: (value: any) => any) => void 
    };
    options?: any;
}

export type IDATAXProperty<T> = any;

export interface IDATAX {
    on: IDATAXOnCommand;
    off: IDATAXOffCommand;
    [key: string]: IDATAXProperty<any>;
}

export interface IDATAXOnCommand {
    (property: string, setHandler: (subProperty: string, value: any) => boolean | void, getHandler?: ((subProperty: string) => any) | null): void;
}

export interface IDATAXOffCommand {
    (property: string): void;
}

export interface IDATAXContext {
    property: string;
    value: any;
    cache: WeakMap<object, any>;
    setHandler: Function;
    getHandler: Function | null;
    reactiveReference: any;
}

export interface IDATAUnsubscribe {
    off: () => void;
}

export type IDATAProperty<T> = any;

export interface IDATA {
    on: (
        name: string, 
        fn_set?: ((value: any) => any) | null, 
        fn_get?: ((value: any) => any) | null
    ) => IDATAUnsubscribe;
    off: (name: string) => void;
    [key: string]: IDATAProperty<any>;
}

export const VanillaReactivityAdapter:IDATAXReactivityAdapter;
export function DATAXReactivityAdapter(newAdapter: IDATAXReactivityAdapter): void;

export const DATAX: IDATAX;
export const DATA: IDATA;
export default DATAX;
