import { useBankingAdapter } from "./BankingAdapterContext";

/** Application placeholder: no product screens yet. Screens arrive with the first UI flow. */
export function App() {
  // Fails fast if the composition root forgot the provider; no operation is called here.
  useBankingAdapter();
  return (
    <main>
      <h1>Banking Shell</h1>
      <p>Каркас приложения. Экраны ещё не подключены.</p>
    </main>
  );
}
