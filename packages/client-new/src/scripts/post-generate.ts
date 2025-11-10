/**
 * Post-generation script to transform primitive types to TON types
 *
 * Strategy:
 * 1. Parse api.yml to find all fields with special formats
 * 2. Create a mapping of field types
 * 3. Modify generated types.gen.ts based on this mapping
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

const ROOT_DIR = process.cwd();
const API_SPEC_PATH = path.join(ROOT_DIR, 'src', 'api.yml');
const TYPES_FILE = path.join(ROOT_DIR, 'src', 'generated', 'types.gen.ts');

interface TypeReplacement {
  from: string;
  to: string;
}

interface CellFieldInfo {
  schemaName: string;  // e.g., "BlockchainRawAccount"
  fieldName: string;   // e.g., "code"
  format: 'hex' | 'base64';  // cell format
  isArray?: boolean;   // true if it's an array field
}

interface AddressFieldInfo {
  schemaName: string;  // e.g., "Account"
  fieldName: string;   // e.g., "address"
  isArray?: boolean;   // true if it's an array field
}

interface StringBigIntFieldInfo {
  schemaName: string;  // e.g., "JettonInfo"
  fieldName: string;   // e.g., "total_supply"
  isArray?: boolean;   // true if it's an array field
}

/**
 * Parse OpenAPI spec and find all String BigInt fields (type: string + x-js-format: bigint)
 */
function analyzeStringBigIntFields(spec: any): StringBigIntFieldInfo[] {
  const stringBigIntFields: StringBigIntFieldInfo[] = [];

  function processSchema(schema: any, schemaName?: string, parentSchemaName?: string) {
    if (!schema || typeof schema !== 'object') return;

    // Check if this is a String BigInt field
    if (schema.type === 'string' && schema['x-js-format'] === 'bigint') {
      const parts = schemaName?.split('.');
      if (parts && parts.length === 2 && parentSchemaName) {
        const fieldName = parts[1];
        const isArray = fieldName.includes('[]');
        const cleanFieldName = isArray ? fieldName.replace('[]', '') : fieldName;

        stringBigIntFields.push({
          schemaName: parentSchemaName,
          fieldName: cleanFieldName,
          isArray
        });
      }
    }

    // Process properties
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        processSchema(propSchema, `${schemaName}.${propName}`, parentSchemaName || schemaName);
      }
    }

    // Process array items
    if (schema.items) {
      processSchema(schema.items, schemaName ? `${schemaName}[]` : undefined, parentSchemaName);
    }

    // Process allOf, anyOf, oneOf
    ['allOf', 'anyOf', 'oneOf'].forEach((key) => {
      if (Array.isArray(schema[key])) {
        schema[key].forEach((item: any) => processSchema(item, schemaName, parentSchemaName));
      }
    });

    // Process additionalProperties
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      processSchema(schema.additionalProperties, schemaName, parentSchemaName);
    }
  }

  // Process all schemas
  if (spec.components?.schemas) {
    for (const [schemaName, schema] of Object.entries(spec.components.schemas)) {
      processSchema(schema, schemaName, schemaName);
    }
  }

  return stringBigIntFields;
}

/**
 * Parse OpenAPI spec and find all Address fields
 */
