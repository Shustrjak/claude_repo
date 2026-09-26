# Композиция экранов (Уровень 3–4 — Screen Composition)

Часть UI-спецификации Banking Shell. Это архитектура, а не реализация: дерево показывает, из каких компонентов собран экран.
Принятые решения `[D-xx]` — в [журнале решений](UI_ARCHITECTURE.md#журнал-решений).

**Обозначения:**

| Метка | Значение |
|---|---|
| `[S]` | Из схемы, в том числе из названия узла |
| `[A]` | Предложение, требованием не является |
| `[R]` | Из ROADMAP, на схеме нет |
| `[D-xx]` | Принятое решение |
| `UNKNOWN` | Схема не описывает содержимое |
| `SOURCE_REQUIRED` | Содержимое экрана не проектируется, пока нет источника (Q-11, [D-07], [D-20]) |

Каждый экран собран в `AppShell`. У экранов до входа вариант `auth` (без нижней навигации), после входа — `main`: он уже содержит `BottomNavigation`, поэтому в деревьях она отдельно не показывается [A]. На каких экранах нижняя навигация видна на самом деле — UNKNOWN.

До входа доступны AUTH-01, ACC-07 и AUTH-02…07 [D-08].

**`onboarding_context`** [D-18] задаётся тем, как пользователь пришёл в регистрацию: ссылка «Зарегистрироваться» на AUTH-01 — `existing_customer` (уже клиент банка, D1 = YES, D2 = NO); ссылка «Открыть счёт» через ACC-07 — `new_customer` (ещё не клиент банка, D1 = NO). Контекст определяет флоу регистрации и передаёт контракт; композиция экрана получает готовое значение; компоненты только показывают поля и о контексте не знают.

**Композиций нет** у кандидата SBP-02 и у отключённых пунктов навигации ACC-04…06, SVC-01, SVC-02, SVC-04 [D-11].

---

## AUTH

```
AUTH-01 Login                      (стартовый экран [D-08])
AppShell(auth)
├── AppHeader
├── AuthMethodSelector            (биометрия или MPIN)
│   └── MPINInput(mode=enter)     (4 цифры [D-09]; когда выбран MPIN)
├── ListRow(link) «Открыть счёт» → ACC-07        [D-08]; вид ссылки — [A]
├── ListRow(link) «Зарегистрироваться» → AUTH-02 [D-16]; вид ссылки — [A]
└── StatusMessage(error)          (PST-03 — ошибка входа) [A]
```

```
AUTH-02 Register User
AppShell(auth)
├── AppHeader(back)
├── PhoneInput(+7)                [D-15]
└── ActionButton(action="next")
```

```
AUTH-03 Select SIM                 (данные — граница устройства [D-14])
AppShell(auth)
├── AppHeader(back)
├── ChoiceList(items = SIM-слоты) (демо-реализация [D-03])
└── ActionButton(action="next")
```

```
AUTH-04 Bind SIM                   (граница устройства [D-14])
AppShell(auth)
├── AppHeader
├── OperationStatus(pending → success | failure)   [A]
└── ActionButton(action="next" | "retry")
```

```
AUTH-05 Personal & Card Details    (состав полей — [D-15], условия — [D-18], почта и согласия — [D-19])
AppShell(auth)
├── AppHeader(back)
│
│   Всегда:
├── Input × 2                     имя, фамилия
├── Input(маска даты)             дата рождения (18+)
├── Input × 7                     адрес: индекс, регион, город, район, улица, дом, квартира
├── Input                         почта
├── OTPVerification               код из письма: отправить код → ввести код → почта подтверждена
│                                 (операция подтверждения почты, не OTP входа [D-19])
├── Checkbox                      согласие на push-уведомления
├── Checkbox                      согласие на маркетинговые рассылки
│
│   Только при onboarding_context = existing_customer [D-18]:
├── Input × 2                     номер карты, срок действия карты
│   (при new_customer полей карты нет)
│
└── ActionButton(action="next")
```

```
AUTH-06 Set MPIN & Enable Biometric
AppShell(auth)
├── AppHeader(back)
├── MPINInput(mode=create)        4 цифры [D-09]
├── MPINInput(mode=confirm)       [R] «пароль + повтор»
├── ListRow(variant=toggle)       включить биометрию; доступность — граница устройства [D-14]
└── ActionButton(action="next")
```

```
AUTH-07 OTP Authentication         (OTP для онбординга [D-10])
AppShell(auth)
├── AppHeader
└── OTPVerification               (Success → HOME-01, Failure → AUTH-03)
```

## HOME

```
HOME-01 Home
AppShell(main)
├── AppHeader(actions = поиск, уведомления, профиль)   [A]
├── AsyncContent
│   ├── AccountCard                                    [A]
│   └── TransactionList(variant=compact)  или ссылка на ACC-02 (Q-10)
└── ListRow(link) → ACC-03, HOME-04 Menu               [A]  (раскладка по D-04)
```

```
HOME-02 Search
AppShell(main)
├── AppHeader(back)
└── SOURCE_REQUIRED — содержимое (Q-11)
```

```
HOME-03 Profile
AppShell(main)
├── AppHeader(back)
└── SOURCE_REQUIRED — содержимое (Q-11)
```

```
HOME-04 Menu
AppShell(main)
├── AppHeader
└── ListRow(link) или ServiceTile          [D-04]; вид — [A]
    активные:    ACC-01, PAY-01, PAY-02, CARD-01, SVC-03, SBP-01
    отключённые: SVC-01, SVC-02, SVC-04 — неактивные пункты, без экрана [D-11]
```

## ACC

```
ACC-01 Account Information
AppShell(main)
├── AppHeader(back)
└── SOURCE_REQUIRED — содержимое (Q-11)
```

```
ACC-02 Mini Statement
AppShell(main)
├── AppHeader(back)
└── AsyncContent
    └── TransactionList(variant=compact)   [S — «Mini Statement»]
```

```
ACC-03 Detailed Statement
AppShell(main)
├── AppHeader(back)
└── SOURCE_REQUIRED — содержимое, в том числе есть ли фильтр периода (Q-11)
```

```
ACC-07 Open Account                (вход — ссылка с AUTH-01 [D-08])
AppShell(auth)
├── AppHeader(back)
├── ListRow(link, disabled) × 3    Savings, Current, Loan — отключённые пункты [D-11]
└── ActionButton(action="next") → AUTH-02 (контекст new_customer)    [D-08, D-18]; кнопка как способ перехода — [A]
    (банковский продукт не открывается: ветка — только начало регистрации [D-18])
```

## PAY

```
PAY-01 Pay                         (входы: меню и нижняя навигация [D-04])
AppShell(main)
├── AppHeader
└── SOURCE_REQUIRED — содержимое и переходы (Q-11)
```

```
PAY-02 Bill Payments
AppShell(main)
├── AppHeader(back)
└── SOURCE_REQUIRED — содержимое и переходы (Q-11)
```

```
PAY-03 Scan QR                     (камера — граница устройства [D-14])
AppShell(main)
├── AppHeader(back)
├── QRScanner
└── StatusMessage(error)          (камера запрещена) [A]
    → после распознавания: PaymentForm(initialRecipient из QR) → PST-01 [A]
```

```
PAY-04 Pay to Mobile Number
AppShell(main)
├── AppHeader(back)
├── PaymentForm(recipientType=mobile)
│   ├── RecipientInput(type=mobile)   (телефон + банк получателя [D-06])
│   ├── AmountInput
│   └── Input(комментарий)
├── PaymentSummary                [A]
└── ActionButton(action="next")   → PST-01
```

**Pay to UPI ID** со схемы убран: в СБП аналога нет [D-06].

```
PAY-06 Pay to Bank Account
  то же, что PAY-04, но PaymentForm(recipientType=bankAccount): номер счёта и БИК [D-01]
  остаётся в разделе СБП [D-06]
```

## СБП (внутри домена PAY)

```
SBP-01 СБП                        (на схеме — UPI)
AppShell(main)
├── AppHeader
├── PaymentMethodSelector(methods = qr, mobile, bankAccount)
└── ListRow(link) «Подключить СБП» → SBP-03    [D-17]; вид — [A]
```

```
SBP-03 Подключение СБП            (на схеме — Register UPI; после входа [D-08])
AppShell(main)
├── AppHeader(back)
├── ListRow(toggle)               «Банк по умолчанию для входящих переводов СБП» [D-06]; вид — [A]
├── ActionButton(action="confirm")  [A]
└── OperationStatus               [A]
    (вход — из SBP-01 [D-17])
```

**SBP-02 Функции СБП** (на схеме — UPI Functions) — кандидат, группа навигации. С SBP-01 не объединяется [D-04]. Содержимое — SOURCE_REQUIRED ([Q-11](SCREEN_INVENTORY.md#q-11)).

## Зарезервированные разделы

**CREDIT, CASHBACK, SAVE** — префиксы зарезервированы, экраны и их место в навигации проектируются отдельно [D-05].

## Состояния платежа

По [D-13] подтверждение и результат платежа — обязательные состояния флоу. Отдельных ID экранов они не получают.

```
PST-01 Подтверждение платежа       [D-13]; шторка или экран — [A]
└── PaymentConfirmation
    ├── PaymentSummary
    ├── AuthMethodSelector        биометрия ИЛИ MPIN, не оба сразу [D-13]
    │   └── MPINInput(mode=enter) 4 цифры [D-09]; запасной способ или единственный,
    │                             если биометрия недоступна или выключена
    ├── ActionButton(action="pay")
    └── ActionButton(action="cancel")
```

```
PST-02 Результат платежа           [D-13]
AppShell(main)
├── OperationStatus(success | failure | pending)
├── PaymentSummary
└── ActionButton(action="close" | "retry")
```

```
PST-03 Ошибка входа                [A] — состояние экрана AUTH-01
└── StatusMessage(error) + ActionButton(action="retry")
```

## CARD

```
CARD-01 Card Services
AppShell(main)
├── AppHeader(back)
└── SOURCE_REQUIRED — содержимое (Q-11, [D-20])
```

## SVC

```
SVC-03 Locate Branch
AppShell(main)
├── AppHeader(back)
└── SOURCE_REQUIRED — содержимое (Q-11)
```

**SVC-01 Deposits & OD, SVC-02 Trading, SVC-04 Other Services** — отключённые пункты меню без экрана [D-11].

## NOTIF

```
NOTIF-01 Notifications
AppShell(main)
├── AppHeader(back)
└── SOURCE_REQUIRED — содержимое (Q-11)
```

## SET

```
SET-01 Settings
AppShell(main)
├── AppHeader
├── ListRow(link)    → SET-02 Change MPIN
├── ListRow(link)    → SET-03 Biometric Login
├── ListRow(link)    → SET-04 Change Language
└── ListRow(danger)  → действие Logout (N42) → AUTH-01 [D-08]
```

```
SET-02 Change MPIN                 (шаги внутри одного экрана [D-10])
AppShell(main)
├── AppHeader(back)
├── шаг 1: OTPVerification         OTP для чувствительной операции [D-10]
├── шаг 2: MPINInput(mode=create)  новый MPIN, 4 цифры [D-09]
│          MPINInput(mode=confirm) повтор — как в AUTH-06 [A]
│          ActionButton(action="confirm") [A]
└── шаг 3: OperationStatus(success) [D-10]
```

```
SET-03 Enable / Disable Biometric Login   (доступность — граница устройства [D-14])
AppShell(main)
├── AppHeader(back)
├── ListRow(variant=toggle)
└── StatusMessage(unavailable)     (устройство не поддерживает) [A]
```

```
SET-04 Change Language
AppShell(main)
├── AppHeader(back)
└── ChoiceList(items = языки)      (Q-17)
```

---

## Какие компоненты на каком экране

`●` — компонент на экране; `○` — предложено `[A]` или взято из ROADMAP `[R]`.
Столбцы с компонентами:

| Столбец | Компонент |
|---|---|
| AB | `ActionButton` |
| MP | `MPINInput` |
| OTP | `OTPVerification` |
| CL | `ChoiceList` |
| OS | `OperationStatus` |
| LR | `ListRow` |
| AC | `AsyncContent` |
| SM | `StatusMessage` |
| PF | `PaymentForm` |
| PS | `PaymentSummary` |
| Другие | Остальные компоненты |

`AppShell` и `AppHeader` есть везде, в таблицу не включены. У экранов с `SOURCE_REQUIRED` (Q-11, [D-20]) компонентов нет: их содержимое не проектируется.

| Экран | AB | MP | OTP | CL | OS | LR | AC | SM | PF | PS | Другие |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AUTH-01 | | ● | | | | ● | | ○ | | | `AuthMethodSelector` |
| AUTH-02 | ● | | | | | | | | | | `PhoneInput` |
| AUTH-03 | ● | | | ● | | | | | | | — |
| AUTH-04 | ● | | | | ○ | | | | | | — |
| AUTH-05 | ● | | ● | | | | | | | | `Input`, `Checkbox` |
| AUTH-06 | ● | ● | | | | ● | | | | | — |
| AUTH-07 | | | ● | | | | | | | | — |
| HOME-01 | | | | | | ○ | ● | | | | `AccountCard` ○, `TransactionList` ○ |
| HOME-02 | | | | | | | | | | | SOURCE_REQUIRED |
| HOME-03 | | | | | | | | | | | SOURCE_REQUIRED |
| HOME-04 | | | | | | ● | | | | | `ServiceTile` ○ |
| ACC-01 | | | | | | | | | | | SOURCE_REQUIRED |
| ACC-02 | | | | | | | ● | ● | | | `TransactionList` |
| ACC-03 | | | | | | | | | | | SOURCE_REQUIRED |
| ACC-07 | ○ | | | | | ● | | | | | — |
| PAY-01 | | | | | | | | | | | SOURCE_REQUIRED |
| PAY-02 | | | | | | | | | | | SOURCE_REQUIRED |
| PAY-03 | | | | | | | | ○ | ○ | | `QRScanner` |
| PAY-04 | ● | | | | | | | | ● | ○ | `RecipientInput` |
| PAY-06 | ● | | | | | | | | ● | ○ | `RecipientInput` |
| SBP-01 | | | | | | ● | | | | | `PaymentMethodSelector` |
| SBP-03 | ○ | | | | ○ | ○ | | | | | — |
| CARD-01 | | | | | | | | | | | SOURCE_REQUIRED |
| SVC-03 | | | | | | | | | | | SOURCE_REQUIRED |
| NOTIF-01 | | | | | | | | | | | SOURCE_REQUIRED |
| SET-01 | | | | | | ● | | | | | — |
| SET-02 | ○ | ● | ● | | ● | | | | | | — |
| SET-03 | | | | | | ● | | ○ | | | — |
| SET-04 | | | | ● | | | | | | | — |
| PST-01 | ● | ● | | | | | | | | ● | `PaymentConfirmation`, `AuthMethodSelector` |
| PST-02 | ● | | | | ● | | | | | ● | — |
| PST-03 | ● | | | | | | | ● | | | — |

---

## Анализ дублирования

Здесь выявлено, что может оказаться дублем или вариантом. Где в столбце «Статус» указан вопрос, решения нет. Форма показа (экран, шторка, переключатель) на данные не влияет, поэтому вопрос Q-10 API-контракт не блокирует.

| Что | Вид | Предложение | Статус |
|---|---|---|---|
| N29 — второй Card Services | Дубль экрана | Ссылается на CARD-01, отдельной реализации нет | Закрыто: дубль (Q-15) |
| N35 Pay, N36 Scan QR в нижней навигации | Пункты навигации | Ведут на PAY-01 и PAY-03 | Из схемы |
| N34 Go to Home | Пункт навигации | Ведёт на HOME-01 | Из схемы |
| SBP-02 Функции СБП и SBP-01 СБП | Разные узлы | Не объединять: SBP-02 стоит рядом с Settings | Решено [D-04] |
| PAY-01 Pay в меню и в нижней навигации | Один экран, два входа | Реализация одна | Решено [D-04] |
| PAY-04, PAY-06 | **Варианты одного экрана** | Одна композиция, разный `recipientType`. Реализация одна | Архитектурное решение: экраны остаются в инвентаре, реализация общая |
| Коды в AUTH-07, SET-02 и AUTH-05 | Один компонент | `OTPVerification`: OTP входа, OTP чувствительной операции, код подтверждения почты. Операции в контракте разные | Решено [D-10], [D-19] |
| ACC-02 и ACC-03 | Варианты | Один `TransactionList`, варианты `compact` и `full` | Q-10; содержимое ACC-03 — Q-11 |
| ACC-02 Mini Statement | Возможно, блок на главной | Может оказаться частью HOME-01, а не экраном | Q-10 |
| AUTH-04 Bind SIM | Возможно, состояние AUTH-03 | `OperationStatus` после выбора SIM | Q-10 |
| SET-03 Biometric | Возможно, переключатель | `ListRow(toggle)` прямо в SET-01 | Q-10 |
| HOME-04 Menu | Возможно, выдвижная панель | Шторка или боковая панель вместо экрана | Q-10 |
| ACC-04…06, SVC-01, SVC-02, SVC-04 | Пункты меню | Отключённые пункты навигации без экрана | Решено [D-11] |
| PST-03 | Состояние экрана | Состояние AUTH-01, не экран | [A] |
