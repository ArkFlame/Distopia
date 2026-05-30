declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): {
      run(...params: Array<string | number | bigint | null | Uint8Array>): unknown;
      get(...params: Array<string | number | bigint | null | Uint8Array>): unknown;
      all(...params: Array<string | number | bigint | null | Uint8Array>): unknown[];
    };
  }
}