function analyzeAddressFields(spec: any): AddressFieldInfo[] {
  const addressFields: AddressFieldInfo[] = [];

  function processSchema(schema: any, schemaName?: string, parentSchemaName?: string) {
    if (!schema || typeof schema !== 'object') return;

    // Check if this is an Address field
    if (schema.type === 'string' && schema.format === 'address') {
      const parts = schemaName?.split('.');
      if (parts && parts.length === 2 && parentSchemaName) {
        const fieldName = parts[1];
        const isArray = fieldName.includes('[]');
        const cleanFieldName = isArray ? fieldName.replace('[]', '') : fieldName;

        addressFields.push({
          schemaName: parentSchemaName,
          fieldName: cleanFieldName,
          isArray
        });
      }
    }

    // Process properties
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        processSchema(propSchema, `${schemaName}.${propName}`, parentSchemaName || schemaName);
      }
    }

    // Process array items
    if (schema.items) {
      processSchema(schema.items, schemaName ? `${schemaName}[]` : undefined, parentSchemaName);
    }

    // Process allOf, anyOf, oneOf
    ['allOf', 'anyOf', 'oneOf'].forEach((key) => {
      if (Array.isArray(schema[key])) {
        schema[key].forEach((item: any) => processSchema(item, schemaName, parentSchemaName));
      }
    });

    // Process additionalProperties
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      processSchema(schema.additionalProperties, schemaName, parentSchemaName);
    }
  }

  // Process all schemas
  if (spec.components?.schemas) {
    for (const [schemaName, schema] of Object.entries(spec.components.schemas)) {
      processSchema(schema, schemaName, schemaName);
    }
  }

  return addressFields;
}

/**
 * Parse OpenAPI spec and find all Cell fields with their formats
 */
function analyzeCellFields(spec: any): CellFieldInfo[] {
  const cellFields: CellFieldInfo[] = [];

  function processSchema(schema: any, schemaName?: string, parentSchemaName?: string) {
    if (!schema || typeof schema !== 'object') return;

    // Check if this is a Cell field
    if (schema.type === 'string') {
      if (schema.format === 'cell') {
        const parts = schemaName?.split('.');
        if (parts && parts.length === 2 && parentSchemaName) {
          const fieldName = parts[1];
          const isArray = fieldName.includes('[]');
          const cleanFieldName = isArray ? fieldName.replace('[]', '') : fieldName;

          cellFields.push({
            schemaName: parentSchemaName,
            fieldName: cleanFieldName,
            format: 'hex',
            isArray
          });
        }
      } else if (schema.format === 'cell-base64') {
        const parts = schemaName?.split('.');
        if (parts && parts.length === 2 && parentSchemaName) {
          const fieldName = parts[1];
          const isArray = fieldName.includes('[]');
          const cleanFieldName = isArray ? fieldName.replace('[]', '') : fieldName;

          cellFields.push({
            schemaName: parentSchemaName,
            fieldName: cleanFieldName,
            format: 'base64',
            isArray
          });
        }
      }
    }

    // Process properties
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        processSchema(propSchema, `${schemaName}.${propName}`, parentSchemaName || schemaName);
      }
    }

    // Process array items
    if (schema.items) {
      processSchema(schema.items, schemaName ? `${schemaName}[]` : undefined, parentSchemaName);
    }

    // Process allOf, anyOf, oneOf
    ['allOf', 'anyOf', 'oneOf'].forEach((key) => {
      if (Array.isArray(schema[key])) {
        schema[key].forEach((item: any) => processSchema(item, schemaName, parentSchemaName));
      }
    });

    // Process additionalProperties
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      processSchema(schema.additionalProperties, schemaName, parentSchemaName);
    }
  }

  // Process all schemas
  if (spec.components?.schemas) {
    for (const [schemaName, schema] of Object.entries(spec.components.schemas)) {
      processSchema(schema, schemaName, schemaName);
    }
  }

  return cellFields;
}

/**
 * Parse OpenAPI spec and find all fields that need type replacement
 */
