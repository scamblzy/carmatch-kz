import { useState, type FormEvent } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  price_kzt: number;
  mileage_km: number;
  transmission: string;
  body_type: string;
  fuel_type: string;
  city: string;
  source_url: string;
  description: string;
}

interface Recommendation {
  listing: Car;
  score: number;
  reasons: string[];
  warnings: string[];
}

interface RecommendationResponse {
  items: Recommendation[];
  total: number;
}

interface SearchForm {
  budget_max: string;
  budget_min: string;
  year_min: string;
  year_max: string;
  mileage_max: string;
  transmission: string;
  body_type: string;
  fuel_type: string;
  preferred_make: string;
  city: string;
}

const initialForm: SearchForm = {
  budget_max: "6000000",
  budget_min: "",
  year_min: "2015",
  year_max: "",
  mileage_max: "160000",
  transmission: "automatic",
  body_type: "sedan",
  fuel_type: "petrol",
  preferred_make: "",
  city: "Astana",
};

const currency = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
});

const numberFormat = new Intl.NumberFormat("ru-RU");

function formatPrice(value: number): string {
  return `${currency.format(value)} ₸`;
}

function transmissionLabel(value: string): string {
  const labels: Record<string, string> = {
    automatic: "Автомат",
    manual: "Механика",
  };

  return labels[value] ?? value;
}

function bodyTypeLabel(value: string): string {
  const labels: Record<string, string> = {
    sedan: "Седан",
    hatchback: "Хэтчбек",
    suv: "Внедорожник / SUV",
    wagon: "Универсал",
    coupe: "Купе",
    minivan: "Минивэн",
    other: "Другой",
  };

  return labels[value] ?? value;
}

