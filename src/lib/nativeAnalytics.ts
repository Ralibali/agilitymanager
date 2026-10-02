// The first native release has no analytics SDK or event collection.
export function track(_event: string, _props?: Record<string, unknown>): void {
  void _event;
  void _props;
}
