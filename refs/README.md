# Референсы: банковское приложение (PET-проект)

Подборка референсов по функционалу, похожему на **Альфа-Банк**, **Т-Банк** и **Банк Plata** (Мексика).
Сами эти три банка — базовая линия, поэтому в список не входят. Исключение — их открытые дизайн-системы (раздел C).

**Как пользоваться.** У каждого референса есть номер `R01`…`R62`. Отметь решение в колонке «Решение»:
`✅` — берём, `❌` — не берём, `🟡` — берём частично. Что именно берём, пиши в «Комментарий»
или в разделе [«Решения»](#решения) в конце файла. Можно просто ответить в чате, например: «R03 — онбординг берём, R12 — только экран перевода».

> Превью-картинки в репозиторий не скачаны: из окружения, где собиралась подборка, закрыт доступ к Dribbble, Behance и Figma CDN.
> Поэтому здесь только ссылки. Dribbble, Behance и Figma Community открываются без логина, для Mobbin и Page Flows нужен аккаунт.

---

## Карта функций → референсы

Коротко, где смотреть каждую ключевую функцию Альфы, Т-Банка и Plata:

| Функция | Где смотреть |
|---|---|
| Главный экран: баланс, счета, карты | R01, R02, R06, R13, R15, R16, R19, R20 |
| Сторис и промо на главной (как в Т-Банке и Альфе) | R32, R35, R41, R23 |
| Переводы по телефону (СБП), между своими счетами | R13, R14, R15, R01 |
| Платежи, шаблоны, автоплатежи, QR | R07, R04, R01 |
| Кешбэк и выбор категорий (Альфа, Т-Банк, Plata) | R10, R04, R01, R28, R29 |
| Кредитная карта, лимит, рассрочка покупок (Plata) | R10, R03, R04, R05, R27 |
| Заморозка, перевыпуск и виртуальная карта | R10, R01, R02, R08 |
| Копилки и цели (Альфа-Копилка, «Банки» Монобанка) | R06, R02, R08, R25, R26 |
| Аналитика трат по категориям | R01, R02, R09, R15, R49 |
| Онбординг, KYC, оформление карты | R03, R24, R44, R01, R58 |
| Геймификация и удержание (квесты, ачивки) | R06, R54, R57 |
| Суперапп (маркетплейс, путешествия, госуслуги) | R07, R01, R55 |
| Тёмная тема | R13, R14, R20, R42 |
| Чат поддержки, уведомления | R02, R06 |

---

## A. Реальные приложения, прямые аналоги

| № | Референс | Почему похож | Что смотреть | Решение | Комментарий |
|---|---|---|---|---|---|
| R01 | **Revolut**: [записи флоу на Page Flows](https://pageflows.com/ios/products/revolut/), [онбординг на Mobbin](https://mobbin.com/explore/flows/633b424d-a942-466c-a0ac-32d67d15033c) | Суперапп как Т-Банк: карты, мультивалюта, кешбэк, инвестиции, путешествия | Аналитика трат, чипсы с быстрыми действиями, мультивалютные счета, виртуальные карты | ⬜ | |
| R02 | **Monzo**: [флоу на Page Flows](https://pageflows.com/ios/products/monzo/), [экраны на Page Flows](https://pageflows.com/screens/mobile/product/monzo/), [выписки на Mobbin](https://mobbin.com/flows/278e1a5b-d5c0-46b5-9d1c-54053626e232) | Дневной банкинг, «горшки» (Pots) как копилки | Лента операций с логотипами мерчантов, Summary с кольцевыми диаграммами бюджета, Pots | ⬜ | |
| R03 | **Nubank / Nu México**: [разбор онбординга (Revolut, Nubank, Monzo)](https://craftinnovations.global/banking-onboarding-best-practices-revolut-nubank-monzo/) | Главный конкурент Plata в Мексике, модель «кредитка прежде всего» | Минималистичный онбординг, экран кредитной карты, простые тексты | ⬜ | |
| R04 | **Klar** (Мексика): [обзор](https://neobanque.ch/app/klar/), [сравнение с Bleap](https://www.bleap.finance/en-us/blog/bleap-vs-klar) | Прямой конкурент Plata: дебет, кредитка, рассрочка, кешбэк | Оплата счетов (ЖКХ, связь), уровни Plus и Platino, кешбэк | ⬜ | |
| R05 | **Stori** (Мексика): [Klar vs Stori](https://www.cbinsights.com/compare/klar-vs-stori-1) | Стартовая кредитка для клиентов без кредитной истории, как у Plata | Выдача кредитки с маленьким лимитом, рост лимита | ⬜ | |
| R06 | **Monobank** (Украина): [Red Dot Award](https://www.red-dot.org/project/monobank-49241), [файл в Figma Community](https://www.figma.com/community/file/1117140325872342568/monobank) | Самый близкий по духу к Т-Банку: только мобильный банк, кредитка, кешбэк, «Банки»-копилки | Маскот-кот, живые тексты, 123 квеста, «Банка» с публичной ссылкой для сбора денег | ⬜ | |
| R07 | **Kaspi.kz** (Казахстан): [HBR: как проектировали суперапп](https://hbr.org/2025/07/the-ceo-of-kaspi-kz-on-designing-an-essential-superapp), [кейс Qorus](https://www.qorusglobal.com/content/19076-kaspikz-the-super-app-transforming-central-asias-digital-landscape) | Суперапп: платежи, маркетплейс, госуслуги, QR | Структура супераппа, платежи и QR, связка банка с маркетплейсом | ⬜ | |
| R08 | **N26**: [разбор паттернов Monobank, Revolut, Monzo и N26](https://www.flatstudio.co/blog/neobank-ux-patterns-daily-banking) | Spaces (подсчета со своим IBAN) | Подсчета и копилки, минималистичная главная | ⬜ | |
| R09 | **Ozon Банк**: [запуск финансовой аналитики (Хабр)](https://habr.com/ru/news/976624/), [мобильное приложение на WebView (Хабр)](https://habr.com/ru/companies/ozontech/articles/828186/) | Российский цифровой банк внутри экосистемы | Экран аналитики финансов, единый UI на всех платформах | ⬜ | |
| R10 | **Банк Plata, официальная страница приложения**: [platacard.mx/en/app](https://platacard.mx/en/app), [Google Play](https://play.google.com/store/apps/details?id=dif.tech.plata&hl=en_US) | Базовая линия по Plata, для сверки функций | Рассрочка 3–12 мес. на покупки от 100 MXN, кешбэк до 15% по выбранным категориям, заморозка карты | ⬜ | |

## B. Концепты на Dribbble

| № | Референс | Что показано | Решение | Комментарий |
|---|---|---|---|---|
| R11 | [RAY® Mobile Banking от OOZE](https://dribbble.com/shots/15858301-RAY-Mobile-Banking) | Управление деньгами, разделение трат, накопления на покупки. 465k просмотров | ⬜ | |
| R12 | [Citadele app от Glow](https://dribbble.com/shots/19256131-Citadele-app-mobile-banking-neobank) | Реальный банк (Латвия), простой и чистый UI | ⬜ | |
| R13 | [Banking App Design Concept от Ronas IT](https://dribbble.com/shots/22712147-Banking-App-Design-Concept) | Тёмная тема, карты на главной, последние операции, экран перевода | ⬜ | |
| R14 | [Banking App Concept от Dmitry Lauretsky (Ronas IT)](https://dribbble.com/shots/19983133-Banking-App-Concept) | Яркие карты на тёмном монохромном фоне, флоу перевода | ⬜ | |
| R15 | [Bank App Concept: UI/UX от Ronas IT](https://dribbble.com/shots/22565033-Bank-App-Concept-UI-UX) | Приветственный экран, экран карты (выбор дизайна, переводы), аналитика расходов | ⬜ | |
| R16 | [Banking App Concept от Ronas IT](https://dribbble.com/shots/22082848-Banking-App-Concept) | Ещё один вариант главной и карт | ⬜ | |
| R17 | [Banking App Main Screen Redesign от Wahiq Iqbal](https://dribbble.com/shots/22894552-Banking-App-Main-Screen-Redesign) | Редизайн главного экрана | ⬜ | |
| R18 | [Mobile Banking App от Shakuro](https://dribbble.com/shots/23716865-Mobile-Banking-App) | Тёмная тема, матовое стекло, светящиеся кнопки | ⬜ | |
| R19 | [Banking App Concept от Conceptzilla (Shakuro)](https://dribbble.com/shots/17143826-Banking-App-Concept) | Концепт главной и операций | ⬜ | |
| R20 | [Neobanking Mobile App от Agilie](https://dribbble.com/shots/24809720-Neobanking-Mobile-App) | Необанк целиком, 208k просмотров | ⬜ | |
| R21 | [Neobanking Mobile App Interactions от Agilie](https://dribbble.com/shots/24848696-Neobanking-Mobile-App-Interactions) | Анимации и микровзаимодействия | ⬜ | |
| R22 | [Neo Bank Dashboards, коллекция Blott](https://dribbble.com/blott/collections/5699192-Neo-Bank-Dashboards) | Подборка дашбордов необанков | ⬜ | |
| R23 | [Тег neobank-app, лента](https://dribbble.com/tags/neobank-app) | Свежие шоты по необанкам (лента меняется) | ⬜ | |
| R24 | [Onboarding for banking от Anastasia Golovko](https://dribbble.com/shots/14482215-Onboarding-for-banking-Mobile-App) | Онбординг банковского приложения | ⬜ | |
| R25 | [Fintech App for Smart Savings Goals от Ronas IT](https://dribbble.com/shots/26587675-Fintech-Mobile-App-for-Smart-Savings-Goals) | Цели и копилки | ⬜ | |
| R26 | [Piggy Bank, детский цифровой банк от Phenomenon](https://dribbble.com/shots/24402668-Piggy-Bank-Mobile-App-UI-UX-Design-for-a-Kids-Digital-Bank) | Копилка с визуализацией роста, детская карта (как в Т-Банке и Альфе) | ⬜ | |
| R27 | [Credit Card App от Sreevenkatesh Jayaraman](https://dribbble.com/shots/6509829-Credit-Card-App) | Управление кредитной картой | ⬜ | |
| R28 | [Тег cashback, лента](https://dribbble.com/tags/cashback) | Экраны кешбэка и выбора категорий | ⬜ | |
| R29 | [Тег credit-card-app, лента](https://dribbble.com/tags/credit-card-app) | Кредитки, лимиты, рассрочка | ⬜ | |

## C. Дизайн-системы банков и Figma-файлы с ними

| № | Референс | Что даёт | Решение | Комментарий |
|---|---|---|---|---|
| R30 | [Альфа-Банк core-components на GitHub](https://github.com/alfa-laboratory/core-components) | Открытая UI-библиотека Альфы (React, Storybook), настоящие компоненты банка | ⬜ | |
| R31 | [Альфа-Банк, дизайн-система Feather](https://adele.uxpin.com/alfa-bank-feather) | Описание дизайн-системы Альфы | ⬜ | |
| R32 | [Alfa Bank, файл в Figma Community](https://www.figma.com/community/file/779265086574105939/alfa-bank) | Экраны приложения Альфы в Figma | ⬜ | |
| R33 | [Taiga UI (Т-Банк)](https://taiga-ui.dev/), [Taiga 3.0 в Figma](https://www.figma.com/community/file/1220308188005380608/taiga-3-0) | Открытый UI-кит Т-Банка (Angular) с тёмной темой из коробки | ⬜ | |
| R34 | [Tinkoff Form Design System в Figma](https://www.figma.com/community/file/1154254456236039086/tinkoff-form-design-system) | Формы в стиле сайта Т-Банка | ⬜ | |
| R35 | [«Тестовое задание / Тинькофф» в Figma](https://www.figma.com/community/file/1264202898301557844) | Пример экранов в стиле Т-Банка | ⬜ | |

## D. Кейсы на Behance

| № | Референс | Что показано | Решение | Комментарий |
|---|---|---|---|---|
| R36 | [rebank, цифровой банк](https://www.behance.net/gallery/176160923/rebank-digital-bank-app-uxui) | Молодёжный банк из Аргентины. Около 5k апрув, полный кейс с GIF | ⬜ | |
| R37 | [Velora, Finance & Bank App](https://www.behance.net/gallery/235567799/Velora-Finance-Bank-App-UIUX-Case-Study) | Бюджеты, платежи, инвестиции. 2025 год | ⬜ | |
| R38 | [Fin i, UX-кейс и редизайн](https://www.behance.net/gallery/196435681/UX-Case-study-UI-Redesign-of-Fin-i-Banking-app) | Процесс редизайна от исследования до UI | ⬜ | |
| R39 | [Monobank App Product Rethinking от Artem Pravda](https://www.behance.net/gallery/113442449/Monobank-App-Product-Rethinking-(UXUIUCD)) | Переосмысление Монобанка | ⬜ | |
| R40 | [Redesign Monobank от Tanya Nazarenko](https://www.behance.net/gallery/221022825/Redesign-Monobank-UXUI-Case-Study) | Ещё один редизайн Монобанка | ⬜ | |
| R41 | [Поиск «Альфа банк» на Behance](https://www.behance.net/search/projects/%D0%90%D0%BB%D1%8C%D1%84%D0%B0%20%D0%B1%D0%B0%D0%BD%D0%BA) и [поиск «Тинькофф»](https://www.behance.net/search/projects/?search=%D0%A2%D0%B8%D0%BD%D1%8C%D0%BA%D0%BE%D1%84%D1%84) | Концепты и редизайны Альфы и Т-Банка от дизайнеров | ⬜ | |

## E. Бесплатные UI-киты в Figma Community (можно брать компоненты)

| № | Референс | Что внутри | Решение | Комментарий |
|---|---|---|---|---|
| R42 | [Banking App UI Kit, светлая и тёмная тема, 43+ экрана](https://www.figma.com/community/file/1320093355098935734/free-banking-mobile-app-ui-kit-with-light-dark-mode-high-quality-ui-43-screen-template) | Полный набор экранов в двух темах | ⬜ | |
| R43 | [Payment Banking Mobile App](https://www.figma.com/community/file/1152191124533385497/free-figma-ui-kit-payment-banking-mobile-app-community) | Банкинг, кошелёк, крипта, инвестиции | ⬜ | |
| R44 | [Finance Apps Onboarding UI Kit](https://www.figma.com/community/file/1507306691977001418/free-finance-apps-onboarding-ui-kit) | Только онбординг | ⬜ | |
| R45 | [Free Finance UI Kit, 30 экранов и стайлгайд](https://www.figma.com/community/file/1259559940863317584/free-finance-ui-kit) | Экраны и стайлгайд | ⬜ | |
| R46 | [Free Finance Banking UI Kit](https://www.figma.com/community/file/1036356407585866248/free-finance-banking-ui-kit) | Переводы, кошелёк, банк | ⬜ | |
| R47 | [FinTech UI kit (Free)](https://www.figma.com/community/file/1364897819916971629/fintech-ui-kit-free) | Библиотека компонентов для банков, отдельный раздел финансовых компонентов | ⬜ | |
| R48 | [Fintech UI Kit, бесплатная версия](https://www.figma.com/community/file/1212747172059114028/fintech-ui-kit-free-version) | Финансы, инвестиции, банкинг | ⬜ | |
| R49 | [BanKitka, Fintech & Crypto UI Kit](https://www.figma.com/community/file/1394634547875877901/bankitka-fintech-crypto-mobile-app-ui-kit) | Финтех и крипта, аналитика | ⬜ | |
| R50 | [Paychain, Finance & Bank App UI Kit (free)](https://www.figma.com/community/file/1409462981462764804/paychain-finance-bank-app-ui-kit-v-1-1-free-version) | Банк и платежи | ⬜ | |
| R51 | [Bank App iOS UI Kit](https://www.figma.com/community/file/974284148399607335/bank-app-ios-ui-kit) | 10+ экранов в стиле iOS | ⬜ | |
| R52 | [Banking App Redesign](https://www.figma.com/community/file/1387354312081685012/banking-app-redesign) | Редизайн банковского приложения | ⬜ | |

## F. Статьи и UX-разборы

| № | Референс | О чём | Решение | Комментарий |
|---|---|---|---|---|
| R53 | [Альфа: «Новый интернет-банк: почему делали с нуля» (Хабр)](https://habr.com/ru/company/alfa/blog/589687/) | Как Альфа переосмыслила структуру и сценарии, которые потом ушли в мобилку | ⬜ | |
| R54 | [Flat Studio: паттерны Monobank, Revolut, Monzo и N26](https://www.flatstudio.co/blog/neobank-ux-patterns-daily-banking) | Сравнение паттернов: квесты, подсчета, аналитика | ⬜ | |
| R55 | [Flat Studio: как необанки становятся суперапами](https://www.flatstudio.co/blog/neobank-financial-super-app) | Суперапп-стратегия, как у Т-Банка | ⬜ | |
| R56 | [Eleken: 15 финтех-интерфейсов, которым доверяют](https://www.eleken.co/blog-posts/trusted-fintech-ui-examples) | UI-паттерны доверия на 15 реальных приложениях | ⬜ | |
| R57 | [Spaceberry: UX-аудит Monobank](https://spaceberry.studio/work/monobank) | Разбор сильных и слабых мест Монобанка | ⬜ | |

## G. Библиотеки экранов (нужен аккаунт)

| № | Референс | Что даёт | Решение | Комментарий |
|---|---|---|---|---|
| R58 | [Mobbin: экраны банковских приложений](https://mobbin.com/explore/mobile/screens/bank-app), [Mobbin Finance+](https://mobbin.com/finance) | Скриншоты реальных банков по паттернам (онбординг, KYC, переводы) | ⬜ | |
| R59 | [Page Flows: финтех](https://pageflows.com/web/products/finance/) | Видеозаписи пользовательских флоу реальных приложений | ⬜ | |

## H. Open-source код (для реализации)

| № | Референс | Стек | Решение | Комментарий |
|---|---|---|---|---|
| R60 | [alexandr7035/Banking-App-Mock-Compose](https://github.com/alexandr7035/Banking-App-Mock-Compose) | Kotlin + Jetpack Compose, слои data → domain ← ui | ⬜ | |
| R61 | [19Ishan/Banking-App-UI](https://github.com/19Ishan/19Ishan-Banking-App-UI) | Kotlin + Compose, MVVM, анимации | ⬜ | |
| R62 | [theArtistSam/Flutter-BankApp](https://github.com/theArtistSam/Flutter-BankApp), [vinothvino42/Mobile-Banking-App-UI](https://github.com/vinothvino42/Mobile-Banking-App-UI), [тема mobile-banking](https://github.com/topics/mobile-banking) | Flutter | ⬜ | |

---

## Решения

Шаблон, скопируй нужные строки:

```
R__ — ✅/❌/🟡
  Берём:
  Не берём:
```