function App() {
  const [form, setForm] = useState<SearchForm>(initialForm);
  const [results, setResults] = useState<Recommendation[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateField(field: keyof SearchForm, value: string) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setResults([]);
    setTotal(null);

    try {
      const budgetMax = Number(form.budget_max);

      if (!Number.isFinite(budgetMax) || budgetMax <= 0) {
        throw new Error("Укажи корректный максимальный бюджет.");
      }

      if (
        form.budget_min.trim() !== "" &&
        Number(form.budget_min) > budgetMax
      ) {
        throw new Error(
          "Минимальный бюджет не может превышать максимальный.",
        );
      }

      if (
        form.year_min.trim() !== "" &&
        form.year_max.trim() !== "" &&
        Number(form.year_min) > Number(form.year_max)
      ) {
        throw new Error(
          "Минимальный год не может быть больше максимального.",
        );
      }

      const payload: Record<string, string | number> = {
        budget_max: budgetMax,
      };

      const numericFields = [
        "budget_min",
        "year_min",
        "year_max",
        "mileage_max",
      ] as const;

      for (const field of numericFields) {
        const value = form[field].trim();

        if (value !== "") {
          const numericValue = Number(value);

          if (!Number.isFinite(numericValue) || numericValue < 0) {
            throw new Error(`Проверь значение поля ${field}.`);
          }

          payload[field] = numericValue;
        }
      }

      const stringFields = [
        "transmission",
        "body_type",
        "fuel_type",
        "preferred_make",
        "city",
      ] as const;

      for (const field of stringFields) {
        const value = form[field].trim();

        if (value !== "") {
          payload[field] = value;
        }
      }

      const response = await fetch(
        `${API_URL}/api/v1/recommendations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const details = await response.text();

        throw new Error(
          `API вернул ошибку ${response.status}: ${details}`,
        );
      }

      const data: RecommendationResponse = await response.json();

      setResults(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось выполнить поиск.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brand-icon">C</span>
          <span>
            car<span className="brand-accent">match</span>
          </span>
          <span className="brand-country">KZ</span>
        </a>

        <span className="topbar-label">
          ПОМОЩНИК В ПОКУПКЕ АВТО
        </span>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="status-dot" />
              УМНЫЙ ПОДБОР АВТОМОБИЛЕЙ
            </div>

            <h1>
              Твоя следующая
              <br />
              машина. <span>Без лишнего.</span>
            </h1>

            <p className="hero-description">
              Задай бюджет и требования. Мы сравним подходящие
              автомобили и объясним, почему стоит обратить на них
              внимание.
            </p>

            <div className="hero-points">
              <span>
                <b>01</b> Под твой бюджет
              </span>
              <span>
                <b>02</b> По твоим критериям
              </span>
              <span>
                <b>03</b> С объяснением выбора
              </span>
            </div>
          </div>

          <div className="hero-decoration" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />

            <div className="hero-car">
              <svg
                viewBox="0 0 440 180"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M43 108 L65 99 L102 57 Q112 43 132 42 L266 42 Q291 43 309 65 L340 97 L383 108 Q397 112 397 129 L397 142 L28 142 L28 123 Q28 113 43 108Z"
                  fill="#B4F36A"
                />
                <path
                  d="M116 58 Q124 51 139 51 L194 51 L194 91 L88 91 L116 58Z"
                  fill="#182321"
                />
                <path
                  d="M206 51 L263 51 Q280 52 294 70 L311 91 L206 91Z"
                  fill="#182321"
                />
                <path
                  d="M200 48 L200 135"
                  stroke="#314A39"
                  strokeWidth="4"
                />
                <path
                  d="M34 111 L73 105 L87 112 L87 125 L31 125Z"
                  fill="#E8FCBD"
                />
                <path
                  d="M343 104 L381 117 L386 128 L345 128Z"
                  fill="#FF846A"
                />
                <rect
                  x="57"
                  y="137"
                  width="72"
                  height="34"
                  rx="17"
                  fill="#15241E"
                />
                <rect
                  x="298"
                  y="137"
                  width="72"
                  height="34"
                  rx="17"
                  fill="#15241E"
                />
                <circle cx="93" cy="154" r="11" fill="#718078" />
                <circle cx="334" cy="154" r="11" fill="#718078" />
                <circle cx="93" cy="154" r="5" fill="#D8E0D7" />
                <circle cx="334" cy="154" r="5" fill="#D8E0D7" />
              </svg>
            </div>

            <div className="decoration-caption">
              <span>CARMATCH / 001</span>
              <span>FIND YOUR MATCH</span>
            </div>
          </div>
        </section>

        <section className="search-section">
          <div className="section-heading">
            <div>
              <span className="section-index">01 / ПАРАМЕТРЫ</span>
              <h2>Какую машину ищем?</h2>
            </div>
            <span className="optional-label">
              Настрой свой поиск
            </span>
          </div>

          <form className="search-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="budget_max">
                Максимальный бюджет, ₸
              </label>
              <input
                id="budget_max"
                type="number"
                min="1"
                required
                value={form.budget_max}
                onChange={(e) =>
                  updateField("budget_max", e.target.value)
                }
              />
            </div>

            <div className="field">
              <label htmlFor="budget_min">
                Минимальный бюджет, ₸
              </label>
              <input
                id="budget_min"
                type="number"
                min="0"
                value={form.budget_min}
                placeholder="Неважно"
                onChange={(e) =>
                  updateField("budget_min", e.target.value)
                }
              />
            </div>

            <div className="field">
              <label htmlFor="preferred_make">Марка</label>
              <input
                id="preferred_make"
                type="text"
                list="car-makes"
                value={form.preferred_make}
                placeholder="Например, Toyota"
                onChange={(e) =>
                  updateField("preferred_make", e.target.value)
                }
              />

              <datalist id="car-makes">
                <option value="Toyota" />
                <option value="Hyundai" />
                <option value="Kia" />
                <option value="Honda" />
                <option value="Chevrolet" />
                <option value="Volkswagen" />
              </datalist>
            </div>

            <div className="field">
              <label htmlFor="city">Город</label>
              <select
                id="city"
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
              >
                <option value="">Любой город</option>
                <option value="Astana">Астана</option>
                <option value="Almaty">Алматы</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="year_min">Год выпуска от</label>
              <input
                id="year_min"
                type="number"
                min="1980"
                max="2035"
                value={form.year_min}
                onChange={(e) =>
                  updateField("year_min", e.target.value)
                }
              />
            </div>

            <div className="field">
              <label htmlFor="year_max">Год выпуска до</label>
              <input
                id="year_max"
                type="number"
                min="1980"
                max="2035"
                value={form.year_max}
                placeholder="Неважно"
                onChange={(e) =>
                  updateField("year_max", e.target.value)
                }
              />
            </div>

            <div className="field">
              <label htmlFor="mileage_max">Пробег до, км</label>
              <input
                id="mileage_max"
                type="number"
                min="0"
                value={form.mileage_max}
                placeholder="Неважно"
                onChange={(e) =>
                  updateField("mileage_max", e.target.value)
                }
              />
            </div>

            <div className="field">
              <label htmlFor="transmission">Коробка</label>
              <select
                id="transmission"
                value={form.transmission}
                onChange={(e) =>
                  updateField("transmission", e.target.value)
                }
              >
                <option value="">Любая</option>
                <option value="automatic">Автомат</option>
                <option value="manual">Механика</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="body_type">Кузов</label>
              <select
                id="body_type"
                value={form.body_type}
                onChange={(e) =>
                  updateField("body_type", e.target.value)
                }
              >
                <option value="">Любой</option>
                <option value="sedan">Седан</option>
                <option value="hatchback">Хэтчбек</option>
                <option value="suv">Внедорожник / SUV</option>
                <option value="wagon">Универсал</option>
                <option value="coupe">Купе</option>
                <option value="minivan">Минивэн</option>
                <option value="other">Другой</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="fuel_type">Топливо</label>
              <select
                id="fuel_type"
                value={form.fuel_type}
                onChange={(e) =>
                  updateField("fuel_type", e.target.value)
                }
              >
                <option value="">Любое</option>
                <option value="petrol">Бензин</option>
                <option value="diesel">Дизель</option>
                <option value="hybrid">Гибрид</option>
                <option value="electric">Электро</option>
                <option value="lpg">Газ</option>
                <option value="other">Другое</option>
              </select>
            </div>

            <div className="form-footer">
              <p>
                <span className="status-dot" />
                Настрой параметры и получи подборку
              </p>

              <button
                className="search-button"
                type="submit"
                disabled={loading}
              >
                {loading ? "Ищем варианты..." : "Подобрать авто"}
                <span aria-hidden="true">↗</span>
              </button>
            </div>
          </form>
        </section>

        {error && (
          <section className="error-panel" role="alert">
            <strong>Не удалось выполнить поиск</strong>
            <p>{error}</p>
            <p>
              Убедись, что FastAPI запущен и доступен по адресу{" "}
              {API_URL}.
            </p>
          </section>
        )}

        {total !== null && (
          <section className="results-section">
            <div className="section-heading results-heading">
              <div>
                <span className="section-index">
                  02 / РЕЗУЛЬТАТЫ
                </span>
                <h2>Твои варианты</h2>
              </div>

              <div className="results-count">
                <strong>{total}</strong>
                <span>подходящих авто</span>
              </div>
            </div>

            {results.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">⌕</span>
                <h3>Пока ничего не нашли</h3>
                <p>
                  Попробуй увеличить бюджет или изменить ограничения
                  по году и пробегу.
                </p>
              </div>
            ) : (
              <div className="car-grid">
                {results.map((item, index) => {
                  const car = item.listing;

                  return (
                    <article className="car-card" key={car.id}>
                      <div className="car-card-top">
                        <span className="car-number">
                          MATCH / {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="score-pill">
                          {item.score}/100
                        </span>
                      </div>

                      <div className="car-symbol" aria-hidden="true">
                        <span>CAR</span>
                        <svg viewBox="0 0 120 44" fill="none">
                          <path
                            d="M10 27 L19 24 L30 11 Q33 8 39 8 H78 Q84 8 90 17 L98 25 L108 28 V35 H7 V30 Q7 28 10 27Z"
                            fill="currentColor"
                          />
                          <path
                            d="M36 12 H52 V23 H27 L36 12Z"
                            fill="#273D30"
                          />
                          <path
                            d="M57 12 H76 Q82 12 86 19 L89 23 H57Z"
                            fill="#273D30"
                          />
                          <circle cx="27" cy="35" r="7" fill="#182321" />
                          <circle cx="89" cy="35" r="7" fill="#182321" />
                          <circle cx="27" cy="35" r="3" fill="#D6E1D4" />
                          <circle cx="89" cy="35" r="3" fill="#D6E1D4" />
                        </svg>
                      </div>

                      <div className="car-title">
                        <h3>
                          {car.make} {car.model}
                        </h3>
                        <span>{car.year} год</span>
                      </div>

                      <div className="car-price">
                        {formatPrice(car.price_kzt)}
                      </div>

                      <div className="car-specs">
                        <div>
                          <span>Пробег</span>
                          <strong>
                            {numberFormat.format(car.mileage_km)} км
                          </strong>
                        </div>

                        <div>
                          <span>Коробка</span>
                          <strong>
                            {transmissionLabel(car.transmission)}
                          </strong>
                        </div>

                        <div>
                          <span>Кузов</span>
                          <strong>{bodyTypeLabel(car.body_type)}</strong>
                        </div>

                        <div>
                          <span>Город</span>
                          <strong>{car.city}</strong>
                        </div>
                      </div>

                      <div className="score-description">
                        <div className="score-label">
                          <span>Соответствие запросу</span>
                          <strong>{item.score}%</strong>
                        </div>

                        <div className="score-track">
                          <div
                            className="score-fill"
                            style={{ width: `${item.score}%` }}
                          />
                        </div>
                      </div>

                      <div className="explanation">
                        <h4>Почему этот вариант?</h4>

                        {item.reasons.slice(0, 3).map((reason) => (
                          <p key={reason}>
                            <span>+</span>
                            {reason}
                          </p>
                        ))}
                      </div>

                      {item.warnings.length > 0 && (
                        <div className="warnings">
                          <h4>Обрати внимание</h4>

                          {item.warnings.slice(0, 2).map((warning) => (
                            <p key={warning}>
                              <span>!</span>
                              {warning}
                            </p>
                          ))}
                        </div>
                      )}

                      <a
                        className="listing-link"
                        href={car.source_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Открыть объявление
                        <span>↗</span>
                      </a>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <section className="demo-notice">
          <span className="demo-notice-icon">i</span>
          <div>
            <strong>Демонстрационная версия</strong>
            <p>
              Сейчас используются синтетические данные для тестирования.
              Это не реальные объявления Kolesa.kz, а ссылки в карточках —
              демонстрационные заглушки.
            </p>
          </div>
        </section>
      </main>

      <footer className="footer">
        <a className="brand footer-brand" href="#">
          <span className="brand-icon">C</span>
          <span>
            car<span className="brand-accent">match</span>
          </span>
          <span className="brand-country">KZ</span>
        </a>

        <span>НАЙДИ СВОЙ MATCH.</span>
        <span>CARMATCH KZ · MVP 0.1.0</span>
      </footer>
    </div>
  );
}

export default App;