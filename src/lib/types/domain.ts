// Generic domain types shared across modules

export type Attrs = {
    b?: number          // birth year (YYYY)
    d?: number          // reserved for future
    [k: string]: string | number | undefined
  }
  
  export interface NodeEntry {
    id: string          // internal id, e.g. "samantha_2010", "alex_2"
    label: string       // display name (NFC-trimmed)
    attrs: Attrs        // extracted attributes (incl. b when applicable)
  }
  