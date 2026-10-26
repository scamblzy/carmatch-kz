import { useState, type FormEvent } from "react";
import "./App.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

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

interface ScoreComponent {
  key: "price" | "year" | "mileage" | "preferred_make";
  label: string;
  score: number;
  weight: number;
  contribution: number;
}

interface Recommendation {
  listing: Car;
  score: number;
  score_breakdown: ScoreComponent[];
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

const transmissionLabels: Record<string, string> = {
  automatic: "Автомат",
  manual: "Механика",
};

const bodyTypeLabels: Record<string, string> = {
  sedan: "Седан",
  hatchback: "Хэтчбек",
  suv: "Внедорожник / SUV",
  wagon: "Универсал",
  coupe: "Купе",
  minivan: "Минивэн",
  other: "Другой",
};

const fuelTypeLabels: Record<string, string> = {
  petrol: "Бензин",
  diesel: "Дизель",
  hybrid: "Гибрид",
  electric: "Электро",
  lpg: "Газ",
  other: "Другое",
};

function formatPrice(value: number): string {
  return `${currency.format(value)} ₸`;
}

function transmissionLabel(value: string): string {
  return transmissionLabels[value] ?? value;
}

function bodyTypeLabel(value: string): string {
  return bodyTypeLabels[value] ?? value;
}

function fuelTypeLabel(value: string): string {
  return fuelTypeLabels[value] ?? value;
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
            throw new Error(
              "Проверь числовые параметры поиска.",
            );
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
      {/* Header */}

      <header className="topbar">
        <a className="brand" href="#" aria-label="CarMatch KZ">
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
        {/* Hero */}

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

          {/* Abstract design instead of car illustrations */}

          <div className="hero-decoration" aria-hidden="true">
            <div className="decoration-grid" />

            <div className="hero-index">
              <span className="hero-index-label">
                CAR MATCHING SYSTEM
              </span>

              <strong>
                01<span> / 03</span>
              </strong>

              <p>
                Меньше шума.
                <br />
                Больше подходящих вариантов.
              </p>
            </div>

            <div className="floating-score">
              <div className="floating-score-head">
                <span>SMART MATCH</span>
                <span className="score-dot" />
              </div>

              <div className="floating-score-value">
                92<span>/100</span>
              </div>

              <div className="mini-score-track">
                <span />
              </div>

              <div className="floating-score-foot">
                <span>Ваши критерии</span>
                <strong>совпадают</strong>
              </div>
            </div>

            <div className="decoration-caption">
              <span>CARMATCH / KZ</span>
              <span>FIND YOUR MATCH</span>
            </div>
          </div>
        </section>

        {/* Search form */}

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
                onChange={(event) =>
                  updateField("budget_max", event.target.value)
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
                onChange={(event) =>
                  updateField("budget_min", event.target.value)
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
                onChange={(event) =>
                  updateField("preferred_make", event.target.value)
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
                onChange={(event) =>
                  updateField("city", event.target.value)
                }
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
                onChange={(event) =>
                  updateField("year_min", event.target.value)
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
                onChange={(event) =>
                  updateField("year_max", event.target.value)
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
                onChange={(event) =>
                  updateField("mileage_max", event.target.value)
                }
              />
            </div>

            <div className="field">
              <label htmlFor="transmission">Коробка передач</label>

              <select
                id="transmission"
                value={form.transmission}
                onChange={(event) =>
                  updateField("transmission", event.target.value)
                }
              >
                <option value="">Любая</option>
                <option value="automatic">Автомат</option>
                <option value="manual">Механика</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="body_type">Тип кузова</label>

              <select
                id="body_type"
                value={form.body_type}
                onChange={(event) =>
                  updateField("body_type", event.target.value)
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
              <label htmlFor="fuel_type">Тип топлива</label>

              <select
                id="fuel_type"
                value={form.fuel_type}
                onChange={(event) =>
                  updateField("fuel_type", event.target.value)
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

        {/* Error state */}

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

        {/* Results */}

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

                      {/* Minimal listing banner, no car pictures */}

                      <div className="car-card-visual">
                        <div className="car-visual-top">
                          <span>CARMATCH / LISTING</span>
                          <span>{car.year}</span>
                        </div>

                        <div className="car-visual-bottom">
                          <span className="car-visual-type">
                            {bodyTypeLabel(car.body_type)}
                          </span>

                          <span className="car-visual-city">
                            {car.city}
                          </span>
                        </div>
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
                          <strong>
                            {bodyTypeLabel(car.body_type)}
                          </strong>
                        </div>

                        <div>
                          <span>Топливо</span>
                          <strong>
                            {fuelTypeLabel(car.fuel_type)}
                          </strong>
                        </div>
                      </div>

                      {/* Overall score */}

                      <div className="score-description">
                        <div className="score-label">
                          <span>Соответствие запросу</span>
                          <strong>{item.score}%</strong>
                        </div>

                        <div className="score-track">
                          <div
                            className="score-fill"
                            style={{
                              width: `${item.score}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Score breakdown */}

                      {item.score_breakdown?.length > 0 && (
                        <div className="score-breakdown">
                          <h4>Из чего складывается оценка</h4>

                          {item.score_breakdown.map((component) => (
                            <div
                              className="breakdown-row"
                              key={component.key}
                            >
                              <div className="breakdown-info">
                                <span>{component.label}</span>

                                <strong>
                                  +{component.contribution.toFixed(1)}
                                </strong>
                              </div>

                              <div className="breakdown-track">
                                <div
                                  className="breakdown-fill"
                                  style={{
                                    width: `${component.score}%`,
                                  }}
                                />
                              </div>

                              <div className="breakdown-meta">
                                <span>
                                  Критерий: {component.score}/100
                                </span>

                                <span>
                                  Вес:{" "}
                                  {Math.round(component.weight * 100)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reasons */}

                      <div className="explanation">
                        <h4>Почему этот вариант?</h4>

                        {item.reasons.slice(0, 4).map((reason) => (
                          <p key={reason}>
                            <span>+</span>
                            {reason}
                          </p>
                        ))}
                      </div>

                      {/* Warnings */}

                      {item.warnings.length > 0 && (
                        <div className="warnings">
                          <h4>Обрати внимание</h4>

                          {item.warnings.slice(0, 3).map((warning) => (
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

        {/* Demo notice */}

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

      {/* Footer */}

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