function analyzeSpec(spec: any): Map<string, string> {
  const typeMap = new Map<string, string>();

  function processSchema(schema: any, schemaName?: string) {
    if (!schema || typeof schema !== 'object') return;

    // Check if this schema itself needs replacement
    if (schema.type === 'string') {
      if (schema.format === 'address') {
        if (schemaName) {
          console.log(`  Found address field in schema: ${schemaName}`);
        }
        return 'Address';
      } else if (schema.format === 'cell' || schema.format === 'cell-base64') {
        if (schemaName) {
          console.log(`  Found cell field in schema: ${schemaName}`);
        }
        return 'Cell';
      } else if (schema['x-js-format'] === 'bigint') {
        if (schemaName) {
          console.log(`  Found bigint string field in schema: ${schemaName}`);
        }
        return 'bigint';
      }
    }

    if (schema.type === 'integer' && schema['x-js-format'] === 'bigint') {
      if (schemaName) {
        console.log(`  Found bigint integer field in schema: ${schemaName}`);
      }
      return 'bigint';
    }

    if (schema.type === 'object' && schema.format === 'tuple-item') {
      if (schemaName) {
        console.log(`  Found tuple-item field in schema: ${schemaName}`);
      }
      return 'TupleItem';
    }

    // Process properties
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const replacement = processSchema(propSchema, `${schemaName}.${propName}`);
        if (replacement) {
          typeMap.set(`${schemaName}.${propName}`, replacement);
        }
      }
    }

    // Process array items
    if (schema.items) {
      processSchema(schema.items, schemaName ? `${schemaName}[]` : undefined);
    }

    // Process allOf, anyOf, oneOf
    ['allOf', 'anyOf', 'oneOf'].forEach((key) => {
      if (Array.isArray(schema[key])) {
        schema[key].forEach((item: any) => processSchema(item, schemaName));
      }
    });

    // Process additionalProperties
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      processSchema(schema.additionalProperties, schemaName);
    }

    return null;
  }

  // Process all schemas
  if (spec.components?.schemas) {
    console.log('\nAnalyzing OpenAPI spec for TON types...');
    for (const [schemaName, schema] of Object.entries(spec.components.schemas)) {
      processSchema(schema, schemaName);
    }
  }

  return typeMap;
}

/**
 * Transform generated types.gen.ts file
 * Uses cellFields and stringBigIntFields information to replace types
 */
function transformTypes(content: string, cellFields: CellFieldInfo[], stringBigIntFields: StringBigIntFieldInfo[]): string {
  let transformed = content;
  let replacementCount = 0;

  // Add imports at the top (after auto-generated comment)
  const autoGenComment = '// This file is auto-generated by @hey-api/openapi-ts';
  if (transformed.includes(autoGenComment)) {
    transformed = transformed.replace(
      autoGenComment,
      `${autoGenComment}\n\nimport { Address, Cell, TupleItem } from '@ton/core';`
    );
    console.log('✓ Added @ton/core imports');
  }

  // Replace types based on context
  // Note: We need to be careful with regex patterns to match actual TypeScript syntax

  // 1. Replace address: string with address: Address
  // Match patterns like:  address: string; or  address?: string;
  const addressPattern = /(\s+address\??:\s*)string(;)/g;
  const addressMatches = transformed.match(addressPattern);
  if (addressMatches) {
    transformed = transformed.replace(addressPattern, '$1Address$2');
    replacementCount += addressMatches.length;
    console.log(`✓ Replaced ${addressMatches.length} address fields: string → Address`);
  }

  // 2. Replace Cell fields using analyzed schema information
  // This handles boc, cell, code, data, and any other fields with format: cell
  const cellFieldNames = new Set(cellFields.map(f => f.fieldName));
  for (const fieldName of cellFieldNames) {
    const pattern = new RegExp(`(\\s+${fieldName}\\??:\\s*)string(;)`, 'g');
    const matches = transformed.match(pattern);
    if (matches) {
      transformed = transformed.replace(pattern, '$1Cell$2');
      replacementCount += matches.length;
    }
  }
  if (cellFieldNames.size > 0) {
    console.log(`✓ Replaced ${cellFieldNames.size} Cell fields: string → Cell (${Array.from(cellFieldNames).join(', ')})`);
  }

  // 3. Replace String BigInt fields: string → bigint
  const stringBigIntFieldNames = new Set(stringBigIntFields.map(f => f.fieldName));
  for (const fieldName of stringBigIntFieldNames) {
    const pattern = new RegExp(`(\\s+${fieldName}\\??:\\s*)string(;)`, 'g');
    const matches = transformed.match(pattern);
    if (matches) {
      transformed = transformed.replace(pattern, '$1bigint$2');
      replacementCount += matches.length;
    }
  }
  if (stringBigIntFieldNames.size > 0) {
    console.log(`✓ Replaced ${stringBigIntFieldNames.size} String BigInt fields: string → bigint (${Array.from(stringBigIntFieldNames).join(', ')})`);
  }

  // 4. Replace fields ending with _address: string
  const addressSuffixPattern = /(\s+\w*_address\??:\s*)string(;)/g;
  const addressSuffixMatches = transformed.match(addressSuffixPattern);
  if (addressSuffixMatches) {
    transformed = transformed.replace(addressSuffixPattern, '$1Address$2');
    replacementCount += addressSuffixMatches.length;
    console.log(`✓ Replaced ${addressSuffixMatches.length} *_address fields: string → Address`);
  }

  return transformed;
}

