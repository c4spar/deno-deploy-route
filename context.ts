export type EventType = string;
export type Method = string;

export class Context {
  constructor(
    public methods: Method[] = [],
    public path?: EventType,
    public name?: string,
  ) {}
}
