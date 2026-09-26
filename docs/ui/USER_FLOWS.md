# Пользовательские флоу (Уровень 2 — User Flows)

Часть UI-спецификации Banking Shell. ID экранов — из [SCREEN_INVENTORY.md](SCREEN_INVENTORY.md). Источник — [`refs/R38-user-flow.jpg`](../../refs/R38-user-flow.jpg).

**Как читать схемы:**

| Обозначение | Значение |
|---|---|
| Сплошная стрелка | Переход есть на схеме-источнике `[S]` |
| Пунктирная стрелка | Переход предложен `[A]` или взят из ROADMAP `[R]` |
| Ромб | Решение |
| Пунктирная рамка | Предложенное состояние флоу (`PST-xx`). В инвентарь экранов не входит |
| Серая рамка | Кандидат (`CANDIDATE`) |

---

## Предложенные состояния флоу

На схеме этих состояний нет, но без них флоу не замыкается. Это **предложения**: пока они не подтверждены, экранами не считаются.

| ID | Состояние | Зачем нужно | Может оказаться |
|---|---|---|---|
| PST-01 | Подтверждение платежа | В PAY-04, PAY-05, PAY-06 нет шага проверки перед отправкой | Шторка поверх формы платежа или отдельный экран |
| PST-02 | Результат платежа | На схеме не показано, чем заканчивается платёж | Отдельный экран |
| PST-03 | Ошибка входа | У AUTH-01 на схеме нет ветки ошибки | Состояние экрана AUTH-01, не отдельный экран |

---

## A. Вход существующего пользователя

```mermaid
flowchart LR
  START([N01 Start]) --> D1{D1: есть счёт?}
  D1 -- YES --> D2{D2: зарегистрирован<br/>в мобильном банке?}
  D2 -- YES --> AUTH01[AUTH-01 Login<br/>биометрия или MPIN]
  AUTH01 --> T11((N11 переход<br/>на главную))
  T11 --> HOME01[HOME-01 Home]
  AUTH01 -.-> PST03[PST-03 Ошибка входа]
  PST03 -.-> AUTH01
  classDef proposed stroke-dasharray: 5 5
  class PST03 proposed
```