/**
 * Transform generated transformers.gen.ts to convert unix timestamps to Date
 *
 * @hey-api/transformers converts timestamp fields to BigInt by default.
 * We need to replace BigInt(timestamp) with new Date(timestamp * 1000) for unix timestamps.
 */
function transformTransformers(content: string): string {
  let transformed = content;
  let replacementCount = 0;

  // Unix timestamp fields that should be Date objects instead of BigInt
  const timestampFields = [
    'timestamp',
    'created_at',
    'updated_at',
    'last_activity',
    'expires_at',
    'valid_until',
    'start_from',
    'cycle_start',
    'cycle_end',
  ];

  // Replace BigInt conversions with Date conversions for timestamp fields
  // Pattern: data.timestamp = BigInt(data.timestamp.toString());
  // Replace with: data.timestamp = new Date(Number(data.timestamp) * 1000);

  for (const field of timestampFields) {
    // Match patterns like: data.timestamp = BigInt(data.timestamp.toString());
    const bigintPattern = new RegExp(
      `(\\s+)(data\\.${field} = )BigInt\\(data\\.${field}\\.toString\\(\\)\\);`,
      'g'
    );

    const matches = transformed.match(bigintPattern);
    if (matches) {
      transformed = transformed.replace(
        bigintPattern,
        `$1$2new Date(Number(data.${field}) * 1000);`
      );
      replacementCount += matches.length;
    }
  }

  if (replacementCount > 0) {
    console.log(`✓ Replaced ${replacementCount} unix timestamp BigInt → Date conversions`);
  }

  return transformed;
}

/**
 * Transform types.gen.ts to change timestamp field types from bigint to Date
 */
function transformTimestampTypes(content: string): string {
  let transformed = content;
  let replacementCount = 0;

  // Change timestamp types from bigint to Date
  const timestampFields = [
    'timestamp',
    'created_at',
    'updated_at',
    'last_activity',
    'expires_at',
    'valid_until',
    'start_from',
    'cycle_start',
    'cycle_end',
  ];

  for (const field of timestampFields) {
    // Pattern: timestamp: bigint; or timestamp?: bigint;
    const pattern = new RegExp(
      `(\\s+${field}\\??: )bigint(;)`,
      'g'
    );

    const matches = transformed.match(pattern);
    if (matches) {
      transformed = transformed.replace(pattern, '$1Date$2');
      replacementCount += matches.length;
    }
  }

  if (replacementCount > 0) {
    console.log(`✓ Changed ${replacementCount} timestamp types: bigint → Date`);
  }

  return transformed;
}

/**
 * Add String BigInt transformations to transformers.gen.ts
 * For each String BigInt field, add lines like:
 *   if (data.total_supply) data.total_supply = BigInt(data.total_supply);
 */
