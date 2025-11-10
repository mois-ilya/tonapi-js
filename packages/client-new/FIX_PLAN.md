# План исправления @ton-api/client-new

## Цель: 100/100

## Этап 1: Критические исправления (45 → 75)

### 1.1 String BigInt transformations (+15 баллов)
**Проблема:** `type: string` + `x-js-format: bigint` остается string

**Решение:**
```typescript
// В post-generate.ts
function addStringBigIntTransformations(content: string, spec: any): string {
  // 1. Найти все поля с type: string + x-js-format: bigint
  // 2. Добавить в transformers: data.field = BigInt(data.field)
  // 3. Обновить types.gen.ts: string → bigint
}
```

**Затронутые поля:**
- `JettonInfo.total_supply`
- `JettonBalance.balance`
- `JettonHolders.addresses[].balance`
- Другие jetton balance поля

**Приоритет:** 🔴 КРИТИЧНО

### 1.2 TupleItem transformation (+15 баллов)
**Проблема:** TupleItem не обрабатывается

**Решение - Option A (Wrapper):**
```typescript
// src/utils/tuple.ts
export function transformTupleItem(item: any): TupleItem {
  switch (item.type) {
    case "tuple":
      return { type: "tuple", items: item.tuple.map(transformTupleItem) };
    case "num":
      return { type: "int", value: parseHexToBigInt(item.num) };
    case "cell":
      return { type: "cell", cell: Cell.fromHex(item.cell) };
    case "slice":
      return { type: "slice", slice: Cell.fromHex(item.slice) };
    case "null":
      return { type: "null" };
    case "nan":
      return { type: "nan" };
  }
}

// Экспортировать из SDK
export { transformTupleItem };
```

**Решение - Option B (Auto-transform):**
Добавить в transformers для методов возвращающих TupleItem.

**Рекомендация:** Option A (проще, безопаснее)

**Приоритет:** 🔴 КРИТИЧНО

## Этап 2: Совместимость со старым клиентом (75 → 85)

### 2.1 snake_case → camelCase (+10 баллов)
**Проблема:** Breaking change - все поля в snake_case

**Решение - Option A (Post-processing types):**
Невозможно - нужна runtime трансформация.

**Решение - Option B (Wrapper layer):**
```typescript
// src/wrapper.ts
export class TonApiClient {
  private sdk: typeof generatedSdk;

  async getAccount(params) {
    const result = await this.sdk.getAccount(params);
    return camelCaseDeep(result.data);
  }
}
```

**Решение - Option C (Response transformer):**
```typescript
// В post-generate.ts
function wrapResponseTransformer(content: string): string {
  // Оборачиваем каждый transformer в camelCase conversion
  data = snakeToCamelDeep(data);
  return data;
}
```

**Рекомендация:** Option C (автоматически, без breaking changes в API)

**Приоритет:** 🟡 ВАЖНО (для миграции)

**ВНИМАНИЕ:** Пользователь сказал "начать только с базы парсинга", возможно camelCase пока НЕ нужен. Уточнить!

## Этап 3: Полнота реализации (85 → 95)

### 3.1 Array transformations (+5 баллов)
**Проблема:** Address[]/Cell[] в массивах не трансформируются

**Решение:**
```typescript
// Обновить analyzeAddressFields/analyzeCellFields
// Не пропускать поля с "[]"
// Генерировать трансформации для массивов:
if (Array.isArray(data.signers)) {
  data.signers = data.signers.map(addr => Address.parse(addr));
}
```

**Приоритет:** 🟢 ЖЕЛАТЕЛЬНО

### 3.2 Nested structures (+3 балла)
**Проблема:** Вложенные Address/Cell могут пропускаться

**Решение:** Рекурсивный анализ схемы для поиска всех Address/Cell полей.

**Приоритет:** 🟢 ЖЕЛАТЕЛЬНО

### 3.3 Cell format awareness (+2 балла)
**Проблема:** Теряется информация hex vs base64

**Решение:** Сохранять format в metadata и использовать при serialization.

**Приоритет:** 🟢 ОПЦИОНАЛЬНО

## Этап 4: Качество кода (95 → 100)

### 4.1 TypeScript AST вместо regex (+3 балла)
**Текущая проблема:** Regex хрупкий

**Решение:**
```typescript
import ts from 'typescript';

function transformTypesWithAST(content: string, replacements: Map<string, string>) {
  const sourceFile = ts.createSourceFile('types.gen.ts', content, ts.ScriptTarget.Latest);
  // Traverse AST и заменять типы
}
```

**Приоритет:** 🟢 КАЧЕСТВО

### 4.2 Comprehensive tests (+2 балла)
- Тесты для всех edge cases
- Тесты для TupleItem
- Тесты для массивов
- Интеграционные тесты

**Приоритет:** 🟢 КАЧЕСТВО

## Пошаговый план реализации

### Шаг 1: String BigInt (День 1)
1. Обновить `analyzeSpec()` для поиска string + bigint полей
2. Создать `addStringBigIntTransformations()`
3. Обновить `transformTypes()` для замены string → bigint
4. Тесты
5. **Оценка: 60/100**

### Шаг 2: TupleItem (День 1-2)
1. Создать `src/utils/tuple.ts` с transformTupleItem()
2. Экспортировать из index
3. Документация
4. Тесты
5. **Оценка: 75/100**

### Шаг 3: camelCase (День 2) - ОПЦИОНАЛЬНО
1. Уточнить у пользователя нужно ли
2. Если да - Option C (wrapper transformer)
3. Тесты совместимости
4. **Оценка: 85/100**

### Шаг 4: Arrays (День 3) - ОПЦИОНАЛЬНО
1. Обновить analyzeAddressFields/analyzeCellFields
2. Генерировать array transformations
3. Тесты
4. **Оценка: 90/100**

### Шаг 5: Качество (День 3-4) - ОПЦИОНАЛЬНО
1. AST трансформации
2. Comprehensive tests
3. **Оценка: 100/100**

## Минимальный план для MVP (75/100)
- ✅ Шаг 1: String BigInt (+15)
- ✅ Шаг 2: TupleItem (+15)
- ❓ Шаг 3: camelCase (+10) - **НУЖНО УТОЧНИТЬ У ПОЛЬЗОВАТЕЛЯ**

## Рекомендация

**Начать с:**
1. String BigInt transformations (критично для корректности API)
2. TupleItem support (критично для get-methods)
3. Уточнить у пользователя про camelCase

**Отложить:**
- Arrays (можно добавить позже)
- AST трансформации (оптимизация)

## Вопросы к пользователю

1. **Нужна ли совместимость naming со старым клиентом?**
   - Если да → реализовать camelCase
   - Если нет → это breaking change, документировать

2. **Какие методы используют TupleItem?**
   - Нужно ли автоматическое преобразование или достаточно утилиты?

3. **Приоритет: корректность vs совместимость?**
   - Корректность → сначала String BigInt + TupleItem
   - Совместимость → сначала camelCase
