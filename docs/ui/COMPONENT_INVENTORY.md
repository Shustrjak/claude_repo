# Инвентарь компонентов (Уровень 3 — Components)

Часть UI-спецификации Banking Shell. Поведение семантических компонентов описано в [SEMANTIC_COMPONENTS.md](SEMANTIC_COMPONENTS.md), из чего собран каждый экран — в [SCREEN_COMPOSITION.md](SCREEN_COMPOSITION.md).

Компоненты делятся на три слоя. Зависимость идёт только сверху вниз.

```
Слой C — композиции экранов   (AUTH-01, PAY-04, …)
        ↓ используют
Слой B — семантические и глобальные компоненты   (ActionButton, PaymentForm, AppShell, …)
        ↓ используют
Слой A — примитивы   (обёртки над @alfalab/core-components, R30)
```

**UI-основа — [R30](../../refs/README.md) `@alfalab/core-components`.** Названия пакетов в таблицах сверены со списком пакетов версии 50.34.0 на npm.

---

## Слой A — примитивы

Примитивы ничего не знают о банке. Бизнес-логики в них нет: только отображение и собственное состояние UI (фокус, маска ввода).

| Примитив | Пакет Alfa (R30) | Где нужен |
|---|---|---|
| `Button` | `button` | Основа для `ActionButton` |
| `IconButton` | `icon-button` | Кнопки в шапке: назад, поиск, уведомления |
| `Input` | `input` | Текстовые поля: комментарий, поиск, номер счёта, БИК |
| `PhoneInput` | `intl-phone-input` | PAY-04. Нужен ли в регистрации, решится вместе с Q-22 |
| `AmountInput` | `amount-input` | Сумма платежа |
| `Money` | `amount` | Отображение суммы и баланса с валютой |
| `CodeInput` | `code-input` | Ввод OTP-кода (в задаче назывался OTPInput) |
| `PassCode` | `pass-code` | Ввод MPIN с цифровой клавиатурой |
| `Select` | `select`, `input-autocomplete` | Выбор из длинного списка с поиском: банк получателя в PAY-04 [D-06] |
| `Radio` | `radio`, `radio-group` | Основа для `ChoiceList` |
| `Switch` | `switch` | Переключатели (в задаче назывался Toggle) |
| `Typography` | `typography` | Текст и заголовки (в задаче — Text и Heading) |
| `Icon` | Отдельный пакет иконок Alfa | Иконки. Какой именно пакет — проверить при старте проекта |
| `Badge` | `badge` | Счётчик непрочитанных |
| `Divider` | `divider` | Разделители |
| `Spinner` | `spinner` | Индикатор загрузки |
| `Skeleton` | `skeleton` | Заглушки на время загрузки. **Добавлен**: нужен для `AsyncContent` |
| `Stack` | `stack`, `gap`, `grid` | Раскладка. В задаче было три примитива: Stack, Row, Container |
| `Cell` | `pure-cell` | Строка списка: иконка, текст, значение. **Добавлен**: основа для `ListRow`, `TransactionRow`, `NotificationItem` |
| `BottomSheet` | `bottom-sheet` | Шторка. Нужна, если PST-01 или HOME-04 окажутся шторками [A] |

Три пакета Alfa семантические компоненты используют **напрямую**, без отдельного примитива: `bank-card` или `card-image` (в `BankCard`), `system-message` (в `StatusMessage`), `status-badge` или `status` (в `StatusBadge`). У каждого пакета ровно один потребитель, поэтому отдельная обёртка не нужна. Так же глобальные компоненты используют `navigation-bar` и `tab-bar`.

### Изменения относительно списка из задачи

| Было в задаче | Решение | Почему |
|---|---|---|
| `Text`, `Heading` | Объединены в `Typography` | В Alfa это один пакет |
| `Container`, `Stack`, `Row` | Объединены в `Stack` | Не заводить примитив под каждый вариант раскладки |
| `OTPInput` | Переименован в `CodeInput` | Так называется пакет Alfa; семантика OTP живёт в `OTPVerification` |
| `Toggle` | Переименован в `Switch` | Так называется пакет Alfa |
| `Header`, `BackButton`, `BottomNavigation` | Перенесены в глобальные компоненты | Это каркас приложения, а не примитивы |
| `Checkbox`, `Avatar` | **Отложены** | По схеме-источнику не нужны. Добавим, когда появится экран, где они нужны (например, содержимое HOME-03 Profile) |
| — | Добавлены `Money`, `PassCode`, `Cell`, `Skeleton`, `PhoneInput`, `Radio`, `BottomSheet` | Нужны экранам из инвентаря; все есть в Alfa |