function addStringBigIntTransformations(content: string, stringBigIntFields: StringBigIntFieldInfo[]): string {
  let transformed = content;
  let additionsCount = 0;

  // Group String BigInt fields by schema name
  const fieldsBySchema = new Map<string, StringBigIntFieldInfo[]>();
  for (const field of stringBigIntFields) {
    const existing = fieldsBySchema.get(field.schemaName) || [];
    existing.push(field);
    fieldsBySchema.set(field.schemaName, existing);
  }

  // For each schema, find its transformer function and add BigInt conversions
  for (const [schemaName, fields] of fieldsBySchema.entries()) {
    // Convert PascalCase to camelCase for function name
    const functionName = schemaName.charAt(0).toLowerCase() + schemaName.slice(1) + 'SchemaResponseTransformer';

    // Find the transformer function
    const functionPattern = new RegExp(
      `(const ${functionName} = \\(data: any\\) => \\{[^}]*)(return data;\\s*\\};)`,
      's'
    );

    const match = transformed.match(functionPattern);
    if (match) {
      const beforeReturn = match[1];
      const returnStatement = match[2];

      // Generate BigInt conversion lines
      const bigintConversions = fields.map(field => {
        if (field.isArray) {
          return `    if (Array.isArray(data.${field.fieldName})) data.${field.fieldName} = data.${field.fieldName}.map((v: string) => BigInt(v));`;
        } else {
          return `    if (data.${field.fieldName}) data.${field.fieldName} = BigInt(data.${field.fieldName});`;
        }
      }).join('\n');

      const newFunction = `${beforeReturn}\n${bigintConversions}\n    ${returnStatement}`;

      transformed = transformed.replace(functionPattern, newFunction);
      additionsCount += fields.length;
    }
  }

  if (additionsCount > 0) {
    console.log(`✓ Added ${additionsCount} String BigInt transformations to transformers.gen.ts`);
  }

  return transformed;
}

/**
 * Add Address transformations to transformers.gen.ts
 * For each Address field, add lines like:
 *   if (data.address) data.address = Address.parse(data.address);
 */
function addAddressTransformations(content: string, addressFields: AddressFieldInfo[]): string {
  let transformed = content;
  let additionsCount = 0;

  // Add Address import if not already present
  if (!transformed.includes("import { Address }") && !transformed.includes("import { Address,")) {
    // Try to add to existing @ton/core import
    if (transformed.includes("import { Cell } from '@ton/core';")) {
      transformed = transformed.replace(
        "import { Cell } from '@ton/core';",
        "import { Address, Cell } from '@ton/core';"
      );
      console.log('✓ Added Address to @ton/core imports in transformers.gen.ts');
    } else {
      const autoGenComment = '// This file is auto-generated by @hey-api/openapi-ts';
      if (transformed.includes(autoGenComment)) {
        transformed = transformed.replace(
          autoGenComment,
          `${autoGenComment}\n\nimport { Address } from '@ton/core';`
        );
        console.log('✓ Added Address import to transformers.gen.ts');
      }
    }
  }

  // Group Address fields by schema name
  const fieldsBySchema = new Map<string, AddressFieldInfo[]>();
  for (const field of addressFields) {
    const existing = fieldsBySchema.get(field.schemaName) || [];
    existing.push(field);
    fieldsBySchema.set(field.schemaName, existing);
  }

  // For each schema, find its transformer function and add Address conversions
  for (const [schemaName, fields] of fieldsBySchema.entries()) {
    // Convert PascalCase to camelCase for function name
    const functionName = schemaName.charAt(0).toLowerCase() + schemaName.slice(1) + 'SchemaResponseTransformer';

    // Find the transformer function
    const functionPattern = new RegExp(
      `(const ${functionName} = \\(data: any\\) => \\{[^}]*)(return data;\\s*\\};)`,
      's'
    );

    const match = transformed.match(functionPattern);
    if (match) {
      const beforeReturn = match[1];
      const returnStatement = match[2];

      // Generate Address conversion lines
      const addressConversions = fields.map(field => {
        if (field.isArray) {
          return `    if (Array.isArray(data.${field.fieldName})) data.${field.fieldName} = data.${field.fieldName}.map((addr: string) => Address.parse(addr));`;
        } else {
          return `    if (data.${field.fieldName}) data.${field.fieldName} = Address.parse(data.${field.fieldName});`;
        }
      }).join('\n');

      const newFunction = `${beforeReturn}\n${addressConversions}\n    ${returnStatement}`;

      transformed = transformed.replace(functionPattern, newFunction);
      additionsCount += fields.length;
    }
  }

  if (additionsCount > 0) {
    console.log(`✓ Added ${additionsCount} Address transformations to transformers.gen.ts`);
  }

  return transformed;
}

