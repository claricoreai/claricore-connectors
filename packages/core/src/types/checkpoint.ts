export interface Checkpoint {
  connectionId: string;
  resource: string;
  cursor?: string | null;
  updatedAt?: string | null;
}