- **Из схемы:** Start → D1 = YES → D2 = YES → AUTH-01 → переход N11 → HOME-01.
- **Не описано:** как приложение принимает решения D1 и D2. Экрана-вопроса («Вы уже клиент?») на схеме нет, см. [Q-02](SCREEN_INVENTORY.md#q-02).
- **Не описано:** что происходит при неверном MPIN. Предложено состояние PST-03.

## B. Регистрация нового пользователя в мобильном банке

```mermaid
flowchart TD
  D2{D2: зарегистрирован<br/>в мобильном банке?} -- NO --> AUTH02[AUTH-02 Register User]
  AUTH02 --> AUTH03[AUTH-03 Select SIM]
  AUTH03 --> AUTH04[AUTH-04 Bind SIM]
  AUTH04 --> AUTH05[AUTH-05 Personal & Card Details]
  AUTH05 --> AUTH06[AUTH-06 Set MPIN & Biometric]
  AUTH06 --> AUTH07[AUTH-07 OTP]
  AUTH07 -- Success --> T11((N11 переход<br/>на главную))
  T11 --> HOME01[HOME-01 Home]
  AUTH07 -- Failure --> AUTH03
```

- **Из схемы:** весь путь целиком, включая Success → главная и Failure → AUTH-03 Select SIM.
- **Вопрос:** порядок шагов. OTP стоит после установки MPIN, а при ошибке пользователь возвращается к выбору SIM, см. [Q-07](SCREEN_INVENTORY.md#q-07).
- **Вопрос:** расхождение с ROADMAP. В этапе 1 роадмапа регистрация устроена по Revolut (R01): страна, телефон, адрес, почта, дата рождения, пароль. Какой вариант главный — [Q-04](SCREEN_INVENTORY.md#q-04).
- **Вопрос:** что происходит при ошибке привязки SIM (AUTH-04). На схеме этого нет.

## C. Платёж

На схеме у PAY-01 Pay **нет исходящих связей**. Поэтому флоу ниже собран так: способы оплаты взяты из ветки UPI (флоу D), а подтверждение и результат — предложенные состояния.

```mermaid
flowchart LR
  HOME01[HOME-01 Home] --> PAY01[PAY-01 Pay]
  NAV[[BottomNavigation: Pay]] --> PAY01
  PAY01 -.-> METHOD{способ оплаты}
  METHOD -.-> PAY03[PAY-03 Scan QR]
  METHOD -.-> PAY04[PAY-04 Pay to Mobile]
  METHOD -.-> PAY05[PAY-05 Pay to UPI ID]
  METHOD -.-> PAY06[PAY-06 Pay to Bank a/c]
  PAY03 -.-> FORM[форма: получатель подставлен из QR]
  PAY04 -.-> CONF[PST-01 Подтверждение]
  PAY05 -.-> CONF
  PAY06 -.-> CONF
  FORM -.-> CONF
  CONF -.-> RES[PST-02 Результат]
  RES -.-> HOME01
  classDef proposed stroke-dasharray: 5 5
  class CONF,RES,FORM,METHOD proposed
```

| Шаг | Где происходит | Источник |
|---|---|---|
| Home → Pay | HOME-01 → PAY-01 | [S] |
| Выбор способа оплаты | PAY-01 | [A]: у Pay на схеме нет связей. Список способов взят из ветки UPI |
| Получатель и сумма | PAY-04, PAY-05, PAY-06 — одна форма `PaymentForm` | Экраны [S], состав формы [A] |
| Подтверждение | PST-01 | [A] |
| Результат | PST-02 | [A] |
| Возврат на главную | PST-02 → HOME-01 | [A] |

**Оплата услуг (PAY-02)** на схеме тоже заканчивается тупиком. Предложено вести её через ту же форму и PST-01 → PST-02 [A]. Содержимое раздела — [Q-11](SCREEN_INVENTORY.md#q-11).

## D. UPI

```mermaid
flowchart LR
  HOME01[HOME-01 Home] --> PAY07[PAY-07 UPI]
  PAY07 --> PAY03[PAY-03 Scan QR]
  PAY07 --> PAY04[PAY-04 Pay to Mobile]
  PAY07 --> PAY05[PAY-05 Pay to UPI ID]
  PAY07 --> PAY06[PAY-06 Pay to Bank a/c]
  NAV[[BottomNavigation]] --> PAY09[PAY-09 UPI Functions]
  NAV --> PAY03
  PAY09 -. "дубль PAY-07?" .- PAY07
  ACC07[ACC-07 Open Account] --> PAY08[PAY-08 Register UPI]
  classDef candidate fill:#eee,stroke:#999
  class PAY09 candidate
```

- **Из схемы:**
  - UPI → четыре способа оплаты;
  - Scan QR доступен и из UPI, и из нижней навигации;
  - Register UPI находится в ветке открытия счёта.
- **Вопросы:**
  - связь PAY-01, PAY-07 и PAY-09 — [Q-06](SCREEN_INVENTORY.md#q-06);
  - заменять ли UPI на СБП или SPEI — [Q-14](SCREEN_INVENTORY.md#q-14).

## E. Настройки

```mermaid
flowchart LR
  NAV[[BottomNavigation]] --> SET01[SET-01 Settings]
  SET01 --> SET02[SET-02 Change MPIN]
  SET01 --> SET03[SET-03 Biometric Login]
  SET01 --> SET04[SET-04 Change Language]
  SET01 --> LOGOUT([N42 Logout — действие])
  LOGOUT -.-> AUTH01[AUTH-01 Login]
```

- **Из схемы:** в настройки попадают из нижней навигации. Там смена MPIN, биометрия, язык и выход.
- **Logout** — действие, а не экран. Куда оно ведёт, на схеме не показано. Предложено: на AUTH-01 [A], см. [Q-16](SCREEN_INVENTORY.md#q-16).

## F. Открытие счёта

```mermaid
flowchart TD
  D1{D1: есть счёт?} -- NO --> ACC07[ACC-07 Open Account]
  ACC07 --> ACC04[ACC-04 Savings Account]
  ACC07 --> ACC05[ACC-05 Current Account]
  ACC07 --> ACC06[ACC-06 Loan Services]
  ACC07 --> PAY08[PAY-08 Register UPI]
  classDef candidate fill:#eee,stroke:#999
  class ACC04,ACC05,ACC06 candidate
```

- **Из схемы:** все пять узлов и связи между ними.
- **Тупик:** из ветки нет пути ни в регистрацию, ни на главную — [Q-02](SCREEN_INVENTORY.md#q-02).

## G. Главная как хаб

```mermaid
flowchart LR
  HOME01[HOME-01 Home] --> HOME02[HOME-02 Search]
  HOME01 --> HOME03[HOME-03 Profile]
  HOME01 --> HOME04[HOME-04 Menu]
  HOME01 --> NOTIF01[NOTIF-01 Notifications]
  HOME01 --> ACC01[ACC-01 Account Info]
  HOME01 --> ACC02[ACC-02 Mini Statement]
  HOME01 --> ACC03[ACC-03 Detailed Statement]
  HOME01 --> PAY01[PAY-01 Pay]
  HOME01 --> PAY02[PAY-02 Bill Payments]
  HOME01 --> PAY07[PAY-07 UPI]
  HOME01 --> CARD01[CARD-01 Card Services]
  HOME01 --> SVC01[SVC-01 Deposits & OD]
  HOME01 --> SVC02[SVC-02 Trading]
  HOME01 --> SVC03[SVC-03 Locate Branch]
  HOME01 --> SVC04[SVC-04 Other Services]
  classDef candidate fill:#eee,stroke:#999
  class SVC01,SVC02,SVC04 candidate
```

- **Из схемы:** с главной ведут 15 уникальных направлений. Card Services нарисован дважды, это один экран.
- **Не описано:** какие направления показываются на самой главной, а какие уходят в меню — [Q-09](SCREEN_INVENTORY.md#q-09).

## H. Нижняя навигация

`BottomNavigation` — глобальный компонент (узел N19), а не экран.

| Пункт | Куда ведёт | Источник |
|---|---|---|
| Go to Home | HOME-01 | [S] |
| Pay | PAY-01 | [S] |
| Scan QR | PAY-03 | [S] |
| Settings | SET-01 | [S] |
| UPI Functions | PAY-09 (кандидат) | [S] |

- **Не описано:** на каких экранах показывается нижняя навигация. Предложено: на экранах после входа [A].
- **Не описано:** связан ли HOME-04 Menu с SET-01. На схеме настройки открываются только из нижней навигации.

---

## Сводка: какие переходы откуда

| Флоу | Переходы из схемы [S] | Предложенные [A] | Тупики и неясности |
|---|---|---|---|
| A. Вход | Start → D1 → D2 → AUTH-01 → HOME-01 | PST-03 ошибка входа | Как принимаются решения D1 и D2 |
| B. Регистрация | AUTH-02 → … → AUTH-07 → HOME-01; Failure → AUTH-03 | — | Порядок OTP и MPIN; ошибка на AUTH-04 |
| C. Платёж | HOME-01 → PAY-01 | Способ оплаты, PST-01, PST-02 | У PAY-01 нет исходящих связей |
| D. UPI | PAY-07 → PAY-03…06 | PAY-03…06 → PST-01 → PST-02 | PAY-09 — дубль или нет |
| E. Настройки | SET-01 → SET-02…04, Logout | Logout → AUTH-01 | Подтверждение выхода |
| F. Открытие счёта | D1 → ACC-07 → ACC-04…06, PAY-08 | — | Нет выхода из ветки |
