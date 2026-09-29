# API-контракт v1 (Уровень 5 — API Contract)

Первая часть контракта Banking Shell: частичный старт по решению [D-07](../ui/UI_ARCHITECTURE.md#журнал-решений). Рамки — в [UI_ARCHITECTURE.md](../ui/UI_ARCHITECTURE.md#уровень-5--api-контракт-частичный-старт).

**Что это.** Набор операций, которые интерфейс вызывает у банковского адаптера (`DemoAdapter`, `NullAdapter`, в будущем `FutureRealBankAdapter`). Контракт не зависит от транспорта: здесь нет URL, HTTP-методов и форматов сериализации. Как операции превращаются в HTTP-запросы, решит `FutureRealBankAdapter`.

**Нотация.** Типы записаны в стиле TypeScript для точности. Это не код приложения.

---

## 1. Правило происхождения полей

Каждое поле контракта — в запросе, в ответе и в коде ошибки — имеет ровно одно происхождение.

| Метка | Значение | Пример |
|---|---|---|
| `UI` | Поле нужно утверждённому экрану, флоу или компоненту. Указывается, где именно, и решение, если оно есть | `UI: AUTH-02, D-15` |
| `TECH` | Техническое поле: без него операция невозможна или небезопасна, хотя на экране его нет. Обоснование указано всегда | `TECH: защита от двойного списания` |

**Что считается утверждённым:**
- экраны и флоу со статусом CONFIRMED;
- входные данные компонентов без метки `[A]`;
- решения D-01…D-20.

**Что не попадает в контракт:**
- предложения `[A]`;
- функциональность из ROADMAP `[R]`;
- экраны с содержимым `SOURCE_REQUIRED`;
- отключённые пункты навигации.

Если поле есть только в предложении `[A]`, оно не входит в v1 и перечислено в [разделе 9](#9-поля-которые-сознательно-не-вошли).

**Одна оговорка.** Операции для главной (HOME-01) опираются на компоненты, чьё использование на главной — предложение `[A]`. Эти операции включены, потому что рамки первой части по D-07 прямо называют счёт и последние операции. Такие поля помечены `UI [A-usage]` и вынесены в [открытый вопрос CQ-02](#10-открытые-вопросы-контракта).

**Соглашение об обязательности.** Поле, которое решение перечисляет для экрана, считается обязательным, если UI не говорит иного. Спорные случаи вынесены в [CQ-01](#10-открытые-вопросы-контракта).

---

## 2. Общие правила контракта

| № | Правило | Происхождение |
|---|---|---|
| G-1 | Адаптер сам хранит состояние сессии, текущей регистрации и привязку «этот экземпляр приложения → зарегистрированный клиент». Токены и ID процессов в контракт не выносятся | TECH: на экранах этих значений нет; AUTH-01 (узел N04) не содержит поля для идентификации клиента — только биометрия или MPIN |
| G-2 | Бизнес-правила — хватает ли денег, верен ли MPIN, существует ли получатель, соблюдён ли лимит — проверяет только адаптер и возвращает код ошибки | UI: [Границы логики](../ui/UI_ARCHITECTURE.md#границы-логики) |
| G-3 | Возможности устройства — SIM, биометрия, камера — в контракт не входят | UI: D-14 |
| G-4 | Биометрию проверяет граница устройства до вызова операции. В контракт уходит только способ подтверждения | UI: D-13, D-14 |
| G-5 | MPIN — строка ровно из 4 цифр | UI: D-09 |
| G-6 | Любая операция `NullAdapter` возвращает осмысленный ответ: чтение — пусто, если у ответа есть пустое значение, иначе `UNAVAILABLE`; действие — `UNAVAILABLE` | UI: [правила границы, п. 4](../ui/UI_ARCHITECTURE.md#уровень-6--граница-адаптера-только-граница) |
| G-7 | Значения `onboardingContext` совпадают с `onboarding_context` из D-18; имя поля в контракте — в camelCase | UI: D-18; TECH: единый стиль имён |

---

## 3. Общие типы

```ts
type Result<T> =
  | { ok: true;  data: T }
  | { ok: false; error: ContractError };

type ContractError = {
  code: ErrorCode;
  fields?: string[];
};

type Money = {
  amount: number;
  currency: "RUB";
};

type CodeDelivery = {
  destinationMasked: string;
  codeLength: number;
  resendAfterSec: number;
};
```

| Тип · поле | Значение | Происхождение |
|---|---|---|
| `Result` | Успех с данными или ошибка | TECH: единый способ вернуть ошибку без исключений; нужен `AsyncContent` и `StatusMessage` для состояний `error` и `unavailable` |
| `ContractError.code` | Код ошибки, см. [раздел 4](#4-коды-ошибок) | UI: состояния ошибок на экранах; `StatusMessage(error / unavailable)` |
| `ContractError.fields` | Имена полей запроса, не прошедших проверку | TECH: показать ошибку у нужного поля формы (AUTH-05, `PaymentForm`: состояние «ошибки валидации») |
| `Money.amount` | Целое число копеек; у операций — со знаком | UI: `AccountCard.balance`, `TransactionRow.amount` («со знаком»), `PaymentForm`. TECH: целые копейки, чтобы не было ошибок округления |
| `Money.currency` | Только `"RUB"` | UI: `AccountCard.balance` («сумма и валюта»), `PaymentForm.currency`; значение — из D-01 (Россия, СБП) |
| `CodeDelivery.destinationMasked` | Куда отправлен код, в замаскированном виде | UI: `OTPVerification.destination` |
| `CodeDelivery.codeLength` | Длина кода | UI: `OTPVerification.codeLength` |
| `CodeDelivery.resendAfterSec` | Через сколько секунд можно запросить код снова | UI: `OTPVerification.resendAfter` |

---

## 4. Коды ошибок

```ts
type ErrorCode =
  | "UNAVAILABLE" | "UNKNOWN" | "VALIDATION_FAILED"
  | "SESSION_EXPIRED" | "NOT_REGISTERED" | "MPIN_INVALID"
  | "OTP_INVALID" | "OTP_REQUIRED"
  | "EMAIL_CODE_INVALID" | "EMAIL_NOT_VERIFIED" | "AGE_RESTRICTION"
  | "AMOUNT_OUT_OF_LIMITS" | "INSUFFICIENT_FUNDS" | "RECIPIENT_NOT_FOUND";
```

| Код | Когда | Где показывается | Происхождение |
|---|---|---|---|
| `UNAVAILABLE` | Банковского ядра нет | `StatusMessage(unavailable)` | UI: NullAdapter, правило G-6 |
| `UNKNOWN` | Любой другой сбой | `StatusMessage(error)`, `OperationStatus(failure)` | TECH: ошибка без отдельной обработки |
| `VALIDATION_FAILED` | Поля не прошли проверку адаптера | Ошибка у поля | TECH: форма проверяет формат, но окончательная проверка — у адаптера (G-2) |
| `SESSION_EXPIRED` | Сессии нет или она закончилась | Переход на AUTH-01 | TECH: без сессии пользователь возвращается во вход (D-08) |
| `NOT_REGISTERED` | Вход на экземпляре приложения, где регистрации не было | AUTH-01, `StatusMessage(error)` | TECH: следствие G-1 |
| `MPIN_INVALID` | Неверный MPIN | AUTH-01 (PST-03), PST-01 | UI: `MPINInput.error`; правило G-2 «верен ли MPIN» |
| `OTP_INVALID` | Неверный или просроченный OTP | AUTH-07 (Failure → AUTH-03), SET-02 | UI: AUTH-07 состояние «ошибка» [S] |
| `OTP_REQUIRED` | Смена MPIN без подтверждённого OTP | SET-02 | TECH: защита правила D-10 «смена MPIN требует OTP» |
| `EMAIL_CODE_INVALID` | Неверный код из письма | AUTH-05 | UI: AUTH-05 состояние «код неверный» (D-19) |
| `EMAIL_NOT_VERIFIED` | Данные AUTH-05 отправлены без подтверждённой почты | AUTH-05 | TECH: защита правила D-19 |
| `AGE_RESTRICTION` | Возраст меньше 18 лет | AUTH-05 | UI: D-15 «дата рождения (18+)» |
| `AMOUNT_OUT_OF_LIMITS` | Сумма вне лимитов | `PaymentForm`, PST-02 | UI: `PaymentForm.limits` |
| `INSUFFICIENT_FUNDS` | Не хватает денег | PST-02 | UI: правило G-2 «хватает ли денег» |
| `RECIPIENT_NOT_FOUND` | Получатель не найден | PST-02 | UI: правило `RecipientInput` «существует ли получатель — решает адаптер» |

---

## 5. Операции

Всего 19 операций в 7 разделах. Каждая возвращает `Result<T>`.

### 5.1 Сессия

#### `login` — вход (AUTH-01)

```ts
login(req: { method: "mpin"; mpin: string } | { method: "biometric" }): Result<void>
```

| Поле | Тип | Обяз. | Происхождение |
|---|---|---|---|
| `method` | `"mpin" \| "biometric"` | да | UI: AUTH-01 «biometric or MPIN» (N04), `AuthMethodSelector` |
| `mpin` | строка из 4 цифр | при `mpin` | UI: `MPINInput(mode=enter)`, D-09 |

- Биометрию проверяет граница устройства до вызова; при `biometric` передаётся только способ (G-4).
- При успехе адаптер открывает сессию (G-1).
- Ошибки: `MPIN_INVALID`, `NOT_REGISTERED`, `UNAVAILABLE`, `UNKNOWN`.

#### `logout` — выход (SET-01)

```ts
logout(): Result<void>
```

Полей нет. Происхождение — UI: SET-01, действие N42 Logout → AUTH-01 (D-08).

### 5.2 Регистрация

Порядок вызовов повторяет флоу B: `startRegistration` → (SIM — граница устройства) → `sendEmailCode` / `verifyEmailCode` → `submitPersonalDetails` → `setMpin` → `requestOtp` / `verifyOtp` с назначением `onboarding`.

#### `startRegistration` — телефон и контекст (AUTH-02)

```ts
startRegistration(req: {
  phone: string;
  onboardingContext: "existing_customer" | "new_customer";
}): Result<void>
```

| Поле | Тип | Обяз. | Происхождение |
|---|---|---|---|
| `phone` | строка, `+7XXXXXXXXXX` | да | UI: AUTH-02, D-15 «телефон (+7)». TECH: формат записи — E.164 |
| `onboardingContext` | `"existing_customer" \| "new_customer"` | да | UI: D-18. Определяет флоу по ссылке на AUTH-01: «Зарегистрироваться» или «Открыть счёт» |

Ошибки: `VALIDATION_FAILED`, `UNAVAILABLE`, `UNKNOWN`.

#### `sendEmailCode` — отправить код на почту (AUTH-05)

```ts
sendEmailCode(req: { email: string }): Result<CodeDelivery>
```

| Поле | Тип | Обяз. | Происхождение |
|---|---|---|---|
| `email` | строка | да | UI: AUTH-05, D-15 «почта»; D-19 «отправить код» |
| ответ `CodeDelivery` | см. раздел 3 | — | UI: `OTPVerification` на AUTH-05 (D-19) |

- Повторный вызов — это повторная отправка кода (`OTPVerification.onResend`).
- Ошибки: `VALIDATION_FAILED`, `UNAVAILABLE`, `UNKNOWN`.

#### `verifyEmailCode` — проверить код из письма (AUTH-05)

```ts
verifyEmailCode(req: { code: string }): Result<void>
```

| Поле | Тип | Обяз. | Происхождение |
|---|---|---|---|
| `code` | строка из `codeLength` цифр | да | UI: AUTH-05 «ввести код», D-19; `OTPVerification.onSubmit(code)` |

- Это операция подтверждения почты, а не OTP (D-19).
- Ошибки: `EMAIL_CODE_INVALID`, `UNAVAILABLE`, `UNKNOWN`.

#### `submitPersonalDetails` — данные AUTH-05

```ts
submitPersonalDetails(req: {
  firstName: string;
  lastName: string;
  birthDate: string;
  address: {
    postalCode: string;
    region: string;
    city: string;
    district: string;
    street: string;
    house: string;
    apartment: string;
  };
  email: string;
  consents: {
    push: boolean;
    marketing: boolean;
  };
  card?: {
    number: string;
    expiry: string;
  };
}): Result<void>
```

| Поле | Тип | Обяз. | Происхождение |
|---|---|---|---|
| `firstName`, `lastName` | строка | да | UI: AUTH-05, D-15 «имя, фамилия» |
| `birthDate` | строка `YYYY-MM-DD` | да | UI: AUTH-05, D-15 «дата рождения (18+)». TECH: формат ISO 8601 |
| `address.postalCode` | строка | да | UI: D-15 «индекс» |
| `address.region` | строка | да | UI: D-15 «регион» |
| `address.city` | строка | да | UI: D-15 «город» |
| `address.district` | строка | да | UI: D-15 «район» |
| `address.street` | строка | да | UI: D-15 «улица» |
| `address.house` | строка | да | UI: D-15 «дом» |
| `address.apartment` | строка | UNKNOWN — CQ-01 | UI: D-15 «квартира» |
| `email` | строка | да | UI: D-15 «почта»; должна совпадать с подтверждённой в `verifyEmailCode` |
| `consents.push` | `boolean` | да | UI: AUTH-05, D-19 «согласие на push-уведомления» (`Checkbox`) |
| `consents.marketing` | `boolean` | да | UI: AUTH-05, D-19 «согласие на маркетинговые рассылки» (`Checkbox`) |
| `card` | объект | **только** при `existing_customer` | UI: D-18 — поля карты зависят от `onboardingContext` |
| `card.number` | строка из цифр | да, если есть `card` | UI: D-15 «номер карты» |
| `card.expiry` | строка `MM/YY` | да, если есть `card` | UI: D-15 «срок действия карты». TECH: формат записи |

- Контекст регистрации адаптер уже знает из `startRegistration` (G-1). Если `card` прислан при `new_customer` или не прислан при `existing_customer` — ошибка `VALIDATION_FAILED`, `fields: ["card"]`.
- Ошибки: `VALIDATION_FAILED`, `EMAIL_NOT_VERIFIED`, `AGE_RESTRICTION`, `UNAVAILABLE`, `UNKNOWN`.

#### `setMpin` — установить MPIN (AUTH-06)

```ts
setMpin(req: { mpin: string }): Result<void>
```

| Поле | Тип | Обяз. | Происхождение |
|---|---|---|---|
| `mpin` | строка из 4 цифр | да | UI: AUTH-06 `MPINInput(mode=create)`, D-09 |

- Совпадение с повтором проверяет форма экрана, в контракт уходит одно значение (`MPINInput`: «совпадение двух MPIN проверяет форма экрана»).
- Включение входа по биометрии на AUTH-06 — граница устройства, не контракт (D-14).
- Ошибки: `VALIDATION_FAILED`, `UNAVAILABLE`, `UNKNOWN`.

### 5.3 OTP

Одни и те же операции служат двум назначениям (D-10). Код подтверждения почты — отдельные операции из 5.2 (D-19).

#### `requestOtp` — отправить OTP (AUTH-07, SET-02)

```ts
requestOtp(req: { purpose: "onboarding" | "change_mpin" }): Result<CodeDelivery>
```

| Поле | Тип | Обяз. | Происхождение |
|---|---|---|---|
| `purpose` | `"onboarding" \| "change_mpin"` | да | UI: D-10 — OTP онбординга (AUTH-07) и OTP чувствительной операции (SET-02) |
| ответ `CodeDelivery` | см. раздел 3 | — | UI: `OTPVerification` |

- Код уходит на телефон из `startRegistration` (для онбординга) или на телефон клиента (для смены MPIN) — адаптер знает его сам (G-1).
- Повторный вызов — повторная отправка.
- Ошибки: `SESSION_EXPIRED` (для `change_mpin`), `UNAVAILABLE`, `UNKNOWN`.

#### `verifyOtp` — проверить OTP

```ts
verifyOtp(req: { purpose: "onboarding" | "change_mpin"; code: string }): Result<void>
```

| Поле | Тип | Обяз. | Происхождение |
|---|---|---|---|
| `purpose` | как в `requestOtp` | да | UI: D-10 |
| `code` | строка из `codeLength` цифр | да | UI: `OTPVerification.onSubmit(code)` |

- `onboarding`: успех завершает регистрацию и открывает сессию — флоу B «Success → HOME-01» [S].
- `change_mpin`: успех разрешает `changeMpin` в этой сессии (D-10).
- Ошибки: `OTP_INVALID`, `SESSION_EXPIRED` (для `change_mpin`), `UNAVAILABLE`, `UNKNOWN`.

### 5.4 Счёт

#### `getAccountSummary` — счёт на главной (HOME-01)

```ts
getAccountSummary(): Result<AccountSummary | null>

type AccountSummary = {
  name: string;
  maskedNumber: string;
  balance: Money;
  status: "active" | "blocked";
};
```

| Поле | Тип | Происхождение |
|---|---|---|
| `name` | строка | UI [A-usage]: `AccountCard.name` на HOME-01 |
| `maskedNumber` | строка | UI [A-usage]: `AccountCard.maskedNumber` |
| `balance` | `Money` | UI [A-usage]: `AccountCard.balance` («сумма и валюта») |
| `status` | `"active" \| "blocked"` | UI [A-usage]: `AccountCard.status`, `StatusBadge`. Значения — из состояний `AccountCard` «обычное, счёт заблокирован» |

- Один счёт, а не список: UI показывает одну `AccountCard` (см. CQ-03).
- Реквизиты счёта не входят: ACC-01 — SOURCE_REQUIRED.
- `null` — счёта нет (так отвечает `NullAdapter`).
- Ошибки: `SESSION_EXPIRED`, `UNKNOWN`.

### 5.5 Операции по счёту

#### `getRecentTransactions` — мини-выписка (ACC-02, HOME-01)

```ts
getRecentTransactions(req: { limit: number }): Result<Transaction[]>

type Transaction = {
  id: string;
  title: string;
  date: string;
  amount: Money;
  status: "success" | "pending" | "failure";
};
```

| Поле | Тип | Происхождение |
|---|---|---|
| `limit` | целое | UI: `TransactionList.limit`, «последние N операций» (ACC-02) |
| `id` | строка | TECH: стабильный ключ строки в списке; не показывается |
| `title` | строка | UI: `TransactionRow.title` |
| `date` | строка ISO 8601 с временем | UI: `TransactionRow.date`. TECH: формат записи |
| `amount` | `Money`, со знаком | UI: `TransactionRow.amount` («со знаком») |
| `status` | `"success" \| "pending" \| "failure"` | UI: `TransactionRow.status` → `StatusBadge` (нейтральные значения) |

- Пустой список — нет операций (`StatusMessage(empty)`; так же отвечает `NullAdapter`).
- Подробная выписка (ACC-03) не входит: SOURCE_REQUIRED.
- Ошибки: `SESSION_EXPIRED`, `UNKNOWN`.

### 5.6 Переводы (СБП)

#### `getTransferLimits` — лимиты суммы (PAY-04, PAY-06)

```ts
getTransferLimits(req: { method: "mobile" | "bankAccount" }): Result<{ min: Money; max: Money }>
```

| Поле | Тип | Происхождение |
|---|---|---|
| `method` | `"mobile" \| "bankAccount"` | UI: `PaymentForm.recipientType`; способы SBP-01 (D-01, D-06) |
| `min`, `max` | `Money` | UI: `PaymentForm.limits` «минимум и максимум, приходят от адаптера» |

Ошибки: `SESSION_EXPIRED`, `UNAVAILABLE`, `UNKNOWN`.

#### `findRecipientBanks` — банки получателя по телефону (PAY-04)

```ts
findRecipientBanks(req: { phone: string }): Result<Bank[]>

type Bank = { id: string; name: string };
```

| Поле | Тип | Происхождение |
|---|---|---|
| `phone` | строка, `+7XXXXXXXXXX` | UI: `RecipientInput(mobile)` — телефон (+7), D-06 |
| `Bank.id` | строка | UI: `RecipientInput.onBankChange(bankId)` |
| `Bank.name` | строка | UI: `RecipientInput.banks` — список для выбора, D-06 |

- Пустой список — по номеру нет ни одного банка.
- Ошибки: `VALIDATION_FAILED`, `SESSION_EXPIRED`, `UNAVAILABLE`, `UNKNOWN`.

#### `confirmTransfer` — подтвердить перевод (PST-01 → PST-02)

```ts
confirmTransfer(req: {
  clientRequestId: string;
  transfer: {
    recipient:
      | { method: "mobile"; phone: string; bankId: string }
      | { method: "bankAccount"; accountNumber: string; bik: string };
    amount: Money;
    comment?: string;
  };
  confirmation: { method: "biometric" } | { method: "mpin"; mpin: string };
}): Result<{ status: "success" | "pending" }>
```

| Поле | Тип | Обяз. | Происхождение |
|---|---|---|---|
| `clientRequestId` | строка, уникальная на попытку | да | TECH: защита от двойного списания при повторе запроса и при `ActionButton(retry)` на PST-02 |
| `recipient.method` | `"mobile" \| "bankAccount"` | да | UI: `PaymentForm.recipientType` |
| `recipient.phone` | строка, `+7XXXXXXXXXX` | при `mobile` | UI: PAY-04, `RecipientInput(mobile)` |
| `recipient.bankId` | строка | при `mobile` | UI: PAY-04, выбор банка получателя (D-06) |
| `recipient.accountNumber` | строка из 20 цифр | при `bankAccount` | UI: PAY-06, D-01 «номер счёта» |
| `recipient.bik` | строка из 9 цифр | при `bankAccount` | UI: PAY-06, D-01 «БИК» |
| `amount` | `Money` | да | UI: `PaymentForm` — `AmountInput`; `PaymentSummary.amount` |
| `comment` | строка | UNKNOWN — CQ-01 | UI: `PaymentForm` — `Input(комментарий)`; `PaymentSummary.comment` |
| `confirmation.method` | `"biometric" \| "mpin"` | да | UI: PST-01, D-13 — биометрия ИЛИ MPIN |
| `confirmation.mpin` | строка из 4 цифр | при `mpin` | UI: PST-01 `MPINInput`, D-09, D-13 |
| ответ `status` | `"success" \| "pending"` | — | UI: PST-02 `OperationStatus(success \| pending)` (D-13) |

- `failure` на PST-02 — это `ok: false` с кодом ошибки.
- Перевод по QR (PAY-03) не входит: формат данных QR — UNKNOWN.
- Ошибки: `MPIN_INVALID`, `AMOUNT_OUT_OF_LIMITS`, `INSUFFICIENT_FUNDS`, `RECIPIENT_NOT_FOUND`, `VALIDATION_FAILED`, `SESSION_EXPIRED`, `UNAVAILABLE`, `UNKNOWN`.

#### `getSbpDefaultBank` — выбран ли этот банк банком по умолчанию (SBP-03)

```ts
getSbpDefaultBank(): Result<{ isDefault: boolean }>
```

| Поле | Тип | Происхождение |
|---|---|---|
| `isDefault` | `boolean` | UI: SBP-03 — «банк по умолчанию для входящих переводов СБП», D-06; `ListRow(toggle).checked` |

Ошибки: `SESSION_EXPIRED`, `UNAVAILABLE`, `UNKNOWN`.

#### `setSbpDefaultBank` — сделать этот банк банком по умолчанию (SBP-03)

```ts
setSbpDefaultBank(): Result<void>
```

- Полей нет. Происхождение — UI: D-06 «сделать этот банк банком по умолчанию»; SBP-03, вход из SBP-01 (D-17).
- Снять настройку контракт не позволяет: в решениях этого действия нет (CQ-05).
- Ошибки: `SESSION_EXPIRED`, `UNAVAILABLE`, `UNKNOWN`.

### 5.7 Настройки

#### `changeMpin` — сменить MPIN (SET-02)

```ts
changeMpin(req: { newMpin: string }): Result<void>
```

| Поле | Тип | Обяз. | Происхождение |
|---|---|---|---|
| `newMpin` | строка из 4 цифр | да | UI: SET-02 шаг 2 `MPINInput(mode=create)`, D-09, D-10 |

- Вызывается только после успешного `verifyOtp({ purpose: "change_mpin" })` в этой же сессии, иначе `OTP_REQUIRED` (D-10).
- Текущий MPIN не передаётся: в утверждённом флоу SET-02 его нет (D-10).
- Ошибки: `OTP_REQUIRED`, `VALIDATION_FAILED`, `SESSION_EXPIRED`, `UNAVAILABLE`, `UNKNOWN`.

#### `getLanguageSettings` — язык интерфейса (SET-04)

```ts
getLanguageSettings(): Result<{ current: string; available: { code: string; title: string }[] }>
```

| Поле | Тип | Происхождение |
|---|---|---|
| `current` | строка — код языка | UI: SET-04 — текущий язык, `ChoiceList.value` |
| `available[].code` | строка | UI: `ChoiceList.items[].id` |
| `available[].title` | строка | UI: `ChoiceList.items[].title` |

- Структура определена, конкретные языки — открытый вопрос Q-17.
- Ошибки: `SESSION_EXPIRED`, `UNAVAILABLE`, `UNKNOWN`.

#### `setLanguage` — сменить язык (SET-04)

```ts
setLanguage(req: { code: string }): Result<void>
```

| Поле | Тип | Обяз. | Происхождение |
|---|---|---|---|
| `code` | строка из `available[].code` | да | UI: `ChoiceList.onChange(id)` на SET-04 |

Ошибки: `VALIDATION_FAILED`, `SESSION_EXPIRED`, `UNAVAILABLE`, `UNKNOWN`.

---

## 6. Поведение адаптеров

| Операция | `NullAdapter` | `DemoAdapter` |
|---|---|---|
| Чтение: `getAccountSummary`, `getRecentTransactions`, `findRecipientBanks`, `getSbpDefaultBank`, `getLanguageSettings`, `getTransferLimits` | `getAccountSummary` → `null`; списки → `[]`; остальные → `UNAVAILABLE` | Демо-данные из JSON |
| Действия: все остальные | `UNAVAILABLE` | Имитация: успех или ошибка по демо-правилам |

- `getTransferLimits`, `getSbpDefaultBank` и `getLanguageSettings` у `NullAdapter` возвращают `UNAVAILABLE`: пустое значение здесь бессмысленно. Для экрана это состояние «недоступно» (G-6).
- Где `DemoAdapter` хранит изменения, пока не решено: вопрос 3 в ROADMAP.

---

## 7. Граница устройства — вне контракта

По D-14 эти возможности — отдельная граница (`DemoDeviceAdapter`). Банковский контракт их не содержит, поля для неё здесь не проектируются.

| Возможность | Где нужна | Связь с контрактом |
|---|---|---|
| Выбор и привязка SIM | AUTH-03, AUTH-04 | Нет |
| Доступность биометрии, включение входа по биометрии | AUTH-01, AUTH-06, SET-03, PST-01 | Нет |
| Проверка биометрии | AUTH-01, PST-01 | Только результат: `login` и `confirmTransfer` получают `method: "biometric"` (G-4) |
| Камера для QR | PAY-03 | Нет: PAY-03 в v1 не входит |

---

## 8. Трассировка: экран → операции

| Экран или состояние | Операции |
|---|---|
| AUTH-01 | `login` |
| AUTH-02 | `startRegistration` |
| AUTH-03, AUTH-04 | — (граница устройства) |
| AUTH-05 | `sendEmailCode`, `verifyEmailCode`, `submitPersonalDetails` |
| AUTH-06 | `setMpin` |
| AUTH-07 | `requestOtp`, `verifyOtp` (`onboarding`) |
| HOME-01 | `getAccountSummary`, `getRecentTransactions` — [A-usage], CQ-02 |
| ACC-02 | `getRecentTransactions` |
| PAY-04 | `getTransferLimits(mobile)`, `findRecipientBanks` |
| PAY-06 | `getTransferLimits(bankAccount)` |
| PST-01 → PST-02 | `confirmTransfer` |
| SBP-01 | — (навигация) |
| SBP-03 | `getSbpDefaultBank`, `setSbpDefaultBank` |
| SET-01 | `logout` |
| SET-02 | `requestOtp`, `verifyOtp` (`change_mpin`), `changeMpin` |
| SET-03 | — (граница устройства) |
| SET-04 | `getLanguageSettings`, `setLanguage` |

**Не входят в v1:**
- экраны с `SOURCE_REQUIRED`: HOME-02, HOME-03, ACC-01, ACC-03, PAY-01, PAY-02, SBP-02, CARD-01, SVC-03, NOTIF-01;
- ACC-07 — данных нет, только переход в регистрацию (D-18);
- PAY-03 — формат QR неизвестен;
- отключённые пункты ACC-04…06, SVC-01, SVC-02, SVC-04 (D-11);
- зарезервированные разделы `CREDIT`, `CASHBACK`, `SAVE` (D-05);
- банковский продукт — контракт не моделирует ни один продукт, кроме одного счёта на главной.

---

## 9. Поля, которые сознательно не вошли

| Поле | Где упоминается | Почему не вошло |
|---|---|---|
| Имя получателя (`resolvedName`) | `RecipientInput` | Предложение `[A]` |
| Комиссия и итог (`fee`, `total`) | `PaymentSummary` | Предложение `[A]` |
| Категория операции (`category`) | `TransactionRow` | Предложение `[A]` |
| Отдельная проверка получателя до подтверждения | Прежний перечень в UI_ARCHITECTURE | Существует ли получатель, проверяет `confirmTransfer` (`RECIPIENT_NOT_FOUND`); отдельного шага в флоу нет |
| Текущий MPIN при смене | Прежняя композиция SET-02 | Убран решением D-10 |
| Данные QR | PAY-03 | Формат UNKNOWN |
| Реквизиты счёта, копирование и «Поделиться» | ACC-01, ROADMAP R02 `[R]` | ACC-01 — SOURCE_REQUIRED |
| Контакты и недавние получатели | ROADMAP R01 `[R]` | Не входит в v1 (D-12) |
| SIM, биометрия, камера | AUTH-03, AUTH-04, AUTH-06, SET-03, PAY-03 | Граница устройства (D-14) |
| Страна | ROADMAP R01 `[R]` | В решении D-15 нет |

---

## 10. Открытые вопросы контракта

Вопросы не блокируют использование v1: там, где ответа нет, контракт выбирает самый узкий вариант и помечает поле.

| № | Вопрос | Что сейчас в контракте |
|---|---|---|
| CQ-01 | Обязательны ли `address.apartment` и `comment` к переводу? В решениях их обязательность не указана | Обязательность — UNKNOWN; поля присутствуют |
| CQ-02 | Показывать ли на главной (HOME-01) `AccountCard` и мини-выписку? В композиции это предложения `[A]`, хотя рамки D-07 включают счёт и операции | Операции есть, поля помечены `[A-usage]` |
| CQ-03 | Может ли у клиента быть больше одного счёта? UI показывает одну `AccountCard` и не даёт выбрать счёт списания | Один счёт; счёт списания выбирает адаптер |
| CQ-04 | Что показывать при переводе в статусе `pending` дальше? Экрана или операции для уточнения статуса в UI нет | `pending` — конечный ответ для PST-02 |
| CQ-05 | Нужно ли снимать настройку «банк по умолчанию» в SBP-03? В D-06 есть только «сделать банком по умолчанию» | Только `setSbpDefaultBank` |
| CQ-06 | Нужно ли ФИО получателя при переводе по реквизитам (PAY-06)? В UI и решениях его нет | Не передаётся |
