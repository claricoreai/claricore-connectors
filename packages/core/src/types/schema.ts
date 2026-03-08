export interface SchemaField {
  name: string;
  type: string;
  required?: boolean;
}

export interface SchemaDefinition {
  resource: string;
  fields: SchemaField[];
}
