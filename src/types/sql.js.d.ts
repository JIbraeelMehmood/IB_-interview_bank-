/** sql.js types. The npm package ships no declarations, and the app only uses
 *  the small surface below, so declare exactly that rather than depend on
 *  a community package. */
declare module 'sql.js' {
  export interface QueryExecResult {
    columns: string[]
    values: any[][]
  }
  export interface Statement {
    bind(values?: any[]): boolean
    step(): boolean
    get(): any[]
    getAsObject(): Record<string, any>
    getColumnNames(): string[]
    reset(): void
    free(): boolean
  }
  export interface Database {
    run(sql: string, params?: any[]): Database
    exec(sql: string, params?: any[]): QueryExecResult[]
    prepare(sql: string, params?: any[]): Statement
    export(): Uint8Array
    close(): void
  }
  export interface SqlJsStatic {
    Database: new (data?: Uint8Array | ArrayLike<number> | Buffer | null) => Database
  }
  export interface SqlJsConfig {
    locateFile?: (file: string) => string
    wasmBinary?: ArrayBuffer | Uint8Array
  }
  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>
}

declare module 'sql.js/dist/sql-asm.js' {
  import initSqlJs from 'sql.js'
  export * from 'sql.js'
  export default initSqlJs
}