---

## Слой B — глобальные компоненты

Каркас, общий для всех экранов.

| Компонент | Основа в Alfa | Назначение |
|---|---|---|
| `AppShell` | — (своя раскладка на `Stack`) | Каркас экрана: шапка, содержимое и нижняя навигация. Вариант `auth` — без нижней навигации, вариант `main` — с ней [A] |
| `AppHeader` | `navigation-bar` | Шапка: заголовок, кнопка «назад», действия справа |
| `BottomNavigation` | `tab-bar` | Нижняя навигация (узел N19). Пункты: Home, Pay, Scan QR, Settings, Функции СБП (на схеме UPI Functions) [S] |

## Слой B — семантические компоненты

Подробно — в [SEMANTIC_COMPONENTS.md](SEMANTIC_COMPONENTS.md).

| # | Компонент | Коротко |
|---|---|---|
| 1 | `ActionButton` | Кнопка с намерением: `next`, `confirm`, `cancel`, `close`, `pay`, `retry` |
| 2 | `AuthMethodSelector` | Вход по биометрии или MPIN |
| 3 | `MPINInput` | Ввод MPIN: вход, создание, повтор, текущий |
| 4 | `OTPVerification` | Ввод OTP, таймер, повторная отправка, ошибка |
| 5 | `ChoiceList` | Выбор одного варианта: SIM, язык |
| 6 | `OperationStatus` | Статус операции: идёт, успех, ошибка |
| 7 | `AccountCard` | Счёт: название, номер, баланс |
| 8 | `TransactionRow` | Одна операция |
| 9 | `TransactionList` | Список операций: `compact` или `full` |
| 10 | `BankCard` | Изображение карты и её статус |
| 11 | `PaymentMethodSelector` | Способы перевода: QR, телефон, реквизиты |
| 12 | `RecipientInput` | Ввод получателя: телефон и банк получателя или счёт и БИК |
| 13 | `RecipientSelector` | Выбор получателя из контактов и недавних. **Отложен**: есть только в ROADMAP [R] |
| 14 | `PaymentForm` | Получатель, сумма, комментарий и проверка полей |
| 15 | `PaymentSummary` | Сводка: сумма, получатель, комиссия |
| 16 | `PaymentConfirmation` | Подтверждение платежа (PST-01) |
| 17 | `QRScanner` | Камера и распознавание QR |
| 18 | `NotificationItem` | Одно уведомление |
| 19 | `ServiceTile` | Плитка раздела или услуги |
| 20 | `ListRow` | Строка-ссылка, переключатель, значение или опасное действие |
| 21 | `SearchResult` | Результат поиска. Что ищем — UNKNOWN |
| 22 | `StatusMessage` | Сообщение: пусто, ошибка, раздел недоступен |
| 23 | `AsyncContent` | Переключает загрузку, ошибку, пустоту и данные |
| 24 | `StatusBadge` | Статус операции, карты или счёта |

### Изменения относительно списка из задачи

| Было в задаче | Решение | Почему |
|---|---|---|
| `AuthenticationForm` | Убран | Это композиция экрана AUTH-01, а не переиспользуемый компонент |
| `SIMSelector` | Заменён на `ChoiceList` | Выбор SIM и выбор языка — один и тот же паттерн «выбрать один вариант» |
| `AccountTypeCard` | Убран | Типы счёта в ACC-07 — это пункты навигации (`ListRow`). Вернём, если ACC-04…06 окажутся карточками с описанием |
| `AccountBalance` | Убран | Сумма показывается примитивом `Money` внутри `AccountCard` |
| `StatementList` | Заменён на `TransactionList(full)` | Мини-выписка и подробная выписка отличаются вариантом, а не компонентом |
| `CardStatus` | Заменён на `StatusBadge` | Статус карты — такой же бейдж, как у операции |
| `CardActions` | Убран до уточнения CARD-01 | Содержимое экрана неизвестно. Скорее всего, хватит `ListRow` или `ServiceTile` |
| `PaymentResult` | Заменён на `OperationStatus` + `PaymentSummary` | Тот же статус операции нужен в AUTH-04 и SET-02 |
| `EmptyState`, `ErrorState` | Объединены в `StatusMessage` | Добавлен вид `unavailable` для NullAdapter, см. [UI_ARCHITECTURE.md](UI_ARCHITECTURE.md) |
| `LoadingState` | Заменён на `AsyncContent` | Один компонент переключает загрузку, ошибку, пустоту и данные |
| `SettingsRow` | Заменён на `ListRow` | Строка нужна не только в настройках: меню, счёт, карты, открытие счёта |

### Конфликт имён