/**
 * Add Cell transformations to transformers.gen.ts
 * For each Cell field, add lines like:
 *   if (data.code) data.code = Cell.fromHex(data.code);
 */
function addCellTransformations(content: string, cellFields: CellFieldInfo[]): string {
  let transformed = content;
  let additionsCount = 0;

  // Add Cell import if not already present
  if (!transformed.includes("import { Cell }")) {
    const autoGenComment = '// This file is auto-generated by @hey-api/openapi-ts';
    if (transformed.includes(autoGenComment)) {
      transformed = transformed.replace(
        autoGenComment,
        `${autoGenComment}\n\nimport { Cell } from '@ton/core';`
      );
      console.log('✓ Added Cell import to transformers.gen.ts');
    }
  }

  // Group Cell fields by schema name
  const fieldsBySchema = new Map<string, CellFieldInfo[]>();
  for (const field of cellFields) {
    const existing = fieldsBySchema.get(field.schemaName) || [];
    existing.push(field);
    fieldsBySchema.set(field.schemaName, existing);
  }

  // For each schema, find its transformer function and add Cell conversions
  for (const [schemaName, fields] of fieldsBySchema.entries()) {
    // Convert PascalCase to camelCase for function name
    const functionName = schemaName.charAt(0).toLowerCase() + schemaName.slice(1) + 'SchemaResponseTransformer';

    // Find the transformer function
    const functionPattern = new RegExp(
      `(const ${functionName} = \\(data: any\\) => \\{[^}]*)(return data;\\s*\\};)`,
      's'
    );

    const match = transformed.match(functionPattern);
    if (match) {
      const beforeReturn = match[1];
      const returnStatement = match[2];

      // Generate Cell conversion lines
      const cellConversions = fields.map(field => {
        const method = field.format === 'hex' ? 'fromHex' : 'fromBase64';
        if (field.isArray) {
          return `    if (Array.isArray(data.${field.fieldName})) data.${field.fieldName} = data.${field.fieldName}.map((c: string) => Cell.${method}(c));`;
        } else {
          return `    if (data.${field.fieldName}) data.${field.fieldName} = Cell.${method}(data.${field.fieldName});`;
        }
      }).join('\n');

      const newFunction = `${beforeReturn}\n${cellConversions}\n    ${returnStatement}`;

      transformed = transformed.replace(functionPattern, newFunction);
      additionsCount += fields.length;
    }
  }

  if (additionsCount > 0) {
    console.log(`✓ Added ${additionsCount} Cell transformations to transformers.gen.ts`);
  } else {
    console.log('⚠️  No Cell transformations were added (transformer functions not found)');
  }

  return transformed;
}

/**
 * Modify jsonBodySerializer to handle Cell and Address serialization
 */
function transformBodySerializer(content: string): string {
  let transformed = content;

  // Add imports for @ton/core types
  if (!transformed.includes("import { Address, Cell }")) {
    const autoGenComment = '// This file is auto-generated by @hey-api/openapi-ts';
    if (transformed.includes(autoGenComment)) {
      transformed = transformed.replace(
        autoGenComment,
        `${autoGenComment}\n\nimport { Address, Cell } from '@ton/core';`
      );
      console.log('✓ Added @ton/core imports to bodySerializer.gen.ts');
    }
  }

  // Replace jsonBodySerializer to handle Cell and Address
  const oldSerializer = `export const jsonBodySerializer = {
    bodySerializer: <T>(body: T): string =>
        JSON.stringify(body, (_key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        )
};`;

  const newSerializer = `export const jsonBodySerializer = {
    bodySerializer: <T>(body: T): string =>
        JSON.stringify(body, (_key, value) => {
            if (typeof value === 'bigint') {
                return value.toString();
            }
            if (Address.isAddress(value)) {
                return value.toRawString();
            }
            if (value instanceof Cell) {
                // Default to hex format for Cell
                return value.toBoc().toString('hex');
            }
            return value;
        })
};`;

  if (transformed.includes(oldSerializer)) {
    transformed = transformed.replace(oldSerializer, newSerializer);
    console.log('✓ Updated jsonBodySerializer to handle Cell and Address');
  }

  return transformed;
}

