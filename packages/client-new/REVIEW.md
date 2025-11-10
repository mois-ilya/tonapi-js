# @ton-api/client-new - Полное ревью и анализ

## Архитектура

### Текущая реализация (@hey-api/openapi-ts v0.87.1)
```
API Spec (api.yml)
    ↓
@hey-api/openapi-ts
    ↓
Generated Code:
  - types.gen.ts (TypeScript types)
  - sdk.gen.ts (SDK methods)
  - transformers.gen.ts (runtime transformers)
  - bodySerializer.gen.ts (request serialization)
    ↓
Post-processing (post-generate.ts):
  - transformTypes() - replace types in types.gen.ts
  - addAddressTransformations() - add Address.parse() to transformers
  - addCellTransformations() - add Cell.fromHex/Base64() to transformers
  - transformBodySerializer() - add Address/Cell serialization
```

### Старая реализация (swagger-typescript-api)
```
API Spec (api.yml)
    ↓
swagger-typescript-api + EJS templates
    ↓
Generated Code:
  - Рекурсивный prepareResponseData() с обходом по схеме
  - Рекурсивный prepareRequestData() с обходом по схеме
  - snake_case → camelCase автоматически
  - Полная поддержка TupleItem
```

## Сравнительная таблица

| Функция | Старый клиент | Новый клиент | Статус |
|---------|--------------|--------------|--------|
| **Type transformations** ||||
| Address (format: address) | ✅ Рекурсивно | ✅ Для известных полей | ⚠️ Частично |
| Cell hex (format: cell) | ✅ Рекурсивно | ✅ Для известных полей | ⚠️ Частично |
| Cell base64 (format: cell-base64) | ✅ Рекурсивно | ✅ Для известных полей | ⚠️ Частично |
| BigInt (integer + x-js-format) | ✅ Рекурсивно | ✅ Автоматически | ✅ OK |
| BigInt (string + x-js-format) | ✅ Рекурсивно | ❌ Остается string | ❌ НЕ РАБОТАЕТ |
| TupleItem | ✅ Полная поддержка | ❌ Не реализовано | ❌ НЕ РАБОТАЕТ |
| Date (unix timestamps) | ❌ Нет | ✅ Для известных полей | ✅ НОВОЕ |
| **Naming** ||||
| snake_case → camelCase | ✅ Автоматически | ❌ Нет | ❌ НЕ РАБОТАЕТ |
| **Arrays** ||||
| Address[] | ✅ Рекурсивно | ❌ Пропускаются | ❌ НЕ РАБОТАЕТ |
| Cell[] | ✅ Рекурсивно | ❌ Пропускаются | ❌ НЕ РАБОТАЕТ |
| **Requests** ||||
| Address serialization | ✅ Рекурсивно | ✅ В bodySerializer | ✅ OK |
| Cell serialization | ✅ Рекурсивно | ✅ В bodySerializer | ⚠️ Без format |
| **Error handling** ||||
| Typed errors | ✅ | ✅ | ✅ OK |

## Критические проблемы

### 🔴 Проблема 1: String BigInt поля НЕ трансформируются
**Затронутые поля:**
- `JettonInfo.total_supply` (type: string, x-js-format: bigint)
- `JettonHolders.addresses[].balance` (type: string, x-js-format: bigint)
- Возможно другие

**Причина:** @hey-api/transformers обрабатывает только `type: integer`, но не `type: string` с x-js-format.

**Текущее поведение:**
```typescript
// Ожидается:
total_supply: bigint // 51993848738495833n

// Реально:
total_supply: string // "51993848738495833"
```

### 🔴 Проблема 2: TupleItem не обрабатывается
**Методы:** `execGetMethodForBlockchainAccount`, другие get-methods

**Старый клиент:**
```typescript
{
  type: "tuple",
  items: [
    { type: "int", value: 15n },
    { type: "cell", cell: Cell {...} }
  ]
}
```

**Новый клиент:**
```typescript
{
  type: "tuple",
  tuple: [
    { type: "num", num: "0xf" },  // ❌ string вместо bigint
    { type: "cell", cell: "b5ee..." }  // ❌ string вместо Cell
  ]
}
```

### 🔴 Проблема 3: snake_case → camelCase отсутствует
**Старый клиент:**
```typescript
{
  accountAddress: "...",
  lastTransactionLt: 123n
}
```

**Новый клиент:**
```typescript
{
  account_address: "...",  // ❌ snake_case
  last_transaction_lt: 123n
}
```

**Влияние:** Breaking change для пользователей старого клиента.

### 🟡 Проблема 4: Address/Cell в массивах не трансформируются
**Пример:** `MultisigOrder.signers: Address[]`

**Текущее поведение:**
```typescript
// analyzeCellFields/analyzeAddressFields пропускают поля с "[]"
signers: Address[]  // ✅ Тип правильный
// Но runtime трансформация НЕ добавляется
```

### 🟡 Проблема 5: Потеря информации о Cell format
**Проблема:**
- API spec различает `format: cell` (hex) и `format: cell-base64`
- После трансформации типов эта информация теряется
- bodySerializer всегда использует hex

**Влияние:** Потенциальные проблемы при отправке Cell в requests.

## Узкие места

### 1. Отсутствие рекурсивного обхода
Старый клиент использует `prepareResponseData()` с рекурсивным обходом по схеме.
Новый клиент генерирует статические transformers без схемы.

**Последствия:**
- Нужно вручную отслеживать все поля
- Array fields пропускаются
- Вложенные структуры могут не обрабатываться

### 2. Post-processing ограничен regex
Текущий подход:
```typescript
const pattern = new RegExp(`(\\s+${fieldName}\\??:\\s*)string(;)`, 'g');
```

**Проблемы:**
- Не работает для массивов
- Не работает для вложенных типов
- Хрупкий к изменениям форматирования

### 3. @hey-api/transformers не поддерживает кастомные типы
Нет встроенной поддержки для:
- Address
- Cell
- TupleItem
- string → bigint

### 4. Отсутствие доступа к схеме в runtime
Старый клиент генерирует `components` объект со всеми схемами.
Новый клиент НЕ экспортирует схемы.

## Оценка: 45/100

### Баллы:
- ✅ BigInt (integer) transformations: +15
- ✅ Address transformations (основные поля): +10
- ✅ Cell transformations (основные поля): +10
- ✅ Request serialization: +10
- ❌ BigInt (string) transformations: 0 (критично)
- ❌ TupleItem: 0 (критично)
- ❌ snake_case → camelCase: 0 (breaking change)
- ❌ Array transformations: 0
- ❌ Рекурсивный обход: 0

### Почему не 100:
1. **Несовместимость с API:** String BigInt поля не работают
2. **Несовместимость со старым клиентом:** Нет camelCase
3. **Неполная функциональность:** TupleItem, массивы
4. **Хрупкая реализация:** Regex-based вместо AST/schema-based

## План исправления

Следует в следующем сообщении...