В Alfa есть свой пакет `action-button` — круглая кнопка быстрого действия с подписью. Семантический `ActionButton` из этой спецификации — это **другой** компонент, обёртка над `button`.

**Правило (Q-19 закрыт по правилу слоёв):** имена слоя B — наши. Если пакет Alfa называется так же, он импортируется под псевдонимом с префиксом `Alfa`, например `AlfaActionButton`, `AlfaStatusBadge`.

---

## Матрица переиспользования

Считаются экраны из инвентаря и предложенные состояния PST. `[A]` — использование предложено, но не подтверждено источником.

| Компонент | Экраны | Кол-во | Флоу |
|---|---|---|---|
| `AppShell`, `AppHeader` | Все подтверждённые экраны | 29 + PST | Все |
| `BottomNavigation` | В составе `AppShell(main)` [A]. На каких экранах показывается — UNKNOWN | — | G, H |
| `ActionButton` | AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, PAY-04, PAY-06, SBP-03, SET-02, PST-01, PST-02, PST-03 | 12 | A, B, C, D, E |
| `ListRow` | AUTH-06, HOME-04, ACC-07, SET-01, SET-03; HOME-01, ACC-01, PAY-02, CARD-01, SBP-03 [A] | 10 | B, E, F, G |
| `AsyncContent` | HOME-01, HOME-02, HOME-03, ACC-01, ACC-02, ACC-03, CARD-01, SVC-03, NOTIF-01 | 9 | G |
| `StatusMessage` | HOME-02, ACC-02, ACC-03, SVC-03, NOTIF-01, PST-03; AUTH-01, PAY-03, SET-03 [A]; и все экраны с `AsyncContent` | 9+ | Все |
| `PaymentForm` | PAY-04, PAY-06; PAY-02 и PAY-03 [A] | 2–4 | C, D |
| `RecipientInput` | PAY-04, PAY-06 | 2 | C, D |
| `PaymentSummary` | PST-01, PST-02; PAY-04, PAY-06 [A] | 4 | C, D |
| `PaymentConfirmation` | PST-01 — общий шаг для PAY-04, PAY-06; PAY-02, PAY-03 [A] | 1 состояние, 4 флоу | C, D |
| `OperationStatus` | PST-02; AUTH-04, SBP-03, SET-02 [A] | 4 | B, C, D, E |
| `MPINInput` | AUTH-01, AUTH-06, SET-02; PST-01 [A] | 3–4 | A, B, E |
| `ChoiceList` | AUTH-03, SET-04 | 2 | B, E |
| `PaymentMethodSelector` | SBP-01; PAY-01 [A] | 1–2 | C, D |
| `AccountCard` | ACC-01; HOME-01 [A] | 1–2 | G |
| `TransactionList` | ACC-02, ACC-03; HOME-01 [A] | 2–3 | G |
| `TransactionRow` | Внутри `TransactionList` | 2 | G |
| `StatusBadge` | Внутри `TransactionRow`, `BankCard`, `AccountCard`, `OperationStatus` | — | — |
| `BankCard` | CARD-01 [A] | 1 | G |
| `ServiceTile` | HOME-04 [A] | 1 | G |
| `OTPVerification` | AUTH-07; SET-02 — UNKNOWN (Q-07) | 1–2 | B, E |
| `AuthMethodSelector` | AUTH-01 | 1 | A |
| `QRScanner` | PAY-03 | 1 | C, D, H |
| `NotificationItem` | NOTIF-01 | 1 | G |
| `SearchResult` | HOME-02 | 1 | G |
| `RecipientSelector` | PAY-04, PAY-06 [R] — отложен (Q-13) | 0 | — |

### Компоненты, которые используются на одном экране

Их **шесть**, и у каждого есть причина существовать отдельно:

| Компонент | Почему не часть экрана |
|---|---|
| `AuthMethodSelector` | Логика выбора способа входа не должна жить в экране. Может понадобиться и в PST-01 [A] |
| `QRScanner` | Работа с камерой: доступ, ошибки, распознавание. Открывается и из СБП, и из нижней навигации |
| `NotificationItem` | Сложная строка со статусом «прочитано». Возможен блок последних уведомлений на главной [A] |
| `SearchResult` | Результат поиска разного типа. Появится, когда станет понятно, по чему ищем |
| `BankCard` | Карта — отдельная доменная сущность. Возможно, будет и на главной [A] |
| `ServiceTile` | По [D-04] направления собраны в меню. Плитки — один из вариантов его вида, второй — `ListRow` [A] |

Специфичных для экрана компонентов вроде `LoginButton` или `PaymentScreenHeader` в спецификации **нет**.