async function main() {
  console.log('🔧 Post-processing generated types...\n');

  const TRANSFORMERS_FILE = path.join(ROOT_DIR, 'src', 'generated', 'transformers.gen.ts');

  // Check if files exist
  if (!fs.existsSync(API_SPEC_PATH)) {
    console.error(`❌ API spec not found: ${API_SPEC_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(TYPES_FILE)) {
    console.error(`❌ Types file not found: ${TYPES_FILE}`);
    process.exit(1);
  }

  // Parse OpenAPI spec
  const specContent = fs.readFileSync(API_SPEC_PATH, 'utf-8');
  const spec = yaml.parse(specContent);

  // Analyze spec (for debugging)
  analyzeSpec(spec);

  // Analyze Address, Cell, and String BigInt fields
  const addressFields = analyzeAddressFields(spec);
  const cellFields = analyzeCellFields(spec);
  const stringBigIntFields = analyzeStringBigIntFields(spec);
  console.log(`\n✓ Found ${addressFields.length} Address fields in API spec`);
  console.log(`✓ Found ${cellFields.length} Cell fields in API spec`);
  console.log(`✓ Found ${stringBigIntFields.length} String BigInt fields in API spec`);

  // Transform types
  console.log('\nTransforming types.gen.ts...');
  let typesContent = fs.readFileSync(TYPES_FILE, 'utf-8');
  typesContent = transformTypes(typesContent, cellFields, stringBigIntFields);
  typesContent = transformTimestampTypes(typesContent);
  fs.writeFileSync(TYPES_FILE, typesContent, 'utf-8');

  // Transform transformers (add Date, Address, Cell, and String BigInt conversions)
  if (fs.existsSync(TRANSFORMERS_FILE)) {
    console.log('\nTransforming transformers.gen.ts...');
    let transformersContent = fs.readFileSync(TRANSFORMERS_FILE, 'utf-8');

    // Add Date conversions
    transformersContent = transformTransformers(transformersContent);

    // Add Address conversions
    transformersContent = addAddressTransformations(transformersContent, addressFields);

    // Add Cell conversions
    transformersContent = addCellTransformations(transformersContent, cellFields);

    // Add String BigInt conversions
    transformersContent = addStringBigIntTransformations(transformersContent, stringBigIntFields);

    fs.writeFileSync(TRANSFORMERS_FILE, transformersContent, 'utf-8');
  } else {
    console.log('\n⚠️  transformers.gen.ts not found, skipping transformations');
  }

  // Transform bodySerializer (add Cell and Address serialization for requests)
  const BODY_SERIALIZER_FILE = path.join(ROOT_DIR, 'src', 'generated', 'core', 'bodySerializer.gen.ts');
  if (fs.existsSync(BODY_SERIALIZER_FILE)) {
    console.log('\nTransforming bodySerializer.gen.ts...');
    let bodySerializerContent = fs.readFileSync(BODY_SERIALIZER_FILE, 'utf-8');
    bodySerializerContent = transformBodySerializer(bodySerializerContent);
    fs.writeFileSync(BODY_SERIALIZER_FILE, bodySerializerContent, 'utf-8');
  }

  console.log('\n✅ Post-processing complete!');
  console.log(`   Modified: ${TYPES_FILE}`);
  if (fs.existsSync(TRANSFORMERS_FILE)) {
    console.log(`   Modified: ${TRANSFORMERS_FILE}`);
  }
  if (fs.existsSync(BODY_SERIALIZER_FILE)) {
    console.log(`   Modified: ${BODY_SERIALIZER_FILE}`);
  }
}

main().catch((error) => {
  console.error('❌ Post-processing failed:', error);
  process.exit(1);
});
