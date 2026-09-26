# Композиция экранов (Уровень 3–4 — Screen Composition)

Часть UI-спецификации Banking Shell. Это архитектура, а не реализация: дерево показывает, из каких компонентов собран экран.
Принятые решения `[D-xx]` — в [журнале решений](UI_ARCHITECTURE.md#журнал-решений).

**Обозначения:**

| Метка | Значение |
|---|---|
| `[A]` | Предложение, требованием не является |
| `[R]` | Из ROADMAP, на схеме нет |
| `UNKNOWN` | Схема не описывает содержимое |

Каждый экран собран в `AppShell`. У экранов до входа вариант `auth` (без нижней навигации), после входа — `main` [A].

---

## AUTH

```
AUTH-01 Login
AppShell(auth)
├── AppHeader
├── AuthMethodSelector            (биометрия или MPIN)
│   └── MPINInput(mode=enter)     (когда выбран MPIN)
└── StatusMessage(error)          (PST-03 — ошибка входа) [A]
```

```
AUTH-02 Register User
AppShell(auth)
├── AppHeader(back)
├── UNKNOWN — поля регистрации   (онбординг по R38 [D-02]; поля из R01 — Q-22)
└── ActionButton(action="next")
```

```
AUTH-03 Select SIM
AppShell(auth)
├── AppHeader(back)
├── ChoiceList(items = SIM-слоты)
└── ActionButton(action="next")
```

```
AUTH-04 Bind SIM
AppShell(auth)
├── AppHeader
├── OperationStatus(pending → success | failure)   [A]
└── ActionButton(action="next" | "retry")
```

```
AUTH-05 Personal & Card Details
AppShell(auth)
├── AppHeader(back)
├── UNKNOWN — личные данные       (Input × N, см. Q-22)
├── UNKNOWN — данные карты        (Input × N)
└── ActionButton(action="next")
```

```
AUTH-06 Set MPIN & Enable Biometric
AppShell(auth)
├── AppHeader(back)
├── MPINInput(mode=create)
├── MPINInput(mode=confirm)       [R] «пароль + повтор»
├── ListRow(variant=toggle)       (включить биометрию)
└── ActionButton(action="next")
```

```
AUTH-07 OTP Authentication
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
├── ListRow(link) → ACC-03, HOME-04 Menu               [A]  (раскладка по D-04)
└── BottomNavigation
```

```
HOME-02 Search
AppShell(main)
├── AppHeader(back)
├── Input(search)
└── AsyncContent
    ├── SearchResult × N          (UNKNOWN, см. Q-11)
    └── StatusMessage(empty)
```

```
HOME-03 Profile
AppShell(main)
├── AppHeader(back)
└── AsyncContent
    └── UNKNOWN — содержимое профиля (Q-11)
```

```
HOME-04 Menu
AppShell(main)
├── AppHeader
└── ListRow(link) или ServiceTile × 9   [D-04]; вид — [A]
    ACC-01, PAY-01, PAY-02, CARD-01, SVC-01, SVC-02, SVC-03, SVC-04, SBP-01
    (кандидаты SVC-01, SVC-02, SVC-04 — в состоянии «недоступно», Q-12)
    (место под зарезервированные разделы CREDIT, CASHBACK, SAVE — D-05)
```

## ACC

```
ACC-01 Account Information
AppShell(main)
├── AppHeader(back)
└── AsyncContent
    ├── AccountCard(variant=подробный)
    └── ListRow(variant=value, copyable) × N    [A][R]  (реквизиты)
```

```
ACC-02 Mini Statement
AppShell(main)
├── AppHeader(back)
└── AsyncContent
    └── TransactionList(variant=compact)
```

```
ACC-03 Detailed Statement
AppShell(main)
├── AppHeader(back)
├── UNKNOWN — фильтр периода      (Q-11)
└── AsyncContent
    └── TransactionList(variant=full)
```

```
ACC-07 Open Account
AppShell(auth)                    [A] — пользователь ещё не вошёл (ветка D1 = NO)
├── AppHeader(back)
└── ListRow(link) × 4             (Savings, Current, Loan, Подключение СБП)
```

**ACC-04 Savings, ACC-05 Current, ACC-06 Loan Services** — кандидаты, композиция не проектируется до ответа на [Q-12](SCREEN_INVENTORY.md#q-12).

## PAY

```
PAY-01 Pay
AppShell(main)
├── AppHeader
└── PaymentMethodSelector         [A] — у Pay на схеме нет связей (Q-11). Входы: меню и нижняя навигация [D-04]
```

```
PAY-02 Bill Payments
AppShell(main)
├── AppHeader(back)
├── ListRow(link) × N             (поставщики услуг) [A][R]
└── → PaymentForm → PST-01 → PST-02                  [A]
```

```
PAY-03 Scan QR
AppShell(main)
├── AppHeader(back)
├── QRScanner
└── StatusMessage(error)          (камера запрещена) [A]
    → после распознавания: PaymentForm(initialRecipient из QR) [A]
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
└── PaymentMethodSelector(methods = qr, mobile, bankAccount)
```

```
SBP-03 Подключение СБП            (на схеме — Register UPI)
AppShell(auth)                    [A] — находится в ветке Open Account
├── AppHeader(back)
├── ListRow(toggle)               «Банк по умолчанию для входящих переводов СБП» [D-06]; вид — [A]
├── ActionButton(action="confirm")  [A]
└── OperationStatus               [A]
```

**SBP-02 Функции СБП** (на схеме — UPI Functions) — кандидат, группа навигации. С SBP-01 не объединяется [D-04]. Содержимое неизвестно ([Q-11](SCREEN_INVENTORY.md#q-11)).

## Зарезервированные разделы

**CREDIT, CASHBACK, SAVE** — место в меню оставлено, экраны проектируются отдельно [D-05].

## Предложенные состояния платежа

```
PST-01 Подтверждение платежа       [A]
BottomSheet или отдельный экран
└── PaymentConfirmation
    ├── PaymentSummary
    ├── MPINInput(mode=enter)      UNKNOWN (Q-18)
    ├── ActionButton(action="pay")
    └── ActionButton(action="cancel")
```

```
PST-02 Результат платежа           [A]
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
└── AsyncContent
    ├── BankCard × N               [A]
    └── ListRow(link) × N          (действия с картой UNKNOWN; ROADMAP, этап 3 [R])
```

## SVC

```
SVC-03 Locate Branch
AppShell(main)
├── AppHeader(back)
└── AsyncContent
    └── UNKNOWN — список или карта отделений (Q-11, Q-12)
```

**SVC-01 Deposits & OD, SVC-02 Trading, SVC-04 Other Services** — кандидаты, композиция не проектируется ([Q-12](SCREEN_INVENTORY.md#q-12)).

## NOTIF

```
NOTIF-01 Notifications
AppShell(main)
├── AppHeader(back)
└── AsyncContent
    ├── NotificationItem × N
    └── StatusMessage(empty)
```

## SET

```
SET-01 Settings
AppShell(main)
├── AppHeader
├── ListRow(link)    → SET-02 Change MPIN
├── ListRow(link)    → SET-03 Biometric Login
├── ListRow(link)    → SET-04 Change Language
├── ListRow(danger)  → действие Logout (N42)
└── BottomNavigation
```

```
SET-02 Change MPIN
AppShell(main)
├── AppHeader(back)
├── MPINInput(mode=current)        [A]
├── MPINInput(mode=create)
├── MPINInput(mode=confirm)        [A]
├── OTPVerification                UNKNOWN (Q-07)
├── ActionButton(action="confirm")
└── OperationStatus                [A]
```

```
SET-03 Enable / Disable Biometric Login
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
| Другие | Компоненты, которые используются на одном-двух экранах |

`AppShell` и `AppHeader` есть везде, в таблицу не включены.

| Экран | AB | MP | OTP | CL | OS | LR | AC | SM | PF | PS | Другие |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AUTH-01 | | ● | | | | | | ○ | | | `AuthMethodSelector` |
| AUTH-02 | ● | | | | | | | | | | — |
| AUTH-03 | ● | | | ● | | | | | | | — |
| AUTH-04 | ● | | | | ○ | | | | | | — |
| AUTH-05 | ● | | | | | | | | | | — |
| AUTH-06 | ● | ● | | | | ● | | | | | — |
| AUTH-07 | | | ● | | | | | | | | — |
| HOME-01 | | | | | | ○ | ● | | | | `AccountCard` ○, `TransactionList` ○, `BottomNavigation` |
| HOME-02 | | | | | | | ● | ● | | | `SearchResult` |
| HOME-03 | | | | | | | ● | | | | — |
| HOME-04 | | | | | | ● | | | | | `ServiceTile` ○ |
| ACC-01 | | | | | | ○ | ● | | | | `AccountCard` |
| ACC-02 | | | | | | | ● | ● | | | `TransactionList` |
| ACC-03 | | | | | | | ● | ● | | | `TransactionList` |
| ACC-07 | | | | | | ● | | | | | — |
| PAY-01 | | | | | | | | | | | `PaymentMethodSelector` ○ |
| PAY-02 | | | | | | ○ | | | ○ | | — |
| PAY-03 | | | | | | | | ○ | ○ | | `QRScanner` |
| PAY-04 | ● | | | | | | | | ● | ○ | `RecipientInput` |
| PAY-06 | ● | | | | | | | | ● | ○ | `RecipientInput` |
| SBP-01 | | | | | | | | | | | `PaymentMethodSelector` |
| SBP-03 | ● | | | | ○ | ○ | | | | | — |
| CARD-01 | | | | | | ○ | ● | | | | `BankCard` ○ |
| SVC-03 | | | | | | | ● | ● | | | — |
| NOTIF-01 | | | | | | | ● | ● | | | `NotificationItem` |
| SET-01 | | | | | | ● | | | | | `BottomNavigation` |
| SET-02 | ● | ● | ○ | | ○ | | | | | | — |
| SET-03 | | | | | | ● | | ○ | | | — |
| SET-04 | | | | ● | | | | | | | — |
| PST-01 | ● | ○ | | | | | | | | ● | `PaymentConfirmation` |
| PST-02 | ● | | | | ● | | | | | ● | — |
| PST-03 | ● | | | | | | | ● | | | — |

---

## Анализ дублирования

Здесь только **выявлено**, что может оказаться дублем или вариантом. Решения не приняты, пока не будет ответов на вопросы.

| Что | Вид | Предложение | Статус |
|---|---|---|---|
| N29 — второй Card Services | Дубль экрана | Ссылается на CARD-01, отдельной реализации нет | Принято как дубль до ответа на Q-15 |
| N35 Pay, N36 Scan QR в нижней навигации | Пункты навигации | Ведут на PAY-01 и PAY-03 | Из схемы |
| N34 Go to Home | Пункт навигации | Ведёт на HOME-01 | Из схемы |
| SBP-02 Функции СБП и SBP-01 СБП | Разные узлы | Не объединять: SBP-02 стоит рядом с Settings | Решено [D-04] |
| PAY-01 Pay в меню и в нижней навигации | Один экран, два входа | Реализация одна | Решено [D-04] |
| PAY-04, PAY-06 | **Варианты одного экрана** | Одна композиция, разный `recipientType`. Реализация одна | Архитектурное решение: экраны остаются в инвентаре, реализация общая |
| ACC-02 и ACC-03 | Варианты | Один `TransactionList`, варианты `compact` и `full` | Q-10 |
| ACC-02 Mini Statement | Возможно, блок на главной | Может оказаться частью HOME-01, а не экраном | Q-10 |
| AUTH-04 Bind SIM | Возможно, состояние AUTH-03 | `OperationStatus` после выбора SIM | Q-10 |
| SET-03 Biometric | Возможно, переключатель | `ListRow(toggle)` прямо в SET-01 | Q-10 |
| HOME-04 Menu | Возможно, выдвижная панель | Шторка или боковая панель вместо экрана | Q-10 |
| ACC-04, ACC-05, ACC-06 | Возможно, пункты меню | Это могут быть варианты выбора внутри ACC-07, а не экраны | Q-12 |
| SVC-01, SVC-02, SVC-04 | Возможно, пункты меню | Для Banking Shell без банковского ядра это могут быть заглушки `StatusMessage(unavailable)` | Q-12 |
| PST-03 | Состояние экрана | Состояние AUTH-01, не экран | [A] |
