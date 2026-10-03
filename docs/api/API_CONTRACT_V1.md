# API-контракт v1 (Уровень 5 — API Contract)

Частичный API-контракт Banking Shell по решению [D-07](../ui/UI_ARCHITECTURE.md#журнал-решений). Рамки первой части — в [UI_ARCHITECTURE.md](../ui/UI_ARCHITECTURE.md#уровень-5--api-контракт-частичный-старт).

```
UI (экраны и флоу)
    ↓ вызывает операции
API-контракт v1          ← этот документ
    ↓ реализуется
BankingAdapter
    ↓
DemoAdapter | NullAdapter | FutureRealBankAdapter (в задаче — RealBankAdapter)

Возможности устройства (SIM, биометрия, камера) — отдельная граница, вне контракта (D-14)
```

**Что это.** Логические операции, которые интерфейс вызывает у банковского адаптера. Контракт не зависит от транспорта: URL, HTTP-методов и форматов сериализации здесь нет. Как операции станут HTTP-запросами, решит `FutureRealBankAdapter`.

**Нотация.** Типы записаны в стиле TypeScript для точности. Это не код приложения.

---

## 1. Происхождение

Каждая операция и каждое предметное поле имеют прослеживаемое происхождение.

| Метка | Значение |
|---|---|
| `[SOURCE]` | Явный источник: схема R38 ([`refs/R38-user-flow.jpg`](../../refs/R38-user-flow.jpg)) |
| `[DECISION]` | Утверждённое решение D-01…D-27 |
| `[SCREEN]` | Утверждённый экран, его композиция или вход семантического компонента без метки `[A]` |
| `[FLOW]` | Утверждённый пользовательский флоу |
| `[TECHNICAL]` | Строго необходимое техническое поле. Обоснование указано всегда; продуктовую функциональность так не вводим |

**Статусы:**

| Статус | Значение |
|---|---|
| `STABLE` | Сигнатура зафиксирована |
| `STABLE · CQ-xx` | Сигнатура зафиксирована, деталь открыта (обязательность поля, значения справочника). Ответ на вопрос может только добавить что-то, но ничего не сломает |
| `NEEDS_DECISION · CQ-xx` | Сигнатура может измениться после ответа |
| `OPEN` | Требование не определено, в контракте его нет |

**Не попадает в контракт:**
- предложения `[A]`;
- функциональность из ROADMAP `[R]`;
- содержимое экранов `SOURCE_REQUIRED`;
- отключённые пункты навигации;
- возможности устройства.

Приоритет источников при конфликте: решение > утверждённые экраны и флоу > ROADMAP и референсы.

**Обязательность полей.** Поле, которое решение перечисляет для экрана, считается обязательным, если UI не говорит иного. Спорные случаи отмечены `NEEDS_DECISION`.

---

## 2. Общие правила

| № | Правило | Происхождение |
|---|---|---|
| G-1 | Адаптер сам хранит состояние сессии, текущей регистрации и привязку «экземпляр приложения → зарегистрированный клиент». Токенов и ID процессов в контракте нет | `[TECHNICAL]` на экранах этих значений нет; `[SOURCE]` узел N04 «Log in user through biometric or MPIN» — на экране входа нет поля идентификации клиента |
| G-2 | Бизнес-правила проверяет только адаптер: хватает ли денег, верен ли MPIN, существует ли получатель, соблюдён ли лимит. Результат — код ошибки | `[SCREEN]` [границы логики](../ui/UI_ARCHITECTURE.md#границы-логики) |
| G-3 | Возможности устройства в контракт не входят ([раздел 8](#8-граница-устройства--вне-контракта)) | `[DECISION]` D-14 |
| G-4 | Биометрию проверяет граница устройства до вызова операции; в контракт уходит только выбранный способ | `[DECISION]` D-13, D-14 |
| G-5 | MPIN — строка ровно из 4 цифр. MPIN передаётся только в запросах и никогда не возвращается в ответах | `[DECISION]` D-09; `[TECHNICAL]` секрет не должен покидать адаптер |
| G-6 | `NullAdapter`: чтение — пусто, если у ответа есть пустое значение, иначе `UNAVAILABLE`; действие — `UNAVAILABLE` | `[SCREEN]` [правила границы](../ui/UI_ARCHITECTURE.md#уровень-6--граница-адаптера-только-граница), `StatusMessage(unavailable)` |
| G-7 | Операции названы по предметной области, не по ID экранов | `[TECHNICAL]` контракт не знает экранов |
| G-8 | Имена полей в camelCase: `onboardingContext` = `onboarding_context` из D-18 | `[TECHNICAL]` единый стиль |
| G-9 | Все операции асинхронные и возвращают `Promise<Result<T>>` | `[TECHNICAL]` адаптер может работать через сеть |

---

## 3. Общие модели

```ts
type Result<T> = { ok: true; data: T } | { ok: false; error: ContractError };
type ContractError = { code: ErrorCode; fields?: string[] };
type Money = { amount: number; currency: "RUB" };
type CodeDelivery = { destinationMasked: string; codeLength: number; resendAfterSec: number };
```

| Модель · поле | Значение | Происхождение |
|---|---|---|
| `Result` | Успех с данными или ошибка | `[TECHNICAL]` единый способ вернуть ошибку; нужен `AsyncContent` и `StatusMessage` для состояний `error` и `unavailable` |
| `ContractError.code` | Код ошибки ([раздел 4](#4-ошибки)) | `[SCREEN]` состояния ошибок экранов, `StatusMessage(error / unavailable)` |
| `ContractError.fields` | Поля запроса, не прошедшие проверку | `[TECHNICAL]` показать ошибку у нужного поля формы: AUTH-05, `PaymentForm`; вложенное поле — путь через точку, например `recipient.recipientName` |
| `Money.amount` | Целые копейки; у операций со знаком | `[SCREEN]` `AccountCard.balance`, `TransactionRow.amount` «со знаком», `PaymentForm`; `[TECHNICAL]` целые копейки — без ошибок округления |
| `Money.currency` | Только `"RUB"` | `[SCREEN]` `PaymentForm.currency`, `AccountCard.balance` «сумма и валюта»; `[DECISION]` D-01 (Россия, СБП) |
| `CodeDelivery.destinationMasked` | Куда отправлен код, в замаскированном виде | `[SCREEN]` `OTPVerification.destination` |
| `CodeDelivery.codeLength` | Длина кода | `[SCREEN]` `OTPVerification.codeLength` |
| `CodeDelivery.resendAfterSec` | Через сколько секунд можно отправить код снова | `[SCREEN]` `OTPVerification.resendAfter` |

---

## 4. Ошибки

11 кодов. Каждый нужен хотя бы одной операции и показывается конкретным состоянием UI.

| Код | Категория | Когда | Где в UI | Происхождение |
|---|---|---|---|---|
| `UNAVAILABLE` | Операция недоступна | Банковского ядра нет | `StatusMessage(unavailable)` | `[SCREEN]` правило G-6 |
| `UNKNOWN` | Прочий сбой | Любая необработанная ошибка | `StatusMessage(error)`, `OperationStatus(failure)` | `[TECHNICAL]` ошибка без отдельной обработки |
| `VALIDATION_FAILED` | Проверка данных | Поля не прошли проверку адаптера | Ошибка у поля (`fields`) | `[TECHNICAL]` форма проверяет только формат, окончательная проверка — у адаптера (G-2) |
| `SESSION_EXPIRED` | Аутентификация | Сессии нет или она закончилась | Переход на AUTH-01 | `[DECISION]` D-08: без сессии — AUTH-01 |
| `STATE_CONFLICT` | Нарушен порядок шагов или состояние не позволяет операцию | Вход без регистрации на этом экземпляре приложения; `submitPersonalDetails` без подтверждённой почты; `changeMpin` без подтверждённого OTP; поля карты не соответствуют `onboardingContext`; счёт списания заблокирован (`fields: ["sourceAccountId"]`) | `StatusMessage(error)`; для перевода — PST-02 | `[TECHNICAL]` защита правил D-10, D-18, D-19 и G-1; `[DECISION]` D-25 |
| `MPIN_INVALID` | Аутентификация | Неверный MPIN | AUTH-01, PST-01 | `[SCREEN]` `MPINInput.error`; G-2 «верен ли MPIN» |
| `CODE_INVALID` | Проверка кода | Неверный или просроченный OTP или код из письма | AUTH-07 (Failure → AUTH-03), SET-02, AUTH-05 | `[SOURCE]` AUTH-07 Failure; `[DECISION]` D-19 «код неверный» |
| `AGE_RESTRICTION` | Проверка данных | Возраст меньше 18 лет | AUTH-05 | `[DECISION]` D-15 «дата рождения (18+)» |
| `AMOUNT_OUT_OF_LIMITS` | Подтверждение перевода | Сумма вне лимитов | `PaymentForm`, PST-02 | `[SCREEN]` `PaymentForm.limits` |
| `INSUFFICIENT_FUNDS` | Подтверждение перевода | Не хватает денег | PST-02 | `[SCREEN]` G-2 «хватает ли денег» |
| `RECIPIENT_NOT_FOUND` | Не найдено | Получатель не найден | PST-02 | `[SCREEN]` `RecipientInput`: «существует ли получатель — решает адаптер» |

Назначение кода (OTP или почта) определяется операцией, поэтому код ошибки у них общий — `CODE_INVALID`.

---

## 5. Операции

19 операций в разделах A–K. У каждой указаны статус и происхождение.

### A. Аутентификация и сессия

#### `login` — вход · `STABLE`

```ts
login(req: LoginRequest): Promise<Result<void>>
type LoginRequest = { method: "mpin"; mpin: string } | { method: "biometric" };
```

| Поле | Тип | Обяз. | Происхождение |
|---|---|---|---|
| `method` | `"mpin" \| "biometric"` | да | `[SOURCE]` N04 «biometric or MPIN»; `[SCREEN]` AUTH-01 `AuthMethodSelector` |
| `mpin` | 4 цифры | при `mpin` | `[SCREEN]` AUTH-01 `MPINInput(mode=enter)`; `[DECISION]` D-09 |

- **Зачем:** `[FLOW]` A — AUTH-01 → HOME-01.
- При `biometric` устройство уже проверило биометрию (G-4). Успех открывает сессию (G-1).
- Ошибки: `MPIN_INVALID`, `STATE_CONFLICT` (на этом экземпляре нет регистрации), `UNAVAILABLE`, `UNKNOWN`.

#### `logout` — выход · `STABLE`

```ts
logout(): Promise<Result<void>>
```

- **Зачем:** `[SOURCE]` N42 Logout; `[FLOW]` E — Logout → AUTH-01 `[DECISION]` D-08.
- Полей нет.

### B. Регистрация в мобильном банке

Порядок по `[FLOW]` B: `startRegistration` → SIM (граница устройства) → `sendEmailCode` и `verifyEmailCode` → `submitPersonalDetails` → `setMpin` → `requestOtp` и `verifyOtp` с назначением `onboarding`. Пароля нет `[DECISION]` D-15.

#### `startRegistration` — телефон и контекст онбординга · `STABLE`

```ts
startRegistration(req: StartRegistrationRequest): Promise<Result<void>>
type StartRegistrationRequest = { phone: string; onboardingContext: OnboardingContext };
```

| Поле | Тип | Обяз. | Происхождение |
|---|---|---|---|
| `phone` | `+7XXXXXXXXXX` | да | `[SCREEN]` AUTH-02; `[DECISION]` D-15 «телефон (+7)»; `[TECHNICAL]` формат E.164 |
| `onboardingContext` | `OnboardingContext` ([раздел C](#c-контекст-онбординга)) | да | `[DECISION]` D-16, D-18 |

- **Зачем:** `[SOURCE]` N05 Register user; `[FLOW]` B.
- Ошибки: `VALIDATION_FAILED`, `UNAVAILABLE`, `UNKNOWN`.

#### `submitPersonalDetails` — данные AUTH-05 · `STABLE · CQ-01`

```ts
submitPersonalDetails(req: PersonalDetails): Promise<Result<void>>

type PersonalDetails = {
  firstName: string;
  lastName: string;
  birthDate: string;
  address: Address;
  email: string;
  consents: { push: boolean; marketing: boolean };
  card?: CardDetails;
};
type Address = {
  postalCode: string; region: string; city: string; district: string;
  street: string; house: string; apartment: string;
};
type CardDetails = { number: string; expiry: string };
```

| Поле | Тип | Обяз. | Происхождение |
|---|---|---|---|
| `firstName`, `lastName` | строка | да | `[DECISION]` D-15 «имя, фамилия» |
| `birthDate` | `YYYY-MM-DD` | да | `[DECISION]` D-15 «дата рождения (18+)»; `[TECHNICAL]` формат ISO 8601 |
| `address.postalCode`, `region`, `city`, `district`, `street`, `house` | строка | да | `[DECISION]` D-15 «индекс, регион, город, район, улица, дом» |
| `address.apartment` | строка; пустая строка — квартиры нет | `NEEDS_DECISION · CQ-01` | `[DECISION]` D-15 «квартира»; `[TECHNICAL]` пустая строка — чтобы тип не зависел от ответа на CQ-01 |
| `email` | строка | да; та же, что подтверждена в `verifyEmailCode` | `[DECISION]` D-15, D-19 |
| `consents.push` | `boolean` | да | `[DECISION]` D-19 «согласие на push-уведомления» |
| `consents.marketing` | `boolean` | да | `[DECISION]` D-19 «согласие на маркетинговые рассылки» |
| `card` | `CardDetails` | **только при `existing_customer`** | `[DECISION]` D-18 |
| `card.number` | строка из цифр | да, если есть `card` | `[DECISION]` D-15 «номер карты» |
| `card.expiry` | `MM/YY` | да, если есть `card` | `[DECISION]` D-15 «срок действия карты»; `[TECHNICAL]` формат записи |

- **Зачем:** `[SOURCE]` N08 «Get Personal & Card Details»; `[SCREEN]` AUTH-05.
- Контекст адаптер помнит из `startRegistration` (G-1). Если `card` пришёл при `new_customer` или не пришёл при `existing_customer` — `STATE_CONFLICT`.
- Ошибки: `VALIDATION_FAILED`, `AGE_RESTRICTION`, `STATE_CONFLICT` (почта не подтверждена; `card` не соответствует контексту), `UNAVAILABLE`, `UNKNOWN`.

### C. Контекст онбординга

```ts
type OnboardingContext = "existing_customer" | "new_customer";
```

| Значение | Кто | Путь в UI | `card` в `submitPersonalDetails` | Происхождение |
|---|---|---|---|---|
| `existing_customer` | Уже клиент банка, в мобильном банке не зарегистрирован (на схеме D1 = YES, D2 = NO) | AUTH-01 → «Зарегистрироваться» → AUTH-02 → … → AUTH-05 | Обязателен | `[DECISION]` D-16, D-18; `[SOURCE]` ветка N02 YES → N03 NO |
| `new_customer` | Ещё не клиент банка (D1 = NO) | AUTH-01 → «Открыть счёт» → ACC-07 → AUTH-02 → … → AUTH-05 | Запрещён | `[DECISION]` D-08, D-18; `[SOURCE]` ветка N02 NO |

- **Слои.** Контекст определяет флоу (выбранная ссылка на AUTH-01). Контракт переносит его один раз — в `startRegistration`. Экран AUTH-05 получает готовое состояние «поля карты нужны / не нужны». Компоненты контекст не знают. Условие привязано к контексту, а не к ID экрана.
- ACC-07 в v1 не открывает банковский продукт `[DECISION]` D-18: операции «открыть счёт» в контракте нет.

### D. Одноразовый код (OTP)

Два назначения у одних и тех же операций `[DECISION]` D-10. Код из письма — отдельные операции раздела E `[DECISION]` D-19.

```ts
type OtpPurpose = "onboarding" | "change_mpin";
```

#### `requestOtp` — отправить OTP · `STABLE`

```ts
requestOtp(req: { purpose: OtpPurpose }): Promise<Result<CodeDelivery>>
```

| Поле | Тип | Обяз. | Происхождение |
|---|---|---|---|
| `purpose` | `OtpPurpose` | да | `[DECISION]` D-10: OTP онбординга (AUTH-07) и OTP чувствительной операции (SET-02) |
| ответ | `CodeDelivery` | — | `[SCREEN]` `OTPVerification` |

- **Зачем:** `[SOURCE]` N10 «Authenticate through OTP»; `[FLOW]` E — смена MPIN.
- Телефон адаптер знает сам (G-1). Повторный вызов = «Отправить ещё раз».
- Ошибки: `SESSION_EXPIRED` (для `change_mpin`), `UNAVAILABLE`, `UNKNOWN`.

#### `verifyOtp` — проверить OTP · `STABLE`

```ts
verifyOtp(req: { purpose: OtpPurpose; code: string }): Promise<Result<void>>
```

| Поле | Тип | Обяз. | Происхождение |
|---|---|---|---|
| `purpose` | `OtpPurpose` | да | `[DECISION]` D-10 |
| `code` | строка из `codeLength` цифр | да | `[SCREEN]` `OTPVerification.onSubmit(code)` |

- `onboarding`: успех завершает регистрацию и открывает сессию `[SOURCE]` Success → «Take user to home page».
- `change_mpin`: успех разрешает `changeMpin` в этой сессии `[DECISION]` D-10.
- Ошибки: `CODE_INVALID`, `SESSION_EXPIRED` (для `change_mpin`), `UNAVAILABLE`, `UNKNOWN`.

### E. Подтверждение почты

Отдельная операция регистрации, не OTP `[DECISION]` D-19. В UI тот же компонент `OTPVerification`.

#### `sendEmailCode` — отправить код на почту · `STABLE`

```ts
sendEmailCode(req: { email: string }): Promise<Result<CodeDelivery>>
```

| Поле | Тип | Обяз. | Происхождение |
|---|---|---|---|
| `email` | строка | да | `[DECISION]` D-15 «почта»; D-19 «отправить код» |
| ответ | `CodeDelivery` | — | `[SCREEN]` `OTPVerification` на AUTH-05 |

- Повторный вызов = повторная отправка.
- Ошибки: `VALIDATION_FAILED`, `UNAVAILABLE`, `UNKNOWN`.

#### `verifyEmailCode` — проверить код из письма · `STABLE`

```ts
verifyEmailCode(req: { code: string }): Promise<Result<void>>
```

| Поле | Тип | Обяз. | Происхождение |
|---|---|---|---|
| `code` | строка из `codeLength` цифр | да | `[DECISION]` D-19 «ввести код»; `[SCREEN]` `OTPVerification.onSubmit(code)` |

- Ошибки: `CODE_INVALID`, `UNAVAILABLE`, `UNKNOWN`.

### F. MPIN

MPIN — ровно 4 цифры, в ответах не возвращается (G-5). Формат проверяет форма, верность — адаптер.

#### `setMpin` — установить MPIN при регистрации · `STABLE`

```ts
setMpin(req: { mpin: string }): Promise<Result<void>>
```

| Поле | Тип | Обяз. | Происхождение |
|---|---|---|---|
| `mpin` | 4 цифры | да | `[SOURCE]` N09 «Set MPIN»; `[SCREEN]` AUTH-06 `MPINInput(mode=create)`; `[DECISION]` D-09 |

- Совпадение с повтором проверяет форма экрана, в контракт уходит одно значение.
- Включение входа по биометрии на AUTH-06 — граница устройства (D-14).
- Ошибки: `VALIDATION_FAILED`, `UNAVAILABLE`, `UNKNOWN`.

#### `changeMpin` — сменить MPIN · `STABLE`

```ts
changeMpin(req: { newMpin: string }): Promise<Result<void>>
```

| Поле | Тип | Обяз. | Происхождение |
|---|---|---|---|
| `newMpin` | 4 цифры | да | `[SOURCE]` N39 Change MPIN; `[SCREEN]` SET-02 шаг 2; `[DECISION]` D-09, D-10 |

- Только после успешного `verifyOtp({ purpose: "change_mpin" })` в этой сессии, иначе `STATE_CONFLICT` `[DECISION]` D-10.
- Текущий MPIN не передаётся: в утверждённом флоу SET-02 его нет (D-10).
- Ошибки: `STATE_CONFLICT`, `VALIDATION_FAILED`, `SESSION_EXPIRED`, `UNAVAILABLE`, `UNKNOWN`.

### G. Счёт

#### `getAccounts` — счета клиента · `STABLE`

```ts
getAccounts(): Promise<Result<AccountSummary[]>>
type AccountSummary = { id: string; name: string; maskedNumber: string; balance: Money; status: AccountStatus };
type AccountStatus = "active" | "blocked";
```

| Поле | Тип | Происхождение |
|---|---|---|
| `id` | строка | `[TECHNICAL]` стабильный идентификатор счёта: ключ элемента списка; `[DECISION]` D-23, D-24 — значение `accountId` в `getRecentTransactions` и `sourceAccountId` в `confirmTransfer`. Не показывается и не означает «основной счёт» |
| `name` | строка | `[SCREEN]` `AccountCard.name` |
| `maskedNumber` | строка | `[SCREEN]` `AccountCard.maskedNumber` |
| `balance` | `Money` | `[SCREEN]` `AccountCard.balance` «сумма и валюта» |
| `status` | `AccountStatus` | `[SCREEN]` вход `AccountCard.status`, `StatusBadge`; `[DECISION]` D-25 — значения `active` и `blocked`, других в v1 нет |

- **Зачем:** `[DECISION]` D-21 — главной нужны минимальные данные счёта; D-22 — счетов у клиента может быть несколько.
- **Смысл статуса в v1** `[DECISION]` D-25. `blocked` — счёт нельзя указать как `sourceAccountId` в `confirmTransfer`. Других следствий v1 не определяет: про входящие переводы, выписку, закрытие, разблокировку и другие операции контракт ничего не говорит. `active` значит только «не заблокирован»: остальные проверки перевода действуют как обычно. Причины, даты и виды ограничений в контракт не входят.
- Ответ — список из нуля, одного или нескольких счетов. Пустой список — счетов нет (так отвечает `NullAdapter`).
- В контракте нет признаков «основной» или «по умолчанию». Какие счета показывает главная — вопрос UI, не контракта (Q-29).
- `AccountSummary.id` — единственный идентификатор счёта в контракте. Им же счёт называют `getRecentTransactions` (D-23) и `confirmTransfer` (D-24).
- Реквизиты и действия со счётом не входят: ACC-01 — SOURCE_REQUIRED, D-21 его не открывает.
- Ошибки: `SESSION_EXPIRED`, `UNKNOWN`.

### H. Операции по счёту (мини-выписка)

#### `getRecentTransactions` — последние операции счёта · `STABLE`

```ts
getRecentTransactions(req: { accountId: string; limit: number }): Promise<Result<Transaction[]>>
type Transaction = { id: string; title: string; date: string; amount: Money; status: "success" | "pending" | "failure" };
```

| Поле | Тип | Происхождение |
|---|---|---|
| `accountId` | строка, `AccountSummary.id`; обязательный | `[DECISION]` D-23 — мини-выписка относится к одному конкретному счёту |
| `limit` | целое | `[SCREEN]` ACC-02 `TransactionList.limit` «последние N операций» |
| `id` | строка | `[TECHNICAL]` стабильный ключ строки списка; не показывается |
| `title` | строка | `[SCREEN]` `TransactionRow.title` |
| `date` | ISO 8601 с временем | `[SCREEN]` `TransactionRow.date`; `[TECHNICAL]` формат записи |
| `amount` | `Money`, со знаком | `[SCREEN]` `TransactionRow.amount` «со знаком» |
| `status` | `"success" \| "pending" \| "failure"` | `[SCREEN]` `TransactionRow.status` → `StatusBadge` |

- **Зачем:** `[SOURCE]` N20 Mini Statement; `[SCREEN]` ACC-02 `TransactionList(compact)`.
- Подробная выписка (ACC-03) не входит: SOURCE_REQUIRED.
- **Счёт — ровно один** `[DECISION]` D-23. Возвращаются только операции счёта `accountId`. Операции разных счетов не объединяются: сводной выписки, общей ленты и сводного баланса нет.
- Какой счёт показывает ACC-02, контракт не решает: `accountId` приходит из перехода на экран (состояние приложения), см. Q-30. С вопросом Q-29 (какие счета на главной) это не связано.
- Неизвестный или чужой `accountId` — `VALIDATION_FAILED` с `fields: ["accountId"]`.
- Ошибки: `VALIDATION_FAILED`, `SESSION_EXPIRED`, `UNKNOWN`.

### I. Платежи (ядро)

Утверждённых платежей, кроме переводов СБП, нет: PAY-01 и PAY-02 — SOURCE_REQUIRED, данные QR для PAY-03 неизвестны. Поэтому ядро платежа — лимиты и подтверждение перевода. Флоу: PAY-04 или PAY-06 → PST-01 → PST-02 `[FLOW]` C, `[DECISION]` D-13.

#### `getTransferLimits` — лимиты суммы · `STABLE`

```ts
getTransferLimits(req: { method: TransferMethod }): Promise<Result<TransferLimits>>
type TransferMethod = "mobile" | "bankAccount";
type TransferLimits = { min: Money; max: Money };
```

| Поле | Тип | Происхождение |
|---|---|---|
| `method` | `TransferMethod` | `[SCREEN]` `PaymentForm.recipientType`; способы SBP-01 `[DECISION]` D-01, D-06 |
| `min`, `max` | `Money` | `[SCREEN]` `PaymentForm.limits` «минимум и максимум, приходят от адаптера» |

Ошибки: `SESSION_EXPIRED`, `UNAVAILABLE`, `UNKNOWN`.

#### `confirmTransfer` — подтвердить перевод · `STABLE · CQ-01, CQ-04`

```ts
confirmTransfer(req: TransferRequest): Promise<Result<TransferResult>>

type TransferRequest = {
  clientRequestId: string;
  sourceAccountId: string;
  recipient:
    | { method: "mobile"; phone: string; bankId: string }
    | { method: "bankAccount"; accountNumber: string; bik: string; recipientName: string };
  amount: Money;
  comment?: string;
  confirmation: { method: "biometric" } | { method: "mpin"; mpin: string };
};
type TransferResult = { status: "success" | "pending" };
```

| Поле | Тип | Обяз. | Происхождение |
|---|---|---|---|
| `clientRequestId` | строка, уникальная на попытку | да | `[TECHNICAL]` защита от двойного списания при повторе запроса и `ActionButton(retry)` на PST-02 |
| `sourceAccountId` | строка, `AccountSummary.id` | да | `[DECISION]` D-24 — каждый перевод идёт с одного конкретного счёта; `[SCREEN]` `PaymentForm.sourceAccountId` |
| `recipient.method` | `TransferMethod` | да | `[SCREEN]` `PaymentForm.recipientType` |
| `recipient.phone` | `+7XXXXXXXXXX` | при `mobile` | `[SCREEN]` PAY-04 `RecipientInput(mobile)`; `[DECISION]` D-06 |
| `recipient.bankId` | строка из `findRecipientBanks` | при `mobile` | `[SCREEN]` `RecipientInput.onBankChange(bankId)`; `[DECISION]` D-06 |
| `recipient.accountNumber` | 20 цифр | при `bankAccount` | `[SCREEN]` PAY-06; `[DECISION]` D-01 «номер счёта» |
| `recipient.bik` | 9 цифр | при `bankAccount` | `[SCREEN]` PAY-06; `[DECISION]` D-01 «БИК» |
| `recipient.recipientName` | непустая строка | при `bankAccount` | `[DECISION]` D-26 — имя получателя при переводе по реквизитам; `[SCREEN]` PAY-06 `RecipientInput(bankAccount)` → `Input` |
| `amount` | `Money` | да | `[SCREEN]` `PaymentForm` → `AmountInput`; `PaymentSummary.amount` |
| `comment` | строка | `NEEDS_DECISION · CQ-01` | `[SCREEN]` `PaymentForm` → `Input(комментарий)`; `PaymentSummary.comment` |
| `confirmation.method` | `"biometric" \| "mpin"` | да | `[DECISION]` D-13 — биометрия ИЛИ MPIN, не оба |
| `confirmation.mpin` | 4 цифры | при `mpin` | `[SCREEN]` PST-01 `MPINInput`; `[DECISION]` D-09, D-13 |
| ответ `status` | `"success" \| "pending"` | — | `[SCREEN]` PST-02 `OperationStatus(success \| pending)`; `[DECISION]` D-13 |

- **Зачем:** `[FLOW]` C — PST-01 → PST-02; `[DECISION]` D-13.
- Отдельной «подготовки платежа» нет: PST-01 показывает данные, которые уже есть у формы. Существует ли получатель, адаптер проверяет здесь (G-2).
- **Счёт списания — ровно один и обязателен** `[DECISION]` D-24. Правило контракта не зависит от числа счетов. Как его получает UI: один счёт — приложение подставляет его само; несколько — пользователь выбирает счёт в форме этого перевода. Счетов нет — перевод отправить нельзя, см. Q-31.
- Выбранный счёт — состояние конкретного перевода, а не настройка. Признаков «счёт по умолчанию» или «основной счёт» нет.
- Неизвестный или чужой `sourceAccountId` — `VALIDATION_FAILED` с `fields: ["sourceAccountId"]`.
- Счёт со статусом `blocked` — `STATE_CONFLICT` с `fields: ["sourceAccountId"]` `[DECISION]` D-25. Проверяет адаптер (G-2). Флоу заранее не считает такой счёт допустимым, но окончательная проверка — у адаптера.
- `comment` остаётся `comment?: string` при любом ответе на CQ-01: если комментарий станет обязательным, отсутствие — `VALIDATION_FAILED`.
- **Имя получателя при `bankAccount` обязательно** `[DECISION]` D-26. Это одна строка в том виде, в каком её ввёл пользователь. Банк имя не сверяет: проверки по документам, разбора на фамилию, имя и отчество, транслитерации, исправлений и типов получателя (физлицо, организация) в v1 нет. Для `mobile` имя не передаётся.
- Пустое или отсутствующее `recipientName` — `VALIDATION_FAILED` с `fields: ["recipient.recipientName"]`. Ограничений длины контракт не задаёт: источника для них нет.
- `failure` на PST-02 — это `ok: false` с кодом ошибки.
- Ошибки: `MPIN_INVALID`, `AMOUNT_OUT_OF_LIMITS`, `INSUFFICIENT_FUNDS`, `RECIPIENT_NOT_FOUND`, `VALIDATION_FAILED`, `STATE_CONFLICT`, `SESSION_EXPIRED`, `UNAVAILABLE`, `UNKNOWN`.

### J. СБП

Раздел СБП после входа: SBP-01 → PAY-03, PAY-04, PAY-06 и «Подключить СБП» → SBP-03 `[DECISION]` D-17. SBP-02 — SOURCE_REQUIRED, операций нет.

#### `findRecipientBanks` — банки получателя по телефону · `STABLE`

```ts
findRecipientBanks(req: { phone: string }): Promise<Result<Bank[]>>
type Bank = { id: string; name: string };
```

| Поле | Тип | Происхождение |
|---|---|---|
| `phone` | `+7XXXXXXXXXX` | `[SCREEN]` PAY-04 `RecipientInput(mobile)`; `[DECISION]` D-06 |
| `Bank.id` | строка | `[SCREEN]` `RecipientInput.onBankChange(bankId)` |
| `Bank.name` | строка | `[SCREEN]` `RecipientInput.banks`; `[DECISION]` D-06 |

- Пустой список — по номеру нет ни одного банка.
- Ошибки: `VALIDATION_FAILED`, `SESSION_EXPIRED`, `UNAVAILABLE`, `UNKNOWN`.

#### `getSbpDefaultBank` — выбран ли этот банк банком по умолчанию · `STABLE`

```ts
getSbpDefaultBank(): Promise<Result<{ isDefault: boolean }>>
```

| Поле | Тип | Происхождение |
|---|---|---|
| `isDefault` | `boolean` | `[SCREEN]` SBP-03 `ListRow(toggle).checked`; `[DECISION]` D-06 |

- **Зачем:** `[SOURCE]` N16 (на схеме Register UPI); `[DECISION]` D-06, D-08, D-17.
- Ошибки: `SESSION_EXPIRED`, `UNAVAILABLE`, `UNKNOWN`.

#### `setSbpDefaultBank` — сделать этот банк банком по умолчанию · `STABLE · CQ-05`

```ts
setSbpDefaultBank(): Promise<Result<void>>
```

- **Зачем:** `[DECISION]` D-06 «сделать этот банк банком по умолчанию для входящих переводов»; SBP-03 после входа, из SBP-01 `[DECISION]` D-08, D-17.
- Полей нет. Снять настройку нельзя: в решениях этого действия нет (CQ-05).
- Ошибки: `SESSION_EXPIRED`, `UNAVAILABLE`, `UNKNOWN`.

### K. Базовые настройки

Смена MPIN — в разделе F. Включение биометрии (SET-03) — граница устройства.

#### `getLanguageSettings` — язык интерфейса · `STABLE · Q-17`

```ts
getLanguageSettings(): Promise<Result<LanguageSettings>>
type LanguageSettings = { current: string; available: { code: string; title: string }[] };
```

| Поле | Тип | Происхождение |
|---|---|---|
| `current` | код языка | `[SCREEN]` SET-04 `ChoiceList.value` |
| `available[].code` | строка | `[SCREEN]` `ChoiceList.items[].id` |
| `available[].title` | строка | `[SCREEN]` `ChoiceList.items[].title` |

- **Зачем:** `[SOURCE]` N41 Change Language.
- Какие языки — `OPEN`: вопрос Q-17. Структура от этого не зависит.
- Ошибки: `SESSION_EXPIRED`, `UNAVAILABLE`, `UNKNOWN`.

#### `setLanguage` — сменить язык · `STABLE · Q-17`

```ts
setLanguage(req: { code: string }): Promise<Result<void>>
```

| Поле | Тип | Обяз. | Происхождение |
|---|---|---|---|
| `code` | один из `available[].code` | да | `[SCREEN]` SET-04 `ChoiceList.onChange(id)` |

Ошибки: `VALIDATION_FAILED`, `SESSION_EXPIRED`, `UNAVAILABLE`, `UNKNOWN`.

---

## 6. Матрица трассировки

Отвечает на вопрос «зачем существует эта операция».

| Операция | Раздел | Экран / флоу | Запрос | Ответ | Происхождение | Метод адаптера | Статус |
|---|---|---|---|---|---|---|---|
| `login` | A | AUTH-01 / A | `LoginRequest` | — | SOURCE N04; DECISION D-09, D-13 | `login` | STABLE |
| `logout` | A | SET-01 / E | — | — | SOURCE N42; DECISION D-08 | `logout` | STABLE |
| `startRegistration` | B, C | AUTH-02 / B | `StartRegistrationRequest` | — | SOURCE N05; DECISION D-15, D-16, D-18 | `startRegistration` | STABLE |
| `submitPersonalDetails` | B, C | AUTH-05 / B | `PersonalDetails`; `card` только при `existing_customer` | — | SOURCE N08; DECISION D-15, D-18, D-19 | `submitPersonalDetails` | STABLE · CQ-01 |
| `requestOtp` | D | AUTH-07, SET-02 / B, E | `{ purpose }` | `CodeDelivery` | SOURCE N10; DECISION D-10 | `requestOtp` | STABLE |
| `verifyOtp` | D | AUTH-07, SET-02 / B, E | `{ purpose, code }` | — | SOURCE N10; DECISION D-10 | `verifyOtp` | STABLE |
| `sendEmailCode` | E | AUTH-05 / B | `{ email }` | `CodeDelivery` | DECISION D-19 | `sendEmailCode` | STABLE |
| `verifyEmailCode` | E | AUTH-05 / B | `{ code }` | — | DECISION D-19 | `verifyEmailCode` | STABLE |
| `setMpin` | F | AUTH-06 / B | `{ mpin }` | — | SOURCE N09; DECISION D-09 | `setMpin` | STABLE |
| `changeMpin` | F | SET-02 / E | `{ newMpin }` | — | SOURCE N39; DECISION D-09, D-10 | `changeMpin` | STABLE |
| `getAccounts` | G | HOME-01; PAY-04, PAY-06 / C, G | — | `AccountSummary[]` | DECISION D-07, D-21, D-22, D-24, D-25; SCREEN `AccountCard` | `getAccounts` | STABLE |
| `getRecentTransactions` | H | ACC-02 / G | `{ accountId, limit }` | `Transaction[]` | SOURCE N20; SCREEN ACC-02; DECISION D-23 | `getRecentTransactions` | STABLE |
| `getTransferLimits` | I | PAY-04, PAY-06 / C | `{ method }` | `TransferLimits` | SCREEN `PaymentForm.limits` | `getTransferLimits` | STABLE |
| `confirmTransfer` | I | PST-01 → PST-02 / C | `TransferRequest` | `TransferResult` | FLOW C; DECISION D-01, D-06, D-09, D-13, D-24, D-25, D-26 | `confirmTransfer` | STABLE · CQ-01, CQ-04 |
| `findRecipientBanks` | J | PAY-04 / C, D | `{ phone }` | `Bank[]` | DECISION D-06 | `findRecipientBanks` | STABLE |
| `getSbpDefaultBank` | J | SBP-03 / D | — | `{ isDefault }` | SOURCE N16; DECISION D-06, D-17 | `getSbpDefaultBank` | STABLE |
| `setSbpDefaultBank` | J | SBP-03 / D | — | — | DECISION D-06, D-08, D-17 | `setSbpDefaultBank` | STABLE · CQ-05 |
| `getLanguageSettings` | K | SET-04 / E | — | `LanguageSettings` | SOURCE N41 | `getLanguageSettings` | STABLE · Q-17 |
| `setLanguage` | K | SET-04 / E | `{ code }` | — | SOURCE N41 | `setLanguage` | STABLE · Q-17 |

**Условные поля регистрации:**

| Поле | `existing_customer` | `new_customer` | Происхождение |
|---|---|---|---|
| `card.number`, `card.expiry` | Обязательны | Запрещены (`STATE_CONFLICT`) | DECISION D-15, D-18 |
| Остальные поля `PersonalDetails` | Те же | Те же | DECISION D-15, D-19 |

**Условные поля перевода** (`recipient` — размеченное объединение по `method`):

| Поле | `mobile` (PAY-04) | `bankAccount` (PAY-06) | Происхождение |
|---|---|---|---|
| `recipient.phone`, `recipient.bankId` | Обязательны | Нет в варианте | DECISION D-06 |
| `recipient.accountNumber`, `recipient.bik` | Нет в варианте | Обязательны | DECISION D-01 |
| `recipient.recipientName` | Нет в варианте | Обязательно, непустое | DECISION D-26 |

Цепочка для имени получателя: PAY-06 → `RecipientInput(bankAccount)` → `Input` (имя получателя) → `recipient: { method: "bankAccount", accountNumber, bik, recipientName }` → `TransferRequest` → `confirmTransfer` → `BankingAdapter.confirmTransfer` [D-26]. Отдельной операции для имени нет.

**Экраны без операций:**
- AUTH-03, AUTH-04, SET-03 — граница устройства;
- SBP-01 — только навигация;
- ACC-07 — только переход в регистрацию, продукт не открывается (D-18).

---

## 7. Интерфейс адаптера (предложение)

Один интерфейс, методы которого сгруппированы по разделам контракта. Каждый метод совпадает с логической операцией 1:1. Это документация, не код. Фабрик, DI-контейнеров и репозиториев нет.

```ts
interface BankingAdapter {
  // A. Сессия
  login(req: LoginRequest): Promise<Result<void>>;
  logout(): Promise<Result<void>>;
  // B–C. Регистрация и контекст онбординга
  startRegistration(req: StartRegistrationRequest): Promise<Result<void>>;
  submitPersonalDetails(req: PersonalDetails): Promise<Result<void>>;
  // D. OTP
  requestOtp(req: { purpose: OtpPurpose }): Promise<Result<CodeDelivery>>;
  verifyOtp(req: { purpose: OtpPurpose; code: string }): Promise<Result<void>>;
  // E. Почта
  sendEmailCode(req: { email: string }): Promise<Result<CodeDelivery>>;
  verifyEmailCode(req: { code: string }): Promise<Result<void>>;
  // F. MPIN
  setMpin(req: { mpin: string }): Promise<Result<void>>;
  changeMpin(req: { newMpin: string }): Promise<Result<void>>;
  // G–H. Счёт и операции
  getAccounts(): Promise<Result<AccountSummary[]>>;
  getRecentTransactions(req: { accountId: string; limit: number }): Promise<Result<Transaction[]>>;
  // I. Платежи
  getTransferLimits(req: { method: TransferMethod }): Promise<Result<TransferLimits>>;
  confirmTransfer(req: TransferRequest): Promise<Result<TransferResult>>;
  // J. СБП
  findRecipientBanks(req: { phone: string }): Promise<Result<Bank[]>>;
  getSbpDefaultBank(): Promise<Result<{ isDefault: boolean }>>;
  setSbpDefaultBank(): Promise<Result<void>>;
  // K. Настройки
  getLanguageSettings(): Promise<Result<LanguageSettings>>;
  setLanguage(req: { code: string }): Promise<Result<void>>;
}
```

| Метод | `NullAdapter` | `DemoAdapter` | `FutureRealBankAdapter` |
|---|---|---|---|
| `getAccounts`, `findRecipientBanks` | `[]` | Демо-данные из JSON; у `getAccounts` — ноль, один или несколько счетов | Запрос к банку |
| `getRecentTransactions` | `[]` при любом `accountId`: счетов нет, операций тоже (G-6) | Демо-операции только этого счёта; неизвестный `accountId` — `VALIDATION_FAILED` | Запрос к банку |
| `confirmTransfer` | `UNAVAILABLE`; счёт списания не подставляет и не придумывает | Принимает только `sourceAccountId` демо-счёта, иначе `VALIDATION_FAILED`; демо-счёт `blocked` — `STATE_CONFLICT` [D-25]; пустое `recipientName` при `bankAccount` — `VALIDATION_FAILED` [D-26]; остальное — по демо-правилам, без сложной банковской логики | Запрос к банку |
| `getTransferLimits`, `getSbpDefaultBank`, `getLanguageSettings` | `UNAVAILABLE` (пустого значения нет, G-6) | Демо-данные из JSON | Запрос к банку |
| Остальные действия | `UNAVAILABLE` | Имитация по демо-правилам | Запрос к банку |

- `DemoAdapter` хранит изменения в `localStorage` браузера; интерфейс об этом не знает, `NullAdapter` ничего не хранит [D-27].
- Реализация: `src/adapters/banking/` — интерфейс, `NullAdapter`, `DemoAdapter` и общие контрактные тесты.
- Выбор адаптера — в одном месте конфигурации.

---

## 8. Граница устройства — вне контракта

По D-14 это отдельная граница (`DemoDeviceAdapter`). В этом шаге она не проектируется, здесь только её рамки.

| Возможность | Где нужна | Связь с банковским контрактом |
|---|---|---|
| Выбор и привязка SIM | AUTH-03, AUTH-04 | Нет |
| Доступность биометрии, включение входа по биометрии | AUTH-01, AUTH-06, SET-03, PST-01 | Нет |
| Проверка биометрии | AUTH-01, PST-01 | Только результат: `login` и `confirmTransfer` получают `method: "biometric"` (G-4) |
| Камера для QR | PAY-03 | Нет: PAY-03 в v1 не входит |

**В `BankingAdapter` запрещены** методы вида `getSimCards`, `bindSim`, `isBiometricAvailable`, `verifyBiometric`, `getBiometricHardware`, `scanQr`.

---

## 9. Вне рамок v1

| Что | Почему | Происхождение |
|---|---|---|
| Содержимое 10 экранов SOURCE_REQUIRED: HOME-02, HOME-03, ACC-01, ACC-03, PAY-01, PAY-02, SBP-02, CARD-01, SVC-03, NOTIF-01 | Содержимое не определено; ни операций, ни полей, ни моделей | DECISION D-07, D-20; Q-11 |
| Отключённые пункты: Savings, Current, Loan, Deposits & OD, Trading, Other Services | Резерв навигации, не функциональность | DECISION D-11 |
| Открытие банковского продукта | ACC-07 только ведёт в регистрацию | DECISION D-18 |
| Кредитная карта, кешбэк, накопления | Зарезервированы, проектируются отдельно | DECISION D-05 |
| Выбор получателя из контактов и недавних | Не входит в v1 | DECISION D-12 |
| Функции карт: заморозка, лимиты, реквизиты, виртуальные и физические карты | CARD-01 — SOURCE_REQUIRED; ROADMAP — не источник | DECISION D-20 |
| Перевод по QR | Формат данных QR неизвестен | SCREEN PAY-03 |
| Возможности устройства | Отдельная граница | DECISION D-14 |
| Пароль | Вход по MPIN, пароля нет | DECISION D-09, D-15 |
| Шаблоны, избранное, регулярные и отложенные платежи, история платежей | Нигде не утверждены | — |

**Поля из предложений `[A]`, которые не вошли:**
- имя получателя, найденное банком (`RecipientInput.resolvedName`). Это не то же, что введённое пользователем `recipientName` [D-26];
- комиссия и итог (`PaymentSummary.fee`, `total`);
- категория операции (`TransactionRow.category`).

---

## 10. Открытые вопросы контракта

Ни один открытый вопрос не меняет существующие обязательные сигнатуры: ответы могут только добавить необязательное поле или операцию либо поменять проверку. Обязательные сигнатуры всех 19 операций заморожены.

| № | Вопрос | Статус | Блокирует v1? | Сейчас в контракте |
|---|---|---|---|---|
| CQ-01 | Обязательны ли квартира в адресе и комментарий к переводу? | NEEDS_DECISION | Нет: меняется только проверка. Типы зафиксированы: `apartment: string` (пустая строка — квартиры нет), `comment?: string` | Поля есть, обязательность не задана |
| ~~CQ-02~~ | ~~Нужны ли данные счёта в v1~~ | Решено — D-21 | — | `getAccounts`; ACC-01 по-прежнему SOURCE_REQUIRED |
| ~~CQ-03~~ | ~~Сколько счетов у клиента~~ | Решено — D-22: может быть несколько | — | `getAccounts` возвращает список |
| CQ-04 | Что дальше, если перевод «в обработке» (`pending`)? Уточнения статуса в UI нет | NEEDS_DECISION | Нет: ответ может только добавить операцию; перевод уже можно назвать по `clientRequestId` | `pending` — конечный ответ для PST-02 |
| CQ-05 | Можно ли снять настройку «банк по умолчанию»? | NEEDS_DECISION | Нет: ответ может только добавить операцию | Только `setSbpDefaultBank` |
| ~~CQ-06~~ | ~~Нужно ли имя получателя при переводе по реквизитам~~ | Решено — D-26: да, одной строкой, только для `bankAccount` | — | `recipient.recipientName` |
| ~~CQ-07~~ | ~~Чьи операции показывает мини-выписка при нескольких счетах~~ | Решено — D-23: одного конкретного счёта | — | `getRecentTransactions` требует `accountId` |
| ~~CQ-08~~ | ~~С какого счёта списывается перевод~~ | Решено — D-24: с одного конкретного счёта, поле обязательно | — | `TransferRequest.sourceAccountId` |
| ~~CQ-09~~ | ~~Значения `AccountSummary.status`~~ | Решено — D-25: `active` \| `blocked`; `blocked` нельзя указать счётом списания | — | `AccountStatus`; `STATE_CONFLICT` в `confirmTransfer` |
| CQ-10 | Вызов не по порядку флоу B: `sendEmailCode` до `startRegistration`, `setMpin` до `submitPersonalDetails`, `requestOtp({ purpose: "onboarding" })` до `setMpin`. В списках ошибок этих операций нет `STATE_CONFLICT`, хотя по разделу 4 это его случай («нарушен порядок шагов»). `DemoAdapter` сейчас отвечает `STATE_CONFLICT`. Дописать его в списки ошибок? | NEEDS_DECISION | Нет: `STATE_CONFLICT` уже есть в `ErrorCode`, меняется только документация | `DemoAdapter` отвечает `STATE_CONFLICT` |
| Q-17 | Какие языки интерфейса | OPEN | Нет | Структура есть, значения не заданы |

Вопросы Q-10, Q-11 и Q-16 из UI-спецификации остаются открытыми: Q-10 и Q-16 контракт не затрагивают, Q-11 исключён целиком.

---

## 11. Изменения относительно предыдущего черновика v1

- Метки происхождения: вместо двух (UI и TECH) — пять (SOURCE, DECISION, SCREEN, FLOW, TECHNICAL).
- Добавлены статусы операций, матрица трассировки в новом формате, предложение интерфейса адаптера и раздел «Вне рамок v1».
- Коды ошибок: `NOT_REGISTERED`, `OTP_REQUIRED` и `EMAIL_NOT_VERIFIED` объединены в `STATE_CONFLICT`; `OTP_INVALID` и `EMAIL_CODE_INVALID` — в `CODE_INVALID`. Было 14 кодов, стало 11.
- Все операции асинхронные (`Promise<Result<T>>`).
- `getAccountSummary` переведена в `NEEDS_DECISION`.
- **Поправка после D-21 и D-22:** `getAccountSummary(): AccountSummary | null` заменена на `getAccounts(): AccountSummary[]`; добавлено техническое поле `AccountSummary.id`; операция стала `STABLE`. Вопросы CQ-02 и CQ-03 закрыты, добавлены CQ-07 и CQ-08. Сигнатура `getRecentTransactions` не менялась.
- **Поправка после D-23 и D-24:** `getRecentTransactions` получила обязательный `accountId`; в `TransferRequest` добавлено обязательное `sourceAccountId`. Оба поля — `AccountSummary.id`, другого идентификатора счёта нет. Вопросы CQ-07 и CQ-08 закрыты. Добавлен CQ-09: значения `AccountSummary.status` пришли из предложения `[A]`, а `[A]` в контракт не попадает, поэтому `getAccounts` переведена в `NEEDS_DECISION · CQ-09`.
- **Поправка после D-25:** утверждён `AccountStatus = "active" | "blocked"`; единственное следствие `blocked` — нельзя указать счётом списания, `confirmTransfer` отвечает `STATE_CONFLICT`. `getAccounts` снова `STABLE`, CQ-09 закрыт.
- **Аудит перед заморозкой:** у CQ-06 исправлена оценка — ответ может добавить обязательное поле, поэтому `confirmTransfer` — `NEEDS_DECISION · CQ-06`. Для CQ-01 зафиксированы типы полей, чтобы ответ менял только проверку.
- **Поправка после D-26:** в вариант `bankAccount` поля `recipient` добавлено обязательное `recipientName: string`; на PAY-06 — поле ввода. CQ-06 закрыт, `confirmTransfer` — `STABLE · CQ-01, CQ-04`. Добавлена таблица условных полей перевода. Для вложенных полей в `fields` введена запись через точку. Обязательные сигнатуры всех 19 операций заморожены.
- Названия операций не менялись.
